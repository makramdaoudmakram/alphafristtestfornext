import { describe, expect, it } from "vitest";
import { stockBarcodeExpDateFromApi } from "@/lib/stock-barcode-exp-date-from-api";
import { formatBarcodeLabelExpMonthYear } from "@/lib/stock-barcode-label-format";

describe("stockBarcodeExpDateFromApi", () => {
  it("reads ISO string expiry from API", () => {
    expect(stockBarcodeExpDateFromApi("2030-10-01")).toBe("2030-10-01");
  });

  it("reads DateOnly JSON object from API", () => {
    expect(
      stockBarcodeExpDateFromApi({ year: 2030, month: 10, day: 1 })
    ).toBe("2030-10-01");
    expect(stockBarcodeExpDateFromApi({ Year: 2027, Month: 6 })).toBe(
      "2027-06-01"
    );
  });

  it("formats parsed batch expiry as MM/yyyy for the label", () => {
    const iso = stockBarcodeExpDateFromApi({ year: 2030, month: 10, day: 15 });
    expect(formatBarcodeLabelExpMonthYear(iso)).toBe("10/2030");
  });
});
