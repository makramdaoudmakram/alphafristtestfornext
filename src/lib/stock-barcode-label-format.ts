import type { StockBarcodeLabel } from "@/types/stock";
import {
  buildThermalBarcodePrintPlan,
  type ThermalBarcodePrintPlan,
} from "@/lib/stock-barcode-bixolon-d22-print";
import {
  applyZebraThermalBarcodePhysicalDimensions,
  buildZebraThermalBarcodePrintPlan,
  type ZebraThermalBarcodePrintPlan,
} from "@/lib/stock-barcode-zebra-lp2824-print";

export {
  applyZebraThermalBarcodePhysicalDimensions,
  buildZebraThermalBarcodePrintPlan,
  ZEBRA_LP2824_DPI,
  ZEBRA_THERMAL_MIN_MODULE_DOTS,
  type ZebraThermalBarcodePrintPlan,
} from "@/lib/stock-barcode-zebra-lp2824-print";

export {
  BIXOLON_D22_DPI,
  BIXOLON_D22_DOTS_PER_MM,
  THERMAL_BARCODE_PRINT_WIDTH_MM,
  THERMAL_MIN_MODULE_DOTS,
  applyThermalBarcodePhysicalDimensions,
  buildThermalBarcodePrintPlan,
  estimateCode128ModuleCount,
  type ThermalBarcodePrintPlan,
} from "@/lib/stock-barcode-bixolon-d22-print";

/** @deprecated Use buildThermalBarcodePrintPlan().jsOptions */
export function buildThermalBarcodeJsOptions(barcodeValue: string) {
  return buildThermalBarcodePrintPlan(barcodeValue).jsOptions;
}

/** RDLC-style expiry: MM/yyyy from batch ExpDate (no fallback date). */
export function formatBarcodeLabelExpMonthYear(
  expDate: string | null | undefined
): string | null {
  if (!expDate?.trim()) return null;

  const trimmed = expDate.trim();
  const iso = /^(\d{4})-(\d{2})(?:-\d{2})?/.exec(trimmed);
  if (iso) {
    return `${iso[2]}/${iso[1]}`;
  }

  const slashFull = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (slashFull) {
    return `${slashFull[2]}/${slashFull[3]}`;
  }

  const slashMonth = /^(\d{2})\/(\d{4})$/.exec(trimmed);
  if (slashMonth) {
    return trimmed;
  }

  return null;
}

export function resolveBarcodeLabelDisplayName(label: Pick<
  StockBarcodeLabel,
  "itemNameEn" | "itemNameAr" | "itemCode"
>): string {
  const en = label.itemNameEn?.trim();
  if (en) return en;
  const ar = label.itemNameAr?.trim();
  if (ar) return ar;
  return label.itemCode?.trim() || "—";
}

export function formatBarcodeLabelSalesPrice(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function thermalBarcodeEncodedValue(label: Pick<
  StockBarcodeLabel,
  "barcodeValue" | "batchNo"
>): string {
  const fromDto = label.barcodeValue?.trim();
  if (fromDto) return fromDto;
  return label.batchNo.trim();
}

export function buildThermalBarcodePlanForLabel(
  label: Pick<StockBarcodeLabel, "barcodeValue" | "batchNo">
): ThermalBarcodePrintPlan {
  return buildThermalBarcodePrintPlan(thermalBarcodeEncodedValue(label));
}

export function buildZebraThermalBarcodePlanForLabel(
  label: Pick<StockBarcodeLabel, "barcodeValue" | "batchNo">
): ZebraThermalBarcodePrintPlan {
  return buildZebraThermalBarcodePrintPlan(thermalBarcodeEncodedValue(label));
}
