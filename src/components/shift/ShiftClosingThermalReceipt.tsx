"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { receiptPrintCss } from "@/components/sales/SalesThermalReceipt";
import { scheduleThermalBrowserPrint } from "@/lib/thermal-browser-print";
import type { ShiftClosingReceipt } from "@/types/shift-closing-receipt";
import type { ReceiptPaperWidth } from "@/types/sales-receipt";

function money(value: number | null | undefined): string {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return amount.toFixed(2);
}

function formatStartDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

const SUMMARY_ROWS: { label: string; key: keyof ShiftClosingReceipt["summary"]; kind: "text" | "money" | "int" }[] = [
  { label: "Serial", key: "scId", kind: "text" },
  { label: "Start Date", key: "startTime", kind: "text" },
  { label: "Total Sales", key: "totalSales", kind: "text" },
  { label: "Total Return", key: "totalReturn", kind: "money" },
  { label: "Total Expen", key: "totalExpen", kind: "money" },
  { label: "Total Purch", key: "totalPurch", kind: "money" },
  { label: "Total Purch Ret", key: "totalPurchRet", kind: "money" },
  { label: "Delivery Value", key: "deliveryValue", kind: "money" },
  { label: "Delivery Count", key: "deliveryCount", kind: "int" },
  { label: "Total Discount", key: "totalDiscount", kind: "money" },
  { label: "Total Transfer", key: "totalTransfer", kind: "money" },
];

function formatSummaryValue(
  receipt: ShiftClosingReceipt,
  row: (typeof SUMMARY_ROWS)[number]
): string {
  const summary = receipt.summary;
  if (row.key === "scId") return String(summary.scId);
  if (row.key === "startTime") return formatStartDate(summary.startTime);
  if (row.key === "totalSales") return summary.totalSales?.trim() || money(0);
  const raw = summary[row.key];
  if (row.kind === "int") {
    const n = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
    return String(n);
  }
  return money(raw as number | null);
}

export function ShiftClosingThermalReceipt({
  receipt,
  width,
  onClose,
  autoPrint = true,
}: {
  receipt: ShiftClosingReceipt;
  width: ReceiptPaperWidth;
  onClose: () => void;
  autoPrint?: boolean;
}) {
  useEffect(() => {
    if (!autoPrint) return;
    return scheduleThermalBrowserPrint({
      onPrint: () => window.print(),
      onAfterPrint: onClose,
    });
  }, [autoPrint, onClose, receipt]);

  if (typeof document === "undefined") return null;

  const extraCss = `
#sales-receipt-print-root .receipt-classification {
  margin-top: 4px;
  padding-top: 2px;
  border-top: 1px dashed #000;
}
#sales-receipt-print-root .receipt-classification:first-of-type {
  margin-top: 2px;
}
#sales-receipt-print-root .receipt-classification-name {
  font-weight: 700;
  word-break: break-word;
  margin-bottom: 2px;
}
@media print {
  #sales-receipt-print-root,
  #sales-receipt-print-root .receipt-sheet,
  #sales-receipt-print-root .receipt-sheet * {
    visibility: visible !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
`;

  return createPortal(
    <div id="sales-receipt-print-root" data-paper-width={width}>
      <style>{`${receiptPrintCss(width)}${extraCss}`}</style>
      <button type="button" className="no-print close-print" onClick={onClose}>
        Close
      </button>
      <button
        type="button"
        className="no-print close-print"
        style={{ marginLeft: 8 }}
        onClick={() => window.print()}
      >
        Print
      </button>
      <article className="receipt-sheet">
        <header className="receipt-center">
          {receipt.summary.pharmacyName ? (
            <div className="receipt-brand">{receipt.summary.pharmacyName}</div>
          ) : null}
          <div className="receipt-title">SHIFT CLOSING</div>
        </header>
        <div className="receipt-rule" />
        <section>
          {SUMMARY_ROWS.map((row) => (
            <div className="receipt-row" key={row.label}>
              <span>{row.label}</span>
              <span>{formatSummaryValue(receipt, row)}</span>
            </div>
          ))}
        </section>
        <div className="receipt-rule" />
        <section className="receipt-classifications">
          <div className="receipt-center receipt-title" style={{ fontSize: "inherit" }}>
            PAYMENTS
          </div>
          {receipt.classifications.length === 0 ? (
            <div className="receipt-row">
              <span>No payment lines</span>
              <span>—</span>
            </div>
          ) : (
            receipt.classifications.map((line, index) => (
              <div
                className="receipt-classification"
                key={`${line.classificationName}-${index}`}
              >
                <div className="receipt-classification-name" dir="auto">
                  {line.classificationName || "—"}
                </div>
                <div className="receipt-row">
                  <span>Value</span>
                  <span>{money(line.value)}</span>
                </div>
                <div className="receipt-row">
                  <span>Expected</span>
                  <span>{money(line.expected)}</span>
                </div>
                <div className="receipt-row">
                  <span>Difference</span>
                  <span>{money(line.difference)}</span>
                </div>
              </div>
            ))
          )}
        </section>
      </article>
    </div>,
    document.body
  );
}
