import {
  BIXOLON_D22_LABEL_HEIGHT_MM,
  BIXOLON_D22_LABEL_WIDTH_MM,
  BIXOLON_D22_MEDIA_HEIGHT_MM,
  BIXOLON_D22_MEDIA_PITCH_MM,
  BIXOLON_D22_PAIR_GAP_MM,
} from "@/lib/stock-barcode-bixolon-layout";

/** Fixed rows — must sum to {@link BIXOLON_D22_LABEL_HEIGHT_MM}. */
export const THERMAL_LABEL_ROW_NAME_MM = 3.5;
export const THERMAL_LABEL_ROW_META_MM = 3;
export const THERMAL_LABEL_ROW_BARCODE_MM = 6.5;

export function assertThermalLabelRowHeights(): void {
  const total =
    THERMAL_LABEL_ROW_NAME_MM +
    THERMAL_LABEL_ROW_META_MM +
    THERMAL_LABEL_ROW_BARCODE_MM;
  if (Math.abs(total - BIXOLON_D22_LABEL_HEIGHT_MM) > 0.001) {
    throw new Error(
      `Thermal label rows must sum to ${BIXOLON_D22_LABEL_HEIGHT_MM}mm, got ${total}mm`
    );
  }
}

/** Shared label content rules — preview and print use the same selectors. */
export function buildThermalLabelContentCssForLabel(
  rootSelector: string,
  labelWidthMm: number,
  labelHeightMm: number,
  options?: { centerBarcode?: boolean }
): string {
  assertThermalLabelRowHeights();
  const barcodeJustify = options?.centerBarcode
    ? "justify-content: center;"
    : "justify-content: flex-start;";

  return `
${rootSelector} .stock-barcode-label--thermal {
  width: ${labelWidthMm}mm;
  max-width: ${labelWidthMm}mm;
  height: ${labelHeightMm}mm;
  min-height: ${labelHeightMm}mm;
  max-height: ${labelHeightMm}mm;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: ${THERMAL_LABEL_ROW_NAME_MM}mm ${THERMAL_LABEL_ROW_META_MM}mm ${THERMAL_LABEL_ROW_BARCODE_MM}mm;
  grid-template-columns: 1fr;
  align-content: start;
  overflow: hidden;
  background: #fff;
  color: #000;
}
${rootSelector} .thermal-name {
  margin: 0;
  padding: 0;
  font-size: 6.5pt;
  font-weight: 600;
  line-height: 1.08;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  unicode-bidi: plaintext;
  word-break: break-word;
}
${rootSelector} .thermal-meta {
  margin: 0;
  padding: 0 2mm 0 0;
  box-sizing: border-box;
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) minmax(13mm, max-content);
  align-items: center;
  column-gap: 0.5mm;
  overflow: visible;
}
${rootSelector} .thermal-exp {
  margin: 0;
  padding: 0;
  font-size: 7.5pt;
  font-weight: 600;
  line-height: 1.05;
  text-align: left;
  white-space: nowrap;
  overflow: visible;
}
${rootSelector} .thermal-price {
  margin: 0;
  padding: 0;
  min-width: 13mm;
  font-size: 8.5pt;
  font-weight: 700;
  line-height: 1.05;
  text-align: left;
  white-space: nowrap;
  overflow: visible;
  justify-self: start;
}
${rootSelector} .thermal-barcode-wrap {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  max-height: ${THERMAL_LABEL_ROW_BARCODE_MM}mm;
  display: flex;
  align-items: center;
  ${barcodeJustify}
  overflow: hidden;
}
${rootSelector} .thermal-barcode {
  display: block;
  margin: 0;
  flex: 0 0 auto;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: ${THERMAL_LABEL_ROW_BARCODE_MM}mm;
}
${rootSelector} .thermal-barcode-error {
  margin: 0;
  padding: 0;
  font-size: 6pt;
  line-height: 1.1;
  color: #b91c1c;
  text-align: center;
}
`;
}

export function buildThermalLabelContentCss(rootSelector: string): string {
  return buildThermalLabelContentCssForLabel(
    rootSelector,
    BIXOLON_D22_LABEL_WIDTH_MM,
    BIXOLON_D22_LABEL_HEIGHT_MM
  );
}

/**
 * Bixolon driver media: 38×26 mm per Chrome page (two 13 mm labels).
 * 4 mm pitch gap is outside the 26 mm area (printer media setting, not a CSS page).
 */
export function buildStockBarcodePrintCss(): string {
  const labelRules = buildThermalLabelContentCssForLabel(
    "#stock-barcode-print-root",
    BIXOLON_D22_LABEL_WIDTH_MM,
    BIXOLON_D22_LABEL_HEIGHT_MM,
    { centerBarcode: true }
  );

  return `
@media print {
  @page {
    size: ${BIXOLON_D22_LABEL_WIDTH_MM}mm ${BIXOLON_D22_MEDIA_HEIGHT_MM}mm;
    margin: 0 !important;
  }
  html,
  body {
    width: ${BIXOLON_D22_LABEL_WIDTH_MM}mm !important;
    max-width: ${BIXOLON_D22_LABEL_WIDTH_MM}mm !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body > *:not(#stock-barcode-print-root) {
    display: none !important;
  }
  #stock-barcode-print-root {
    display: block !important;
    position: static !important;
    width: ${BIXOLON_D22_LABEL_WIDTH_MM}mm !important;
    max-width: ${BIXOLON_D22_LABEL_WIDTH_MM}mm !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  #stock-barcode-print-root .bixolon-media-pair {
    width: ${BIXOLON_D22_LABEL_WIDTH_MM}mm;
    height: ${BIXOLON_D22_MEDIA_HEIGHT_MM}mm;
    min-height: ${BIXOLON_D22_MEDIA_HEIGHT_MM}mm;
    max-height: ${BIXOLON_D22_MEDIA_HEIGHT_MM}mm;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  #stock-barcode-print-root .bixolon-media-pair--single-label {
    justify-content: flex-start;
  }
  #stock-barcode-print-root .stock-barcode-label--thermal {
    flex-shrink: 0;
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
#stock-barcode-print-root {
  display: none;
  margin: 0;
  padding: 0;
}
#stock-barcode-print-root .bixolon-media-pair {
  width: ${BIXOLON_D22_LABEL_WIDTH_MM}mm;
  height: ${BIXOLON_D22_MEDIA_HEIGHT_MM}mm;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0;
}
${labelRules}
`;
}

export function buildStockBarcodePreviewCss(): string {
  const labelRules = buildThermalLabelContentCss(
    ".stock-barcode-bixolon-preview"
  );

  return `
.stock-barcode-bixolon-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.stock-barcode-bixolon-preview .bixolon-preview-scale {
  transform: scale(2.4);
  transform-origin: top left;
  margin-right: calc(${BIXOLON_D22_LABEL_WIDTH_MM}mm * 1.45);
  margin-bottom: calc(${BIXOLON_D22_LABEL_HEIGHT_MM}mm * 1.45);
}
.stock-barcode-bixolon-preview .stock-barcode-label--thermal {
  border: 1px dashed #888;
}
${labelRules}
`;
}

export {
  BIXOLON_D22_MEDIA_HEIGHT_MM,
  BIXOLON_D22_MEDIA_PITCH_MM,
  BIXOLON_D22_PAIR_GAP_MM,
};
