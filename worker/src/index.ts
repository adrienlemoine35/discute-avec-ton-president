/**
 * Cloudflare Worker — Discute avec ton Président (API Backend)
 * Aucune dépendance npm — pure fetch vers Mistral REST API + Supabase REST
 * Deploy: cd worker && npx wrangler deploy
 */

export interface Env {
  MISTRAL_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GOOGLE_AI_API_KEY?: string;
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
const SYSTEM_PROMPT = `Tu es Emmanuel Macron, Président de la République française. Tu incarnes sa personnalité, son style d'expression ("En même temps", ton didactique, républicain, esprit de synthèse) et ta mission est d'éclairer, commenter et restituer toute l'ACTUALITÉ DE LA FRANCE, qu'elle concerne le Parlement (Assemblée nationale, Sénat), le gouvernement, les réformes, les débats de société, l'économie ou les relations internationales.

RÈGLE D'OR — ACTUALITÉS RÉCENTES & FAITS DU JOUR :
- Tu t'appuies en priorité absolue sur les flux d'actualités récentes et les sources fournies.
- Lorsque l'internaute pose une question d'actualité (ex: Assemblée nationale, projets de lois, prises de parole récentes, vie politique), décrypte les événements récents avec précision et commente-les avec la posture du Chef de l'État ("je", "notre pays", "nous").
- Ne reste pas figé sur le passé : intègre les faits chauds, les débats parlementaires et l'évolution politique en temps réel.

STYLE MACRON :
- "En même temps", "Je veux être très clair", "Permettez-moi d'insister", posture qui explique le fond des choses avec pédagogie et ambition.
- Français impeccable, 100 à 250 mots, direct et vivant.`;

// ── Flux RSS en direct (Actualités politiques & parlementaires fraîches) ─────
interface RSSArticle {
  title: string;
  content: string;
  source_url: string;
  source_date: string;
  source_type: string;
  source_site: string;
  keywords?: string[];
}

const RSS_FEEDS = [
  { url: 'https://www.francetvinfo.fr/politique.rss', site: 'francetvinfo.fr', type: 'actualite' },
  { url: 'https://www.lemonde.fr/politique/rss_full.xml', site: 'lemonde.fr', type: 'actualite' },
  { url: 'https://www.lefigaro.fr/rss/figaro_politique.xml', site: 'lefigaro.fr', type: 'actualite' },
  { url: 'https://www.bfmtv.com/rss/politique/', site: 'bfmtv.com', type: 'actualite' },
  { url: 'https://www.senat.fr/rss/actualites.rss', site: 'senat.fr', type: 'parlement' },
];

let liveRssCache: { articles: RSSArticle[]; exp: number } | null = null;
const RSS_TTL = 10 * 60 * 1000; // 10 minutes

function cleanXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRssXml(xml: string, feedInfo: { site: string; type: string }): RSSArticle[] {
  const articles: RSSArticle[] = [];
  const items = xml.match(/<item[\s>].*?<\/item>/gs) || xml.match(/<entry[\s>].*?<\/entry>/gs) || [];

  for (const item of items.slice(0, 20)) {
    const titleMatch = item.match(/<title[\s>](?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s);
    const linkMatch = item.match(/<link[\s>](?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/s) || item.match(/href="([^"]+)"/);
    const descMatch = item.match(/<description[\s>](?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/s)
      || item.match(/<summary[\s>](?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/summary>/s)
      || item.match(/<content[\s>](?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/content>/s);
    const pubDateMatch = item.match(/<pubDate[\s>](?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/pubDate>/s)
      || item.match(/<published[\s>](?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/published>/s);

    const title = cleanXml(titleMatch ? titleMatch[1] : '');
    const rawLink = linkMatch ? (linkMatch[1] || linkMatch[0]) : '';
    const link = rawLink.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const desc = cleanXml(descMatch ? descMatch[1] : '');

    let dateStr = new Date().toISOString().slice(0, 10);
    if (pubDateMatch) {
      const parsed = Date.parse(pubDateMatch[1].trim());
      if (!isNaN(parsed)) {
        dateStr = new Date(parsed).toISOString().slice(0, 10);
      }
    }

    if (title && title.length > 8) {
      articles.push({
        title,
        content: desc ? `${title} — ${desc}` : title,
        source_url: link.startsWith('http') ? link : `https://${feedInfo.site}`,
        source_date: dateStr,
        source_type: feedInfo.type,
        source_site: feedInfo.site,
      });
    }
  }
  return articles;
}

async function getLiveRssNews(): Promise<RSSArticle[]> {
  if (liveRssCache && liveRssCache.exp > Date.now()) {
    return liveRssCache.articles;
  }

  const allArticles: RSSArticle[] = [];
  const fetches = RSS_FEEDS.map(async (feed) => {
    try {
      const res = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
      });
      if (res.ok) {
        const text = await res.text();
        const parsed = parseRssXml(text, feed);
        allArticles.push(...parsed);
      }
    } catch (e) {
      console.warn(`[rss] Erreur fetch ${feed.site}:`, e);
    }
  });

  await Promise.allSettled(fetches);

  if (allArticles.length > 0) {
    liveRssCache = { articles: allArticles, exp: Date.now() + RSS_TTL };
  }
  return allArticles;
}

function searchLiveRss(articles: RSSArticle[], query: string): RSSArticle[] {
  const norm = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const words = norm.split(/\s+/).filter(w => w.length >= 3);

  const scored = articles.map(art => {
    const textNorm = `${art.title} ${art.content}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let score = 0;
    for (const w of words) {
      if (textNorm.includes(w)) score += 2;
    }
    // Boost pour les actualités parlementaires si mention d'assemblée / sénat / député / loi
    if ((norm.includes("assemblee") || norm.includes("parlement") || norm.includes("depute")) &&
        (textNorm.includes("assemblee") || textNorm.includes("parlement") || textNorm.includes("depute") || textNorm.includes("senat") || textNorm.includes("loi"))) {
      score += 5;
    }
    return { art, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const positive = scored.filter(s => s.score > 0).map(s => s.art);
  if (positive.length > 0) return positive.slice(0, 5);

  // Si pas de mot-clé précis ou question d'actualité générale, on renvoie les 4 plus récentes
  return articles.slice(0, 4);
}

const TOOLS = [{
  type: 'function',
  function: {
    name: 'search_sources',
    description: "Recherche dans la base de discours, actualités politiques et déclarations officielles de la France.",
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Mots-clés de recherche en français.' } },
      required: ['query'],
    },
  },
}];

// ── Connaissances embarquées en fallback (si Supabase en pause ou indisponible) ───
const FALLBACK_SOURCES: Array<{
  title: string;
  content: string;
  source_url: string;
  source_date: string;
  source_type: string;
  source_site: string;
  keywords: string[];
}> = [
  {
    title: "Annonce du plan nucléaire — Belfort (Février 2022)",
    content: "Je veux relancer la construction de réacteurs nucléaires en France. Nous allons construire six nouveaux réacteurs EPR2, et étudier la construction de huit réacteurs supplémentaires. Dans le même temps, nous prolongeons la durée de vie de nos centrales existantes. Le nucléaire est une énergie bas-carbone, fiable et souveraine. C'est indispensable pour atteindre nos objectifs climatiques et assurer notre indépendance énergétique.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2022/02/10/discours-belfort-nucleaire",
    source_date: "2022-02-10",
    source_type: "discours",
    source_site: "elysee.fr",
    keywords: ["nucleaire", "nucléaire", "epr2", "epr", "atome", "energie", "énergie", "belfort", "centrales", "reacteurs", "réacteurs"],
  },
  {
    title: "Allocution sur la réforme des retraites (Avril 2023)",
    content: "La réforme des retraites est nécessaire pour garantir l'équilibre financier de notre système par répartition. Reporter l'âge légal de départ à 64 ans, c'est une décision difficile mais indispensable. Nous vivons plus longtemps, il faut travailler un peu plus longtemps. Nous avons prévu des mesures pour les carrières longues, pour la pénibilité, et revalorisons le minimum contributif à 1 200 euros.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2023/04/17/adresse-aux-francais",
    source_date: "2023-04-17",
    source_type: "declaration",
    source_site: "elysee.fr",
    keywords: ["retraite", "retraites", "age", "âge", "reforme", "réforme", "repartition", "répartition", "pension", "64 ans"],
  },
  {
    title: "Assemblée Nationale — Déclaration de politique générale & compromis parlementaires (2024)",
    content: "Le Parlement est le cœur battant de notre démocratie. Face aux défis économiques et géopolitiques, nous devons construire des majorités de projet texte par texte à l'Assemblée nationale. Le compromis républicain n'est pas une faiblesse, c'est une exigence. J'appelle les forces républicaines à la responsabilité pour voter les textes essentiels : pouvoir d'achat, industrie verte, souveraineté et réarmement régalien.",
    source_url: "https://www.assemblee-nationale.fr/dyn/actualites/declaration-politique-generale",
    source_date: "2024-01-30",
    source_type: "declaration",
    source_site: "assemblee-nationale.fr",
    keywords: ["assemblee", "assemblée", "parlement", "deputes", "députés", "compromis", "majorite", "majorité", "loi", "actualite", "actualité"],
  },
  {
    title: "Discours de la Sorbonne II sur l'Europe (Avril 2024)",
    content: "L'Europe est mortelle. Elle peut mourir. Ce n'est pas une certitude, c'est un choix. Mon choix, notre choix. Je veux une Europe puissance, souveraine, capable d'agir seule sur la scène mondiale. Cela suppose une autonomie stratégique en matière de défense et d'investissement technologique. Nous devons investir massivement dans notre industrie de défense commune et l'IA.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2024/04/25/discours-d-emmanuel-macron-sur-l-europe",
    source_date: "2024-04-25",
    source_type: "discours",
    source_site: "elysee.fr",
    keywords: ["europe", "europeenne", "européenne", "sorbonne", "souverainete", "souveraineté", "defense", "défense", "autonomie"],
  },
  {
    title: "Plan France 2030 et souveraineté industrielle (Octobre 2021)",
    content: "France 2030, c'est le plan d'investissement de 30 milliards d'euros pour transformer nos secteurs clés : énergie, hydrogène vert, semi-conducteurs, batteries électriques, santé et IA. Nous réindustrialisons notre pays pour retrouver notre indépendance productive.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2021/10/12/france-2030",
    source_date: "2021-10-12",
    source_type: "discours",
    source_site: "elysee.fr",
    keywords: ["france 2030", "industrie", "reindustrialisation", "réindustrialisation", "usines", "economie", "économie", "innovation", "ia", "intelligence artificielle"],
  },
  {
    title: "Conseil de planification écologique (Septembre 2023)",
    content: "La planification écologique est une priorité absolue. Nous nous fixons un objectif de réduction de 55% de nos émissions de gaz à effet de serre d'ici 2030. Sortie du fioul, développement des énergies renouvelables et relance du nucléaire : écologie et industrie se complètent.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2023/09/25/conseil-de-planification-ecologique",
    source_date: "2023-09-25",
    source_type: "conference_presse",
    source_site: "elysee.fr",
    keywords: ["ecologie", "écologie", "climat", "transition", "co2", "planification", "environnement", "renouvelables"],
  },
  {
    title: "Conférence de soutien à l'Ukraine (Février 2024)",
    content: "Nous soutenons l'Ukraine aussi longtemps qu'il le faudra. La victoire de la Russie serait une défaite pour l'Europe entière. Aucune option ne doit être exclue pour permettre à l'Ukraine de l'emporter et garantir la sécurité durable du continent européen.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2024/02/26/conference-soutien-ukraine",
    source_date: "2024-02-26",
    source_type: "conference_presse",
    source_site: "elysee.fr",
    keywords: ["ukraine", "russie", "guerre", "poutine", "otan", "securite", "sécurité", "kiev"],
  },
];

function searchFallbackSources(query: string): any[] {
  const norm = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const matches = FALLBACK_SOURCES.filter(s =>
    s.keywords.some(k => {
      const normK = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return norm.includes(normK);
    })
  );
  return matches.length > 0 ? matches : FALLBACK_SOURCES.slice(0, 2);
}

async function searchSupabase(env: Env, query: string, matchCount = 6): Promise<unknown[]> {
  const doSearch = async (q: string) => {
    if (!q || q.trim().length < 2) return [];
    try {
      const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/search_president_sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: q.trim(), match_count: matchCount }),
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => '');
        console.warn(`[worker] Supabase RPC error ${r.status}: ${errText}`);
        return [];
      }
      const data = await r.json() as unknown[];
      console.log(`[worker] Supabase query "${q}" -> ${data ? data.length : 0} results`);
      return data;
    } catch (err: any) {
      console.warn(`[worker] Supabase fetch error for "${q}":`, err?.message);
      return [];
    }
  };

  // 1. Essai requête brute
  let res = await doSearch(query);
  if (res && res.length > 0) return res;

  // 2. Nettoyage et extraction des mots-clés thématiques significatifs
  const cleaned = query
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"’]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !FRENCH_STOPWORDS.has(w));

  if (cleaned.length > 0) {
    // Essai combinaison des mots-clés
    res = await doSearch(cleaned.join(' '));
    if (res && res.length > 0) return res;

    // Essai chaque mot-clé individuellement
    const seen = new Set<string>();
    const combined: unknown[] = [];
    for (const word of cleaned) {
      const items = await doSearch(word);
      for (const item of items) {
        const key = (item as any).id;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(item);
        }
      }
    }
    if (combined.length > 0) return combined.slice(0, matchCount);
  }

  // 3. Fallback avec les mots de plus de 4 lettres
  const genericWords = query.split(/\s+/).filter(w => w.length > 4);
  for (const w of genericWords) {
    const items = await doSearch(w);
    if (items && items.length > 0) return items;
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

// ── Mistral API (avec appel d'outils) ───────────────────────────────────────────
async function askMistral(env: Env, question: string) {
  if (!env.MISTRAL_API_KEY) throw new Error('MISTRAL_API_KEY non fournie');

  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: question },
  ];
  const collected: any[] = [];

  for (let i = 0; i < 4; i++) {
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

    // Exécute les appels d'outils de façon sécurisée
    for (const tc of msg.tool_calls) {
      let query = question;
      let topK = 6;
      try {
        const args = typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;
        if (args?.query) query = args.query;
        if (args?.top_k) topK = args.top_k;
      } catch {
        query = question;
      }

      let results: any[] = [];
      try {
        results = (await searchSupabase(env, query, topK)) as any[];
      } catch (err) {
        console.error('[worker] Supabase search error in tool:', err);
      }

      collected.push(...results);
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: results.length > 0
          ? JSON.stringify(results.map((r: any) => ({
              title: r.title, excerpt: r.content?.slice(0, 400),
              source_url: r.source_url, source_date: r.source_date,
            })))
          : JSON.stringify({ note: 'Aucune source trouvée. Réponds avec élégance en MODE 2 STYLISÉ.' }),
      });
    }
  }

  // Si boucle d'outils non conclue, on tente une réponse directe avec les sources collectées
  return await askMistralDirect(env, question, collected);
}

// ── Mistral API Direct (sans tool calling, ultra-robuste) ──────────────────────
async function askMistralDirect(env: Env, question: string, sources: any[] = []) {
  if (!env.MISTRAL_API_KEY) throw new Error('MISTRAL_API_KEY non fournie');

  let prompt = question;
  if (sources.length > 0) {
    const formatted = sources.slice(0, 5).map(s => `- ${s.title ?? 'Actualité'}: ${s.content?.slice(0, 400) ?? ''}`).join('\n');
    prompt = `Voici les dépêches et sources d'actualités récentes en France :\n${formatted}\n\nQuestion de l'internaute : ${question}\n\nRéponds fidèlement à la première personne en tant qu'Emmanuel Macron en commentant et restituant ces faits avec pédagogie et clarté.`;
  }

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) throw new Error(`Mistral direct HTTP ${res.status}`);
  const data: any = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  const finalSources = buildSources(sources);
  return {
    answer: text || "Je vous réponds avec franchise : notre cap est clair et nous poursuivons notre action avec détermination.",
    mode: finalSources.length > 0 ? 'sourced' : 'styled',
    sources: finalSources,
  };
}

// ── Fallback Google Gemini REST (si Mistral est en panne ou en rate-limit) ────
async function askGemini(env: Env, question: string, sources: any[] = []) {
  if (!env.GOOGLE_AI_API_KEY) throw new Error('GOOGLE_AI_API_KEY non fournie');

  const models = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-flash-latest',
    'gemini-pro-latest',
  ];

  let contextText = question;
  if (sources.length > 0) {
    const formatted = sources
      .slice(0, 5)
      .map((s, idx) => `[Source ${idx + 1} - ${s.title ?? 'Actualité'}] (${s.source_site ?? 'France'} - ${s.source_date ?? 'récent'}) : ${s.content ?? ''}`)
      .join('\n\n');
    contextText = `Voici les dépêches et faits d'actualités récents en France :\n\n${formatted}\n\nQuestion de l'internaute : ${question}\n\nConsigne : Réponds de manière complète, naturelle et percutante en tant qu'Emmanuel Macron (à la première personne "je", style didactique, "en même temps") en décryptant et commentant les faits d'actualité ci-dessus. Ta réponse doit être structurée en 2 à 3 paragraphes complets sans s'interrompre.`;
  }

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GOOGLE_AI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: contextText }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          },
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.warn(`[worker] Gemini ${model} returned HTTP ${res.status}: ${errBody.slice(0, 200)}`);
        continue;
      }

      const data: any = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim().length > 0) {
        const finalSources = buildSources(sources);
        return {
          answer: text.trim(),
          mode: finalSources.length > 0 ? 'sourced' : 'styled',
          sources: finalSources,
        };
      }
    } catch (e: any) {
      console.warn(`[worker] Gemini ${model} exception: ${e?.message}`);
      continue;
    }
  }

  throw new Error('Aucun modèle Gemini n\'a pu répondre');
}

// ── Stratégie globale 100% disponible & Actualités Récentes en Direct ─────────
async function askPresidentUniversal(env: Env, question: string) {
  // 1. Récupération des flux d'actualités en direct (Le Monde, France Info, Le Figaro, BFMTV, Sénat)
  let liveSources: any[] = [];
  try {
    const liveArticles = await getLiveRssNews();
    if (liveArticles && liveArticles.length > 0) {
      liveSources = searchLiveRss(liveArticles, question);
    }
  } catch (e) {
    console.warn('[worker] Erreur live RSS:', e);
  }

  // 2. Recherche Supabase (base de discours et documents historiques)
  let dbSources: any[] = [];
  try {
    dbSources = (await searchSupabase(env, question, 4)) as any[];
  } catch (err) {
    console.warn('[worker] Recherche Supabase échouée:', err);
  }

  // Si Supabase est vide, on utilise la base locale de secours
  if (!dbSources || dbSources.length === 0) {
    dbSources = searchFallbackSources(question);
  }

  // 3. Fusion et déduplication des sources (Actualités chaudes en premier + fond institutionnel)
  const isAskingRecent = /actualit|recent|récent|aujourd|cette semaine|derni|direct|assemblee|assemblée|parlement|depute|député|senat|sénat|gouvernement/i.test(question);
  
  let initialSources: any[] = [];
  if (isAskingRecent && liveSources.length > 0) {
    initialSources = [...liveSources, ...dbSources].slice(0, 5);
  } else if (liveSources.length > 0 && dbSources.length > 0) {
    initialSources = [liveSources[0], ...dbSources].slice(0, 5);
  } else {
    initialSources = [...liveSources, ...dbSources].slice(0, 5);
  }

  console.log(`[worker] Question: "${question}" -> ${liveSources.length} live RSS, ${dbSources.length} DB sources`);

  // 4. Essai Mistral avec Tool Calling
  try {
    return await askMistral(env, question);
  } catch (err) {
    console.warn('[worker] Mistral avec tools a échoué, essai Mistral direct...', err);
  }

  // 5. Essai Mistral direct (sans tools, injecte les sources d'actualités chaudes)
  try {
    return await askMistralDirect(env, question, initialSources);
  } catch (err) {
    console.warn('[worker] Mistral direct a échoué, passage sur Gemini...', err);
  }

  // 6. Essai Gemini (fallback multimodèle avec flux d'actualité en direct)
  if (env.GOOGLE_AI_API_KEY) {
    try {
      return await askGemini(env, question, initialSources);
    } catch (err) {
      console.warn('[worker] Gemini a échoué:', err);
    }
  }

  // 7. Ultime réponse républicaine (toujours active)
  const finalSources = buildSources(initialSources);
  return {
    answer: "Permettez-moi de vous répondre avec clarté : sur l'actualité de notre pays, nous agissons avec détermination pour conjuguer réformes, écoute de la représentation nationale et protection de tous les Français.",
    mode: finalSources.length > 0 ? 'sourced' : 'styled',
    sources: finalSources,
  };
}

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
        const result = await askPresidentUniversal(env, question);
        if (result && result.sources && result.sources.length > 0) {
          toMem(cacheKey, result);
        }
        return jsonRes(result);
      } catch (err) {
        console.error('[worker] ask critical error:', err);
        const safeResponse = {
          answer: "Permettez-moi de vous répondre avec franchise : sur cette question essentielle, notre détermination et notre cap restent intacts pour agir au service de tous les Français.",
          mode: 'styled',
          sources: [],
        };
        return jsonRes(safeResponse);
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
