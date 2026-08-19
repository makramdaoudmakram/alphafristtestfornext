"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { getStors } from "@/lib/api-client";
import type { StorItem } from "@/types/stor";

function formatStorLabel(item: StorItem): string {
  return item.storArName?.trim() || "—";
}

/**
 * Store picker for Parm — saves Stor.Id (as string) into ParmStor.
 */
export function StorIdCombobox({
  value,
  onValueChange,
  placeholder = "Select store",
  disabled,
  fallbackLabel,
  fallbackValue,
}: {
  value: string;
  onValueChange: (storId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  fallbackLabel?: string | null;
  /** Only apply fallbackLabel when value matches this id/text (prevents overwriting new picks). */
  fallbackValue?: string | null;
}) {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const [items, setItems] = useState<StorItem[]>([]);
  const [loading, setLoading] = useState(false);

  const normalizedValue = value.trim();
  const normalizedFallbackValue = (fallbackValue ?? "").trim();

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      setItems(await getStors(token));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (status === "loading") return;
    void load();
  }, [status, load]);

  const handleValueChange = useCallback(
    (storId: string) => {
      onValueChange(storId.trim());
    },
    [onValueChange]
  );

  const options = useMemo<ComboboxOption[]>(() => {
    const byValue = new Map<string, ComboboxOption>();

    for (const item of items) {
      const key = String(item.id);
      byValue.set(key, { value: key, label: formatStorLabel(item) });
    }

    if (normalizedValue && !byValue.has(normalizedValue)) {
      const fallback =
        normalizedValue === normalizedFallbackValue
          ? fallbackLabel?.trim() || "—"
          : normalizedValue;
      byValue.set(normalizedValue, {
        value: normalizedValue,
        label: fallback,
      });
    }

    return [...byValue.values()].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true })
    );
  }, [fallbackLabel, items, normalizedFallbackValue, normalizedValue]);

  const orphanLabel = useMemo(() => {
    if (!normalizedValue) return null;
    if (options.some((option) => option.value === normalizedValue)) return null;
    if (
      normalizedValue === normalizedFallbackValue &&
      fallbackLabel?.trim()
    ) {
      return fallbackLabel.trim();
    }
    return normalizedValue;
  }, [fallbackLabel, normalizedFallbackValue, normalizedValue, options]);

  return (
    <SearchableCombobox
      value={normalizedValue}
      onValueChange={handleValueChange}
      options={options}
      orphanLabel={orphanLabel}
      placeholder={loading ? "Loading…" : placeholder}
      disabled={disabled || (loading && items.length === 0) || status === "loading"}
      emptyMessage="No stores found."
      size="lg"
    />
  );
}
