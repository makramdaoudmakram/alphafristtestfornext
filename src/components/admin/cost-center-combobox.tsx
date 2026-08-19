"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { getCostCentersForComp } from "@/lib/api-client";
import {
  formatCostCenterLabel,
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
  nameOnly = false,
  fallbackLabel,
  fallbackValue,
}: {
  value: string;
  onValueChange: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** When provided, uses these options instead of fetching per instance. */
  options?: ComboboxOption[];
  loading?: boolean;
  /** Show only the cost center name (Arabic) without the code prefix. */
  nameOnly?: boolean;
  /** Label for the original value when it is not in the loaded list (edit form). */
  fallbackLabel?: string | null;
  /** Only apply fallbackLabel when value matches this code (prevents overwriting new picks). */
  fallbackValue?: string | null;
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

  const normalizedValue = normalizeLedgerCode(value);
  const normalizedFallbackValue = normalizeLedgerCode(fallbackValue);

  const handleValueChange = useCallback(
    (code: string) => {
      onValueChange(normalizeLedgerCode(code));
    },
    [onValueChange]
  );

  const internalOptions = useMemo<ComboboxOption[]>(() => {
    return items
      .filter((item) => item.code?.trim())
      .map((item) => {
        const code = item.code!.trim();
        const name = item.name?.trim() || "";
        return {
          value: code,
          label: formatCostCenterLabel(code, name, nameOnly),
        };
      });
  }, [items, nameOnly]);

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
    const fallback = fallbackLabel?.trim();
    if (
      normalizedValue &&
      fallback &&
      normalizedValue === normalizedFallbackValue
    ) {
      map.set(normalizedValue, fallback);
    }
    return map;
  }, [
    externalOptions,
    fallbackLabel,
    items,
    normalizedFallbackValue,
    normalizedValue,
  ]);

  const options = useMemo<ComboboxOption[]>(() => {
    const base = externalOptions ?? internalOptions;
    return mergeCostCenterComboboxOptions(
      base,
      [normalizedValue],
      nameByCode,
      nameOnly
    );
  }, [
    externalOptions,
    internalOptions,
    nameByCode,
    nameOnly,
    normalizedValue,
  ]);

  const orphanLabel = useMemo(() => {
    if (!normalizedValue) return null;
    if (options.some((option) => option.value === normalizedValue)) return null;
    if (
      normalizedValue === normalizedFallbackValue &&
      fallbackLabel?.trim()
    ) {
      return fallbackLabel.trim();
    }
    return nameByCode.get(normalizedValue) ?? normalizedValue;
  }, [
    fallbackLabel,
    nameByCode,
    normalizedFallbackValue,
    normalizedValue,
    options,
  ]);

  const isLoading = usesExternalOptions
    ? (externalLoading ?? false)
    : loading;

  return (
    <SearchableCombobox
      value={normalizedValue}
      onValueChange={handleValueChange}
      options={options}
      orphanLabel={orphanLabel}
      placeholder={isLoading ? "Loading…" : placeholder}
      disabled={disabled || (isLoading && items.length === 0) || status === "loading"}
      emptyMessage="No cost centers found."
      size="lg"
    />
  );
}
