/**
 * Zebra LP 2824 Plus — 203 dpi browser print profile (38 × 13 mm labels).
 * Separate from Bixolon D22 sizing; same encoding rules, Zebra-specific datasets.
 */

import { ZEBRA_LP2824_LABEL_WIDTH_MM } from "@/lib/stock-barcode-zebra-lp2824-layout";
import { THERMAL_LABEL_ROW_BARCODE_MM } from "@/lib/stock-barcode-thermal-layout-css";
import {
  countCode128BarModules,
  type ThermalBarcodeJsOptions,
  type ThermalBarcodePrintPlan,
} from "@/lib/stock-barcode-bixolon-d22-print";

export const ZEBRA_LP2824_DPI = 203;
export const ZEBRA_LP2824_DOTS_PER_MM = ZEBRA_LP2824_DPI / 25.4;

export const ZEBRA_THERMAL_LABEL_SIDE_PADDING_MM = 0;

export const ZEBRA_THERMAL_BARCODE_PRINT_WIDTH_MM =
  ZEBRA_LP2824_LABEL_WIDTH_MM - ZEBRA_THERMAL_LABEL_SIDE_PADDING_MM * 2;

export const ZEBRA_THERMAL_QUIET_ZONE_MM = 1.25;
export const ZEBRA_THERMAL_MIN_MODULE_DOTS = 2;
export const ZEBRA_THERMAL_BAR_HEIGHT_MM = 2.6;

export const ZEBRA_THERMAL_BARCODE_TOO_WIDE =
  "Batch barcode does not fit at minimum module width on a 38 mm Zebra label.";

export type ZebraThermalBarcodePrintPlan = ThermalBarcodePrintPlan;

function mmToDots(mm: number): number {
  return mm * ZEBRA_LP2824_DOTS_PER_MM;
}

function dotsToMm(dots: number): number {
  return dots / ZEBRA_LP2824_DOTS_PER_MM;
}

function estimateSvgHeightDots(
  quietZoneDots: number,
  barHeightDots: number,
  fontSizeDots: number,
  textMargin: number
): number {
  return quietZoneDots * 2 + barHeightDots + fontSizeDots + textMargin + 2;
}

export function buildZebraThermalBarcodePrintPlan(
  barcodeValue: string
): ZebraThermalBarcodePrintPlan {
  const encodedValue = barcodeValue.trim();
  const targetWidthDots = mmToDots(ZEBRA_THERMAL_BARCODE_PRINT_WIDTH_MM);
  const quietZoneDots = Math.round(mmToDots(ZEBRA_THERMAL_QUIET_ZONE_MM));
  const barModules = countCode128BarModules(encodedValue);
  const maxHeightDots = mmToDots(THERMAL_LABEL_ROW_BARCODE_MM);

  const availableBarDots = targetWidthDots - quietZoneDots * 2;
  const moduleWidthDots = ZEBRA_THERMAL_MIN_MODULE_DOTS;

  const requiredBarDots = barModules * moduleWidthDots;
  if (requiredBarDots > availableBarDots) {
    throw new Error(ZEBRA_THERMAL_BARCODE_TOO_WIDE);
  }

  let barHeightDots = Math.round(mmToDots(ZEBRA_THERMAL_BAR_HEIGHT_MM));
  let fontSizeDots = Math.max(8, Math.round(mmToDots(0.55)));
  const textMargin = 1;

  const barPatternDots = barModules * moduleWidthDots;
  while (
    encodedValue.length * fontSizeDots * 0.55 > barPatternDots &&
    fontSizeDots > 6
  ) {
    fontSizeDots -= 1;
  }

  while (
    estimateSvgHeightDots(
      quietZoneDots,
      barHeightDots,
      fontSizeDots,
      textMargin
    ) > maxHeightDots &&
    (barHeightDots > 12 || fontSizeDots > 7)
  ) {
    if (barHeightDots > 12) barHeightDots -= 1;
    else if (fontSizeDots > 7) fontSizeDots -= 1;
    else break;
  }

  const jsOptions: ThermalBarcodeJsOptions = {
    format: "CODE128",
    displayValue: true,
    width: moduleWidthDots,
    height: barHeightDots,
    margin: quietZoneDots,
    fontSize: fontSizeDots,
    textMargin,
  };

  const naturalWidthDots =
    barModules * moduleWidthDots + quietZoneDots * 2;

  return {
    encodedValue,
    jsOptions,
    moduleWidthDots,
    quietZoneDots,
    barModules,
    targetPrintWidthMm: dotsToMm(naturalWidthDots),
  };
}

export function applyZebraThermalBarcodePhysicalDimensions(
  svg: SVGSVGElement,
  plan: ZebraThermalBarcodePrintPlan
): void {
  const pixelWidth = parseFloat(svg.getAttribute("width") ?? "");
  const pixelHeight = parseFloat(svg.getAttribute("height") ?? "");
  if (!Number.isFinite(pixelWidth) || !Number.isFinite(pixelHeight)) {
    return;
  }

  const widthMm = dotsToMm(pixelWidth);
  const heightMm = dotsToMm(pixelHeight);
  const maxLabelWidthMm = ZEBRA_THERMAL_BARCODE_PRINT_WIDTH_MM;
  const maxHeightMm = THERMAL_LABEL_ROW_BARCODE_MM;

  if (widthMm > maxLabelWidthMm + 0.5) {
    console.warn(
      "[zebra thermal barcode] SVG wider than label row; check module plan.",
      { widthMm, maxLabelWidthMm, encoded: plan.encodedValue }
    );
  }

  const viewBoxW = Math.max(1, Math.round(pixelWidth));
  const viewBoxH = Math.max(1, Math.round(pixelHeight));
  svg.setAttribute("viewBox", `0 0 ${viewBoxW} ${viewBoxH}`);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("width", `${widthMm}mm`);
  svg.setAttribute("height", `${heightMm}mm`);
  svg.style.width = `${widthMm}mm`;
  svg.style.height = `${heightMm}mm`;
  svg.style.maxWidth = "none";
  svg.style.maxHeight = "none";
  svg.style.display = "block";
  svg.style.margin = "0";
  svg.style.flexShrink = "0";
  svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
  svg.dataset.zebraDpi = String(ZEBRA_LP2824_DPI);
  svg.dataset.printerProfile = "zebra-lp2824";
  svg.dataset.moduleWidthDots = String(plan.moduleWidthDots);
  svg.dataset.barModules = String(plan.barModules);
  svg.dataset.quietZoneDots = String(plan.quietZoneDots);
  svg.dataset.quietZoneMm = dotsToMm(plan.quietZoneDots).toFixed(2);
  svg.dataset.barcodePrintWidthMm = widthMm.toFixed(2);
  svg.dataset.barcodePrintHeightMm = heightMm.toFixed(2);
}
