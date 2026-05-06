"""
Scraper — vie-publique.fr + assemblee-nationale.fr
Récupère discours, interviews et déclarations publiques de Macron.
"""

import requests
import time
import json
from bs4 import BeautifulSoup
from typing import Optional

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; PortfolioRAG/1.0; educational use)",
    "Accept-Language": "fr-FR,fr;q=0.9",
}


# ─────────────────────────────────────────────
#  vie-publique.fr
# ─────────────────────────────────────────────

VP_SEARCH = (
    "https://www.vie-publique.fr/discours"
    "?field_intervenant_tid=All"
    "&field_type_doc_tid=All"
    "&title=macron"
    "&page={page}"
)
VP_BASE = "https://www.vie-publique.fr"


def fetch_viepublique_article(url: str) -> Optional[dict]:
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
    except Exception as e:
        print(f"  ERREUR {url}: {e}")
        return None

    soup = BeautifulSoup(r.text, "lxml")

    title_el = soup.find("h1")
    title = title_el.get_text(strip=True) if title_el else None

    date_el = soup.find("time")
    source_date = (date_el.get("datetime") or "")[:10] if date_el else None

    body_el = (
        soup.find("div", class_="field--name-body")
        or soup.find("div", class_="content-text")
        or soup.find("article")
    )
    if not body_el:
        return None

    for tag in body_el.find_all(["script", "style", "nav", "aside"]):
        tag.decompose()

    text = body_el.get_text(separator="\n", strip=True)
    if not text or len(text) < 200:
        return None

    return {
        "title": title,
        "content": text,
        "source_url": url,
        "source_date": source_date,
        "source_type": "discours",
        "source_site": "vie-publique.fr",
    }


def scrape_viepublique(max_pages: int = 20, delay: float = 1.5) -> list[dict]:
    articles = []
    seen = set()

    print(f"[Vie-Publique] Scraping {max_pages} pages...")

    for page in range(0, max_pages):
        url = VP_SEARCH.format(page=page)
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            r.raise_for_status()
        except Exception as e:
            print(f"  Page {page} ERREUR: {e}")
            continue

        soup = BeautifulSoup(r.text, "lxml")
        links = []

        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/discours/" in href and href not in seen:
                full = VP_BASE + href if href.startswith("/") else href
                links.append(full)
                seen.add(href)

        if not links:
            print(f"  Page {page} — aucun lien. Arrêt.")
            break

        print(f"  Page {page}: {len(links)} liens", end=" ", flush=True)

        for link in links:
            art = fetch_viepublique_article(link)
            if art:
                articles.append(art)
                print(".", end="", flush=True)
            time.sleep(delay)

        print()

    print(f"\n[Vie-Publique] {len(articles)} articles récupérés.")
    return articles


# ─────────────────────────────────────────────
#  Sources supplémentaires (médias / LCP)
# ─────────────────────────────────────────────

EXTRA_SOURCES = [
    # Discours de la Sorbonne 2024
    {
        "title": "Discours de la Sorbonne — Europe, notre mortalité — 25 avril 2024",
        "source_url": "https://www.elysee.fr/emmanuel-macron/2024/04/25/discours-d-emmanuel-macron-sur-l-europe",
        "source_date": "2024-04-25",
        "source_type": "discours",
        "source_site": "elysee.fr",
        "content": (
            "L'Europe est mortelle. Elle peut mourir. Ce n'est pas une certitude, c'est un choix. "
            "Notre choix. [...] Nous devons construire une Europe puissance, capable d'agir seule sur "
            "la scène mondiale si nécessaire. Cela suppose une véritable autonomie stratégique en matière "
            "de défense, de technologie, d'énergie et de politique industrielle."
        ),
    },
    # Discours de la Sorbonne 2017
    {
        "title": "Discours de la Sorbonne — Initiative pour l'Europe — 26 septembre 2017",
        "source_url": "https://www.elysee.fr/emmanuel-macron/2017/09/26/initiative-pour-l-europe-discours-d-emmanuel-macron",
        "source_date": "2017-09-26",
        "source_type": "discours",
        "source_site": "elysee.fr",
        "content": (
            "Je veux une Europe souveraine, unie et démocratique. Nous avons besoin d'une refondation "
            "de l'Europe. Ce projet, je vais vous le présenter dans sa totalité [...] "
            "Je propose de créer un Parquet européen, un Bureau européen de l'asile, "
            "une Agence de l'innovation de rupture, une Académie du renseignement européen."
        ),
    },
]


if __name__ == "__main__":
    vp_results = scrape_viepublique(max_pages=30)

    # Ajouter les sources manuelles
    all_results = vp_results + EXTRA_SOURCES

    with open("viepublique_raw.json", "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    print(f"Sauvegardé dans viepublique_raw.json ({len(all_results)} entrées)")
