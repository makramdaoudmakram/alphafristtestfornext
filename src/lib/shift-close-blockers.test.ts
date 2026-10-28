import { describe, expect, it } from "vitest";
import {
  getShiftCloseWarningMessages,
  hasShiftCloseBlockers,
  SHIFT_CLOSE_PENDING_DELIVERIES_WARNING,
  SHIFT_CLOSE_PENDING_INVOICES_WARNING,
} from "@/lib/shift-close-blockers";
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
  salesReturnTotal: 0,
  purchaseReturnTotal: 0,
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

describe("shift close blockers", () => {
  it("reports both warnings when invoices and deliveries are pending", () => {
    const input = preview({
      canClose: false,
      unresolvedSales: [{ sthId: 1, totalBillNet: 10, createdAt: null }],
      pendingDeliveries: [{ sthId: 2, contact: "a", tel: "b", delivStat: "P" }],
    });
    expect(hasShiftCloseBlockers(input)).toBe(true);
    expect(getShiftCloseWarningMessages(input)).toEqual([
      SHIFT_CLOSE_PENDING_INVOICES_WARNING,
      SHIFT_CLOSE_PENDING_DELIVERIES_WARNING,
    ]);
  });

  it("reports delivery warning only when sales are clear", () => {
    const input = preview({
      pendingDeliveries: [{ sthId: 2, contact: "a", tel: "b", delivStat: "P" }],
    });
    expect(hasShiftCloseBlockers(input)).toBe(true);
    expect(getShiftCloseWarningMessages(input)).toEqual([
      SHIFT_CLOSE_PENDING_DELIVERIES_WARNING,
    ]);
  });

  it("reports no warnings when both lists are empty", () => {
    const input = preview();
    expect(hasShiftCloseBlockers(input)).toBe(false);
    expect(getShiftCloseWarningMessages(input)).toEqual([]);
  });
});
