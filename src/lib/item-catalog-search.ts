import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PurchaseDetail } from "@/types/purchase";

export const ITEM_AUTOCOMPLETE_LIMIT = 15;

export type ItemCatalogSearchField = "code" | "nameAr" | "nameEn";

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Default purchase / sell from ItemCatalog (Itm_DefPharm_Price, Itm_DefSell_Price). */
export function catalogDefaultPrices(item: ItemCatalogItem): {
  itmPurPrice: number;
  itmSell: number;
} {
  const itmPurPrice =
    item.itmDefPharmPrice != null && Number.isFinite(item.itmDefPharmPrice)
      ? item.itmDefPharmPrice
      : 0;
  const itmSell =
    item.itmDefSellPrice != null && Number.isFinite(item.itmDefSellPrice)
      ? item.itmDefSellPrice
      : 0;
  return { itmPurPrice, itmSell };
}

export function patchDetailFromCatalogItem(
  item: ItemCatalogItem
): Partial<PurchaseDetail> {
  const { itmPurPrice, itmSell } = catalogDefaultPrices(item);
  return {
    itmId: item.itmCode?.trim() ?? "",
    itmNameAr: item.itmNameAr?.trim() ?? "",
    itmNameEn: item.itmNameEn?.trim() ?? "",
    itmPurPrice,
    itmSell,
  };
}

/** Exact field match, else first autocomplete hit (for Enter without open list). */
export function resolveCatalogItemOnEnter(
  items: ItemCatalogItem[],
  field: ItemCatalogSearchField,
  query: string
): ItemCatalogItem | null {
  const q = norm(query);
  if (!q) return null;

  for (const item of items) {
    let hay = "";
    if (field === "code") hay = norm(item.itmCode);
    else if (field === "nameAr") hay = norm(item.itmNameAr);
    else hay = norm(item.itmNameEn);
    if (hay && hay === q) return item;
  }

  const hits = searchItemCatalog(items, field, query, 1);
  return hits[0] ?? null;
}

export function searchItemCatalog(
  items: ItemCatalogItem[],
  field: ItemCatalogSearchField,
  query: string,
  limit = ITEM_AUTOCOMPLETE_LIMIT
): ItemCatalogItem[] {
  const q = norm(query);
  if (!q) return [];

  const matches: ItemCatalogItem[] = [];
  for (const item of items) {
    let hay = "";
    if (field === "code") hay = norm(item.itmCode);
    else if (field === "nameAr") hay = norm(item.itmNameAr);
    else hay = norm(item.itmNameEn);

    if (!hay) continue;

    if (hay.includes(q)) {
      matches.push(item);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

export function suggestionPrimaryLabel(
  item: ItemCatalogItem,
  field: ItemCatalogSearchField
): string {
  if (field === "code") return item.itmCode?.trim() || "—";
  if (field === "nameAr") return item.itmNameAr?.trim() || "—";
  return item.itmNameEn?.trim() || "—";
}

export function suggestionSecondaryLabel(
  item: ItemCatalogItem,
  field: ItemCatalogSearchField
): string {
  if (field === "code") {
    return [item.itmNameAr, item.itmNameEn].filter(Boolean).join(" · ") || item.itmCode || "";
  }
  return item.itmCode?.trim() || "";
}

export function enrichDetailFromCatalog(
  row: PurchaseDetail,
  itemByCode: Map<string, ItemCatalogItem>
): PurchaseDetail {
  const code = row.itmId?.trim();
  if (!code) return row;
  const item = itemByCode.get(code.toLowerCase());
  if (!item) return row;
  const { itmPurPrice, itmSell } = catalogDefaultPrices(item);
  return {
    ...row,
    itmNameAr: row.itmNameAr || item.itmNameAr?.trim() || "",
    itmNameEn: row.itmNameEn || item.itmNameEn?.trim() || "",
    itmPurPrice: row.itmPurPrice || itmPurPrice,
    itmSell: row.itmSell || itmSell,
  };
}
