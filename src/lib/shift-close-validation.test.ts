import { describe, expect, it } from "vitest";
import {
  buildShiftClosePaymentCollection,
  validateShiftCloseForm,
} from "@/lib/shift-close-validation";

describe("validateShiftCloseForm", () => {
  it("accepts valid actual pharmacy cash", () => {
    const result = validateShiftCloseForm({
      actualCash: "100",
    });
    expect(result).toEqual({
      ok: true,
      actual: 100,
    });
  });

  it("accepts decimals up to two places", () => {
    const result = validateShiftCloseForm({
      actualCash: "150.50",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.actual).toBe(150.5);
    }
  });

  it("rejects empty actual cash", () => {
    const result = validateShiftCloseForm({
      actualCash: "",
    });
    expect(result.ok).toBe(false);
  });
});

describe("buildShiftClosePaymentCollection", () => {
  const classifications = [
    { salesClassifyId: 1, displayName: "Cash", salesInvoiceCount: 1 },
    { salesClassifyId: 2, displayName: "Visa", salesInvoiceCount: 1 },
  ];

  it("maps entered amounts by classification id", () => {
    const result = buildShiftClosePaymentCollection(classifications, {
      "1": "2000",
      "2": "1500",
    });
    expect(result).toEqual({
      ok: true,
      paymentCollection: [
        { salesClassifyId: 1, actualAmount: 2000 },
        { salesClassifyId: 2, actualAmount: 1500 },
      ],
    });
  });

  it("treats blank inputs as zero", () => {
    const result = buildShiftClosePaymentCollection(classifications, {
      "1": "",
      "2": "1500",
    });
    expect(result).toEqual({
      ok: true,
      paymentCollection: [
        { salesClassifyId: 1, actualAmount: 0 },
        { salesClassifyId: 2, actualAmount: 1500 },
      ],
    });
  });
});
