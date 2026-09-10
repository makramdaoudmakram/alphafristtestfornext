"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { getCostCentersForComp } from "@/lib/api-client";
import type { CostCenterCompoItem } from "@/types/cost-center";

function costCenterDisplayName(name: string | null, code: string | null): string {
  const trimmedName = name?.trim();
  if (trimmedName) return trimmedName;

  const trimmedCode = code?.trim();
  if (trimmedCode) return trimmedCode;

  return "";
}

/**
 * Cost center picker for Employee Info.
 * Displays CostCenter.Name only; stores CostCenter.Id in EmployInfo.Pharm.
 */
export function EmployInfoCostCenterCombobox({
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
      const label = costCenterDisplayName(item.name, item.code);
      if (!label) continue;

      byValue.set(id, { value: id, label });
    }

    if (value != null) {
      const key = String(value);
      if (!byValue.has(key)) {
        const savedLabel = fallbackLabel?.trim();
        if (savedLabel) {
          byValue.set(key, { value: key, label: savedLabel });
        }
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
