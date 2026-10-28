import { describe, expect, it } from "vitest";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { ReturnItemStockSearchItem } from "@/types/stock";
import {
  normalizePharmPurchaseReturnExpDateForApi,
  patchDetailFromPharmPurchaseReturnStockSearch,
} from "@/lib/pharm-purchase-return-stock-search";

function catalogItem(): ItemCatalogItem {
  return {
    id: 1,
    itemCatalogId: 1,
    itmCode: "81848",
    itmCode2: null,
    itmNameAr: "ع",
    itmNameEn: "Item",
    itmUnit1: 10,
    itmUnit2: null,
    itmUnit3: null,
    child: null,
  } as ItemCatalogItem;
}

function searchWithStock(
  overrides: Partial<ReturnItemStockSearchItem> = {}
): ReturnItemStockSearchItem {
  return {
    itemCatalogId: 1,
    itemCode: "81848",
    itemName: "Item",
    itemNameAr: "ع",
    itemNameEn: "Item",
    storeId: 3,
    totalQuantity: 5,
    transferQty: 0,
    availableQty: 5,
    baseAvailableQty: 50,
    salesPrice: 5,
    costPrice: 3,
    stockId: 99,
    expDate: "2027-08-15",
    batchNo: "BATCH-1",
    itmUnit1: 10,
    itmUnit2: null,
    itmUnit3: null,
    itmUnit1Unit2: null,
    itmUnit1Unit3: 10,
    ...overrides,
  };
}

describe("pharmacy purchase return stock search patch", () => {
  it("rejects items without a stock batch", () => {
    const result = patchDetailFromPharmPurchaseReturnStockSearch(
      catalogItem(),
      searchWithStock({ stockId: null, batchNo: "", baseAvailableQty: 0 }),
      "3"
    );
    expect(result).toEqual({
      error: 'No stock record for item "81848" batch "—".',
    });
  });

  it("maps batch expiry to YYYY-MM-01 for save", () => {
    const patch = patchDetailFromPharmPurchaseReturnStockSearch(
      catalogItem(),
      searchWithStock(),
      "3"
    );
    expect("error" in patch).toBe(false);
    if ("error" in patch) return;

    expect(patch.expDate).toBe("2027-08-01");
    expect(patch.batchNo).toBe("BATCH-1");
    expect(patch.stockId).toBe(99);
    expect(patch.itmId).toBe("81848");
  });

  it("normalizes MM/YYYY expiry for the API payload", () => {
    expect(normalizePharmPurchaseReturnExpDateForApi("08/2027")).toBe(
      "2027-08-01"
    );
    expect(normalizePharmPurchaseReturnExpDateForApi("2027-08-15")).toBe(
      "2027-08-01"
    );
  });

  it("rejects zero available qty when a stock batch was selected", () => {
    const result = patchDetailFromPharmPurchaseReturnStockSearch(
      catalogItem(),
      searchWithStock({ baseAvailableQty: 0, availableQty: 0 }),
      "3"
    );
    expect(result).toEqual({
      error:
        'Insufficient available stock for item "81848" batch "BATCH-1".',
    });
  });
});
