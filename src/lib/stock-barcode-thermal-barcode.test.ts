import { describe, expect, it } from "vitest";
import {
  buildThermalBarcodePrintPlan,
  THERMAL_MIN_MODULE_DOTS,
} from "@/lib/stock-barcode-bixolon-d22-print";
import {
  buildThermalBarcodeJsOptions,
  buildThermalBarcodePlanForLabel,
  thermalBarcodeEncodedValue,
} from "@/lib/stock-barcode-label-format";

describe("buildThermalBarcodeJsOptions", () => {
  it("delegates to DPI-aware print plan", () => {
    const value = "B001";
    expect(buildThermalBarcodeJsOptions(value)).toEqual(
      buildThermalBarcodePrintPlan(value).jsOptions
    );
  });
});

describe("thermalBarcodeEncodedValue", () => {
  it("prefers barcodeValue then batchNo without altering digits", () => {
    expect(
      thermalBarcodeEncodedValue({
        barcodeValue: " 12345 ",
        batchNo: "999",
      })
    ).toBe("12345");
    expect(
      thermalBarcodeEncodedValue({ barcodeValue: "", batchNo: " BATCH " })
    ).toBe("BATCH");
  });

  it("builds plan from label DTO fields", () => {
    const plan = buildThermalBarcodePlanForLabel({
      barcodeValue: "X",
      batchNo: "Y",
    });
    expect(plan.encodedValue).toBe("X");
    expect(plan.moduleWidthDots).toBeGreaterThanOrEqual(THERMAL_MIN_MODULE_DOTS);
  });
});
