import { describe, expect, it } from "vitest";
import {
  applyPharmPurchaseDetailPatch,
  computePharmPurchaseCost,
  computePharmPurchaseDiscAmount,
  computePharmPurchaseHeaderTotals,
  computePharmPurchaseLineTotal,
  computePharmPurchaseNet,
  computeTotalDiscount,
  computeTotalSalesValue,
  recalculatePharmPurchaseDetailRow,
} from "@/lib/pharm-purchase-calculations";
import { createEmptyDetailRow } from "@/lib/purchase.mapper";
import type { PurchaseDetail } from "@/types/purchase";

function row(overrides: Partial<PurchaseDetail> = {}): PurchaseDetail {
  return {
    ...createEmptyDetailRow("7"),
    itmId: "ITM-1",
    qnty: 1,
    itmPurPrice: 0,
    itmSell: 0,
    ...overrides,
  };
}

function rec(overrides: Partial<PurchaseDetail> = {}): PurchaseDetail {
  return recalculatePharmPurchaseDetailRow(row(overrides));
}

describe("pharm purchase detail calculations", () => {
  it("uses the sales price as the calculation base when there is no discount", () => {
    const line = rec({ itmSell: 10, qnty: 3, itmPurPrice: 4 });

    expect(line.itmDisMon).toBe(0);
    expect(line.itmNet).toBe(30);
    expect(line.lineTotal).toBe(30);
    expect(line.itmCost).toBe(4);
  });

  it("takes the discount percentage from the sales price, not the purchase price", () => {
    // Purchase-price math would give a 20 discount and a 180 net.
    const line = rec({ itmSell: 10, qnty: 2, itmPurPrice: 100, itmDisPer: 10 });

    expect(line.itmDisMon).toBe(2);
    expect(line.itmNet).toBe(18);
    expect(computePharmPurchaseNet(line)).toBe(18);
  });

  it("recomputes the fixed discount amount on the sales subtotal", () => {
    const line = rec({ itmSell: 20, qnty: 5, itmPurPrice: 60, itmDisPer: 25, itmDisMon: 999 });

    expect(line.itmDisMon).toBe(25);
    expect(line.itmNet).toBe(75);
  });

  it("applies percentage and fixed discount once, not twice", () => {
    const line = rec({ itmSell: 10, qnty: 4, itmDisPer: 10, itmDisMon: 40, itmNet: 999 });

    // Subtotal 40 - 4 = 36. Stacking both discounts would be 32.
    expect(line.itmDisMon).toBe(4);
    expect(line.itmNet).toBe(36);
    expect(line.itmNet).toBe(line.lineTotal);
  });

  it("never folds an additional discount into the net", () => {
    const line = rec({ itmSell: 10, qnty: 3, itmDisPer: 10, itmExtraDis: 5 });

    expect(line.itmExtraDis).toBe(0);
    expect(line.itmDisMon).toBe(3);
    expect(line.itmNet).toBe(27);
  });

  it("recalculates the line net and the document totals immediately on edit", () => {
    const initial = rec({ itmSell: 10, qnty: 2, itmPurPrice: 10 });
    expect(initial.itmNet).toBe(20);

    const afterSalesPrice = applyPharmPurchaseDetailPatch(initial, { itmSell: 15 });
    expect(afterSalesPrice.itmNet).toBe(30);
    expect(afterSalesPrice.lineTotal).toBe(30);

    const afterDiscount = applyPharmPurchaseDetailPatch(afterSalesPrice, { itmDisPer: 50 });
    expect(afterDiscount.itmDisMon).toBe(15);
    expect(afterDiscount.itmNet).toBe(15);
    expect(computeTotalDiscount([afterDiscount])).toBe(15);
    expect(computePharmPurchaseHeaderTotals([afterDiscount]).pthNetBill).toBe(15);
  });

  it("sums sales-based line nets into the document totals", () => {
    const lines = [
      rec({ itmId: "A", itmSell: 10, qnty: 3, bonus: 1, itmPurPrice: 8 }),
      rec({ itmId: "B", itmSell: 20, qnty: 2, itmPurPrice: 5, itmDisPer: 10 }),
      rec({ itmId: "B", itmSell: 5, qnty: 4, itmPurPrice: 5, itmDisPer: 25 }),
    ];

    const totals = computePharmPurchaseHeaderTotals(lines);

    expect(lines.map((line) => line.itmNet)).toEqual([30, 36, 15]);
    expect(totals.totalBill).toBe(81);
    expect(totals.pthNetBill).toBe(81);
    expect(totals.totalDesMon).toBe(9);
    expect(totals.noOfItems).toBe(2);
    expect(totals.totalQuantity).toBe(10);
    expect(totals.totalTax).toBe(0);
    expect(computeTotalSalesValue(lines)).toBe(90);
    expect(totals.totalBill).toBe(lines.reduce((sum, line) => sum + line.itmNet, 0));
  });

  it("keeps the purchase price for the recorded unit cost only", () => {
    const line = row({ itmSell: 10, qnty: 2, itmPurPrice: 100, itmDisPer: 10 });

    expect(computePharmPurchaseCost(line)).toBe(90);
    expect(computePharmPurchaseNet(line)).toBe(18);
    expect(computePharmPurchaseLineTotal(line)).toBe(18);
  });

  it("returns zero net for a zero sales price", () => {
    const line = rec({ itmSell: 0, qnty: 4, itmPurPrice: 50, itmDisPer: 10 });

    expect(line.itmDisMon).toBe(0);
    expect(line.itmNet).toBe(0);
    expect(line.itmCost).toBe(45);
  });

  it("clamps discounts so the net never goes negative", () => {
    expect(computePharmPurchaseDiscAmount(row({ itmSell: 10, qnty: 2, itmDisPer: 150 }))).toBe(20);
    expect(rec({ itmSell: 10, qnty: 2, itmDisPer: 150 }).itmNet).toBe(0);

    const totals = computePharmPurchaseHeaderTotals([
      rec({ itmSell: 10, qnty: 2, itmDisPer: 300 }),
    ]);
    expect(totals.totalBill).toBe(0);
    expect(totals.pthNetBill).toBe(0);
    expect(totals.totalDesMon).toBe(20);
  });

  it("ignores invalid negative discount and price values", () => {
    const negativePercent = rec({ itmSell: 10, qnty: 2, itmDisPer: -20 });
    expect(negativePercent.itmDisMon).toBe(0);
    expect(negativePercent.itmNet).toBe(20);

    const negativePrice = rec({ itmSell: -10, qnty: 2 });
    expect(negativePrice.itmDisMon).toBe(0);
    expect(negativePrice.itmNet).toBe(0);
  });
});
