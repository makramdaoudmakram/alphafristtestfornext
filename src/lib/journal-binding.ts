import type { ComboboxOption } from "@/components/ui/searchable-combobox";

/** Trim ledger/voucher business codes (ACCCode, CostCenter code). */
export function normalizeLedgerCode(code: string | null | undefined): string {
  return (code ?? "").trim();
}

export function formatAccountLabel(
  code: string,
  name?: string | null
): string {
  const normalized = normalizeLedgerCode(code);
  if (!normalized) return "";
  const label = (name ?? "").trim();
  return label && label !== normalized ? `${normalized} - ${label}` : normalized;
}

export function formatCostCenterLabel(
  code: string,
  name?: string | null
): string {
  return formatAccountLabel(code, name);
}

export function buildAccountNameMap(
  accounts: Array<{ accCode: string; name: string }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const account of accounts) {
    const code = normalizeLedgerCode(account.accCode);
    if (!code) continue;
    map.set(code, account.name.trim() || code);
  }
  return map;
}

export function buildCostCenterNameMap(
  items: Array<{ code: string | null; name: string | null }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    const code = normalizeLedgerCode(item.code);
    if (!code) continue;
    map.set(code, (item.name ?? "").trim() || code);
  }
  return map;
}

export function resolveAccountName(
  code: string | null | undefined,
  nameByCode: Map<string, string>,
  fallbackName?: string | null
): string {
  const normalized = normalizeLedgerCode(code);
  if (!normalized) return "";
  const fromMap = nameByCode.get(normalized);
  if (fromMap) return fromMap;
  const fallback = (fallbackName ?? "").trim();
  return fallback && fallback !== normalized ? fallback : normalized;
}

export function toAccountComboboxOptions(
  accounts: Array<{ accCode: string; name: string }>
): ComboboxOption[] {
  return accounts
    .map((account) => {
      const code = normalizeLedgerCode(account.accCode);
      if (!code) return null;
      return {
        value: code,
        label: formatAccountLabel(code, account.name),
      };
    })
    .filter((option): option is ComboboxOption => option !== null)
    .sort((a, b) =>
      a.value.localeCompare(b.value, undefined, { numeric: true })
    );
}

export function mergeAccountComboboxOptions(
  base: ComboboxOption[],
  savedRows: Array<{ code: string; name?: string | null }>
): ComboboxOption[] {
  const byValue = new Map(base.map((option) => [option.value, option]));
  for (const row of savedRows) {
    const code = normalizeLedgerCode(row.code);
    if (!code || byValue.has(code)) continue;
    byValue.set(code, {
      value: code,
      label: formatAccountLabel(code, row.name),
    });
  }
  return [...byValue.values()].sort((a, b) =>
    a.value.localeCompare(b.value, undefined, { numeric: true })
  );
}

export function toCostCenterComboboxOptions(
  items: Array<{ code: string | null; name: string | null }>
): ComboboxOption[] {
  return items
    .map((item) => {
      const code = normalizeLedgerCode(item.code);
      if (!code) return null;
      const name = (item.name ?? "").trim();
      return {
        value: code,
        label: formatCostCenterLabel(code, name),
      };
    })
    .filter((option): option is ComboboxOption => option !== null)
    .sort((a, b) =>
      a.value.localeCompare(b.value, undefined, { numeric: true })
    );
}

export function mergeCostCenterComboboxOptions(
  base: ComboboxOption[],
  codes: Array<string | null | undefined>,
  nameByCode: Map<string, string>
): ComboboxOption[] {
  const byValue = new Map(base.map((option) => [option.value, option]));
  for (const raw of codes) {
    const code = normalizeLedgerCode(raw);
    if (!code || byValue.has(code)) continue;
    byValue.set(code, {
      value: code,
      label: formatCostCenterLabel(code, nameByCode.get(code)),
    });
  }
  return [...byValue.values()].sort((a, b) =>
    a.value.localeCompare(b.value, undefined, { numeric: true })
  );
}
