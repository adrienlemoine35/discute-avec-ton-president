#!/usr/bin/env python3
"""
scrape_elysee.py
Scrape discours, déclarations et interviews d'Emmanuel Macron depuis elysee.fr
Usage : python scrape_elysee.py [--max-pages N]
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re
import os
import sys
import argparse
from datetime import datetime

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "https://www.elysee.fr"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Catégories d'URL pertinentes sur elysee.fr
RELEVANT_PATH_PATTERNS = [
    r"/discours-du-president-de-la-republique",
    r"/declarations",
    r"/conferences-de-presse",
    r"/interviews",
    r"/communiques-de-presse",
    r"/allocutions",
    r"/lettres",
    r"/tribunes",
    r"/emmanuel-macron/",
]

# Sitemaps principaux à explorer
SITEMAP_URLS = [
    "https://www.elysee.fr/sitemap.xml",
    "https://www.elysee.fr/sitemap_index.xml",
]

# URL de listing des discours (pagination)
LISTING_URLS = [
    "https://www.elysee.fr/emmanuel-macron/discours",
    "https://www.elysee.fr/emmanuel-macron/discours-et-interventions",
    "https://www.elysee.fr/recherche?query=discours&author=Emmanuel+Macron",
    "https://www.elysee.fr/recherche?query=intervention&author=Emmanuel+Macron",
]

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "elysee_raw.json")

REQUEST_DELAY = 1.0  # secondes entre chaque requête


# ---------------------------------------------------------------------------
# Helpers HTTP
# ---------------------------------------------------------------------------

def get_page(url: str, session: requests.Session, timeout: int = 20) -> requests.Response | None:
    """Fetcher une page avec gestion d'erreurs."""
    try:
        resp = session.get(url, headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        return resp
    except requests.exceptions.HTTPError as e:
        print(f"  [HTTP {e.response.status_code}] {url}")
        return None
    except requests.exceptions.ConnectionError:
        print(f"  [CONNEXION ERREUR] {url}")
        return None
    except requests.exceptions.Timeout:
        print(f"  [TIMEOUT] {url}")
        return None
    except Exception as e:
        print(f"  [ERREUR] {url} — {e}")
        return None


# ---------------------------------------------------------------------------
# Découverte des URLs via sitemap
# ---------------------------------------------------------------------------

def parse_sitemap(content: str) -> list[str]:
    """Extraire toutes les <loc> d'un sitemap XML (index ou standard)."""
    soup = BeautifulSoup(content, "xml")
    return [loc.get_text(strip=True) for loc in soup.find_all("loc")]


def is_relevant_url(url: str) -> bool:
    """Vérifier si une URL correspond à du contenu discours/déclarations."""
    for pattern in RELEVANT_PATH_PATTERNS:
        if re.search(pattern, url, re.IGNORECASE):
            return True
    return False


def collect_urls_from_sitemaps(session: requests.Session, max_urls: int) -> list[str]:
    """Explorer les sitemaps récursivement pour collecter les URLs pertinentes."""
    collected: set[str] = set()
    to_explore: list[str] = list(SITEMAP_URLS)
    explored: set[str] = set()

    print("[SITEMAP] Exploration des sitemaps...")

    while to_explore and len(collected) < max_urls:
        sitemap_url = to_explore.pop(0)
        if sitemap_url in explored:
            continue
        explored.add(sitemap_url)

        print(f"  → {sitemap_url}")
        resp = get_page(sitemap_url, session)
        time.sleep(REQUEST_DELAY)

        if resp is None:
            continue

        locs = parse_sitemap(resp.text)

        for loc in locs:
            if loc.endswith(".xml"):
                # C'est un sous-sitemap
                if loc not in explored:
                    to_explore.append(loc)
            elif loc.startswith("https://www.elysee.fr"):
                if is_relevant_url(loc):
                    collected.add(loc)

    print(f"[SITEMAP] {len(collected)} URLs pertinentes trouvées.")
    return list(collected)


# ---------------------------------------------------------------------------
# Découverte via pages de listing paginées
# ---------------------------------------------------------------------------

def collect_urls_from_listings(session: requests.Session, max_urls: int) -> list[str]:
    """
    Parcourir les pages de listing d'elysee.fr avec pagination
    pour découvrir des URLs d'articles.
    """
    collected: set[str] = set()

    for base_listing in LISTING_URLS:
        if len(collected) >= max_urls:
            break

        page_num = 0
        consecutive_empty = 0

        while len(collected) < max_urls and consecutive_empty < 3:
            # Paramètres de pagination courants sur elysee.fr
            if "?" in base_listing:
                url = f"{base_listing}&page={page_num}"
            else:
                url = f"{base_listing}?page={page_num}" if page_num > 0 else base_listing

            print(f"  [LISTING] {url}")
            resp = get_page(url, session)
            time.sleep(REQUEST_DELAY)

            if resp is None:
                break

            soup = BeautifulSoup(resp.text, "html.parser")
            new_found = 0

            # Chercher les liens vers des articles
            for a_tag in soup.find_all("a", href=True):
                href = a_tag["href"]
                # Construire l'URL absolue
                if href.startswith("/"):
                    href = BASE_URL + href
                if not href.startswith("https://www.elysee.fr"):
                    continue
                if is_relevant_url(href) and href not in collected:
                    collected.add(href)
                    new_found += 1

            if new_found == 0:
                consecutive_empty += 1
            else:
                consecutive_empty = 0

            page_num += 1

    print(f"[LISTING] {len(collected)} URLs collectées via listings.")
    return list(collected)


# ---------------------------------------------------------------------------
# Extraction du contenu d'une page article
# ---------------------------------------------------------------------------

def extract_date(soup: BeautifulSoup, url: str) -> str:
    """Tenter d'extraire la date depuis la page."""
    # 1) Balise <time>
    time_tag = soup.find("time")
    if time_tag:
        dt_attr = time_tag.get("datetime", "")
        if dt_attr:
            # Normaliser au format YYYY-MM-DD
            match = re.search(r"\d{4}-\d{2}-\d{2}", dt_attr)
            if match:
                return match.group(0)
        # Texte brut de la balise
        raw = time_tag.get_text(strip=True)
        parsed = parse_french_date(raw)
        if parsed:
            return parsed

    # 2) Méta-données OpenGraph / schema.org
    for meta_name in ["article:published_time", "datePublished", "date"]:
        meta = soup.find("meta", property=meta_name) or soup.find("meta", attrs={"name": meta_name})
        if meta and meta.get("content"):
            match = re.search(r"\d{4}-\d{2}-\d{2}", meta["content"])
            if match:
                return match.group(0)

    # 3) Depuis l'URL (pattern /YYYY/MM/DD/ ou /YYYY-MM-DD)
    match = re.search(r"(\d{4})[/-](\d{2})[/-](\d{2})", url)
    if match:
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"

    # 4) Texte brut dans la page
    for selector in [".date", ".article-date", ".publication-date", '[class*="date"]']:
        tag = soup.select_one(selector)
        if tag:
            parsed = parse_french_date(tag.get_text(strip=True))
            if parsed:
                return parsed

    return ""


def parse_french_date(text: str) -> str:
    """Convertir une date en français (ex: '15 mai 2023') en YYYY-MM-DD."""
    MONTHS_FR = {
        "janvier": "01", "février": "02", "mars": "03",
        "avril": "04", "mai": "05", "juin": "06",
        "juillet": "07", "août": "08", "septembre": "09",
        "octobre": "10", "novembre": "11", "décembre": "12",
    }
    text = text.lower().strip()
    match = re.search(
        r"(\d{1,2})\s+(" + "|".join(MONTHS_FR.keys()) + r")\s+(\d{4})",
        text
    )
    if match:
        day = match.group(1).zfill(2)
        month = MONTHS_FR[match.group(2)]
        year = match.group(3)
        return f"{year}-{month}-{day}"
    return ""


def detect_source_type(url: str, title: str) -> str:
    """Détecter le type de contenu."""
    combined = (url + " " + title).lower()
    if "discours" in combined:
        return "discours"
    if "déclaration" in combined or "declaration" in combined:
        return "declaration"
    if "conférence-de-presse" in combined or "conference-de-presse" in combined:
        return "conference_de_presse"
    if "interview" in combined or "entretien" in combined:
        return "interview"
    if "allocution" in combined:
        return "allocution"
    if "lettre" in combined:
        return "lettre"
    if "tribune" in combined:
        return "tribune"
    if "communiqué" in combined or "communique" in combined:
        return "communique"
    return "discours"


def extract_article(soup: BeautifulSoup, url: str) -> dict | None:
    """
    Extraire titre, date et contenu textuel d'une page elysee.fr.
    Retourne None si la page ne semble pas être un article de discours.
    """
    # --- Titre ---
    title = ""

    # Priorité 1 : balise <h1>
    h1 = soup.find("h1")
    if h1:
        title = h1.get_text(strip=True)

    # Priorité 2 : meta og:title
    if not title:
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            title = og_title["content"].strip()

    # Priorité 3 : <title>
    if not title:
        title_tag = soup.find("title")
        if title_tag:
            title = title_tag.get_text(strip=True)

    if not title:
        return None

    # --- Date ---
    date = extract_date(soup, url)

    # --- Contenu ---
    content = ""

    # Sélecteurs spécifiques à elysee.fr (ordre de priorité)
    content_selectors = [
        "article .content",
        "article .body",
        ".article-body",
        ".article-content",
        ".speech-content",
        ".discours-content",
        '[class*="article"] [class*="content"]',
        '[class*="article"] [class*="body"]',
        ".entry-content",
        "article",
        "main .content",
        "main",
        ".content-area",
    ]

    content_tag = None
    for selector in content_selectors:
        content_tag = soup.select_one(selector)
        if content_tag:
            break

    if content_tag:
        # Supprimer navigation, scripts, styles, header, footer intra-article
        for unwanted in content_tag.select(
            "script, style, nav, header, footer, .breadcrumb, "
            ".share-buttons, .related, .tags, [class*='nav'], "
            "[class*='menu'], [class*='share'], [class*='social'], "
            "[class*='related'], [class*='sidebar']"
        ):
            unwanted.decompose()

        paragraphs = []
        for tag in content_tag.find_all(["p", "h2", "h3", "h4", "blockquote", "li"]):
            text = tag.get_text(separator=" ", strip=True)
            if len(text) > 30:  # Ignorer les fragments trop courts
                paragraphs.append(text)

        content = "\n\n".join(paragraphs)

    # Fallback : tout le texte du <body>
    if not content or len(content) < 200:
        body = soup.find("body")
        if body:
            for unwanted in body.select(
                "script, style, nav, header, footer, "
                ".breadcrumb, .menu, [class*='nav'], [class*='menu']"
            ):
                unwanted.decompose()
            raw_text = body.get_text(separator="\n", strip=True)
            # Nettoyer les lignes vides multiples
            lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
            content = "\n".join(lines)

    # Vérification minimale de qualité
    if len(content) < 100:
        return None

    source_type = detect_source_type(url, title)

    return {
        "title": title,
        "content": content,
        "url": url,
        "date": date,
        "source_type": source_type,
        "source_site": "elysee.fr",
    }


# ---------------------------------------------------------------------------
# Scraping principal
# ---------------------------------------------------------------------------

def scrape(max_pages: int = 200) -> list[dict]:
    """Orchestrer le scraping complet."""
    session = requests.Session()
    session.headers.update(HEADERS)

    results: list[dict] = []
    seen_urls: set[str] = set()

    # --- Collecte des URLs ---
    print("=" * 60)
    print("PHASE 1 : Collecte des URLs")
    print("=" * 60)

    urls_sitemap = collect_urls_from_sitemaps(session, max_pages * 3)
    time.sleep(REQUEST_DELAY)

    urls_listings = collect_urls_from_listings(session, max_pages * 3)
    time.sleep(REQUEST_DELAY)

    all_urls = list(dict.fromkeys(urls_sitemap + urls_listings))  # dédupliquer, garder l'ordre

    print(f"\n[TOTAL] {len(all_urls)} URLs uniques à scraper (limite : {max_pages})")
    print("=" * 60)
    print("PHASE 2 : Extraction du contenu")
    print("=" * 60)

    for i, url in enumerate(all_urls[:max_pages], 1):
        if url in seen_urls:
            continue
        seen_urls.add(url)

        print(f"[{i}/{min(len(all_urls), max_pages)}] {url}")

        resp = get_page(url, session)
        time.sleep(REQUEST_DELAY)

        if resp is None:
            continue

        # Vérifier que c'est du HTML
        content_type = resp.headers.get("Content-Type", "")
        if "html" not in content_type:
            print(f"  → Ignoré (Content-Type: {content_type})")
            continue

        try:
            soup = BeautifulSoup(resp.text, "html.parser")
            article = extract_article(soup, url)
        except Exception as e:
            print(f"  → Erreur parsing : {e}")
            continue

        if article is None:
            print("  → Pas de contenu exploitable")
            continue

        results.append(article)
        print(f"  ✓ \"{article['title'][:70]}\" ({article['date']})")

    return results


# ---------------------------------------------------------------------------
# Entrée principale
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Scrape les discours de Macron sur elysee.fr"
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=200,
        help="Nombre maximum de pages à scraper (défaut : 200)",
    )
    args = parser.parse_args()

    print(f"\nelysee.fr Scraper — max_pages={args.max_pages}")
    print(f"Sortie : {OUTPUT_FILE}\n")

    # Créer le dossier data/ si nécessaire
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    start_time = datetime.now()
    data = scrape(max_pages=args.max_pages)
    elapsed = (datetime.now() - start_time).total_seconds()

    # Tri par date décroissante
    data.sort(key=lambda x: x.get("date", ""), reverse=True)

    # Sauvegarde JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print(f"TERMINÉ en {elapsed:.1f}s")
    print(f"{len(data)} articles sauvegardés dans {OUTPUT_FILE}")

    # Statistiques par type
    type_counts: dict[str, int] = {}
    for item in data:
        t = item.get("source_type", "inconnu")
        type_counts[t] = type_counts.get(t, 0) + 1
    if type_counts:
        print("\nRépartition par type :")
        for k, v in sorted(type_counts.items(), key=lambda x: -x[1]):
            print(f"  {k:<25} {v}")
    print("=" * 60)


if __name__ == "__main__":
    main()
