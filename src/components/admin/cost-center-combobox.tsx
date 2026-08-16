"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { getCostCentersForComp } from "@/lib/api-client";
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
}: {
  value: string;
  onValueChange: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
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
    const mapped = items
      .filter((item) => item.code?.trim())
      .map((item) => ({
        value: item.code!.trim(),
        label: `${item.code} — ${item.name?.trim() || "—"}`,
      }));
    return mapped;
  }, [items]);

  return (
    <SearchableCombobox
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={loading ? "Loading…" : placeholder}
      disabled={disabled || loading || status === "loading"}
      emptyMessage="No cost centers found."
    />
  );
}
