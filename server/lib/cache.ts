/**
 * Cache persistant JSON sur disque + mémoire
 * - Survit aux redémarrages du serveur
 * - TTL 24h : même question = réponse instantanée, 0 appel API
 * - Max 500 entrées (LRU)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { AskResult } from './claude.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = join(__dir, '../../data/response-cache.json');
const TTL_MS = 24 * 60 * 60 * 1000; // 24 heures
const MAX_ENTRIES = 500;

interface CacheEntry { result: AskResult; expiresAt: number; }
type CacheStore = Record<string, CacheEntry>;

// Charge depuis le disque au démarrage
function loadFromDisk(): CacheStore {
  try {
    if (existsSync(CACHE_FILE)) {
      const raw = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as CacheStore;
      const now = Date.now();
      // Purge les entrées expirées dès le chargement
      return Object.fromEntries(Object.entries(raw).filter(([, v]) => v.expiresAt > now));
    }
  } catch { /* fichier corrompu → repartir vide */ }
  return {};
}

function saveToDisk(store: CacheStore) {
  try {
    mkdirSync(dirname(CACHE_FILE), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2));
  } catch (e) {
    console.warn('[cache] Impossible d\'écrire sur disque:', e);
  }
}

let store: CacheStore = loadFromDisk();
console.log(`[cache] ${Object.keys(store).length} entrées chargées depuis le disque`);

export function cacheKey(question: string): string {
  return question.toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 200);
}

export function getCache(question: string): AskResult | null {
  const key = cacheKey(question);
  const entry = store[key];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { delete store[key]; return null; }
  return entry.result;
}

export function setCache(question: string, result: AskResult): void {
  const key = cacheKey(question);
  // Éviction LRU si plein
  const keys = Object.keys(store);
  if (keys.length >= MAX_ENTRIES) delete store[keys[0]];

  store[key] = { result, expiresAt: Date.now() + TTL_MS };
  saveToDisk(store);
}

export function getCacheStats() {
  const now = Date.now();
  const valid = Object.values(store).filter(e => e.expiresAt > now).length;
  return { total: Object.keys(store).length, valid };
}
