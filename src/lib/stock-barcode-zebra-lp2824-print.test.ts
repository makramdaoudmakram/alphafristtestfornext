import { describe, expect, it } from "vitest";
import {
  ZEBRA_LP2824_DPI,
  ZEBRA_LP2824_DOTS_PER_MM,
  ZEBRA_THERMAL_BARCODE_PRINT_WIDTH_MM,
  ZEBRA_THERMAL_MIN_MODULE_DOTS,
  applyZebraThermalBarcodePhysicalDimensions,
  buildZebraThermalBarcodePrintPlan,
} from "@/lib/stock-barcode-zebra-lp2824-print";
import { countCode128BarModules, dotsToMm } from "@/lib/stock-barcode-bixolon-d22-print";

describe("Zebra LP 2824 Plus print profile", () => {
  it("uses 203 dpi and 38 mm label width cap", () => {
    expect(ZEBRA_LP2824_DPI).toBe(203);
    expect(ZEBRA_LP2824_DOTS_PER_MM).toBeCloseTo(8, 0);
    expect(ZEBRA_THERMAL_BARCODE_PRINT_WIDTH_MM).toBe(38);
  });

  it("builds CODE128 plan with 2-dot modules for 10-digit BatchNo", () => {
    const batchNo = "0000005698";
    const plan = buildZebraThermalBarcodePrintPlan(batchNo);
    expect(plan.encodedValue).toBe(batchNo);
    expect(plan.moduleWidthDots).toBe(ZEBRA_THERMAL_MIN_MODULE_DOTS);
    expect(plan.jsOptions.width).toBe(2);
    const naturalDots =
      plan.barModules * plan.moduleWidthDots + plan.quietZoneDots * 2;
    expect(plan.targetPrintWidthMm).toBeCloseTo(dotsToMm(naturalDots), 2);
    expect(plan.targetPrintWidthMm).toBeLessThan(38);
  });

  it("matches Code Set C module estimate with Bixolon helper", () => {
    expect(countCode128BarModules("0000012345")).toBe(11 + 5 * 11 + 13);
  });

  it("tags SVG with Zebra printer datasets", () => {
    const plan = buildZebraThermalBarcodePrintPlan("0000000001");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "178");
    svg.setAttribute("height", "40");
    applyZebraThermalBarcodePhysicalDimensions(svg, plan);
    expect(svg.dataset.zebraDpi).toBe("203");
    expect(svg.dataset.printerProfile).toBe("zebra-lp2824");
    expect(svg.style.maxWidth).toBe("none");
  });
});
