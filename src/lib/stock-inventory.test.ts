import { describe, expect, it } from "vitest";
import {
  inventoryDisplayAvailableQty,
  inventoryDisplayAvailableQtyInDisplayUnit,
  inventoryDisplayBaseQtyInCatalogUnit,
  inventoryDisplayFromStoreSummaryTotals,
  inventoryDisplayQty,
  inventoryDisplayTransferQty,
} from "@/lib/stock-inventory";
import type { StockBatchItem } from "@/types/stock";

function row(overrides: Partial<StockBatchItem>): StockBatchItem {
  return {
    id: 1,
    batchNo: "B1",
    itemCode: "X",
    storeId: 1,
    qty: 100,
    transferQty: 25,
    availableQty: 75,
    purshPrice: 1,
    salesPrice: 2,
    costPrice: 1,
    allowPrintBarcode: false,
    ...overrides,
  };
}

describe("stock-inventory triad display", () => {
  it("uses authoritative AvailableQty from API", () => {
    expect(inventoryDisplayAvailableQty(row({}))).toBe(75);
  });

  it("falls back to Qty - TransferQty in base units when AvailableQty is missing", () => {
    const { availableQty: _omit, ...rest } = row({});
    expect(
      inventoryDisplayAvailableQty({ ...rest, qty: 50, transferQty: 10 } as StockBatchItem)
    ).toBe(40);
  });

  it("scales pending and available to display unit when qtyUnit3 is set", () => {
    const batch = row({ qty: 100, qtyUnit3: 10, transferQty: 25, availableQty: 75 });
    expect(inventoryDisplayQty(batch)).toBe(10);
    expect(inventoryDisplayTransferQty(batch)).toBe(2.5);
    expect(inventoryDisplayAvailableQtyInDisplayUnit(batch)).toBe(7.5);
    expect(inventoryDisplayQty(batch) - inventoryDisplayTransferQty(batch)).toBe(
      inventoryDisplayAvailableQtyInDisplayUnit(batch)
    );
  });

  it("derives display available from base Qty - TransferQty before unit conversion when API AvailableQty is absent", () => {
    const { availableQty: _omit, ...rest } = row({
      qty: 100,
      qtyUnit3: 10,
      transferQty: 25,
    });
    const batch = rest as StockBatchItem;
    expect(inventoryDisplayAvailableQty(batch)).toBe(75);
    expect(inventoryDisplayAvailableQtyInDisplayUnit(batch)).toBe(7.5);
    expect(inventoryDisplayQty(batch)).toBe(10);
    expect(inventoryDisplayTransferQty(batch)).toBe(2.5);
  });

  it("keeps book, pending, and available in the same unit when no Unit1-to-Unit3 conversion exists", () => {
    const batch = row({ qty: 50, transferQty: 10, availableQty: 40, qtyUnit3: null });
    expect(inventoryDisplayQty(batch)).toBe(50);
    expect(inventoryDisplayTransferQty(batch)).toBe(10);
    expect(inventoryDisplayAvailableQtyInDisplayUnit(batch)).toBe(40);
    expect(inventoryDisplayQty(batch) - inventoryDisplayTransferQty(batch)).toBe(
      inventoryDisplayAvailableQtyInDisplayUnit(batch)
    );
  });

  it("aggregates store summary base totals into display units once", () => {
    const totals = inventoryDisplayFromStoreSummaryTotals({
      totalQty: 100,
      totalTransferQty: 25,
      totalAvailableQty: 75,
      totalIncomingUnacceptedQty: 30,
      itmUnit1Unit3: 10,
    });
    expect(totals.stock).toBe(10);
    expect(totals.pending).toBe(2.5);
    expect(totals.available).toBe(7.5);
    expect(totals.incoming).toBe(3);
  });

  it("converts pending movement base qty with catalog unit factor", () => {
    expect(inventoryDisplayBaseQtyInCatalogUnit(25, 10)).toBe(2.5);
    expect(inventoryDisplayBaseQtyInCatalogUnit(25, null)).toBe(25);
  });
});
