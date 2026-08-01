"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lookupMovments } from "@/lib/api-client";
import type { MovmentLookupItem } from "@/types/movment";

const cache = new Map<string, MovmentLookupItem[]>();

function cacheKey(parentId: number, search: string): string {
  return `${parentId}|${search.trim().toLowerCase()}`;
}

type UseMovmentLookupOptions = {
  parentId: number;
  token: string | null | undefined;
  search: string;
  enabled?: boolean;
  debounceMs?: number;
};

export function useMovmentLookup({
  parentId,
  token,
  search,
  enabled = true,
  debounceMs = 250,
}: UseMovmentLookupOptions) {
  const [items, setItems] = useState<MovmentLookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const clearCacheForParent = useCallback(() => {
    for (const key of cache.keys()) {
      if (key.startsWith(`${parentId}|`)) cache.delete(key);
    }
  }, [parentId]);

  useEffect(() => {
    if (!enabled || !token || parentId <= 0) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    const key = cacheKey(parentId, search);
    const cached = cache.get(key);
    if (cached) {
      setItems(cached);
      setLoading(false);
      setError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;

      setLoading(true);
      setError(null);

      void lookupMovments(token, parentId, search, {
        pageSize: 50,
        signal: controller.signal,
      })
        .then((rows) => {
          if (requestId !== requestIdRef.current) return;
          cache.set(key, rows);
          setItems(rows);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          if (requestId !== requestIdRef.current) return;
          setItems([]);
          setLoading(false);
          setError(
            err instanceof Error ? err.message : "Failed to load movements"
          );
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [enabled, token, parentId, search, debounceMs]);

  return { items, loading, error, clearCacheForParent };
}
