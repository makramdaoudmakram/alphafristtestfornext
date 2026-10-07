import { apiFetch } from "@/lib/api-client";

export type PurchasePrintLine = {
  lineNo: number;
  itemId: number | null;
  arabicName: string;
  englishName: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  salesPrice: number;
  discount: number;
  tax: number;
  net: number;
};

export type PurchasePrintReport = {
  companyName: string;
  documentType: string;
  purchaseId: number;
  vendorName: string;
  vendorBillNo: string;
  vendorBillDate: string | null;
  purchaseDate: string | null;
  lines: PurchasePrintLine[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
};

export function getPurchasePrintReport(documentId: number, token?: string | null) {
  return apiFetch<PurchasePrintReport>(
    `Reporting/purchases/${documentId}/print`,
    { method: "GET" },
    token
  );
}
