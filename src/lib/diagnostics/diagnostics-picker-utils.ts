import type {
  DiagnosticsLookupCustomer,
  DiagnosticsLookupEntry,
  DiagnosticsLookupItem,
  DiagnosticsLookupVendor,
} from "./diagnostics-types";

export function formatLookupLabel(entry: {
  name: string;
  code?: string | null;
}): string {
  const name = entry.name?.trim() || "—";
  const code = entry.code?.trim();
  return code ? `${name} (${code})` : name;
}

export function vendorToEntry(v: DiagnosticsLookupVendor): DiagnosticsLookupEntry {
  return {
    id: v.id,
    name: v.name,
    code: v.code?.trim() || v.id,
  };
}

export function customerToEntry(
  c: DiagnosticsLookupCustomer
): DiagnosticsLookupEntry {
  return {
    id: String(c.id),
    name: c.name,
    code: c.code?.trim() || String(c.id),
  };
}

export function itemToEntry(i: DiagnosticsLookupItem): DiagnosticsLookupEntry {
  return {
    id: String(i.id),
    name: i.name,
    code: i.code?.trim() || String(i.id),
  };
}

export function mergeLookupEntries(
  ...groups: DiagnosticsLookupEntry[][]
): DiagnosticsLookupEntry[] {
  const byId = new Map<string, DiagnosticsLookupEntry>();
  for (const group of groups) {
    for (const entry of group) {
      byId.set(entry.id, entry);
    }
  }
  return [...byId.values()];
}
