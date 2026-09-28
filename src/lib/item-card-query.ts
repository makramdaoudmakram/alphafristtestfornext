import type { ItemCardQuery } from "@/types/item-card";

export function defaultFromDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildItemCardQueryString(params: ItemCardQuery): string {
  const search = new URLSearchParams();
  search.set("itemId", String(params.itemId));
  search.set("fromDate", params.fromDate);
  search.set("toDate", params.toDate);
  if (params.documentType) search.set("documentType", params.documentType);
  if (params.page != null) search.set("page", String(params.page));
  if (params.pageSize != null) search.set("pageSize", String(params.pageSize));
  return search.toString();
}

export function formatItemCardQuantity(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toFixed(4).replace(/\.?0+$/, "");
}

export function formatItemCardDate(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}
