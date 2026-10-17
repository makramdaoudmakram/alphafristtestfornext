"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type {
  ReceiptPaperWidth,
  SalesReceipt,
  SalesReceiptLine,
} from "@/types/sales-receipt";

function money(value: number | null | undefined): string {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return amount.toFixed(2);
}

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : money(value);
}

/**
 * Thermal print isolation: @page takes the physical paper width, everything outside
 * the receipt root is hidden while printing. Margins are 0 because thermal rolls have
 * no printable border; the sheet carries its own padding.
 */
export function receiptPrintCss(width: ReceiptPaperWidth): string {
  const baseFont = width >= 80 ? "11px" : "9.5px";
  return `
@page {
  size: ${width}mm auto;
  margin: 0;
}
@media screen {
  #sales-receipt-print-root {
    position: fixed;
    inset: 0;
    z-index: 90;
    overflow: auto;
    background: #e7e5e4;
    padding: 24px 16px 48px;
  }
}
@media print {
  body > *:not(#sales-receipt-print-root) {
    display: none !important;
  }
  #sales-receipt-print-root {
    display: block !important;
    position: static !important;
    background: #fff !important;
    padding: 0 !important;
    overflow: visible !important;
  }
  #sales-receipt-print-root .no-print {
    display: none !important;
  }
}
#sales-receipt-print-root .receipt-sheet {
  width: ${width}mm;
  margin: 0 auto;
  box-sizing: border-box;
  padding: ${width >= 80 ? "3mm" : "2mm"};
  background: #fff;
  color: #000;
  font-family: "Segoe UI", Tahoma, "Noto Naskh Arabic", "Traditional Arabic", Arial, sans-serif;
  font-size: ${baseFont};
  line-height: 1.35;
}
#sales-receipt-print-root .receipt-center {
  text-align: center;
}
#sales-receipt-print-root .receipt-brand {
  font-size: ${width >= 80 ? "14px" : "12px"};
  font-weight: 700;
  word-break: break-word;
}
#sales-receipt-print-root .receipt-title {
  font-weight: 700;
  letter-spacing: 0.12em;
  margin-top: 2px;
}
#sales-receipt-print-root .receipt-rule {
  border-top: 1px dashed #000;
  margin: 4px 0;
}
#sales-receipt-print-root .receipt-row {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}
#sales-receipt-print-root .receipt-row span:first-child {
  min-width: 0;
  word-break: break-word;
}
#sales-receipt-print-root .receipt-row span:last-child {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
#sales-receipt-print-root .receipt-item-name {
  word-break: break-word;
}
#sales-receipt-print-root .receipt-item + .receipt-item {
  margin-top: 3px;
}
#sales-receipt-print-root .receipt-totals .grand {
  font-weight: 700;
  font-size: ${width >= 80 ? "12px" : "10.5px"};
  border-top: 2px solid #000;
  margin-top: 3px;
  padding-top: 3px;
}
#sales-receipt-print-root .close-print {
  display: block;
  margin: 0 auto 12px;
  border: 1px solid #222;
  background: #fff;
  padding: 6px 14px;
  cursor: pointer;
}
`;
}

export function SalesThermalReceipt({
  receipt,
  width,
  onClose,
}: {
  receipt: SalesReceipt;
  width: ReceiptPaperWidth;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 50);
    window.addEventListener("afterprint", onClose);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", onClose);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const lines: SalesReceiptLine[] = receipt.lines;

  return createPortal(
    <div id="sales-receipt-print-root" data-paper-width={width}>
      <style>{receiptPrintCss(width)}</style>
      <button type="button" className="no-print close-print" onClick={onClose}>
        Close
      </button>
      <article className="receipt-sheet">
        <header className="receipt-center">
          {receipt.pharmacyName ? <div className="receipt-brand">{receipt.pharmacyName}</div> : null}
          {receipt.pharmacyTel ? <div>{receipt.pharmacyTel}</div> : null}
          {receipt.pharmacyAddress ? <div>{receipt.pharmacyAddress}</div> : null}
          <div className="receipt-title">SALES RECEIPT</div>
        </header>
        <div className="receipt-rule" />
        <div className="receipt-row">
          <span>Invoice No:</span>
          <span>{receipt.sthId}</span>
        </div>
        {receipt.invoiceDate ? (
          <div className="receipt-row">
            <span>Date:</span>
            <span>{receipt.invoiceDate}</span>
          </div>
        ) : null}
        {receipt.customerName || receipt.customerTel ? (
          <div className="receipt-row">
            <span>Customer:</span>
            <span dir="auto">
              {[receipt.customerName, receipt.customerTel].filter(Boolean).join(" · ")}
            </span>
          </div>
        ) : null}
        <div className="receipt-rule" />
        <section className="receipt-items">
          {lines.map((line) => (
            <div className="receipt-item" key={line.lineNo}>
              <div className="receipt-item-name" dir="auto">
                {line.itemName ?? line.itemCode ?? `Item ${line.lineNo}`}
              </div>
              <div className="receipt-row">
                <span>
                  {formatQty(line.quantity)} ×{" "}
                  {line.unitName ? `${line.unitName} × ` : ""}
                  {money(line.unitPrice)}
                </span>
                <span>{money(line.lineNet)}</span>
              </div>
              {line.lineDiscount > 0 ? (
                <div className="receipt-row">
                  <span>Discount</span>
                  <span>-{money(line.lineDiscount)}</span>
                </div>
              ) : null}
            </div>
          ))}
        </section>
        <div className="receipt-rule" />
        <section className="receipt-totals">
          {receipt.totalBill != null ? (
            <div className="receipt-row">
              <span>Items total</span>
              <span>{money(receipt.totalBill)}</span>
            </div>
          ) : null}
          {receipt.totalDiscount != null && receipt.totalDiscount > 0 ? (
            <div className="receipt-row">
              <span>Discount</span>
              <span>-{money(receipt.totalDiscount)}</span>
            </div>
          ) : null}
          {receipt.serviceCost != null && receipt.serviceCost > 0 ? (
            <div className="receipt-row">
              <span>Service</span>
              <span>{money(receipt.serviceCost)}</span>
            </div>
          ) : null}
          <div className="receipt-row grand">
            <span>Total payable</span>
            <span>{money(receipt.finalPayableAmount)}</span>
          </div>
        </section>
        <div className="receipt-rule" />
        <section className="receipt-payments">
          {receipt.payments.map((payment, index) => (
            <div
              className="receipt-row"
              key={`${payment.paymentMethodId}-${index}`}
            >
              <span dir="auto">{payment.paymentName ?? `Method ${payment.paymentMethodId}`}</span>
              <span>{money(payment.amount)}</span>
            </div>
          ))}
          <div className="receipt-row">
            <span>Paid</span>
            <span>{money(receipt.paidAmount)}</span>
          </div>
          <div className="receipt-row">
            <span>Balance remaining</span>
            <span>{money(receipt.remainingAmount)}</span>
          </div>
          {receipt.changeAmount > 0 ? (
            <div className="receipt-row">
              <span>Change</span>
              <span>{money(receipt.changeAmount)}</span>
            </div>
          ) : null}
        </section>
        <div className="receipt-rule" />
        <footer className="receipt-center">{receipt.paymentStatus}</footer>
      </article>
    </div>,
    document.body
  );
}
