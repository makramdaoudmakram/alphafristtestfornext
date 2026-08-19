"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { getCostCentersForComp } from "@/lib/api-client";
import type { CostCenterCompoItem } from "@/types/cost-center";

function formatCostCenterLabel(code: string | null, name: string | null): string {
  const c = code?.trim() ?? "";
  const n = name?.trim() ?? "";
  if (c && n && n !== c) return `${c} - ${n}`;
  return c || n || "";
}

/**
 * Cost Center picker for Stor — saves CostCenter.Id into Stor.CostCenterId.
 */
export function CostCenterIdCombobox({
  value,
  onValueChange,
  placeholder = "Select cost center",
  disabled,
  fallbackLabel,
}: {
  value: number | null;
  onValueChange: (id: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Ensures edit form shows saved selection even if not in the loaded page. */
  fallbackLabel?: string | null;
}) {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const [items, setItems] = useState<CostCenterCompoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      setItems(await getCostCentersForComp(token));
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

  const options = useMemo<ComboboxOption[]>(() => {
    const byValue = new Map<string, ComboboxOption>();

    for (const item of items) {
      const id = String(item.id);
      byValue.set(id, {
        value: id,
        label: formatCostCenterLabel(item.code, item.name) || id,
      });
    }

    if (value != null) {
      const key = String(value);
      if (!byValue.has(key)) {
        byValue.set(key, {
          value: key,
          label: fallbackLabel?.trim() || `#${key}`,
        });
      }
    }

    return [...byValue.values()].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true })
    );
  }, [fallbackLabel, items, value]);

  const stringValue = value != null ? String(value) : "";

  return (
    <SearchableCombobox
      value={stringValue}
      onValueChange={(next) => {
        if (!next) {
          onValueChange(null);
          return;
        }
        const parsed = Number(next);
        onValueChange(Number.isFinite(parsed) ? parsed : null);
      }}
      options={options}
      placeholder={loading ? "Loading…" : placeholder}
      disabled={disabled || loading || status === "loading"}
      emptyMessage="No cost centers found."
      size="lg"
    />
  );
}
