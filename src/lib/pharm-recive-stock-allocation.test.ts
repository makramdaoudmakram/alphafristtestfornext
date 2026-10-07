import { describe, expect, it } from "vitest";
import {
  allocatePharmReciveFifoReceivingQuantity,
  resolveUnitForBaseQuantity,
  type PharmReciveStockBatch,
} from "@/lib/pharm-recive-stock-allocation";
import type { ItemCatalogItem } from "@/types/item-catalog";

// Box = Unit1 (id 10), Strip = Unit3 (id 30), 1 Box = 3 Strips.
const boxItem = {
  itmUnit1: 10,
  itmUnit2: null,
  itmUnit3: 30,
  itmUnit1Unit2: null,
  itmUnit1Unit3: 3,
} as unknown as ItemCatalogItem;

// Box(Unit1)=12 strips, Pack(Unit2): 4 packs per box → 3 strips per pack, Strip(Unit3)=base.
const packItem = {
  itmUnit1: 10,
  itmUnit2: 20,
  itmUnit3: 30,
  itmUnit1Unit2: 4,
  itmUnit1Unit3: 12,
} as unknown as ItemCatalogItem;

describe("resolveUnitForBaseQuantity", () => {
  it("case 1: 3 strips fit exactly into one Box", () => {
    expect(resolveUnitForBaseQuantity(boxItem, 3)).toEqual({ unitId: 10, qty: 1 });
  });

  it("case 2: 1 strip stays a Strip, never 0.333 Box", () => {
    expect(resolveUnitForBaseQuantity(boxItem, 1)).toEqual({ unitId: 30, qty: 1 });
  });

  it("case 3: 2 strips stay Strips", () => {
    expect(resolveUnitForBaseQuantity(boxItem, 2)).toEqual({ unitId: 30, qty: 2 });
  });

  it("case 4: 6 strips combine into 2 Boxes", () => {
    expect(resolveUnitForBaseQuantity(boxItem, 6)).toEqual({ unitId: 10, qty: 2 });
  });

  it("falls back to base unit when no coarse unit divides", () => {
    expect(resolveUnitForBaseQuantity(boxItem, 4)).toEqual({ unitId: 30, qty: 4 });
  });

  it("uses Unit2 (pack) when it divides but Unit1 (box) does not", () => {
    expect(resolveUnitForBaseQuantity(packItem, 3)).toEqual({ unitId: 20, qty: 1 });
    expect(resolveUnitForBaseQuantity(packItem, 12)).toEqual({ unitId: 10, qty: 1 });
    expect(resolveUnitForBaseQuantity(packItem, 1)).toEqual({ unitId: 30, qty: 1 });
  });

  it("returns null for non-positive base", () => {
    expect(resolveUnitForBaseQuantity(boxItem, 0)).toBeNull();
    expect(resolveUnitForBaseQuantity(boxItem, -2)).toBeNull();
  });
});

describe("Excel FIFO line mapping preserves oldest-first order and whole units", () => {
  const boxFactor = 3; // conversionValue for Unit1 (Box)

  const batch = (
    batchNo: string,
    expDate: string,
    qtyBase: number
  ): PharmReciveStockBatch => ({
    batchNo,
    expDate,
    qtyBase,
    salesPrice: 0,
    purshPrice: 0,
    costPrice: 0,
  });

  it("case 4: two batches split 1 Box into whole strips, FIFO order kept", () => {
    const batches = [batch("OLD", "2025-01-01", 1), batch("NEW", "2025-06-01", 2)];
    const lines = allocatePharmReciveFifoReceivingQuantity(1, boxFactor, batches);

    // 1 Box = 3 base strips, consumed oldest → newest.
    expect(lines.map((l) => l.batchNo)).toEqual(["OLD", "NEW"]);
    expect(lines.map((l) => l.stockUsedBase)).toEqual([1, 2]);

    const rows = lines.map((l) => resolveUnitForBaseQuantity(boxItem, l.stockUsedBase));
    expect(rows).toEqual([
      { unitId: 30, qty: 1 }, // OLD batch: 1 Strip
      { unitId: 30, qty: 2 }, // NEW batch: 2 Strips
    ]);
    expect(rows.some((r) => r && Math.abs(r.qty - Math.round(r.qty)) > 0.0001)).toBe(false);
  });

  it("case 1: single full-box batch maps to Box", () => {
    const batches = [batch("A", "2025-01-01", 3)];
    const lines = allocatePharmReciveFifoReceivingQuantity(1, boxFactor, batches);
    expect(resolveUnitForBaseQuantity(boxItem, lines[0]!.stockUsedBase)).toEqual({
      unitId: 10,
      qty: 1,
    });
  });
});
