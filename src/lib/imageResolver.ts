"use client";

import { useState, useEffect } from "react";

const cache = new Map<string, { url: string | null; source: string }>();
const pending = new Map<string, Promise<{ url: string | null; source: string }>>();

/**
 * Fallback chain:
 * 1. Wikipedia pageimages (genus)
 * 2. Wikimedia Commons file search (genus)
 * 3. iNaturalist (best for extant birds)
 * 4. PhyloPic silhouette (genus-level SVG)
 * 5. Group silhouette fallback (handled by ExcavationReport)
 */
async function resolveImage(
  genus: string,
  group?: string
): Promise<{ url: string | null; source: string }> {
  const key = genus;
  if (cache.has(key)) return cache.get(key)!;
  if (pending.has(key)) return pending.get(key)!;

  const promise = (async () => {
    const result = { url: null as string | null, source: "none" };

    try {
      // 1. Wikipedia pageimages
      const wpUrl = await tryWikipedia(genus);
      if (wpUrl) {
        result.url = wpUrl;
        result.source = "wikipedia";
        cache.set(key, result);
        return result;
      }

      // 2. Wikimedia Commons file search
      const cmUrl = await tryCommonsSearch(genus);
      if (cmUrl) {
        result.url = cmUrl;
        result.source = "commons";
        cache.set(key, result);
        return result;
      }

      // 3. iNaturalist (prioritize for birds, but try for all)
      const inatUrl = await tryINaturalist(genus);
      if (inatUrl) {
        result.url = inatUrl;
        result.source = "inaturalist";
        cache.set(key, result);
        return result;
      }

      // 4. PhyloPic silhouette
      const phyloUrl = await tryPhyloPic(genus);
      if (phyloUrl) {
        result.url = phyloUrl;
        result.source = "phylopic";
        cache.set(key, result);
        return result;
      }
    } catch {
      // Fall through to no result
    }

    cache.set(key, result);
    return result;
  })();

  pending.set(key, promise);
  promise.finally(() => pending.delete(key));
  return promise;
}

async function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// Strategy 1: Wikipedia pageimages API
async function tryWikipedia(genus: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(genus)}&prop=pageimages&piprop=thumbnail&pithumbsize=400&format=json&origin=*`;
    const res = await fetchWithTimeout(url);
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0] as { thumbnail?: { source: string } };
    return page?.thumbnail?.source || null;
  } catch {
    return null;
  }
}

// Strategy 2: Wikimedia Commons file search
async function tryCommonsSearch(genus: string): Promise<string | null> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(genus)}&gsrlimit=3&prop=imageinfo&iiprop=url|mime&iiurlwidth=400&format=json&origin=*`;
    const res = await fetchWithTimeout(url);
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    for (const p of Object.values(pages) as any[]) {
      const info = p?.imageinfo?.[0];
      if (info?.mime?.startsWith("image/") && info.thumburl) {
        return info.thumburl;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Strategy 3: iNaturalist (CC photos, great for extant birds)
async function tryINaturalist(genus: string): Promise<string | null> {
  try {
    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(genus)}&rank=genus&per_page=1`;
    const res = await fetchWithTimeout(url, 8000);
    const data = await res.json();
    const result = data?.results?.[0];
    return result?.default_photo?.medium_url || null;
  } catch {
    return null;
  }
}

// Strategy 4: PhyloPic silhouettes (SVG)
async function tryPhyloPic(genus: string): Promise<string | null> {
  try {
    const name = genus.toLowerCase();
    const url = `https://api.phylopic.org/images?build=536&filter_name=${encodeURIComponent(name)}&page=0&embed_items=true`;
    const res = await fetchWithTimeout(url, 8000);
    const data = await res.json();
    const items = data?._embedded?.items;
    if (!items?.length) return null;
    const img = items[0];
    const vectorFile = img?._links?.vectorFile?.href;
    if (vectorFile) return vectorFile;
    const rasterFiles = img?._links?.rasterFiles;
    if (rasterFiles?.length) return rasterFiles[0].href;
    return null;
  } catch {
    return null;
  }
}

export type ImageSource = "wikipedia" | "commons" | "inaturalist" | "phylopic" | "none";

export function useDinoImage(genus: string, group?: string): {
  url: string | null;
  source: ImageSource;
  loading: boolean;
} {
  const cached = cache.get(genus);
  const [url, setUrl] = useState<string | null>(cached?.url ?? null);
  const [source, setSource] = useState<ImageSource>((cached?.source as ImageSource) ?? "none");
  const [loading, setLoading] = useState(!cache.has(genus));

  useEffect(() => {
    if (!genus) {
      setUrl(null);
      setSource("none");
      setLoading(false);
      return;
    }

    if (cache.has(genus)) {
      const c = cache.get(genus)!;
      setUrl(c.url);
      setSource(c.source as ImageSource);
      setLoading(false);
      return;
    }

    setLoading(true);
    resolveImage(genus, group).then((result) => {
      setUrl(result.url);
      setSource(result.source as ImageSource);
      setLoading(false);
    });
  }, [genus, group]);

  return { url, source, loading };
}
