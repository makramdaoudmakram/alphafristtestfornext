"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { getAccountChartSelect } from "@/lib/customer-api";

/**
 * Customer Contract Company / Contract Company Discount.
 * Displays AccountChart.ACCName, stores ACCCode.
 */
export function CustomerAccountChartCombobox({
  value,
  onValueChange,
  placeholder = "Select account",
  disabled,
}: {
  value: string;
  onValueChange: (accCode: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const [items, setItems] = useState<{ accCode: string; accName: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      setItems(await getAccountChartSelect(token));
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
      const label = item.accName.trim() || item.accCode;
      byValue.set(item.accCode, { value: item.accCode, label });
    }

    const trimmed = value.trim();
    if (trimmed && !byValue.has(trimmed)) {
      byValue.set(trimmed, { value: trimmed, label: trimmed });
    }

    return [...byValue.values()];
  }, [items, value]);

  return (
    <SearchableCombobox
      value={value.trim()}
      onValueChange={onValueChange}
      options={options}
      placeholder={loading ? "Loading…" : placeholder}
      searchPlaceholder="Search account name or code..."
      disabled={disabled || loading || status === "loading"}
      emptyMessage="No AccountChart records found."
      size="lg"
    />
  );
}
