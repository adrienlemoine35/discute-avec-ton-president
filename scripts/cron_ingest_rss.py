#!/usr/bin/env python3
"""
cron_ingest_rss.py — Script d'ingestion automatique des flux RSS dans Supabase
================================================================================
1. Récupère les dépêches et articles récents depuis les flux RSS (Presse, Gouvernement, Parlement).
2. Vérifie dans Supabase si la source_url existe déjà (déduplication).
3. Découpe en chunks et insère les nouveaux articles.

Usage :
  python cron_ingest_rss.py
  (Peut être exécuté toutes les heures via cron ou GitHub Actions)
"""

import os
import time
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
}

RSS_FEEDS = [
    {"url": "https://www.francetvinfo.fr/politique.rss", "site": "francetvinfo.fr", "type": "actualite"},
    {"url": "https://www.lemonde.fr/politique/rss_full.xml", "site": "lemonde.fr", "type": "actualite"},
    {"url": "https://www.lefigaro.fr/rss/figaro_politique.xml", "site": "lefigaro.fr", "type": "actualite"},
    {"url": "https://www.bfmtv.com/rss/politique/", "site": "bfmtv.com", "type": "actualite"},
    {"url": "https://lcp.fr/rss.xml", "site": "lcp.fr", "type": "parlement"},
    {"url": "https://www.senat.fr/rss/actualites.rss", "site": "senat.fr", "type": "parlement"},
    {"url": "https://www.france24.com/fr/france/rss", "site": "france24.com", "type": "actualite"},
    {"url": "https://www.europe1.fr/rss/politique.xml", "site": "europe1.fr", "type": "actualite"},
]


def parse_date(date_str: str) -> str:
    if not date_str:
        return datetime.now().strftime("%Y-%m-%d")
    for fmt in [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d",
    ]:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime("%Y-%m-%d")
        except Exception:
            continue
    return datetime.now().strftime("%Y-%m-%d")


def fetch_rss_articles():
    articles = []
    for feed in RSS_FEEDS:
        print(f"📡 Parsing {feed['site']} ({feed['url']})...")
        try:
            r = requests.get(feed["url"], headers=HEADERS, timeout=12)
            if r.status_code != 200:
                continue
            soup = BeautifulSoup(r.content, "xml")
            items = soup.find_all("item") or soup.find_all("entry")
            for item in items[:15]:
                title_el = item.find("title")
                link_el = item.find("link")
                desc_el = item.find("description") or item.find("summary") or item.find("content")
                date_el = item.find("pubDate") or item.find("published") or item.find("updated")

                title = title_el.get_text(strip=True) if title_el else ""
                link = ""
                if link_el:
                    link = link_el.get_text(strip=True) or link_el.get("href", "")
                
                desc = ""
                if desc_el:
                    desc_soup = BeautifulSoup(desc_el.get_text(strip=True), "html.parser")
                    desc = desc_soup.get_text(separator=" ", strip=True)

                source_date = parse_date(date_el.get_text(strip=True) if date_el else "")

                if title and len(title) > 8 and link:
                    articles.append({
                        "title": title,
                        "content": f"{title} — {desc}" if desc else title,
                        "source_url": link,
                        "source_date": source_date,
                        "source_type": feed["type"],
                        "source_site": feed["site"],
                    })
        except Exception as e:
            print(f"  ⚠️ Erreur {feed['site']}: {e}")
    return articles


def main():
    print("🔄 Démarrage du job d'ingestion RSS automatique Supabase...")
    articles = fetch_rss_articles()
    print(f"📦 {len(articles)} articles extraits des flux RSS.")

    inserted_count = 0
    for art in articles:
        # Déduplication par source_url
        existing = supabase.table("president_sources").select("id").eq("source_url", art["source_url"]).execute()
        if existing.data and len(existing.data) > 0:
            continue

        res = supabase.table("president_sources").insert({
            "title": art["title"],
            "content": art["content"],
            "source_url": art["source_url"],
            "source_date": art["source_date"],
            "source_type": art["source_type"],
            "source_site": art["source_site"],
        }).execute()

        if res.data:
            inserted_count += 1

    print(f"✅ Terminé ! {inserted_count} nouvelles actualités insérées dans Supabase.")


if __name__ == "__main__":
    main()
