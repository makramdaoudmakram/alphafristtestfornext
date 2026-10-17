import type { SalesPaymentLine } from "@/types/sales-payment";

export type SalesReceiptLine = {
  lineNo: number;
  itemName: string | null;
  itemCode: string | null;
  quantity: number;
  unitName: string | null;
  unitPrice: number;
  lineDiscount: number;
  lineNet: number;
};

/**
 * Authoritative receipt payload from GET SalesPayment/{sthId}/receipt — rebuilt from
 * persisted SQL Server rows. Never carries tax; never trusted from frontend inputs.
 */
export type SalesReceipt = {
  sthId: number;
  billTyp: number;
  paymentStatus: string;
  invoiceDate: string | null;
  pharmacyName: string | null;
  pharmacyTel: string | null;
  pharmacyAddress: string | null;
  customerName: string | null;
  customerTel: string | null;
  totalBill: number | null;
  totalDiscount: number | null;
  serviceCost: number | null;
  finalPayableAmount: number;
  paidAmount: number;
  remainingAmount: number;
  changeAmount: number;
  payments: SalesPaymentLine[];
  lines: SalesReceiptLine[];
};

export type ReceiptPaperWidth = 58 | 80;
