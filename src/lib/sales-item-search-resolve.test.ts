import { describe, expect, it, vi } from "vitest";
import type { StockBatchItem } from "@/types/stock";
import type { SalesItemSearchHit } from "@/types/sales-workspace";
import {
  autocompleteSearchPayload,
  isBatchInCurrentPharmacyStore,
  pickAutoSelectHit,
  preferExactItemCodeHits,
  resolveSalesItemOnEnter,
  tryResolveBatchBarcodeScan,
  type SalesSearchClient,
} from "@/lib/sales-item-search-resolve";
import {
  looksLikeScannerPayload,
  resolveSalesAutocompleteSearchType,
} from "@/lib/sales-item-search-ux";

function hit(
  patch: Partial<SalesItemSearchHit> & { itemCatalogId: number; itmCode: string }
): SalesItemSearchHit {
  return {
    itmNameAr: "",
    itmNameEn: "",
    defSellPrice: null,
    defPharmPrice: null,
    unit1: 1,
    unit2: null,
    unit3: 1,
    unit1Unit2: null,
    unit1Unit3: 1,
    itmMaxDiscPer: null,
    groupNameEn: "",
    groupNameAr: "",
    itmSrvc: false,
    stocks: [],
    ...patch,
  };
}

function batch(patch: Partial<StockBatchItem> & { id: number; batchNo: string }): StockBatchItem {
  return {
    itemCode: "ITM-1",
    itemNameAr: null,
    itemNameEn: "Item",
    storeId: 8,
    storeName: "S8",
    expDate: "2026-12-01",
    qty: 5,
    transferQty: 0,
    availableQty: 5,
    qtyUnit3: 5,
    purshPrice: 1,
    salesPrice: 12,
    costPrice: 1,
    allowPrintBarcode: true,
    itemCatalogId: 101,
    ...patch,
  };
}

describe("sales search classification", () => {
  it("uses English name for plain words", () => {
    expect(resolveSalesAutocompleteSearchType("Vitamin", "English")).toBe("EnglishName");
    expect(resolveSalesAutocompleteSearchType("أوجمنتين", "Arabic")).toBe("ArabicName");
  });

  it("uses item code search for code-like tokens", () => {
    expect(resolveSalesAutocompleteSearchType("ITM-701", "English")).toBe("ItemCode");
    expect(resolveSalesAutocompleteSearchType("1234567890123", "English")).toBe("ItemCode");
  });

  it("detects scanner payloads without treating every long number as intl barcode only", () => {
    expect(looksLikeScannerPayload("6281007012345")).toBe(true);
    expect(looksLikeScannerPayload("ABC1234567890")).toBe(true);
    expect(looksLikeScannerPayload("Vitamin")).toBe(false);
    expect(looksLikeScannerPayload("aug  ment")).toBe(false);
  });

  it("preserves wildcard name queries in autocomplete payload", () => {
    const payload = autocompleteSearchPayload("aug  ment", "English");
    expect(payload.searchType).toBe("EnglishName");
    expect(payload.search).toBe("aug  ment");
  });
});

describe("pickAutoSelectHit", () => {
  it("prefers exact item code matches", () => {
    const hits = [
      hit({ itemCatalogId: 1, itmCode: "BI-1001" }),
      hit({ itemCatalogId: 2, itmCode: "BI-100" }),
    ];
    const narrowed = preferExactItemCodeHits(hits, "BI-100");
    expect(narrowed).toHaveLength(1);
    expect(narrowed[0].itmCode).toBe("BI-100");
  });

  it("does not auto-select ambiguous lists", () => {
    const hits = [
      hit({ itemCatalogId: 1, itmCode: "BI-1" }),
      hit({ itemCatalogId: 2, itmCode: "BI-2" }),
    ];
    expect(pickAutoSelectHit(hits, "BI")).toEqual({ status: "list", hits });
  });

  it("auto-selects a single hit", () => {
    const single = hit({ itemCatalogId: 1, itmCode: "X" });
    expect(pickAutoSelectHit([single], "X")).toEqual({ status: "single", hit: single });
  });
});

describe("batch barcode resolution", () => {
  it("rejects batches from another pharmacy store", () => {
    expect(isBatchInCurrentPharmacyStore(batch({ storeId: 9 }), 8)).toBe(false);
    expect(isBatchInCurrentPharmacyStore(batch({ storeId: 8 }), 8)).toBe(true);
    expect(isBatchInCurrentPharmacyStore(batch({ storeId: 8, qty: 0 }), 8)).toBe(false);
  });

  it("resolves a batch scan to a single stocked hit", async () => {
    const catalogHit = hit({
      itemCatalogId: 101,
      itmCode: "ITM-1",
      stocks: [
        {
          stockId: 500,
          batchNo: "000000000000001",
          expDate: "2026-12-01",
          availableQty: 5,
          salesPrice: 12,
          storId: 8,
          storName: "S8",
          parmId: 7,
          pharmacyName: "Pharm",
        },
      ],
    });

    const client: SalesSearchClient = {
      lookupStockByBarcodeScan: vi.fn().mockResolvedValue({
        normalizedBatchNo: "000000000000001",
        batch: batch({ id: 500, batchNo: "000000000000001" }),
      }),
      searchSalesItems: vi.fn().mockResolvedValue({ storId: 8, items: [catalogHit] }),
    };

    const result = await tryResolveBatchBarcodeScan(
      client,
      "token",
      "000000000000001",
      "CurrentPharmacy",
      8
    );
    expect(result?.status).toBe("single");
    if (result?.status === "single") {
      expect(result.hit.stocks).toHaveLength(1);
      expect(result.hit.stocks[0].stockId).toBe(500);
    }
  });
});

describe("resolveSalesItemOnEnter", () => {
  it("tries international barcode before item code for scanner input", async () => {
    const barcodeHit = hit({ itemCatalogId: 200, itmCode: "EAN-200" });
    const search = vi
      .fn()
      .mockResolvedValueOnce({ storId: 8, items: [barcodeHit] })
      .mockResolvedValue({ storId: 8, items: [] });

    const client: SalesSearchClient = {
      lookupStockByBarcodeScan: vi.fn().mockRejectedValue(new Error("not found")),
      searchSalesItems: search,
    };

    const result = await resolveSalesItemOnEnter(client, "t", {
      query: "6281007012345",
      language: "English",
      stockScope: "CurrentPharmacy",
      pharmacyStorId: 8,
    });

    expect(result.status).toBe("single");
    expect(search).toHaveBeenCalledWith("t", {
      searchType: "Barcode",
      stockScope: "CurrentPharmacy",
      search: "6281007012345",
      take: 15,
    });
  });

  it("falls back to item code and name when barcode misses", async () => {
    const codeHit = hit({ itemCatalogId: 301, itmCode: "12345678901" });
    const search = vi
      .fn()
      .mockResolvedValueOnce({ storId: 8, items: [] })
      .mockResolvedValueOnce({ storId: 8, items: [codeHit] });

    const client: SalesSearchClient = {
      lookupStockByBarcodeScan: vi.fn().mockRejectedValue(new Error("not found")),
      searchSalesItems: search,
    };

    const result = await resolveSalesItemOnEnter(client, "t", {
      query: "12345678901",
      language: "English",
      stockScope: "CurrentPharmacy",
      pharmacyStorId: 8,
    });

    expect(result.status).toBe("single");
    expect(search).toHaveBeenNthCalledWith(2, "t", {
      searchType: "ItemCode",
      stockScope: "CurrentPharmacy",
      search: "12345678901",
      take: 15,
    });
  });

  it("uses name search for non-scanner text", async () => {
    const nameHit = hit({ itemCatalogId: 1, itmCode: "VIT", itmNameEn: "Vitamin" });
    const search = vi.fn().mockResolvedValue({ storId: 8, items: [nameHit] });

    const client: SalesSearchClient = {
      lookupStockByBarcodeScan: vi.fn(),
      searchSalesItems: search,
    };

    const result = await resolveSalesItemOnEnter(client, "t", {
      query: "Vitamin",
      language: "English",
      stockScope: "CurrentPharmacy",
      pharmacyStorId: 8,
    });

    expect(result.status).toBe("single");
    expect(client.lookupStockByBarcodeScan).not.toHaveBeenCalled();
    expect(search).toHaveBeenCalledWith("t", {
      searchType: "EnglishName",
      stockScope: "CurrentPharmacy",
      search: "Vitamin",
      take: 15,
    });
  });
});
