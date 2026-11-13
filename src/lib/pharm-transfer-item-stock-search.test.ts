import { describe, expect, it } from "vitest";
import { patchPharmTransferDetailFromStockSearch } from "@/lib/pharm-transfer-item-stock-search";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { ReturnItemStockSearchItem } from "@/types/stock";

function catalog(id: number): ItemCatalogItem {
  return {
    id,
    itemCatalogId: id,
    itmCode: "PHX1",
    itmCode2: null,
    itmIntCode: null,
    itmNameAr: "عرض",
    itmNameEn: "Pharm Item",
    itmDefSellPrice: 10,
    itmDefTax: null,
    itmDefPharmPrice: 6,
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
    itmUnit1: 1,
    itmUnit2: null,
    itmUnit3: null,
    itmUnit1Unit2: null,
    itmUnit1Unit3: null,
    child: null,
  };
}

const search: ReturnItemStockSearchItem = {
  itemCatalogId: 42,
  itemCode: "PHX1",
  itemNameAr: "عرض",
  itemNameEn: "Pharm Item",
  itemName: "Pharm Item",
  storeId: 7,
  totalQuantity: 8,
  availableQty: 8,
  salesPrice: 10,
  costPrice: 6,
  batchNo: "0000000001",
  expDate: "2027-01-01",
  stockId: 99,
  itmUnit1: 1,
};

describe("pharm-transfer-item-stock-search", () => {
  it("maps itemCatalogId from search result into detail patch", () => {
    const patch = patchPharmTransferDetailFromStockSearch(catalog(42), search);
    expect("error" in patch).toBe(false);
    if ("error" in patch) return;
    expect(patch.itemCatalogId).toBe(42);
    expect(patch.itmId).toBe("PHX1");
    expect(patch.stockId).toBe(99);
  });
});
