"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BIXOLON_D22_LABEL_HEIGHT_MM,
  BIXOLON_D22_LABEL_WIDTH_MM,
  BIXOLON_D22_MEDIA_HEIGHT_MM,
  BIXOLON_D22_MEDIA_PITCH_MM,
  BIXOLON_D22_PAIR_GAP_MM,
  chunkLabelsIntoPairs,
} from "@/lib/stock-barcode-bixolon-layout";
import {
  buildStockBarcodePreviewCss,
  buildStockBarcodePrintCss,
} from "@/lib/stock-barcode-thermal-layout-css";
import { buildZebraStockBarcodePrintCss } from "@/lib/stock-barcode-zebra-thermal-layout-css";
import {
  STOCK_BARCODE_PRINTER_PROFILES,
  type StockBarcodePrinterProfile,
} from "@/lib/stock-barcode-printer-profile";
import type { StockBarcodeLabel } from "@/types/stock";
import { StockBarcodeLabelView } from "@/components/stock/stock-barcode-label";

const BIXOLON_PRINT_CSS = buildStockBarcodePrintCss();
const ZEBRA_PRINT_CSS = buildZebraStockBarcodePrintCss();
const PREVIEW_CSS = buildStockBarcodePreviewCss();

type StockBarcodePrintDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: StockBarcodeLabel[];
};

function renderBixolonPrintLabels(labels: StockBarcodeLabel[]) {
  const pairs = chunkLabelsIntoPairs(labels);
  return pairs.map((pair, pairIndex) => (
    <div
      key={`bixolon-media-${pairIndex}`}
      className={`bixolon-media-pair${pair.length === 1 ? " bixolon-media-pair--single-label" : ""}`}
      data-bixolon-media-index={pairIndex}
      data-bixolon-media-height-mm={BIXOLON_D22_MEDIA_HEIGHT_MM}
    >
      {pair.map((label, labelIndex) => (
        <StockBarcodeLabelView
          key={`print-${label.stockId}-${label.batchNo}-${pairIndex}-${labelIndex}`}
          label={label}
          thermalPrint
          printerProfile={STOCK_BARCODE_PRINTER_PROFILES.bixolonD22}
        />
      ))}
    </div>
  ));
}

function renderZebraPrintLabels(labels: StockBarcodeLabel[]) {
  return labels.map((label, index) => (
    <StockBarcodeLabelView
      key={`print-${label.stockId}-${label.batchNo}-${index}`}
      label={label}
      thermalPrint
      printerProfile={STOCK_BARCODE_PRINTER_PROFILES.zebraLp2824}
    />
  ));
}

export function StockBarcodePrintDialog({
  open,
  onOpenChange,
  labels,
}: StockBarcodePrintDialogProps) {
  const [printProfile, setPrintProfile] =
    useState<StockBarcodePrinterProfile | null>(null);

  useEffect(() => {
    if (printProfile === null) return;

    const timer = window.setTimeout(() => {
      window.print();
    }, 350);

    const onAfterPrint = () => {
      setPrintProfile(null);
    };

    window.addEventListener("afterprint", onAfterPrint);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [printProfile]);

  const startPrint = useCallback(
    (profile: StockBarcodePrinterProfile) => {
      if (labels.length === 0) return;
      setPrintProfile(profile);
    },
    [labels.length]
  );

  const printPortal =
    printProfile !== null && typeof document !== "undefined"
      ? createPortal(
          printProfile === STOCK_BARCODE_PRINTER_PROFILES.bixolonD22 ? (
            <div id="stock-barcode-print-root">
              <style>{BIXOLON_PRINT_CSS}</style>
              {renderBixolonPrintLabels(labels)}
            </div>
          ) : (
            <div id="stock-barcode-zebra-print-root">
              <style>{ZEBRA_PRINT_CSS}</style>
              {renderZebraPrintLabels(labels)}
            </div>
          ),
          document.body
        )
      : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Print stock barcodes</DialogTitle>
            <DialogDescription>
              Choose your printer below. Bixolon uses driver media{" "}
              {BIXOLON_D22_LABEL_WIDTH_MM}×{BIXOLON_D22_MEDIA_HEIGHT_MM} mm (two{" "}
              {BIXOLON_D22_LABEL_WIDTH_MM}×{BIXOLON_D22_LABEL_HEIGHT_MM} mm labels
              per position, {BIXOLON_D22_PAIR_GAP_MM} mm pitch gap on the roll). Print
              at 100% scale with margins <strong>None</strong> and headers/footers
              off. Match the Bixolon driver to {BIXOLON_D22_LABEL_WIDTH_MM}×
              {BIXOLON_D22_MEDIA_HEIGHT_MM} mm media ({BIXOLON_D22_MEDIA_PITCH_MM} mm
              pitch).
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            <style>{PREVIEW_CSS}</style>
            <p className="mb-2 text-sm text-muted-foreground">
              Preview (Bixolon layout, magnified): same grid as print output.
            </p>
            <div className="stock-barcode-bixolon-preview">
              {labels.map((label, index) => (
                <div
                  key={`preview-wrap-${label.stockId}-${index}`}
                  className="bixolon-preview-scale"
                >
                  <StockBarcodeLabelView
                    key={`preview-${label.stockId}-${index}`}
                    label={label}
                    thermalPrint
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() =>
                startPrint(STOCK_BARCODE_PRINTER_PROFILES.bixolonD22)
              }
              disabled={labels.length === 0}
              className="h-auto flex-col items-start gap-0.5 py-2"
            >
              <span className="flex items-center font-semibold">
                <Printer className="mr-2 size-4" />
                Print Bixolon
              </span>
              <span className="pl-6 text-xs font-normal opacity-80">
                Existing working printer
              </span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                startPrint(STOCK_BARCODE_PRINTER_PROFILES.zebraLp2824)
              }
              disabled={labels.length === 0}
              className="h-auto flex-col items-start gap-0.5 py-2"
            >
              <span className="flex items-center font-semibold">
                <Printer className="mr-2 size-4" />
                Print Zebra
              </span>
              <span className="pl-6 text-xs font-normal opacity-80">
                LP 2824 Plus
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printPortal}
    </>
  );
}
