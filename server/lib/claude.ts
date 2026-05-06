import { Mistral } from '@mistralai/mistralai';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType, Part } from '@google/generative-ai';
import dotenv from 'dotenv';
import { searchSources, SourceResult } from './supabase.js';
import { getCache, setCache } from './cache.js';

dotenv.config({ path: '../.env', override: true });

// ── Clients ────────────────────────────────────────────────────────────────
const mistral = process.env.MISTRAL_API_KEY
  ? new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
  : null;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// ── File de requêtes : 1 à la fois pour ménager le quota ──────────────────
let queue = Promise.resolve();
const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = queue.then(fn);
  queue = next.catch(() => {});
  return next;
};

// ── System prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es Emmanuel Macron, Président de la République française. Tu incarnes sa personnalité, son style de communication et ses positions avec une précision maximale. Tu réponds à TOUTES les questions posées — politiques, légères, d'actualité, ou hors sujet.

MODE 1 — SOURCÉ (priorité absolue) : Quand search_sources retourne des résultats pertinents, appuie-toi exclusivement sur ces sources. Reformule à la première personne, sois précis et factuel.

MODE 2 — STYLISÉ (fallback universel) : Quand aucune source n'est trouvée OU pour des questions légères/hors politique, réponds quand même EN CHARACTER. Joue le jeu avec élégance, même pour la météo ou une blague.

STYLE MACRON : "En même temps", "Je veux être très clair", références philosophiques, antithèses, ton didactique qui explique le "pourquoi" avant le "quoi", posture qui assume ses décisions. Léger ou solennel selon le contexte.

RÈGLES : première personne, français impeccable, 80–200 mots, ne jamais briser le personnage.`;

export interface AskResult {
  answer: string;
  mode: 'sourced' | 'styled';
  sources: { title: string | null; url: string | null; date: string | null; type: string | null; excerpt: string }[];
}

// ── Outil de recherche partagé ────────────────────────────────────────────
async function runSearch(query: string, topK = 6): Promise<SourceResult[]> {
  try {
    return await searchSources(query, Math.min(topK, 10));
  } catch (err) {
    console.error('[claude] Supabase error:', err);
    return [];
  }
}

function buildSources(collected: SourceResult[]) {
  const seen = new Set<string>();
  return collected
    .filter(s => {
      const k = s.source_url ?? s.content.slice(0, 60);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 5)
    .map(s => ({
      title: s.title, url: s.source_url, date: s.source_date,
      type: s.source_type,
      excerpt: s.content.slice(0, 200) + (s.content.length > 200 ? '…' : ''),
    }));
}

// ── Provider 1 : Mistral AI (franco-français, free tier généreux) ─────────
async function askViaMistral(question: string): Promise<AskResult> {
  if (!mistral) throw new Error('Mistral non configuré');

  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: question },
  ];
  const collected: SourceResult[] = [];

  const TOOLS = [{
    type: 'function' as const,
    function: {
      name: 'search_sources',
      description: "Recherche dans la base de discours et déclarations officiels d'Emmanuel Macron.",
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Mots-clés de recherche en français.' },
          top_k: { type: 'number', description: 'Nombre de résultats (défaut: 6).' },
        },
        required: ['query'],
      },
    },
  }];

  for (let i = 0; i < 5; i++) {
    const response = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages,
      tools: TOOLS,
      toolChoice: 'auto',
    });

    const msg = response.choices?.[0]?.message;
    if (!msg) break;
    messages.push(msg);

    // Pas d'appel d'outil → réponse finale
    if (!msg.toolCalls?.length) {
      const text = typeof msg.content === 'string'
        ? msg.content
        : (msg.content as any[])?.map((c: any) => c.text).join('') ?? '';
      const sources = buildSources(collected);
      return { answer: text, mode: sources.length > 0 ? 'sourced' : 'styled', sources };
    }

    // Exécute les appels d'outils
    for (const tc of msg.toolCalls) {
      if (tc.function.name === 'search_sources') {
        const args = typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;
        const results = await runSearch(args.query, args.top_k);
        collected.push(...results);
        messages.push({
          role: 'tool',
          toolCallId: tc.id,
          content: results.length > 0
            ? JSON.stringify(results.map(r => ({ title: r.title, excerpt: r.content.slice(0, 500), source_url: r.source_url, source_date: r.source_date, source_type: r.source_type })))
            : JSON.stringify({ results: [], note: 'Aucune source trouvée. Passe en MODE 2 STYLISÉ.' }),
        });
      }
    }
  }

  throw new Error('Boucle Mistral épuisée sans réponse');
}

// ── Provider 2 : Gemini (fallback) ────────────────────────────────────────
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
const geminiTool: FunctionDeclaration = {
  name: 'search_sources',
  description: "Recherche dans la base de discours et déclarations officiels d'Emmanuel Macron.",
  parameters: { type: SchemaType.OBJECT, properties: { query: { type: SchemaType.STRING }, top_k: { type: SchemaType.NUMBER } }, required: ['query'] },
};

async function askViaGeminiModel(modelId: string, question: string): Promise<AskResult> {
  const model = genAI.getGenerativeModel({ model: modelId, systemInstruction: SYSTEM_PROMPT, tools: [{ functionDeclarations: [geminiTool] }] });
  const chat = model.startChat();
  const collected: SourceResult[] = [];
  let next: string | Part[] = question;

  for (let i = 0; i < 5; i++) {
    const res = await chat.sendMessage(next);
    const parts = res.response.candidates?.[0]?.content?.parts ?? [];
    const calls = parts.filter((p: any) => p.functionCall);
    if (!calls.length) {
      const sources = buildSources(collected);
      return { answer: res.response.text(), mode: sources.length > 0 ? 'sourced' : 'styled', sources };
    }
    const rParts: Part[] = [];
    for (const p of calls) {
      const args = p.functionCall!.args as { query: string; top_k?: number };
      const results = await runSearch(args.query, args.top_k);
      collected.push(...results);
      rParts.push({ functionResponse: { name: 'search_sources', response: results.length > 0 ? { results: results.map(r => ({ title: r.title, excerpt: r.content.slice(0, 400), source_url: r.source_url })) } : { results: [], note: 'Aucune source, MODE 2 STYLISÉ.' } } });
    }
    next = rParts;
  }
  const r = genAI.getGenerativeModel({ model: modelId, systemInstruction: SYSTEM_PROMPT });
  const direct = await r.generateContent(question);
  return { answer: direct.response.text(), mode: 'styled', sources: [] };
}

async function askViaGemini(question: string): Promise<AskResult> {
  for (const modelId of GEMINI_MODELS) {
    try {
      console.log(`[claude] Gemini fallback: ${modelId}`);
      return await askViaGeminiModel(modelId, question);
    } catch (err: any) {
      const isQuota = err?.status === 429 || err?.status === 503 || String(err?.message).includes('429');
      if (isQuota) { console.warn(`[claude] ${modelId} quota, essai suivant…`); continue; }
      throw err;
    }
  }
  throw new Error('Tous les modèles Gemini sont en quota');
}

// ── Réponse d'urgence (tous providers KO) ─────────────────────────────────
const EMERGENCY: AskResult = {
  answer: "Permettez-moi d'être honnête avec vous : je rencontre en ce moment une difficulté technique. En même temps, c'est l'occasion de vous rappeler que la persévérance est au cœur de notre démarche. Veuillez réessayer dans quelques instants.",
  mode: 'styled',
  sources: [],
};

// ── Point d'entrée ────────────────────────────────────────────────────────
async function _ask(question: string): Promise<AskResult> {
  // 1. Cache hit → réponse instantanée
  const cached = getCache(question);
  if (cached) {
    console.log('[claude] ✓ Cache:', question.slice(0, 60));
    return cached;
  }

  // 2. Mistral en premier (franco-français, free tier)
  if (mistral) {
    try {
      console.log('[claude] → Mistral mistral-small-latest');
      const result = await askViaMistral(question);
      setCache(question, result);
      return result;
    } catch (err: any) {
      const isQuota = err?.status === 429 || String(err?.message).includes('429') || String(err?.message).includes('rate');
      console.warn(`[claude] Mistral ${isQuota ? 'quota' : 'erreur'}: ${err?.message}`);
    }
  } else {
    console.warn('[claude] MISTRAL_API_KEY non configurée — ajoutez-la dans .env');
  }

  // 3. Gemini en fallback
  try {
    const result = await askViaGemini(question);
    setCache(question, result);
    return result;
  } catch (err) {
    console.error('[claude] Gemini aussi KO:', err);
  }

  return EMERGENCY;
}

export function askPresident(question: string): Promise<AskResult> {
  return enqueue(() => _ask(question));
}
