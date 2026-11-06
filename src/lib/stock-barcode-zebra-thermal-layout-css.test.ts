import { describe, expect, it } from "vitest";
import { buildZebraStockBarcodePrintCss } from "@/lib/stock-barcode-zebra-thermal-layout-css";
import { ZEBRA_LP2824_LABEL_HEIGHT_MM, ZEBRA_LP2824_LABEL_WIDTH_MM } from "@/lib/stock-barcode-zebra-lp2824-layout";

describe("Zebra stock barcode print CSS", () => {
  it("targets a dedicated print root and fixed 13 mm pages", () => {
    const css = buildZebraStockBarcodePrintCss();
    expect(css).toContain("#stock-barcode-zebra-print-root");
    expect(css).not.toContain("zebra-label-pair");
    expect(css).not.toContain("page-break-after");
    expect(css).toContain(
      `${ZEBRA_LP2824_LABEL_WIDTH_MM}mm ${ZEBRA_LP2824_LABEL_HEIGHT_MM}mm`
    );
    expect(css).not.toContain("#stock-barcode-print-root");
  });
});
