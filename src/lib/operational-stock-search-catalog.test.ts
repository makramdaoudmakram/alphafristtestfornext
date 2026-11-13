import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { ReturnItemStockSearchItem } from "@/types/stock";
import {
  itemCatalogItemFromStockSearchRow,
  resolveCatalogItemForStockSearch,
} from "@/lib/operational-stock-search-catalog";

const getItemCatalog = vi.fn();
const getItemCatalogByCodes = vi.fn();

vi.mock("@/lib/api-client", () => ({
  getItemCatalog: (...args: unknown[]) => getItemCatalog(...args),
  getItemCatalogByCodes: (...args: unknown[]) => getItemCatalogByCodes(...args),
}));

function searchRow(
  overrides: Partial<ReturnItemStockSearchItem> = {}
): ReturnItemStockSearchItem {
  return {
    itemCatalogId: 42,
    itemCode: "PHX1",
    itemNameAr: "عرض",
    itemNameEn: "Pharm Item",
    itemName: "Pharm Item",
    storeId: 7,
    totalQuantity: 5,
    salesPrice: 10,
    costPrice: 6,
    batchNo: "0000000001",
    expDate: null,
    stockId: 99,
    itmUnit1: 1,
    itmUnit2: 2,
    itmUnit3: 3,
    itmUnit1Unit2: 1,
    itmUnit1Unit3: 10,
    ...overrides,
  };
}

describe("operational-stock-search-catalog", () => {
  beforeEach(() => {
    getItemCatalog.mockReset();
    getItemCatalogByCodes.mockReset();
  });

  it("builds catalog row from stock search snapshot with matching ids", () => {
    const built = itemCatalogItemFromStockSearchRow(searchRow());
    expect(built).not.toBeNull();
    expect(built!.itemCatalogId).toBe(42);
    expect(built!.itmCode).toBe("PHX1");
    expect(built!.itmUnit1).toBe(1);
  });

  it("resolves catalog from search row without calling GetById", async () => {
    const resolved = await resolveCatalogItemForStockSearch(
      "token",
      searchRow(),
      new Map()
    );
    expect(resolved?.itemCatalogId).toBe(42);
    expect(getItemCatalog).not.toHaveBeenCalled();
    expect(getItemCatalogByCodes).not.toHaveBeenCalled();
  });

  it("falls back to GetByCodes when snapshot has no units", async () => {
    getItemCatalogByCodes.mockResolvedValue([
      {
        id: 42,
        itemCatalogId: 42,
        itmCode: "PHX1",
        itmUnit1: 5,
        itmUnit2: null,
        itmUnit3: null,
        itmActive: true,
        itmStopSell: false,
        itmSrvc: false,
        itmStopPur: false,
        itmPrintBarcode: false,
        itmAllowDiscount: true,
        itmFreez: false,
        stopTransfer: false,
      } satisfies Partial<ItemCatalogItem> as ItemCatalogItem,
    ]);

    const resolved = await resolveCatalogItemForStockSearch(
      "token",
      searchRow({ itmUnit1: null, itmUnit2: null, itmUnit3: null }),
      new Map()
    );
    expect(getItemCatalogByCodes).toHaveBeenCalledWith("token", ["PHX1"]);
    expect(getItemCatalog).not.toHaveBeenCalled();
    expect(resolved?.itmUnit1).toBe(5);
  });

  it("uses cached catalog by code when units are present", async () => {
    const cached: ItemCatalogItem = {
      id: 42,
      itemCatalogId: 42,
      itmCode: "PHX1",
      itmCode2: null,
      itmIntCode: null,
      itmNameAr: null,
      itmNameEn: null,
      itmDefSellPrice: null,
      itmDefTax: null,
      itmDefPharmPrice: null,
      itmHasExpire: null,
      itmActive: true,
      itmStopSell: false,
      itmSrvc: false,
      itmStopPur: false,
      itmPrintBarcode: false,
      itmAllowDiscount: true,
      itmFreez: false,
      stopTransfer: false,
      brandId: null,
      brandName: null,
      itmGroup: null,
      groupName: null,
      itemForm: null,
      itemFormName: null,
      itmOrigin: null,
      itemOriginName: null,
      itmNotes: null,
      itmMaxDiscPer: null,
      itmMaxDiscVal: null,
      itmUnit1: 9,
      itmUnit2: null,
      itmUnit3: null,
      itmUnit1Unit2: null,
      itmUnit1Unit3: null,
      child: null,
    };
    const map = new Map([["phx1", cached]]);

    const resolved = await resolveCatalogItemForStockSearch(
      "token",
      searchRow(),
      map
    );
    expect(resolved?.itmUnit1).toBe(9);
    expect(getItemCatalog).not.toHaveBeenCalled();
  });
});
