#!/usr/bin/env python3
"""
scrape_assemblee.py
Récupère les actualités et dossiers législatifs depuis assemblee-nationale.fr
et les flux RSS politiques officiels.

Usage : python scrape_assemblee.py
"""

import os
import time
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Optional

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, text/html, */*",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "assemblee_raw.json")

# ─────────────────────────────────────────────
# Flux RSS & Sources Parlementaires / Politiques / Gouvernement
# ─────────────────────────────────────────────
RSS_FEEDS = [
    {
        "url": "https://www.francetvinfo.fr/politique.rss",
        "site": "francetvinfo.fr",
        "type": "actualite",
    },
    {
        "url": "https://www.lemonde.fr/politique/rss_full.xml",
        "site": "lemonde.fr",
        "type": "actualite",
    },
    {
        "url": "https://www.lefigaro.fr/rss/figaro_politique.xml",
        "site": "lefigaro.fr",
        "type": "actualite",
    },
    {
        "url": "https://www.bfmtv.com/rss/politique/",
        "site": "bfmtv.com",
        "type": "actualite",
    },
    {
        "url": "https://lcp.fr/rss.xml",
        "site": "lcp.fr",
        "type": "parlement",
    },
    {
        "url": "https://www.senat.fr/rss/actualites.rss",
        "site": "senat.fr",
        "type": "parlement",
    },
    {
        "url": "https://www.france24.com/fr/france/rss",
        "site": "france24.com",
        "type": "actualite",
    },
    {
        "url": "https://www.europe1.fr/rss/politique.xml",
        "site": "europe1.fr",
        "type": "actualite",
    },
]


def parse_date(date_str: str) -> Optional[str]:
    """Convertit divers formats de date RSS en YYYY-MM-DD."""
    if not date_str:
        return None
    date_str = date_str.strip()
    # Format RFC 822 (ex: Tue, 10 Sep 2024 14:30:00 +0200)
    for fmt in [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d",
    ]:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime("%Y-%m-%d")
        except Exception:
            continue
    return None


def fetch_article_content(url: str) -> Optional[str]:
    """Récupère le corps textuel complet d'une page d'actualité."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
    except Exception as e:
        print(f"    [Erreur fetch] {url}: {e}")
        return None

    soup = BeautifulSoup(r.text, "lxml")

    for tag in soup.find_all(["script", "style", "nav", "aside", "header", "footer"]):
        tag.decompose()

    # Détection des conteneurs d'articles standards
    body = (
        soup.find("article")
        or soup.find("main")
        or soup.find("div", class_="article-content")
        or soup.find("div", class_="content-text")
        or soup.find("div", class_="field--name-body")
    )
    if body:
        text = body.get_text(separator="\n", strip=True)
        if len(text) >= 150:
            return text
    return None


def scrape_rss_feed(feed_info: dict) -> list[dict]:
    url = feed_info["url"]
    site = feed_info["site"]
    default_type = feed_info["type"]
    documents = []

    print(f"\n📡 Parsing du flux RSS : {url} ({site})")
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
    except Exception as e:
        print(f"  [Erreur Flux] Impossible de contacter {url}: {e}")
        return documents

    soup = BeautifulSoup(r.content, "xml")
    items = soup.find_all("item") or soup.find_all("entry")
    print(f"  -> {len(items)} entrées trouvées.")

    for item in items:
        title_tag = item.find("title")
        link_tag = item.find("link")
        desc_tag = item.find("description") or item.find("summary") or item.find("content")
        date_tag = item.find("pubDate") or item.find("published") or item.find("updated") or item.find("dc:date")

        title = title_tag.get_text(strip=True) if title_tag else "Actualité politique"
        
        # Link extraction
        link = ""
        if link_tag:
            link = link_tag.get_text(strip=True) or link_tag.get("href", "")
        
        # Date extraction
        source_date = parse_date(date_tag.get_text(strip=True) if date_tag else "")
        if not source_date:
            source_date = datetime.now().strftime("%Y-%m-%d")

        # Description textuelle
        desc_text = ""
        if desc_tag:
            raw_desc = desc_tag.get_text(strip=True)
            desc_soup = BeautifulSoup(raw_desc, "html.parser")
            desc_text = desc_soup.get_text(separator=" ", strip=True)

        content = desc_text

        # Si le lien est disponible, on tente d'extraire l'article complet
        if link and link.startswith("http"):
            full_text = fetch_article_content(link)
            if full_text and len(full_text) > len(content):
                content = full_text
            time.sleep(0.5)

        if content and len(content) >= 100:
            documents.append({
                "title": title,
                "content": content,
                "source_url": link or url,
                "source_date": source_date,
                "source_type": default_type,
                "source_site": site,
            })

    return documents


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    all_docs = []

    for feed in RSS_FEEDS:
        docs = scrape_rss_feed(feed)
        all_docs.extend(docs)

    print(f"\n{'─'*50}")
    print(f"Total documents récupérés : {len(all_docs)}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_docs, f, ensure_ascii=False, indent=2)

    print(f"Données enregistrées dans : {OUTPUT_FILE}")
    print(f"Pour insérer dans Supabase :")
    print(f"  python ingest.py {OUTPUT_FILE}")
    print(f"  python embed_all.py")


if __name__ == "__main__":
    main()
