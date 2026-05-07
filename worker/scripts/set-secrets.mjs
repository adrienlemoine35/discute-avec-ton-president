/**
 * Pousse automatiquement les secrets du .env vers le Worker Cloudflare
 * Usage: node scripts/set-secrets.mjs
 * (depuis le dossier worker/)
 */
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ENV_FILE = resolve('../.env');
if (!existsSync(ENV_FILE)) {
  console.error('❌ Fichier .env introuvable à', ENV_FILE);
  process.exit(1);
}

const SECRETS_TO_PUSH = [
  'MISTRAL_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_AI_API_KEY',
  'ELEVENLABS_API_KEY',
  'ELEVENLABS_VOICE_ID',
];

const env = Object.fromEntries(
  readFileSync(ENV_FILE, 'utf-8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=').map(p => p.trim()))
    .filter(([k, v]) => k && v)
);

console.log('🔐 Envoi des secrets vers Cloudflare Workers...\n');
let pushed = 0;

for (const key of SECRETS_TO_PUSH) {
  const value = env[key];
  if (!value) {
    console.log(`⏭  ${key} — vide, ignoré`);
    continue;
  }
  try {
    execSync(`echo "${value}" | npx wrangler secret put ${key}`, { stdio: 'inherit' });
    console.log(`✅ ${key} envoyé`);
    pushed++;
  } catch {
    console.error(`❌ Erreur pour ${key}`);
  }
}

console.log(`\n✅ ${pushed} secrets configurés.`);
