/**
 * Bixolon SLP-D220 (D22) prints at 203 dpi = 8 dots/mm per manufacturer spec.
 * JsBarcode options use the same dot units so SVG mm sizing maps 1:1 at print time.
 */

import { BIXOLON_D22_LABEL_WIDTH_MM } from "@/lib/stock-barcode-bixolon-layout";
import { THERMAL_LABEL_ROW_BARCODE_MM } from "@/lib/stock-barcode-thermal-layout-css";

export const BIXOLON_D22_DPI = 203;
export const BIXOLON_D22_DOTS_PER_MM = BIXOLON_D22_DPI / 25.4;

/** No horizontal padding — label content uses full printable width (see layout constant). */
export const THERMAL_LABEL_SIDE_PADDING_MM = 0;

/** Target printed symbol width (bars + quiet zones), equal to label width. */
export const THERMAL_BARCODE_PRINT_WIDTH_MM =
  BIXOLON_D22_LABEL_WIDTH_MM - THERMAL_LABEL_SIDE_PADDING_MM * 2;

/** Quiet zone each side (~10 dots @ 203 dpi). */
export const THERMAL_QUIET_ZONE_MM = 1.25;

/** Minimum narrow-module width for reliable handheld scanning @ 203 dpi. */
export const THERMAL_MIN_MODULE_DOTS = 2;

export const THERMAL_MAX_MODULE_DOTS = 3;

export const THERMAL_BARCODE_TOO_WIDE = `Batch barcode does not fit at minimum module width on a ${BIXOLON_D22_LABEL_WIDTH_MM} mm label.`;

/** Bar height only (human-readable text is additional). */
export const THERMAL_BAR_HEIGHT_MM = 2.6;

export type ThermalBarcodeJsOptions = {
  format: "CODE128";
  displayValue: boolean;
  width: number;
  height: number;
  margin: number;
  fontSize: number;
  textMargin: number;
};

export type ThermalBarcodePrintPlan = {
  encodedValue: string;
  jsOptions: ThermalBarcodeJsOptions;
  moduleWidthDots: number;
  quietZoneDots: number;
  barModules: number;
  targetPrintWidthMm: number;
};

/**
 * CODE128 bar-module count (bars only, not quiet zones).
 * Numeric values prefer Code Set C (pairs); odd trailing digit uses a B latch.
 */
export function countCode128BarModules(value: string): number {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 11 + 13;

  if (/^\d+$/.test(trimmed)) {
    const pairs = Math.floor(trimmed.length / 2);
    let modules = 11 + 13 + pairs * 11;
    if (trimmed.length % 2 === 1) {
      modules += 11 + 11;
    }
    return modules;
  }

  return 11 + trimmed.length * 11 + 13;
}

/** @deprecated Use countCode128BarModules for 10-digit batch numbers. */
export function estimateCode128ModuleCount(value: string): number {
  return countCode128BarModules(value);
}

export function mmToDots(mm: number): number {
  return mm * BIXOLON_D22_DOTS_PER_MM;
}

export function dotsToMm(dots: number): number {
  return dots / BIXOLON_D22_DOTS_PER_MM;
}

function estimateSvgHeightDots(
  quietZoneDots: number,
  barHeightDots: number,
  fontSizeDots: number,
  textMargin: number
): number {
  return quietZoneDots * 2 + barHeightDots + fontSizeDots + textMargin + 2;
}

export function buildThermalBarcodePrintPlan(
  barcodeValue: string
): ThermalBarcodePrintPlan {
  const encodedValue = barcodeValue.trim();
  const targetPrintWidthMm = THERMAL_BARCODE_PRINT_WIDTH_MM;
  const targetWidthDots = mmToDots(targetPrintWidthMm);
  const quietZoneDots = Math.round(mmToDots(THERMAL_QUIET_ZONE_MM));
  const barModules = countCode128BarModules(encodedValue);
  const maxHeightDots = mmToDots(THERMAL_LABEL_ROW_BARCODE_MM);

  const availableBarDots = targetWidthDots - quietZoneDots * 2;
  const moduleWidthDots = THERMAL_MIN_MODULE_DOTS;

  const requiredBarDots = barModules * moduleWidthDots;
  if (requiredBarDots > availableBarDots) {
    throw new Error(THERMAL_BARCODE_TOO_WIDE);
  }

  let barHeightDots = Math.round(mmToDots(THERMAL_BAR_HEIGHT_MM));
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

/** Map JsBarcode dot coordinates to physical millimeters (intrinsic size only — no stretch). */
export function applyThermalBarcodePhysicalDimensions(
  svg: SVGSVGElement,
  plan: ThermalBarcodePrintPlan
): void {
  const pixelWidth = parseFloat(svg.getAttribute("width") ?? "");
  const pixelHeight = parseFloat(svg.getAttribute("height") ?? "");
  if (!Number.isFinite(pixelWidth) || !Number.isFinite(pixelHeight)) {
    return;
  }

  const widthMm = dotsToMm(pixelWidth);
  const heightMm = dotsToMm(pixelHeight);
  const maxLabelWidthMm = THERMAL_BARCODE_PRINT_WIDTH_MM;
  const maxHeightMm = THERMAL_LABEL_ROW_BARCODE_MM;

  if (widthMm > maxLabelWidthMm + 0.5) {
    console.warn(
      "[thermal barcode] SVG wider than label row; bars may be clipped — check module plan.",
      { widthMm, maxLabelWidthMm, encoded: plan.encodedValue }
    );
  }
  if (heightMm > maxHeightMm + 0.5) {
    console.warn("[thermal barcode] SVG taller than barcode row.", {
      heightMm,
      maxHeightMm,
    });
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
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.dataset.bixolonDpi = String(BIXOLON_D22_DPI);
  svg.dataset.moduleWidthDots = String(plan.moduleWidthDots);
  svg.dataset.barModules = String(plan.barModules);
  svg.dataset.quietZoneDots = String(plan.quietZoneDots);
  svg.dataset.quietZoneMm = dotsToMm(plan.quietZoneDots).toFixed(2);
  svg.dataset.barcodePrintWidthMm = widthMm.toFixed(2);
  svg.dataset.barcodePrintHeightMm = heightMm.toFixed(2);
}
