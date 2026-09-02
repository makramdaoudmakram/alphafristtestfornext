import type { AuditDatePreset, AuditFieldChange } from "@/types/audit-center";

export function startOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateRangeForPreset(
  preset: AuditDatePreset,
  customFrom?: string,
  customTo?: string
): { dateFrom?: string; dateTo?: string } {
  if (preset === "all") return {};
  const now = new Date();
  if (preset === "custom") {
    const from = customFrom ? startOfLocalDay(new Date(`${customFrom}T00:00:00`)) : undefined;
    const to = customTo ? endOfLocalDay(new Date(`${customTo}T00:00:00`)) : undefined;
    return {
      dateFrom: from?.toISOString(),
      dateTo: to?.toISOString(),
    };
  }
  const end = endOfLocalDay(now);
  if (preset === "today") {
    return {
      dateFrom: startOfLocalDay(now).toISOString(),
      dateTo: end.toISOString(),
    };
  }
  const days = preset === "7d" ? 6 : 29;
  const start = startOfLocalDay(now);
  start.setDate(start.getDate() - days);
  return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
}

export function formatAuditDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  const seconds = String(parsed.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export function formatAuditTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatAuditDayLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const today = startOfLocalDay(new Date());
  const that = startOfLocalDay(parsed);
  const diff = Math.round((today.getTime() - that.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return formatAuditDateTime(value).slice(0, 10);
}

export function actionBadgeClass(action: string): string {
  switch (action.toUpperCase()) {
    case "INSERT":
    case "CREATE":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "UPDATE":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "DELETE":
      return "border-red-200 bg-red-50 text-red-800";
    case "POST":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "REVERSE":
    case "UNPOST":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "ADJUST":
    case "STOCK ADJUSTMENT":
      return "border-orange-200 bg-orange-50 text-orange-800";
    default:
      return "border-border bg-muted text-foreground";
  }
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatAuditActionLabel(action: string): string {
  const value = action.trim().toUpperCase();
  if (value === "INSERT" || value === "CREATE") return "CREATE";
  if (value === "ADJUST") return "STOCK ADJUSTMENT";
  return value || "UPDATE";
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatDocumentAuditDateTime(
  value: string,
  options?: { seconds?: boolean }
): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = MONTHS[parsed.getMonth()];
  const year = parsed.getFullYear();
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  if (options?.seconds === false) {
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  }
  const seconds = String(parsed.getSeconds()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
}

export function extractAuditItem(description: string, fallback?: string | null): string | null {
  const explicit = fallback?.trim();
  if (explicit) return explicit;

  const match = description.match(
    /(?:Updated quantity for|Updated purchase price for|Updated item |Deleted item |Added item )(.+?)(?:\s+from\s+|\s+with quantity\s+|:\s+|\s+from details|\.)/i
  );
  const item = match?.[1]?.trim().replace(/:$/, "");
  return item || null;
}

const FIELD_LABELS: Record<string, string> = {
  quantity: "Quantity",
  "purchase price": "Purchase Price",
  "sales price": "Sales Price",
  "cost price": "Cost Price",
  bonus: "Bonus",
  batch: "Batch",
  expiry: "Expiry Date",
};

function humanizeParsedField(field: string): string {
  return FIELD_LABELS[field.trim().toLowerCase()] ?? field.trim();
}

function normalizeParsedValue(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\.$/, "");
  return trimmed ? trimmed : null;
}

export function parseChangesFromDescription(description: string): AuditFieldChange[] {
  if (!description.trim()) return [];
  const changes: AuditFieldChange[] = [];

  const add = (field: string, before: string | undefined, after: string | undefined) => {
    const label = humanizeParsedField(field);
    const oldValue = normalizeParsedValue(before);
    const newValue = normalizeParsedValue(after);
    if (!label) return;
    if ((oldValue ?? "") === (newValue ?? "")) return;
    if (changes.some((change) => change.field.toLowerCase() === label.toLowerCase())) return;
    changes.push({ field: label, before: oldValue, after: newValue });
  };

  const fromTo = description.matchAll(
    /(?:Updated\s+)?(quantity|purchase price|sales price|cost price|bonus|batch|expiry)(?:\s+for\s+.+?)?\s+from\s+(.+?)\s+to\s+([^\s.;]+)/gi
  );
  for (const match of fromTo) add(match[1], match[2], match[3]);

  const arrows = description.matchAll(
    /(Quantity|Purchase price|Sales price|Cost price|Bonus|Batch|Expiry)\s+(.+?)\s*(?:→|->)\s+([^.;]+)/gi
  );
  for (const match of arrows) add(match[1], match[2], match[3]);

  const added = description.match(/Added item .+ with quantity ([^\s.]+)/i);
  if (added) add("Quantity", undefined, added[1]);

  return changes;
}
