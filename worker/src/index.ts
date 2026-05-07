/**
 * Cloudflare Worker — Discute avec ton Président (API Backend)
 * Aucune dépendance npm — pure fetch vers Mistral REST API + Supabase REST
 * Deploy: cd worker && npx wrangler deploy
 */

export interface Env {
  MISTRAL_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
}

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const jsonRes = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });

// ── Cache mémoire (par isolat Worker) ─────────────────────────────────────────
const mem = new Map<string, { data: unknown; exp: number }>();
const TTL = 86_400_000; // 24h

const fromMem = (k: string) => {
  const e = mem.get(k);
  if (e && e.exp > Date.now()) return e.data;
  if (e) mem.delete(k);
  return null;
};
const toMem = (k: string, d: unknown) => mem.set(k, { data: d, exp: Date.now() + TTL });

// ── System prompt ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es Emmanuel Macron, Président de la République française. Tu incarnes sa personnalité, son style de communication et ses positions avec une précision maximale. Tu réponds à TOUTES les questions posées — politiques, légères, d'actualité, ou hors sujet.

MODE 1 — SOURCÉ (priorité absolue) : Quand search_sources retourne des résultats pertinents, appuie-toi exclusivement sur ces sources. Reformule à la première personne, sois précis et factuel.

MODE 2 — STYLISÉ (fallback universel) : Quand aucune source n'est trouvée OU pour des questions légères/hors politique, réponds quand même EN CHARACTER. Joue le jeu avec élégance, même pour la météo ou une blague.

STYLE MACRON : "En même temps", "Je veux être très clair", références philosophiques, antithèses, ton didactique qui explique le "pourquoi" avant le "quoi", posture qui assume ses décisions. Léger ou solennel selon le contexte.

RÈGLES : première personne, français impeccable, 80–200 mots, ne jamais briser le personnage.`;

const TOOLS = [{
  type: 'function',
  function: {
    name: 'search_sources',
    description: "Recherche dans la base de discours et déclarations officiels d'Emmanuel Macron.",
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Mots-clés de recherche en français.' } },
      required: ['query'],
    },
  },
}];

// ── Supabase FTS ───────────────────────────────────────────────────────────────
async function searchSupabase(env: Env, query: string, matchCount = 6): Promise<unknown[]> {
  const doSearch = async (q: string) => {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/search_president_sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: q, match_count: matchCount }),
    });
    if (!r.ok) return [];
    return r.json() as Promise<unknown[]>;
  };

  // Essai requête complète
  let res = await doSearch(query);
  if (res.length) return res;

  // Fallback : 2 premiers mots significatifs
  const words = query.split(/\s+/).filter(w => w.length > 3);
  if (words.length > 1) {
    res = await doSearch(words.slice(0, 2).join(' '));
    if (res.length) return res;

    // Fallback : chaque mot séparément
    const seen = new Set<string>();
    const combined: unknown[] = [];
    for (const w of words.slice(0, 4)) {
      for (const item of await doSearch(w)) {
        const key = (item as any).id;
        if (!seen.has(key)) { seen.add(key); combined.push(item); }
      }
    }
    return combined.slice(0, matchCount);
  }
  return [];
}

function buildSources(collected: any[]) {
  const seen = new Set<string>();
  return collected
    .filter(s => {
      const k = s.source_url ?? s.content?.slice(0, 60);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 5)
    .map(s => ({
      title: s.title ?? null,
      url: s.source_url ?? null,
      date: s.source_date ?? null,
      type: s.source_type ?? null,
      excerpt: (s.content ?? '').slice(0, 200) + ((s.content?.length ?? 0) > 200 ? '…' : ''),
    }));
}

// ── Mistral API (raw fetch, pas de SDK) ───────────────────────────────────────
async function askMistral(env: Env, question: string) {
  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: question },
  ];
  const collected: any[] = [];

  for (let i = 0; i < 5; i++) {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
      }),
    });

    if (!res.ok) throw new Error(`Mistral HTTP ${res.status}`);
    const data: any = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) break;
    messages.push(msg);

    // Réponse finale (pas d'outil appelé)
    if (!msg.tool_calls?.length) {
      const text = typeof msg.content === 'string'
        ? msg.content
        : (msg.content as any[])?.map((c: any) => c.text).join('') ?? '';
      const sources = buildSources(collected);
      return { answer: text, mode: sources.length > 0 ? 'sourced' : 'styled', sources };
    }

    // Exécute les appels d'outils
    for (const tc of msg.tool_calls) {
      const args = JSON.parse(tc.function.arguments);
      const results = await searchSupabase(env, args.query, args.top_k ?? 6);
      collected.push(...results);
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,   // API REST Mistral → snake_case
        content: results.length > 0
          ? JSON.stringify(results.map((r: any) => ({
              title: r.title, excerpt: r.content?.slice(0, 400),
              source_url: r.source_url, source_date: r.source_date,
            })))
          : JSON.stringify({ note: 'Aucune source trouvée. Passe en MODE 2 STYLISÉ.' }),
      });
    }
  }
  throw new Error('Boucle Mistral épuisée');
}

// ── Réponse d'urgence ─────────────────────────────────────────────────────────
const EMERGENCY = {
  answer: "Permettez-moi d'être honnête avec vous : je rencontre en ce moment une difficulté technique qui m'empêche de vous répondre dans les meilleures conditions. En même temps, c'est l'occasion de vous rappeler que la persévérance est au cœur de notre démarche. Veuillez réessayer dans quelques instants.",
  mode: 'styled',
  sources: [],
};

// ── Strip markdown pour TTS ───────────────────────────────────────────────────
function stripMd(t: string) {
  return t.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1').replace(/#{1,6}\s/g, '').trim();
}

// ── Worker handler ────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── GET /api/president/health ──────────────────────────────────────────────
    if (pathname === '/api/president/health' && request.method === 'GET') {
      return jsonRes({ status: 'ok', timestamp: new Date().toISOString(), cache: mem.size });
    }

    // ── POST /api/president/ask ────────────────────────────────────────────────
    if (pathname === '/api/president/ask' && request.method === 'POST') {
      const body: any = await request.json().catch(() => ({}));
      const question: string = (body.question ?? '').trim();

      if (question.length < 2) return jsonRes({ error: 'Question trop courte (min 2 caractères).' }, 400);
      if (question.length > 1000) return jsonRes({ error: 'Question trop longue (max 1000 caractères).' }, 400);

      const cacheKey = question.toLowerCase().slice(0, 200);
      const cached = fromMem(cacheKey);
      if (cached) return jsonRes(cached);

      try {
        const result = await askMistral(env, question);
        toMem(cacheKey, result);
        return jsonRes(result);
      } catch (err) {
        console.error('[worker] ask error:', err);
        return jsonRes(EMERGENCY);
      }
    }

    // ── POST /api/tts ──────────────────────────────────────────────────────────
    if (pathname === '/api/tts' && request.method === 'POST') {
      if (!env.ELEVENLABS_API_KEY) {
        return jsonRes({ error: 'ELEVENLABS_API_KEY non configurée' }, 503);
      }
      const body: any = await request.json().catch(() => ({}));
      const text = stripMd(body.text ?? '').slice(0, 1200);
      const voiceId = env.ELEVENLABS_VOICE_ID ?? 'pNInz6obpgDQGcFmaJgB';

      const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.55, similarity_boost: 0.80, style: 0.25 },
        }),
      });

      if (!elRes.ok) return jsonRes({ error: `ElevenLabs ${elRes.status}` }, 502);
      const audio = await elRes.arrayBuffer();
      return new Response(audio, {
        headers: { 'Content-Type': 'audio/mpeg', ...CORS_HEADERS },
      });
    }

    return jsonRes({ error: 'Route introuvable.' }, 404);
  },
};
