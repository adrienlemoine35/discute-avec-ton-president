"""
embed_all.py — Génère les embeddings Gemini pour toutes les sources sans embedding
Usage : python embed_all.py

Requiert :
  pip install supabase google-generativeai python-dotenv
"""

import os
import time
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / '.env', override=True)

import google.generativeai as genai
from supabase import create_client

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
GOOGLE_API_KEY = os.environ['GOOGLE_AI_API_KEY']

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GOOGLE_API_KEY)

EMBED_MODEL = 'models/text-embedding-004'
BATCH_SIZE = 10  # max 10 req/min free tier


def embed_text(text: str) -> list[float] | None:
    try:
        result = genai.embed_content(
            model=EMBED_MODEL,
            content=text,
            task_type='retrieval_document',
        )
        return result['embedding']
    except Exception as e:
        print(f'  ⚠️  Erreur embedding: {e}')
        return None


def main():
    print('\n🔍 Récupération des sources sans embedding...')
    response = supabase.table('president_sources').select('id, title, content').is_('embedding', 'null').execute()
    sources = response.data

    if not sources:
        print('✅ Toutes les sources ont déjà un embedding !')
        return

    print(f'📦 {len(sources)} sources à traiter\n')
    ok, fail = 0, 0

    for i, src in enumerate(sources):
        text = f"{src.get('title', '')} {src.get('content', '')}".strip()
        embedding = embed_text(text[:2000])  # limite ~2000 tokens

        if embedding:
            supabase.table('president_sources').update({'embedding': embedding}).eq('id', src['id']).execute()
            ok += 1
            print(f'  [{i+1}/{len(sources)}] ✅ {src.get("title", src["id"])[:60]}')
        else:
            fail += 1
            print(f'  [{i+1}/{len(sources)}] ❌ SKIP {src["id"]}')

        # Rate limit free tier : ~1 req/s
        if (i + 1) % BATCH_SIZE == 0:
            print(f'\n  ⏳ Pause 15s (rate limit)...\n')
            time.sleep(15)
        else:
            time.sleep(1.2)

    print(f'\n✅ Terminé : {ok} embeddings créés, {fail} échecs')


if __name__ == '__main__':
    main()
