import type {
  SalesItemSearchHit,
  SalesSearchLanguage,
  SalesStockScope,
} from "@/types/sales-workspace";

export type SalesApiSearchType =
  | "ArabicName"
  | "EnglishName"
  | "Barcode"
  | "ItemCode"
  | "General";

/**
 * Resolve SalesItemSearch searchType.
 * Long numeric payloads are treated as barcode scans.
 * Otherwise the E/A toggle selects ArabicName or EnglishName so the
 * existing double-space wildcard runs on the matching name field.
 * Item-code matching stays on the server for non-wildcard name queries.
 */
export function resolveSalesSearchType(
  query: string,
  language: SalesSearchLanguage = "English"
): SalesApiSearchType {
  const q = query.trim();
  if (/^\d{8,}$/.test(q)) return "Barcode";
  return language === "Arabic" ? "ArabicName" : "EnglishName";
}

export function salesItemPrimaryLabel(
  hit: Pick<SalesItemSearchHit, "itmCode" | "itmNameAr" | "itmNameEn">,
  language: SalesSearchLanguage
): string {
  const name =
    language === "Arabic"
      ? hit.itmNameAr || hit.itmNameEn
      : hit.itmNameEn || hit.itmNameAr;
  return name || hit.itmCode || "—";
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

/** Base Unit1 catalog price for Catalog scope (not converted Unit2/3). */
export function salesCatalogDisplayPrice(hit: SalesItemSearchHit): number | null {
  const pharm = hit.defPharmPrice;
  if (pharm != null && Number.isFinite(pharm)) return pharm;
  const sell = hit.defSellPrice;
  if (sell != null && Number.isFinite(sell)) return sell;
  return null;
}

/**
 * Autocomplete secondary line — includes base Unit1 SalesPrice from Stock
 * (or catalog def price for Catalog scope). Does not apply priceQtyNet.
 */
export function salesItemSecondaryLabel(
  hit: SalesItemSearchHit,
  stockScope: SalesStockScope
): string {
  const code = hit.itmCode || "—";

  if (stockScope === "Catalog") {
    return `Code: ${code} · Catalog · Price: ${formatMoney(salesCatalogDisplayPrice(hit))}`;
  }

  if (hit.stocks.length === 0) {
    return `Code: ${code} · No stock · Price: ${formatMoney(salesCatalogDisplayPrice(hit))}`;
  }

  if (hit.stocks.length === 1) {
    const s = hit.stocks[0];
    const loc = s.pharmacyName || s.storName || "";
    const parts = [
      `Code: ${code}`,
      `Batch: ${s.batchNo || "—"}`,
      `Exp: ${s.expDate || "—"}`,
      `Available: ${s.availableQty}`,
      `Price: ${formatMoney(s.salesPrice)}`,
    ];
    if (loc) parts.push(loc);
    return parts.join(" · ");
  }

  const prices = hit.stocks
    .map((s) => s.salesPrice)
    .filter((p) => Number.isFinite(p));
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;
  const priceLabel =
    min != null && max != null && min !== max
      ? `${formatMoney(min)}–${formatMoney(max)}`
      : formatMoney(min ?? salesCatalogDisplayPrice(hit));

  return `Code: ${code} · ${hit.stocks.length} batches · Price: ${priceLabel}`;
}
