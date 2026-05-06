"""
Script d'ingestion — Discute avec ton Président (version simplifiée, sans embeddings)
======================================================================================
1. Lit les fichiers JSON de scraping (*_raw.json)
2. Découpe les textes en chunks
3. Insère directement dans Supabase (full-text search natif PostgreSQL)

Usage :
  python ingest.py                   # ingère tous les *_raw.json présents
  python ingest.py elysee_raw.json   # ingère un fichier spécifique
"""

import os
import sys
import json
import glob
from typing import Iterator
from dotenv import load_dotenv
from supabase import create_client, Client
from tqdm import tqdm

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

CHUNK_SIZE = 800    # caractères max par chunk
CHUNK_OVERLAP = 150
BATCH_SIZE = 50     # inserts par batch Supabase


def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> Iterator[str]:
    """Découpe un texte en chunks avec chevauchement sur les paragraphes."""
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 1 <= size:
            current += ("\n" if current else "") + para
        else:
            if current:
                yield current
                current = current[-overlap:] + "\n" + para if overlap else para
            else:
                for i in range(0, len(para), size - overlap):
                    yield para[i:i + size]
                current = ""
    if current:
        yield current


def ingest_file(filepath: str) -> int:
    with open(filepath, encoding="utf-8") as f:
        documents = json.load(f)

    print(f"\n[Ingest] {filepath} → {len(documents)} documents")

    records = []
    for doc in tqdm(documents, desc="Chunking"):
        content = doc.get("content", "")
        if not content or len(content) < 100:
            continue
        for chunk in chunk_text(content):
            records.append({
                "content": chunk,
                "title": doc.get("title"),
                "source_url": doc.get("source_url"),
                "source_date": doc.get("source_date"),
                "source_type": doc.get("source_type", "autre"),
                "source_site": doc.get("source_site"),
            })

    print(f"  {len(records)} chunks → insertion dans Supabase...")
    inserted = 0
    for i in tqdm(range(0, len(records), BATCH_SIZE), desc="Inserting"):
        batch = records[i:i + BATCH_SIZE]
        res = supabase.table("president_sources").insert(batch).execute()
        inserted += len(res.data)

    print(f"  ✓ {inserted} chunks insérés.")
    return inserted


def main():
    files = sys.argv[1:] if len(sys.argv) > 1 else sorted(glob.glob("*_raw.json"))
    if not files:
        print("Aucun fichier *_raw.json trouvé. Lance d'abord les scrapers :")
        print("  python scrape_elysee.py")
        print("  python scrape_viepublique.py")
        return

    total = 0
    for f in files:
        if os.path.exists(f):
            total += ingest_file(f)
        else:
            print(f"Introuvable : {f}")

    print(f"\n{'─'*40}\nIngestion terminée : {total} chunks dans Supabase.")


if __name__ == "__main__":
    main()
