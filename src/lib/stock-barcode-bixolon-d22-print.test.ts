import { describe, expect, it } from "vitest";
import {
  applyThermalBarcodePhysicalDimensions,
  BIXOLON_D22_DPI,
  BIXOLON_D22_DOTS_PER_MM,
  THERMAL_BARCODE_PRINT_WIDTH_MM,
  THERMAL_LABEL_SIDE_PADDING_MM,
  THERMAL_MIN_MODULE_DOTS,
  buildThermalBarcodePrintPlan,
  countCode128BarModules,
  dotsToMm,
  mmToDots,
} from "@/lib/stock-barcode-bixolon-d22-print";

describe("Bixolon D22 print math", () => {
  it("uses manufacturer 203 dpi (8 dots/mm)", () => {
    expect(BIXOLON_D22_DPI).toBe(203);
    expect(BIXOLON_D22_DOTS_PER_MM).toBeCloseTo(8, 0);
    expect(mmToDots(1)).toBeCloseTo(8, 0);
  });

  it("targets full printable barcode width (zero horizontal margins)", () => {
    expect(THERMAL_BARCODE_PRINT_WIDTH_MM).toBe(38);
    expect(THERMAL_LABEL_SIDE_PADDING_MM).toBe(0);
  });
});

describe("countCode128BarModules", () => {
  it("uses Code Set C module count for 10-digit batch numbers", () => {
    expect(countCode128BarModules("0000005698")).toBe(11 + 5 * 11 + 13);
  });
});

describe("buildThermalBarcodePrintPlan", () => {
  it("encodes the full 10-digit BatchNo in CODE128 with integer module dots", () => {
    const batchNo = "0000005698";
    const plan = buildThermalBarcodePrintPlan(batchNo);
    expect(plan.encodedValue).toBe(batchNo);
    expect(plan.jsOptions.format).toBe("CODE128");
    expect(plan.jsOptions.displayValue).toBe(true);
    expect(plan.jsOptions.width).toBe(Math.floor(plan.jsOptions.width));
    expect(plan.jsOptions.width).toBeGreaterThanOrEqual(THERMAL_MIN_MODULE_DOTS);
    expect(plan.quietZoneDots).toBeGreaterThanOrEqual(
      Math.round(mmToDots(1))
    );
    expect(plan.moduleWidthDots).toBe(plan.jsOptions.width);
  });

  it("uses fixed 2-dot modules and natural width (does not fill 38 mm)", () => {
    const batchNo = "0000005698";
    const plan = buildThermalBarcodePrintPlan(batchNo);
    expect(plan.moduleWidthDots).toBe(THERMAL_MIN_MODULE_DOTS);
    expect(plan.jsOptions.width).toBe(2);
    const naturalDots =
      plan.barModules * plan.moduleWidthDots + plan.quietZoneDots * 2;
    expect(plan.targetPrintWidthMm).toBeCloseTo(dotsToMm(naturalDots), 2);
    expect(plan.targetPrintWidthMm).toBeLessThan(THERMAL_BARCODE_PRINT_WIDTH_MM);
  });

  it("fits short and full-length numeric batch numbers at minimum module width", () => {
    const short = buildThermalBarcodePrintPlan("12345678");
    const ten = buildThermalBarcodePrintPlan("0000012345");
    expect(short.moduleWidthDots).toBe(THERMAL_MIN_MODULE_DOTS);
    expect(ten.moduleWidthDots).toBe(THERMAL_MIN_MODULE_DOTS);
  });

  it("maps dots to millimeters for physical SVG sizing", () => {
    expect(dotsToMm(203)).toBeCloseTo(25.4, 2);
    expect(dotsToMm(mmToDots(38))).toBeCloseTo(38, 1);
  });
});

describe("applyThermalBarcodePhysicalDimensions", () => {
  it("sets SVG width and height in millimeters from dot coordinates without fitScale", () => {
    const plan = buildThermalBarcodePrintPlan("0000000001");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "203");
    svg.setAttribute("height", "40");
    applyThermalBarcodePhysicalDimensions(svg, plan);
    expect(svg.getAttribute("width")).toBe(`${dotsToMm(203)}mm`);
    expect(svg.getAttribute("viewBox")).toBe("0 0 203 40");
    expect(svg.dataset.bixolonDpi).toBe(String(BIXOLON_D22_DPI));
    expect(svg.style.maxWidth).toBe("none");
    expect(svg.style.flexShrink).toBe("0");
    expect(svg.dataset.moduleWidthDots).toBe(String(plan.moduleWidthDots));
  });
});
