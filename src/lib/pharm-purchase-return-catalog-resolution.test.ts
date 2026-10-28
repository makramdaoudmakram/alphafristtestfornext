import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { ReturnItemStockSearchItem } from "@/types/stock";
import { patchDetailFromPharmPurchaseReturnStockSearch } from "@/lib/pharm-purchase-return-stock-search";
import { resolveCatalogMapForPharmPurchaseReturnSave } from "@/lib/pharm-purchase-return-catalog";

const getItemCatalogByCodes = vi.fn();
const getItemCatalogPage = vi.fn(async () => ({
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: 25,
}));
const lookupItemCatalog = vi.fn(async () => []);
const getItemCatalog = vi.fn();

vi.mock("@/lib/api-client", () => ({
  getItemCatalogByCodes: (...args: unknown[]) => getItemCatalogByCodes(...args),
  getItemCatalogPage: (...args: unknown[]) => getItemCatalogPage(...args),
  lookupItemCatalog: (...args: unknown[]) => lookupItemCatalog(...args),
  getItemCatalog: (...args: unknown[]) => getItemCatalog(...args),
}));

function catalogRow(
  overrides: Partial<ItemCatalogItem> = {}
): ItemCatalogItem {
  return {
    id: 99,
    itemCatalogId: 99,
    itmCode: "81848",
    itmCode2: null,
    itmUnit1: 5,
    itmUnit2: null,
    itmUnit3: null,
    child: null,
    ...overrides,
  } as ItemCatalogItem;
}

function stockSearchRow(): ReturnItemStockSearchItem {
  return {
    itemCatalogId: 99,
    itemCode: "81848",
    itemName: "Test",
    itemNameAr: "ع",
    itemNameEn: "Test",
    storeId: 3,
    totalQuantity: 2,
    transferQty: 0,
    availableQty: 2,
    baseAvailableQty: 20,
    salesPrice: 1,
    costPrice: 1,
    stockId: 1,
    expDate: "2026-12-01",
    batchNo: "B1",
    itmUnit1: 5,
    itmUnit2: null,
    itmUnit3: null,
    itmUnit1Unit2: null,
    itmUnit1Unit3: 10,
  };
}

describe("pharmacy purchase return catalog resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getItemCatalogPage.mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 25,
    });
    lookupItemCatalog.mockResolvedValue([]);
    getItemCatalog.mockResolvedValue(catalogRow());
  });

  it("uses canonical Itm_Code on stock-backed patches", () => {
    const item = catalogRow({ itmCode: "PRIMARY", itmCode2: "81848" });
    const patch = patchDetailFromPharmPurchaseReturnStockSearch(
      item,
      { ...stockSearchRow(), itemCode: "PRIMARY" },
      "3"
    );
    expect("error" in patch).toBe(false);
    if ("error" in patch) return;
    expect(patch.itmId).toBe("PRIMARY");
    expect(patch.expDate).toBe("2026-12-01");
  });

  it("resolves a selected item by canonical code and passes unit validation path", async () => {
    getItemCatalogByCodes.mockResolvedValue([catalogRow()]);

    const details = [{ itmId: "81848", unitId: 5 }];
    const { error } = await resolveCatalogMapForPharmPurchaseReturnSave(
      details,
      new Map(),
      [],
      "token"
    );

    expect(error).toBeNull();
  });

  it("returns an explicit resolution error when the catalog cannot be resolved", async () => {
    getItemCatalogByCodes.mockResolvedValue([]);

    const { error } = await resolveCatalogMapForPharmPurchaseReturnSave(
      [{ itmId: "MISSING-99", unitId: 1 }],
      new Map(),
      [],
      "token"
    );

    expect(error).toMatch(/could not resolve catalog item "MISSING-99"/i);
    expect(error).not.toMatch(/wait for the catalog to finish loading/i);
  });
});
