"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { getStorAccountOptions } from "@/lib/api-client";
import {
  STOR_ACCOUNT_PARENT_CODE,
  type StorAccountOption,
} from "@/types/stor";

function formatAccountLabel(accCode: string, name: string): string {
  const code = accCode.trim();
  const n = name.trim();
  if (code && n && n !== code) return `${code} - ${n}`;
  return code || n;
}

/**
 * Account No picker for Stor — loads AccountsChart where PARENTCode = 116.
 * Saves ACCCode into Stor.AccountNo.
 */
export function StorAccountCombobox({
  value,
  onValueChange,
  placeholder = "Select account",
  disabled,
  fallbackLabel,
}: {
  value: string;
  onValueChange: (accCode: string) => void;
  placeholder?: string;
  disabled?: boolean;
  fallbackLabel?: string | null;
}) {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const [items, setItems] = useState<StorAccountOption[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      setItems(await getStorAccountOptions(token));
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
      byValue.set(item.accCode, {
        value: item.accCode,
        label: formatAccountLabel(item.accCode, item.name),
      });
    }

    const trimmed = value.trim();
    if (trimmed && !byValue.has(trimmed)) {
      byValue.set(trimmed, {
        value: trimmed,
        label: fallbackLabel?.trim() || trimmed,
      });
    }

    return [...byValue.values()].sort((a, b) =>
      a.value.localeCompare(b.value, undefined, { numeric: true })
    );
  }, [fallbackLabel, items, value]);

  const emptyMessage = `No accounts found for Parent Account ${STOR_ACCOUNT_PARENT_CODE}.`;

  return (
    <SearchableCombobox
      value={value.trim()}
      onValueChange={onValueChange}
      options={options}
      placeholder={loading ? "Loading…" : placeholder}
      disabled={disabled || loading || status === "loading"}
      emptyMessage={emptyMessage}
      size="lg"
    />
  );
}
