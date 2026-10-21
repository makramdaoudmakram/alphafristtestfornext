import { describe, expect, it } from "vitest";
import { classifyShiftClosingPreview } from "@/lib/shift-close-blockers";
import type { ShiftClosingPreview } from "@/types/shift";

const baseTotals = {
  salesPostPay: 0,
  salesPostPayDiscount: 0,
  salesMedicalDiscount: 0,
  salesMedicen: 0,
  salesAccessories: 0,
  salesTax: 0,
  salesTragurt: 0,
  salesCostMedicen: 0,
  salesAccessoricCost: 0,
  salesParmCost: 0,
  salesExpensive: 0,
  salesPurches: 0,
};

function preview(
  overrides: Partial<ShiftClosingPreview> = {}
): ShiftClosingPreview {
  return {
    parmId: 1,
    pharmKey: "1",
    scId: 1,
    moveId: 5,
    costCenterCode: "CC",
    costCenterName: "Main",
    shiftStartedAt: null,
    openingBalance: 0,
    canClose: true,
    blockReason: null,
    unresolvedSales: [],
    pendingDeliveries: [],
    totals: baseTotals,
    ...overrides,
  };
}

describe("classifyShiftClosingPreview", () => {
  it("flags pending sales before delivery", () => {
    const result = classifyShiftClosingPreview(
      preview({
        unresolvedSales: [{ sthId: 1, totalBillNet: 10, createdAt: null }],
        pendingDeliveries: [{ sthId: 2, contact: "a", tel: "b", delivStat: "P" }],
      })
    );
    expect(result).toEqual({ ok: false, kind: "pending-sales" });
  });

  it("flags pending delivery when sales are clear", () => {
    const result = classifyShiftClosingPreview(
      preview({
        pendingDeliveries: [{ sthId: 2, contact: "a", tel: "b", delivStat: "P" }],
      })
    );
    expect(result).toEqual({ ok: false, kind: "pending-delivery" });
  });

  it("allows close when both lists are empty", () => {
    const input = preview();
    const result = classifyShiftClosingPreview(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preview).toEqual(input);
    }
  });
});
