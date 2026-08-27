"use client";

import { useEffect, useId, useRef } from "react";
import JsBarcode from "jsbarcode";
import type { StockBarcodeLabel } from "@/types/stock";

type StockBarcodeLabelViewProps = {
  label: StockBarcodeLabel;
  className?: string;
};

function displayName(label: StockBarcodeLabel) {
  return label.itemNameEn?.trim() || label.itemNameAr?.trim() || label.itemCode;
}

function formatExpDate(expDate: string | null) {
  if (!expDate?.trim()) return null;
  const trimmed = expDate.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const [year, month] = trimmed.split("-");
    return `${month}/${year}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [year, month, day] = trimmed.slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  }
  return trimmed;
}

function formatSalesPrice(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function StockBarcodeLabelView({ label, className }: StockBarcodeLabelViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const titleId = useId();
  const expDisplay = formatExpDate(label.expDate);

  useEffect(() => {
    const node = svgRef.current;
    if (!node || !label.barcodeValue) return;

    try {
      JsBarcode(node, label.barcodeValue, {
        format: "CODE128",
        displayValue: true,
        fontSize: 14,
        height: 48,
        margin: 8,
        textMargin: 4,
      });
    } catch {
      node.innerHTML = "";
    }
  }, [label.barcodeValue]);

  return (
    <article
      className={`stock-barcode-label flex w-[220px] flex-col items-center rounded border bg-white p-3 text-center text-black ${className ?? ""}`}
    >
      <h3 id={titleId} className="text-sm font-semibold leading-tight">
        {displayName(label)}
      </h3>
      <p className="text-xs text-neutral-600">{label.itemCode}</p>
      {expDisplay ? (
        <p className="text-xs text-neutral-600">Exp: {expDisplay}</p>
      ) : null}
      {label.allowPrintBarcode ? (
        <p className="text-xs text-neutral-600">Price: {formatSalesPrice(label.salesPrice)}</p>
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
