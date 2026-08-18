"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { getCostCentersForComp } from "@/lib/api-client";
import {
  mergeCostCenterComboboxOptions,
  normalizeLedgerCode,
} from "@/lib/journal-binding";
import type { CostCenterCompoItem } from "@/types/cost-center";

/**
 * Reusable CostCenter dropdown (old Web Forms drpCostCenter).
 * Value stored is the cost center **Code** (same as ledger/voucher CostCenter field).
 */
export function CostCenterCombobox({
  value,
  onValueChange,
  placeholder = "Select Costcenter",
  disabled,
  options: externalOptions,
  loading: externalLoading,
}: {
  value: string;
  onValueChange: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** When provided, uses these options instead of fetching per instance. */
  options?: ComboboxOption[];
  loading?: boolean;
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

  const usesExternalOptions = externalOptions != null;

  useEffect(() => {
    if (usesExternalOptions) return;
    if (status === "loading") return;
    void load();
  }, [status, load, usesExternalOptions]);

  const internalOptions = useMemo<ComboboxOption[]>(() => {
    return items
      .filter((item) => item.code?.trim())
      .map((item) => {
        const code = item.code!.trim();
        const name = item.name?.trim() || "";
        return {
          value: code,
          label: name && name !== code ? `${code} - ${name}` : name || code,
        };
      });
  }, [items]);

  const nameByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      const code = normalizeLedgerCode(item.code);
      if (!code) continue;
      map.set(code, (item.name ?? "").trim() || code);
    }
    for (const option of externalOptions ?? []) {
      if (!map.has(option.value)) {
        const dash = option.label.indexOf(" - ");
        map.set(
          option.value,
          dash >= 0 ? option.label.slice(dash + 3) : option.label
        );
      }
    }
    return map;
  }, [externalOptions, items]);

  const options = useMemo<ComboboxOption[]>(() => {
    const base = externalOptions ?? internalOptions;
    return mergeCostCenterComboboxOptions(base, [value], nameByCode);
  }, [externalOptions, internalOptions, nameByCode, value]);

  const normalizedValue = normalizeLedgerCode(value);
  const isLoading = usesExternalOptions
    ? (externalLoading ?? false)
    : loading;

  return (
    <SearchableCombobox
      value={normalizedValue}
      onValueChange={onValueChange}
      options={options}
      placeholder={isLoading ? "Loading…" : placeholder}
      disabled={disabled || isLoading || status === "loading"}
      emptyMessage="No cost centers found."
      size="lg"
    />
  );
}
