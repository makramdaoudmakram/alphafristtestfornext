export type SalesDetailsReportLine = {
  shiftNo: number | null;
  invoiceSerial: number;
  paymentType: string | null;
  itemNameArabic: string | null;
  itemNameEnglish: string | null;
  quantity: number;
  salesPrice: number;
  salesTime: string | null;
};

export type SalesDetailsReportPage = {
  items: SalesDetailsReportLine[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  totalQuantity: number;
  totalSales: number;
  appliedDateFrom: string;
  appliedDateTo: string;
  historySearchAllowed: boolean;
  pharmacyName: string | null;
};
