import { describe, expect, it } from "vitest";
import {
  formatBarcodeLabelExpMonthYear,
  formatBarcodeLabelSalesPrice,
  resolveBarcodeLabelDisplayName,
} from "@/lib/stock-barcode-label-format";
import { THERMAL_MIN_MODULE_DOTS } from "@/lib/stock-barcode-bixolon-d22-print";

describe("formatBarcodeLabelExpMonthYear", () => {
  it("formats ISO date as MM/yyyy", () => {
    expect(formatBarcodeLabelExpMonthYear("2027-06-01")).toBe("06/2027");
    expect(formatBarcodeLabelExpMonthYear("2027-06")).toBe("06/2027");
  });

  it("returns null when expiry is missing", () => {
    expect(formatBarcodeLabelExpMonthYear(null)).toBeNull();
    expect(formatBarcodeLabelExpMonthYear("")).toBeNull();
  });
});

describe("resolveBarcodeLabelDisplayName", () => {
  it("prefers English then Arabic then item code", () => {
    expect(
      resolveBarcodeLabelDisplayName({
        itemNameEn: "English",
        itemNameAr: "Arabic",
        itemCode: "X",
      })
    ).toBe("English");
    expect(
      resolveBarcodeLabelDisplayName({
        itemNameEn: "",
        itemNameAr: "Arabic",
        itemCode: "X",
      })
    ).toBe("Arabic");
  });
});

describe("formatBarcodeLabelSalesPrice", () => {
  it("formats with two decimals", () => {
    expect(formatBarcodeLabelSalesPrice(12.5)).toBe("12.50");
  });
});

describe("thermal barcode constants", () => {
  it("keeps minimum module width at scannable dot size", () => {
    expect(THERMAL_MIN_MODULE_DOTS).toBeGreaterThanOrEqual(2);
  });
});
