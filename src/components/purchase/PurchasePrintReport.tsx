"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { PurchasePrintReport as PurchasePrintReportData } from "@/lib/purchase-print";

const PRINT_CSS = `
@page {
  size: A4;
  margin: 12mm;
}
@media screen {
  #purchase-print-root {
    position: fixed;
    inset: 0;
    z-index: 80;
    overflow: auto;
    background: #e7e5e4;
    padding: 24px 16px 48px;
  }
}
@media print {
  body > *:not(#purchase-print-root) {
    display: none !important;
  }
  #purchase-print-root {
    display: block !important;
    position: static !important;
    background: #fff !important;
    padding: 0 !important;
    overflow: visible !important;
  }
  #purchase-print-root .no-print {
    display: none !important;
  }
}
#purchase-print-root .sheet {
  width: 186mm;
  margin: 0 auto;
  background: #fff;
  color: #111;
  font-family: "Segoe UI", Tahoma, "Noto Naskh Arabic", "Traditional Arabic", Arial, sans-serif;
  font-size: 11px;
  line-height: 1.35;
}
#purchase-print-root .brand {
  margin: 0;
  text-align: center;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.28em;
}
#purchase-print-root .doc-title {
  margin: 2px 0 16px;
  text-align: center;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: 0.18em;
}
#purchase-print-root .meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 24px;
  margin-bottom: 16px;
}
#purchase-print-root .meta p {
  margin: 0;
  display: grid;
  grid-template-columns: 8.5rem 1fr;
  gap: 8px;
}
#purchase-print-root .meta span {
  color: #444;
}
#purchase-print-root table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
#purchase-print-root th,
#purchase-print-root td {
  border: 1px solid #222;
  padding: 4px 5px;
  vertical-align: top;
  word-wrap: break-word;
}
#purchase-print-root th {
  background: #f3f4f6;
  font-size: 9px;
  font-weight: 650;
  text-align: left;
}
#purchase-print-root td.num,
#purchase-print-root th.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
#purchase-print-root td.ar {
  direction: rtl;
  unicode-bidi: isolate;
  text-align: right;
  font-size: 12px;
}
#purchase-print-root td.en {
  direction: ltr;
  unicode-bidi: isolate;
  text-align: left;
}
#purchase-print-root .totals {
  width: 72mm;
  margin-left: auto;
  margin-top: 12px;
  border-collapse: collapse;
}
#purchase-print-root .totals td {
  border: none;
  border-bottom: 1px solid #d4d4d4;
  padding: 4px 0;
}
#purchase-print-root .totals tr.grand td {
  border-top: 2px solid #111;
  border-bottom: none;
  font-weight: 700;
  font-size: 13px;
  padding-top: 6px;
}
#purchase-print-root .close-print {
  display: block;
  margin: 0 auto 16px;
  border: 1px solid #222;
  background: #fff;
  padding: 6px 14px;
  cursor: pointer;
}
`;

function money(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  return amount.toFixed(2);
}

function formatDate(value: string | null) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function PurchasePrintReport({
  report,
  onClose,
}: {
  report: PurchasePrintReportData;
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

  return createPortal(
    <div id="purchase-print-root">
      <style>{PRINT_CSS}</style>
      <button type="button" className="no-print close-print" onClick={onClose}>
        Close
      </button>
      <article className="sheet">
        <h1 className="brand">{report.companyName}</h1>
        <p className="doc-title">PURCHASE ORDER</p>
        <div className="meta">
          <p>
            <span>Purchase No:</span>
            <strong>{report.purchaseId}</strong>
          </p>
          <p>
            <span>Purchase Date:</span>
            <strong>{formatDate(report.purchaseDate)}</strong>
          </p>
          <p>
            <span>Vendor:</span>
            <strong>{report.vendorName}</strong>
          </p>
          <p>
            <span>Vendor Bill No:</span>
            <strong>{report.vendorBillNo}</strong>
          </p>
          <p>
            <span>Vendor Bill Date:</span>
            <strong>{formatDate(report.vendorBillDate)}</strong>
          </p>
        </div>
        <table>
          <colgroup>
            <col style={{ width: "6%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Arabic Item Name</th>
              <th>English Item Name</th>
              <th className="num">Qty</th>
              <th>Unit</th>
              <th className="num">Purchase Price</th>
              <th className="num">Sales Price</th>
              <th className="num">Discount</th>
              <th className="num">Tax</th>
              <th className="num">Net</th>
            </tr>
          </thead>
          <tbody>
            {report.lines.map((line) => (
              <tr key={line.lineNo}>
                <td className="num">{line.lineNo}</td>
                <td className="ar" lang="ar" dir="rtl">
                  {line.arabicName}
                </td>
                <td className="en" lang="en" dir="ltr">
                  {line.englishName}
                </td>
                <td className="num">{money(line.quantity)}</td>
                <td>{line.unit}</td>
                <td className="num">{money(line.purchasePrice)}</td>
                <td className="num">{money(line.salesPrice)}</td>
                <td className="num">{money(line.discount)}</td>
                <td className="num">{money(line.tax)}</td>
                <td className="num">{money(line.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="totals">
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td className="num">{money(report.subtotal)}</td>
            </tr>
            <tr>
              <td>Discount</td>
              <td className="num">{money(report.discount)}</td>
            </tr>
            <tr>
              <td>Tax</td>
              <td className="num">{money(report.tax)}</td>
            </tr>
            <tr className="grand">
              <td>Grand Total</td>
              <td className="num">{money(report.grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>,
    document.body
  );
}
