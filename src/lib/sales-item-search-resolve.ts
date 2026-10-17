import type { StockBatchItem } from "@/types/stock";
import type {
  SalesItemSearchHit,
  SalesItemSearchStock,
  SalesSearchLanguage,
  SalesStockScope,
} from "@/types/sales-workspace";
import type { SalesApiSearchType } from "@/lib/sales-item-search-ux";
import {
  resolveSalesAutocompleteSearchType,
  looksLikeScannerPayload,
  isLikelyNameToken,
} from "@/lib/sales-item-search-ux";

export type SalesItemSearchResponse = {
  storId: number;
  items: SalesItemSearchHit[];
};

export type SalesSearchClient = {
  searchSalesItems: (
    token: string,
    params: {
      searchType: SalesApiSearchType;
      stockScope: SalesStockScope;
      search: string;
      take?: number;
    }
  ) => Promise<SalesItemSearchResponse>;
  lookupStockByBarcodeScan: (
    token: string,
    scan: string
  ) => Promise<{
    normalizedBatchNo: string;
    batch: StockBatchItem;
  }>;
};

export type ResolveEnterResult =
  | { status: "empty" }
  | { status: "none" }
  | { status: "single"; hit: SalesItemSearchHit }
  | { status: "list"; hits: SalesItemSearchHit[] };

export function stockBatchToSalesStock(batch: StockBatchItem): SalesItemSearchStock {
  return {
    stockId: batch.id,
    batchNo: batch.batchNo,
    expDate: batch.expDate,
    availableQty: batch.availableQty,
    salesPrice: batch.salesPrice,
    storId: batch.storeId,
    storName: batch.storeName,
    parmId: null,
    pharmacyName: null,
  };
}

export function isBatchInCurrentPharmacyStore(
  batch: StockBatchItem,
  pharmacyStorId: number
): boolean {
  return batch.storeId === pharmacyStorId && batch.qty > 0;
}

export function preferExactItemCodeHits(
  hits: SalesItemSearchHit[],
  term: string
): SalesItemSearchHit[] {
  const t = term.trim();
  if (!t) return hits;
  const exact = hits.filter((h) => h.itmCode === t);
  return exact.length > 0 ? exact : hits;
}

export function pickAutoSelectHit(
  hits: SalesItemSearchHit[],
  term: string
): ResolveEnterResult {
  if (hits.length === 0) return { status: "none" };
  const narrowed = preferExactItemCodeHits(hits, term);
  if (narrowed.length === 1) {
    return { status: "single", hit: narrowed[0] };
  }
  return { status: "list", hits: narrowed };
}

function attachSingleStock(
  hit: SalesItemSearchHit,
  stock: SalesItemSearchStock
): SalesItemSearchHit {
  return { ...hit, stocks: [stock] };
}

async function loadCatalogHitForBatch(
  client: SalesSearchClient,
  token: string,
  batch: StockBatchItem,
  stockScope: SalesStockScope
): Promise<{ storId: number; hit: SalesItemSearchHit } | null> {
  const code = batch.itemCode?.trim();
  if (!code) return null;

  const response = await client.searchSalesItems(token, {
    searchType: "ItemCode",
    stockScope,
    search: code,
    take: 20,
  });

  const catalogId = batch.itemCatalogId;
  const hit =
    response.items.find((i) =>
      catalogId ? i.itemCatalogId === catalogId : i.itmCode === code
    ) ?? response.items.find((i) => i.itmCode === code);

  if (!hit) return null;
  return { storId: response.storId, hit };
}

export async function tryResolveBatchBarcodeScan(
  client: SalesSearchClient,
  token: string,
  scan: string,
  stockScope: SalesStockScope,
  pharmacyStorId: number | null
): Promise<ResolveEnterResult | null> {
  try {
    const lookup = await client.lookupStockByBarcodeScan(token, scan);
    const batch = lookup?.batch;
    if (!batch) return null;

    const loaded = await loadCatalogHitForBatch(client, token, batch, stockScope);
    if (!loaded) return null;

    const storId = pharmacyStorId ?? loaded.storId;
    if (!isBatchInCurrentPharmacyStore(batch, storId)) {
      return null;
    }

    const stock = stockBatchToSalesStock(batch);
    return {
      status: "single",
      hit: attachSingleStock(loaded.hit, stock),
    };
  } catch {
    return null;
  }
}

export async function resolveSalesItemOnEnter(
  client: SalesSearchClient,
  token: string,
  params: {
    query: string;
    language: SalesSearchLanguage;
    stockScope: SalesStockScope;
    pharmacyStorId: number | null;
    take?: number;
  }
): Promise<ResolveEnterResult> {
  const raw = params.query;
  const trim = raw.trim();
  if (!trim) return { status: "empty" };

  const take = params.take ?? 15;
  const { stockScope, language } = params;

  if (looksLikeScannerPayload(raw)) {
    const batchHit = await tryResolveBatchBarcodeScan(
      client,
      token,
      raw,
      stockScope,
      params.pharmacyStorId
    );
    if (batchHit?.status === "single") return batchHit;

    const barcode = await client.searchSalesItems(token, {
      searchType: "Barcode",
      stockScope,
      search: trim,
      take,
    });
    const barcodePick = pickAutoSelectHit(barcode.items, trim);
    if (barcodePick.status !== "none") return barcodePick;
  }

  let codePick: ResolveEnterResult = { status: "none" };
  if (!isLikelyNameToken(trim)) {
    const code = await client.searchSalesItems(token, {
      searchType: "ItemCode",
      stockScope,
      search: trim,
      take,
    });
    codePick = pickAutoSelectHit(code.items, trim);
    if (codePick.status === "single") return codePick;
    if (codePick.status === "list" && codePick.hits.length > 1) {
      return codePick;
    }
  }

  const nameType: SalesApiSearchType =
    language === "Arabic" ? "ArabicName" : "EnglishName";
  const nameSearch =
    nameType === "ArabicName" || nameType === "EnglishName" ? raw : trim;
  const named = await client.searchSalesItems(token, {
    searchType: nameType,
    stockScope,
    search: nameSearch,
    take,
  });
  const namePick = pickAutoSelectHit(named.items, trim);
  if (namePick.status !== "none") return namePick;

  if (codePick.status === "list") return codePick;
  return { status: "none" };
}

export function autocompleteSearchPayload(
  query: string,
  language: SalesSearchLanguage
): { searchType: SalesApiSearchType; search: string } {
  const searchType = resolveSalesAutocompleteSearchType(query, language);
  const search =
    searchType === "ItemCode" ? query.trim() : query;
  return { searchType, search };
}

