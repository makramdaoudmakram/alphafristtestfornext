/** Thermal label printer profiles for Print Stock Barcodes. */
export type StockBarcodePrinterProfile = "bixolon-d22" | "zebra-lp2824";

export const STOCK_BARCODE_PRINTER_PROFILES = {
  bixolonD22: "bixolon-d22",
  zebraLp2824: "zebra-lp2824",
} as const satisfies Record<string, StockBarcodePrinterProfile>;
