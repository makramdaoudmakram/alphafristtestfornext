"use client";

import { useEffect, useRef, useState } from "react";
import {
  diagnosticsLookup,
  type DiagnosticsLookupKind,
} from "@/lib/diagnostics/diagnostics-api";
import type { DiagnosticsLookupEntry } from "@/lib/diagnostics/diagnostics-types";

const DEFAULT_DEBOUNCE_MS = 300;

export function useDebouncedDiagnosticsLookup(options: {
  token: string | undefined;
  kind: DiagnosticsLookupKind;
  initialEntries: DiagnosticsLookupEntry[];
  debounceMs?: number;
  take?: number;
  enabled?: boolean;
  operation?: string;
}) {
  const {
    token,
    kind,
    initialEntries,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    take = 50,
    enabled = true,
    operation,
  } = options;

  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<DiagnosticsLookupEntry[]>(initialEntries);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const initialRef = useRef(initialEntries);

  useEffect(() => {
    initialRef.current = initialEntries;
    if (!search.trim()) {
      setEntries(initialEntries);
    }
  }, [initialEntries, search]);

  useEffect(() => {
    if (!enabled || !token) return;

    const term = search.trim();
    if (!term) {
      abortRef.current?.abort();
      setLoading(false);
      setError(null);
      setEntries(initialRef.current);
      return;
    }

    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);

      void diagnosticsLookup(
          token,
          kind,
          term,
          take,
          controller.signal,
          operation
        )
        .then((rows) => {
          if (controller.signal.aborted) return;
          setEntries(rows);
        })
        .catch((lookupError) => {
          if (controller.signal.aborted) return;
          setEntries([]);
          setError(
            lookupError instanceof Error
              ? lookupError.message
              : "Lookup failed."
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [debounceMs, enabled, kind, operation, search, take, token]);

  return {
    search,
    setSearch,
    entries,
    error,
    loading,
    loadedCount: entries.length,
  };
}
