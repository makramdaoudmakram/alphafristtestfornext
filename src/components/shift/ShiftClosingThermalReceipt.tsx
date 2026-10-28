"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { receiptPrintCss } from "@/components/sales/SalesThermalReceipt";
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
    const timer = window.setTimeout(() => window.print(), 50);
    window.addEventListener("afterprint", onClose);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", onClose);
    };
  }, [autoPrint, onClose]);

  if (typeof document === "undefined") return null;

  const extraCss = `
#sales-receipt-print-root .receipt-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 4px;
  font-size: inherit;
}
#sales-receipt-print-root .receipt-table th,
#sales-receipt-print-root .receipt-table td {
  border: 1px solid #000;
  padding: 2px 3px;
  text-align: left;
  vertical-align: top;
  word-break: break-word;
}
#sales-receipt-print-root .receipt-table th {
  font-weight: 700;
}
#sales-receipt-print-root .receipt-table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
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
        <table className="receipt-table">
          <thead>
            <tr>
              <th>Classification Name</th>
              <th>Value</th>
              <th>Expected</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {receipt.classifications.map((line) => (
              <tr key={line.classificationName}>
                <td dir="auto">{line.classificationName}</td>
                <td className="num">{money(line.value)}</td>
                <td className="num">{money(line.expected)}</td>
                <td className="num">{money(line.difference)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>,
    document.body
  );
}
