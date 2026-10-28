import type { ReceiptPaperWidth } from "@/types/sales-receipt";

export type ShiftClosingReceiptSummary = {
  pharmacyName: string | null;
  scId: number;
  startTime: string | null;
  totalSales: string | null;
  totalReturn: number | null;
  totalExpen: number | null;
  totalPurch: number | null;
  totalPurchRet: number | null;
  deliveryValue: number | null;
  deliveryCount: number | null;
  totalDiscount: number;
  totalTransfer: number | null;
};

export type ShiftClosingReceiptClassificationRow = {
  classificationName: string;
  value: number | null;
  expected: number | null;
  difference: number | null;
};

export type ShiftClosingReceipt = {
  summary: ShiftClosingReceiptSummary;
  classifications: ShiftClosingReceiptClassificationRow[];
};

export type ShiftClosingReceiptPrintState = {
  receipt: ShiftClosingReceipt;
  width: ReceiptPaperWidth;
};
