"use client";

import { useState, useEffect } from "react";

const cache = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

async function resolveImage(genus: string): Promise<string | null> {
  if (cache.has(genus)) return cache.get(genus)!;
  if (pending.has(genus)) return pending.get(genus)!;

  const promise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(genus)}&prop=pageimages&piprop=thumbnail&pithumbsize=400&format=json&origin=*`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      const data = await res.json();
      const pages = data?.query?.pages;
      if (!pages) {
        cache.set(genus, null);
        return null;
      }

      const page = Object.values(pages)[0] as { thumbnail?: { source: string } };
      const thumb = page?.thumbnail?.source || null;
      cache.set(genus, thumb);
      return thumb;
    } catch {
      cache.set(genus, null);
      return null;
    } finally {
      pending.delete(genus);
    }
  })();

  pending.set(genus, promise);
  return promise;
}

export function useDinoImage(genus: string): {
  url: string | null;
  loading: boolean;
} {
  const [url, setUrl] = useState<string | null>(cache.get(genus) ?? null);
  const [loading, setLoading] = useState(!cache.has(genus));

  useEffect(() => {
    if (!genus) {
      setUrl(null);
      setLoading(false);
      return;
    }

    if (cache.has(genus)) {
      setUrl(cache.get(genus)!);
      setLoading(false);
      return;
    }

    setLoading(true);
    resolveImage(genus).then((result) => {
      setUrl(result);
      setLoading(false);
    });
  }, [genus]);

  return { url, loading };
}
