/**
 * server/lib/rss.ts — Module Live RSS pour le serveur Express local
 */

export interface RSSArticle {
  id?: string;
  title: string;
  content: string;
  source_url: string;
  source_date: string;
  source_type: string;
  source_site: string;
}

const RSS_FEEDS = [
  { url: 'https://www.francetvinfo.fr/politique.rss', site: 'francetvinfo.fr', type: 'actualite' },
  { url: 'https://www.lemonde.fr/politique/rss_full.xml', site: 'lemonde.fr', type: 'actualite' },
  { url: 'https://www.lefigaro.fr/rss/figaro_politique.xml', site: 'lefigaro.fr', type: 'actualite' },
  { url: 'https://www.bfmtv.com/rss/politique/', site: 'bfmtv.com', type: 'actualite' },
  { url: 'https://lcp.fr/rss.xml', site: 'lcp.fr', type: 'parlement' },
  { url: 'https://www.senat.fr/rss/actualites.rss', site: 'senat.fr', type: 'parlement' },
  { url: 'https://www.france24.com/fr/france/rss', site: 'france24.com', type: 'actualite' },
  { url: 'https://www.europe1.fr/rss/politique.xml', site: 'europe1.fr', type: 'actualite' },
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

export async function getLiveRssNews(): Promise<RSSArticle[]> {
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

export function searchLiveRss(articles: RSSArticle[], query: string): RSSArticle[] {
  const norm = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const words = norm.split(/\s+/).filter(w => w.length >= 3);

  const scored = articles.map(art => {
    const textNorm = `${art.title} ${art.content}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let score = 0;
    for (const w of words) {
      if (textNorm.includes(w)) score += 2;
    }
    if ((norm.includes("assemblee") || norm.includes("parlement") || norm.includes("depute")) &&
        (textNorm.includes("assemblee") || textNorm.includes("parlement") || textNorm.includes("depute") || textNorm.includes("senat") || textNorm.includes("loi"))) {
      score += 5;
    }
    return { art, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const positive = scored.filter(s => s.score > 0).map(s => s.art);
  if (positive.length > 0) return positive.slice(0, 5);

  return articles.slice(0, 4);
}
