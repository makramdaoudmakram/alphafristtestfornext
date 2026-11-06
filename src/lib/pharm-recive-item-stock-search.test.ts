import { describe, expect, it } from "vitest";
import {
  patchPharmReciveDetailFromItemSearch,
  resolvePharmReciveSearchAvailableQty,
  validatePharmReciveDetailQuantity,
} from "@/lib/pharm-recive-item-stock-search";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { ReturnItemStockSearchItem } from "@/types/stock";

const catalogItem = {
  itmCode: "ITM-1",
  itmUnit1: 1,
  itmUnit3: 1,
  itmUnit1Unit3: 1,
} as unknown as ItemCatalogItem;

function searchRow(
  overrides: Partial<ReturnItemStockSearchItem> = {}
): ReturnItemStockSearchItem {
  return {
    itemCatalogId: 1,
    itemCode: "ITM-1",
    itemName: "Item",
    itemNameAr: null,
    itemNameEn: "Item",
    storeId: 10,
    totalQuantity: 100,
    transferQty: 20,
    availableQty: 80,
    baseAvailableQty: 80,
    salesPrice: 5,
    costPrice: 3,
    stockId: 99,
    expDate: "2026-12-01",
    batchNo: "B1",
    itmUnit1: 1,
    itmUnit2: null,
    itmUnit3: 1,
    itmUnit1Unit2: null,
    itmUnit1Unit3: 1,
    ...overrides,
  };
}

describe("resolvePharmReciveSearchAvailableQty", () => {
  it("prefers availableQty from API", () => {
    expect(resolvePharmReciveSearchAvailableQty(searchRow())).toBe(80);
  });

  it("derives available from physical minus transfer when availableQty missing", () => {
    expect(
      resolvePharmReciveSearchAvailableQty(
        searchRow({ availableQty: undefined, totalQuantity: 100, transferQty: 20 })
      )
    ).toBe(80);
  });
});

describe("patchPharmReciveDetailFromItemSearch", () => {
  it("caps default qnty and maxSearchQty to available, not physical qty", () => {
    const patch = patchPharmReciveDetailFromItemSearch(
      catalogItem,
      searchRow({ totalQuantity: 100, availableQty: 80 })
    );
    expect("error" in patch).toBe(false);
    if ("error" in patch) return;
    expect(patch.maxSearchQty).toBe(80);
    expect(patch.qnty).toBe(1);
    expect(patch.qnty!).toBeLessThanOrEqual(patch.maxSearchQty!);
    expect(patch.batchNo).toBe("B1");
    expect(patch.expDate).toBe("2026-12-01");
  });

  it("returns error when available is zero", () => {
    const result = patchPharmReciveDetailFromItemSearch(
      catalogItem,
      searchRow({ availableQty: 0, totalQuantity: 5, transferQty: 5 })
    );
    expect(result).toEqual({
      error:
        'Insufficient available stock for item "ITM-1" batch "B1". Available: 0.',
    });
  });
});

describe("validatePharmReciveDetailQuantity", () => {
  it("rejects quantity above maxSearchQty", () => {
    const result = validatePharmReciveDetailQuantity(81, 80);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("80");
  });
});
