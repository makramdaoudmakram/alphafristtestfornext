import {
  ZEBRA_LP2824_LABEL_HEIGHT_MM,
  ZEBRA_LP2824_LABEL_WIDTH_MM,
} from "@/lib/stock-barcode-zebra-lp2824-layout";
import { buildThermalLabelContentCssForLabel } from "@/lib/stock-barcode-thermal-layout-css";

const ZEBRA_PRINT_ROOT_ID = "stock-barcode-zebra-print-root";

export function buildZebraStockBarcodePrintCss(): string {
  const labelRules = buildThermalLabelContentCssForLabel(
    `#${ZEBRA_PRINT_ROOT_ID}`,
    ZEBRA_LP2824_LABEL_WIDTH_MM,
    ZEBRA_LP2824_LABEL_HEIGHT_MM
  );

  return `
@media print {
  @page {
    size: ${ZEBRA_LP2824_LABEL_WIDTH_MM}mm ${ZEBRA_LP2824_LABEL_HEIGHT_MM}mm;
    margin: 0 !important;
  }
  html,
  body {
    width: ${ZEBRA_LP2824_LABEL_WIDTH_MM}mm !important;
    max-width: ${ZEBRA_LP2824_LABEL_WIDTH_MM}mm !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body > *:not(#${ZEBRA_PRINT_ROOT_ID}) {
    display: none !important;
  }
  #${ZEBRA_PRINT_ROOT_ID} {
    display: block !important;
    position: static !important;
    width: ${ZEBRA_LP2824_LABEL_WIDTH_MM}mm !important;
    max-width: ${ZEBRA_LP2824_LABEL_WIDTH_MM}mm !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  #${ZEBRA_PRINT_ROOT_ID} .stock-barcode-label--thermal {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
#${ZEBRA_PRINT_ROOT_ID} {
  display: none;
  margin: 0;
  padding: 0;
}
${labelRules}
`;
}

export { ZEBRA_PRINT_ROOT_ID };
