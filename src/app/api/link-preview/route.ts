import { NextRequest, NextResponse } from "next/server";
import type { LinkPreview } from "@/lib/types";

const TIMEOUT_MS = 5000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

function fail(url: string): LinkPreview {
  return { url, title: null, description: null, image: null, siteName: null, ok: false };
}

async function fetchWithTimeout(url: string, headers?: Record<string, string>) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { headers, signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

// TikTok and YouTube offer keyless oEmbed, which beats scraping for exactly
// the links the family will paste.
async function tryOEmbed(url: string): Promise<LinkPreview | null> {
  const host = new URL(url).hostname.replace(/^www\./, "");
  let endpoint: string | null = null;
  if (/(^|\.)tiktok\.com$/.test(host)) {
    endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  } else if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) {
    endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  }
  if (!endpoint) return null;

  try {
    const res = await fetchWithTimeout(endpoint);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      title?: string; author_name?: string; thumbnail_url?: string; provider_name?: string;
    };
    return {
      url,
      title: data.title ?? null,
      description: data.author_name ? `by ${data.author_name}` : null,
      image: data.thumbnail_url ?? null,
      siteName: data.provider_name ?? host,
      ok: true,
    };
  } catch {
    return null;
  }
}

function metaContent(html: string, key: string): string | null {
  // Matches <meta property="og:x" content="..."> in either attribute order.
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'");
}

async function scrapeOg(url: string): Promise<LinkPreview> {
  try {
    const res = await fetchWithTimeout(url, {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-GB,en;q=0.9",
    });
    if (!res.ok) return fail(url);
    const html = (await res.text()).slice(0, 500_000);

    const title =
      metaContent(html, "og:title") ??
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ??
      null;
    const image = metaContent(html, "og:image");
    if (!title && !image) return fail(url);

    let absoluteImage = image;
    if (image && !/^https?:\/\//i.test(image)) {
      try { absoluteImage = new URL(image, res.url || url).href; } catch { absoluteImage = null; }
    }

    return {
      url,
      title,
      description: metaContent(html, "og:description") ?? metaContent(html, "description"),
      image: absoluteImage,
      siteName: metaContent(html, "og:site_name") ?? new URL(url).hostname.replace(/^www\./, ""),
      ok: true,
    };
  } catch {
    return fail(url);
  }
}

export async function POST(req: NextRequest) {
  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  // Instagram blocks scrapers outright; return the fallback card immediately
  // instead of burning 5 seconds on a doomed fetch.
  const host = parsed.hostname.replace(/^www\./, "");
  if (/(^|\.)instagram\.com$/.test(host)) {
    return NextResponse.json(fail(url));
  }

  const preview = (await tryOEmbed(url)) ?? (await scrapeOg(url));
  return NextResponse.json(preview);
}
