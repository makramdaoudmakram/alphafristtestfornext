import { describe, expect, it } from "vitest";
import {
  BIXOLON_D22_LABEL_HEIGHT_MM,
  BIXOLON_D22_LABEL_WIDTH_MM,
  BIXOLON_D22_MEDIA_HEIGHT_MM,
  countBixolonChromePrintPages,
} from "@/lib/stock-barcode-bixolon-layout";
import {
  THERMAL_LABEL_ROW_BARCODE_MM,
  THERMAL_LABEL_ROW_META_MM,
  THERMAL_LABEL_ROW_NAME_MM,
  buildStockBarcodePrintCss,
  buildThermalLabelContentCss,
  buildThermalLabelContentCssForLabel,
} from "@/lib/stock-barcode-thermal-layout-css";

describe("thermal label layout css", () => {
  it("uses fixed rows that sum to 13 mm label height", () => {
    const total =
      THERMAL_LABEL_ROW_NAME_MM +
      THERMAL_LABEL_ROW_META_MM +
      THERMAL_LABEL_ROW_BARCODE_MM;
    expect(total).toBe(BIXOLON_D22_LABEL_HEIGHT_MM);
  });

  it("sets exact 38×13 mm label boxes with zero outer margin", () => {
    const css = buildThermalLabelContentCss("#test-root");
    expect(css).toContain(`width: ${BIXOLON_D22_LABEL_WIDTH_MM}mm`);
    expect(css).toContain(`height: ${BIXOLON_D22_LABEL_HEIGHT_MM}mm`);
    expect(css).toContain("padding: 0");
  });

  it("centers barcode in print root and clamps SVG to barcode row height", () => {
    const css = buildThermalLabelContentCssForLabel(
      "#stock-barcode-print-root",
      38,
      13,
      { centerBarcode: true }
    );
    expect(css).toContain("justify-content: center");
    expect(css).toContain(`max-height: ${THERMAL_LABEL_ROW_BARCODE_MM}mm`);
    expect(css).toContain("overflow: hidden");
  });

  it("uses 38×26 mm @page and 26 mm media pair blocks", () => {
    const css = buildStockBarcodePrintCss();
    expect(css).toContain(
      `size: ${BIXOLON_D22_LABEL_WIDTH_MM}mm ${BIXOLON_D22_MEDIA_HEIGHT_MM}mm`
    );
    expect(css).toContain(".bixolon-media-pair");
    expect(css).toContain(`height: ${BIXOLON_D22_MEDIA_HEIGHT_MM}mm`);
    expect(css).toContain("flex-direction: column");
    expect(css).toContain("gap: 0");
    expect(css).not.toContain("page-break-after");
    expect(css).not.toMatch(/margin-bottom:\s*${BIXOLON_D22_PAIR_GAP_MM}mm/);
    expect(css).not.toContain("padding-bottom:");
  });

  it("print css zeroes page margins", () => {
    const css = buildStockBarcodePrintCss();
    expect(css).toContain("@page");
    expect(css).toContain("margin: 0 !important");
  });
});

describe("countBixolonChromePrintPages", () => {
  it.each([
    [4, 2],
    [5, 3],
  ])("%i labels => %i Chrome pages at 26 mm", (labels, pages) => {
    expect(countBixolonChromePrintPages(labels)).toBe(pages);
  });
});
