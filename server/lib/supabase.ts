import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env', override: true });

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env');
}

export const supabase = createClient(url, serviceKey);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export interface SourceResult {
  id: string;
  content: string;
  title: string | null;
  source_url: string | null;
  source_date: string | null;
  source_type: string | null;
  source_site: string | null;
  rank: number;
}

async function embedQuery(text: string): Promise<number[] | null> {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text }] },
      taskType: 'RETRIEVAL_QUERY' as any,
    });
    return result.embedding.values;
  } catch {
    return null;
  }
}

async function ftSearch(query: string, matchCount: number): Promise<SourceResult[]> {
  const { data, error } = await supabase.rpc('search_president_sources', {
    query,
    match_count: matchCount,
  });
  if (error) return [];
  return (data as SourceResult[]) ?? [];
}

export async function searchSources(query: string, matchCount = 8): Promise<SourceResult[]> {
  // Tente la recherche vectorielle en premier
  const embedding = await embedQuery(query);

  if (embedding) {
    const { data, error } = await supabase.rpc('search_president_by_embedding', {
      query_embedding: embedding,
      match_count: matchCount,
    });

    if (!error && data && (data as SourceResult[]).length > 0) {
      return data as SourceResult[];
    }
  }

  // FTS avec la requête complète
  let results = await ftSearch(query, matchCount);
  if (results.length > 0) return results;

  // FTS avec les 3 premiers mots (cas multi-mots sans résultat)
  const words = query.trim().split(/\s+/).filter(w => w.length > 3);
  if (words.length > 1) {
    // Essai avec les 2 premiers mots significatifs
    results = await ftSearch(words.slice(0, 2).join(' '), matchCount);
    if (results.length > 0) return results;

    // Essai avec chaque mot seul, on prend les plus pertinents
    const seen = new Set<string>();
    const combined: SourceResult[] = [];
    for (const w of words.slice(0, 4)) {
      const r = await ftSearch(w, 3);
      for (const item of r) {
        const key = item.id;
        if (!seen.has(key)) { seen.add(key); combined.push(item); }
      }
    }
    return combined.slice(0, matchCount);
  }

  return [];
}
