"use client";

import { useEffect, useId, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import {
  applyThermalBarcodePhysicalDimensions,
  applyZebraThermalBarcodePhysicalDimensions,
  buildThermalBarcodePlanForLabel,
  buildZebraThermalBarcodePlanForLabel,
  formatBarcodeLabelExpMonthYear,
  formatBarcodeLabelSalesPrice,
  resolveBarcodeLabelDisplayName,
  thermalBarcodeEncodedValue,
} from "@/lib/stock-barcode-label-format";
import type { StockBarcodePrinterProfile } from "@/lib/stock-barcode-printer-profile";
import { STOCK_BARCODE_PRINTER_PROFILES } from "@/lib/stock-barcode-printer-profile";
import {
  BIXOLON_D22_LABEL_HEIGHT_MM,
  BIXOLON_D22_LABEL_WIDTH_MM,
} from "@/lib/stock-barcode-bixolon-layout";
import type { StockBarcodeLabel } from "@/types/stock";

type StockBarcodeLabelViewProps = {
  label: StockBarcodeLabel;
  className?: string;
  /** Compact 38×13 mm layout for Bixolon D22 thermal print output. */
  thermalPrint?: boolean;
  /** Browser print profile; defaults to Bixolon D22. */
  printerProfile?: StockBarcodePrinterProfile;
};

function formatExpDatePreview(expDate: string | null) {
  const monthYear = formatBarcodeLabelExpMonthYear(expDate);
  if (monthYear) return monthYear;
  if (!expDate?.trim()) return null;
  const trimmed = expDate.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [year, month, day] = trimmed.slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  }
  return trimmed;
}

export function StockBarcodeLabelView({
  label,
  className,
  thermalPrint = false,
  printerProfile = STOCK_BARCODE_PRINTER_PROFILES.bixolonD22,
}: StockBarcodeLabelViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const titleId = useId();
  const itemName = resolveBarcodeLabelDisplayName(label);
  const expMonthYear = formatBarcodeLabelExpMonthYear(label.expDate);
  const expPreview = formatExpDatePreview(label.expDate);
  const encodedValue = thermalBarcodeEncodedValue(label);
  const [barcodeRenderError, setBarcodeRenderError] = useState<string | null>(
    null
  );

  useEffect(() => {
    const node = svgRef.current;
    if (!node || !encodedValue) {
      setBarcodeRenderError(
        encodedValue ? null : "Barcode value is missing."
      );
      return;
    }

    setBarcodeRenderError(null);

    try {
      if (thermalPrint) {
        if (printerProfile === STOCK_BARCODE_PRINTER_PROFILES.zebraLp2824) {
          const plan = buildZebraThermalBarcodePlanForLabel(label);
          JsBarcode(node, plan.encodedValue, plan.jsOptions);
          applyZebraThermalBarcodePhysicalDimensions(node, plan);
        } else {
          const plan = buildThermalBarcodePlanForLabel(label);
          JsBarcode(node, plan.encodedValue, plan.jsOptions);
          applyThermalBarcodePhysicalDimensions(node, plan);
        }
      } else {
        JsBarcode(node, encodedValue, {
          format: "CODE128",
          displayValue: true,
          fontSize: 14,
          height: 48,
          margin: 8,
          textMargin: 4,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Barcode generation failed.";
      setBarcodeRenderError(message);
      node.innerHTML = "";
      if (process.env.NODE_ENV !== "production") {
        console.error("[StockBarcodeLabelView] JsBarcode failed:", error);
      }
    }
  }, [encodedValue, label, printerProfile, thermalPrint]);

  const showThermalSalesPrice = Number.isFinite(label.salesPrice);

  if (thermalPrint) {
    return (
      <article
        className={`stock-barcode-label stock-barcode-label--thermal bg-white text-black ${className ?? ""}`}
        data-label-width-mm={BIXOLON_D22_LABEL_WIDTH_MM}
        data-label-height-mm={BIXOLON_D22_LABEL_HEIGHT_MM}
      >
        <p
          className="thermal-name w-full"
          dir="auto"
          data-testid="thermal-product-name"
        >
          {itemName}
        </p>

        <div
          className="thermal-meta w-full"
          data-testid="thermal-meta-row"
        >
          <span
            className="thermal-exp min-w-0"
            dir="ltr"
            data-testid="thermal-expiry"
          >
            {expMonthYear ?? ""}
          </span>
          {showThermalSalesPrice ? (
            <span
              className="thermal-price shrink-0 tabular-nums"
              data-testid="thermal-sales-price"
            >
              {formatBarcodeLabelSalesPrice(label.salesPrice)}
            </span>
          ) : (
            <span className="thermal-price shrink-0" aria-hidden />
          )}
        </div>

        <div
          className="thermal-barcode-wrap"
          data-testid="thermal-barcode-wrap"
        >
          {barcodeRenderError ? (
            <p
              className="thermal-barcode-error"
              data-testid="thermal-barcode-error"
              role="alert"
            >
              {barcodeRenderError}
            </p>
          ) : null}
          {barcodeRenderError ? null : (
          <svg
            ref={svgRef}
            role="img"
            aria-label={`Barcode ${encodedValue}`}
            className="thermal-barcode"
            data-encoded-value={encodedValue}
          />
          )}
        </div>
      </article>
    );
  }

  return (
    <article
      className={`stock-barcode-label flex w-[220px] flex-col items-center rounded border bg-white p-3 text-center text-black ${className ?? ""}`}
    >
      <h3 id={titleId} className="text-sm font-semibold leading-tight" dir="auto">
        {itemName}
      </h3>
      <p className="text-xs text-neutral-600">{label.itemCode}</p>
      {expPreview ? (
        <p className="text-xs text-neutral-600">Exp: {expPreview}</p>
      ) : null}
      {label.allowPrintBarcode ? (
        <p className="text-xs text-neutral-600">
          Price: {formatBarcodeLabelSalesPrice(label.salesPrice)}
        </p>
      ) : null}
      <svg
        ref={svgRef}
        role="img"
        aria-labelledby={titleId}
        className="mt-2 max-w-full"
      />
    </article>
  );
}

export function stockBatchToBarcodeLabel(batch: {
  id: number;
  batchNo: string;
  itemCode: string;
  itemNameAr: string | null;
  itemNameEn: string | null;
  storeId: number;
  expDate: string | null;
  qty: number;
  salesPrice: number;
  allowPrintBarcode?: boolean;
}): StockBarcodeLabel {
  return {
    stockId: batch.id,
    batchNo: batch.batchNo,
    barcodeValue: batch.batchNo.trim(),
    itemCode: batch.itemCode,
    itemNameAr: batch.itemNameAr,
    itemNameEn: batch.itemNameEn,
    storeId: batch.storeId,
    expDate: batch.expDate,
    qty: batch.qty,
    salesPrice: batch.salesPrice,
    allowPrintBarcode: batch.allowPrintBarcode ?? false,
  };
}
