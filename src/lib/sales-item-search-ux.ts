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

 * Autocomplete debounce searchType — names with wildcards, or item-code Contains

 * when the query looks like a code (not a plain word).

 */

/** Single token with no spaces that is only letters — treat as a name, not a code. */
export function isLikelyNameToken(query: string): boolean {
  const token = query.trim();
  if (!token || /\s/.test(token)) return true;
  return /^[\p{L}]+$/u.test(token);
}

export function resolveSalesAutocompleteSearchType(
  query: string,
  language: SalesSearchLanguage = "English"
): SalesApiSearchType {
  const token = query.trim();
  if (
    !isLikelyNameToken(token) &&
    token.length >= 2 &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(token) &&
    (/\d/.test(token) || /[-_.]/.test(token))
  ) {
    return "ItemCode";
  }
  return language === "Arabic" ? "ArabicName" : "EnglishName";
}



/**

 * @deprecated Use {@link resolveSalesAutocompleteSearchType} for debounced search.

 * Kept for callers that only need name vs code routing.

 */

export function resolveSalesSearchType(

  query: string,

  language: SalesSearchLanguage = "English"

): SalesApiSearchType {

  return resolveSalesAutocompleteSearchType(query, language);

}



/** True when Enter resolution should try batch + international barcode before catalog search. */

export function looksLikeScannerPayload(query: string): boolean {

  const token = query.trim();

  if (token.length === 0) return false;

  if (/\s/.test(token)) return false;

  if (/^\d+$/.test(token)) return true;

  return (

    token.length >= 4 &&

    /^[0-9A-Za-z][0-9A-Za-z.-]*$/.test(token) &&

    /\d/.test(token)

  );

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



  if (hit.itmSrvc) {

    return `Code: ${code} · Service · Price: ${formatMoney(salesCatalogDisplayPrice(hit))}`;

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


