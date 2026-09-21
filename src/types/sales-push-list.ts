export const SALES_PUSH_LIST_EXCEL_HEADERS = [
  "ItemCode",
  "BatchNo",
  "Percent",
  "Comection",
  "Startdate",
  "EndDate",
  "Active",
] as const;

export type SalesPushListItem = {
  id: number;
  itemCode: string;
  arabicName: string;
  englishName: string;
  batchNo: string;
  percent: number;
  comection: number;
  startdate: string;
  endDate: string;
  active: boolean;
};

export type SalesPushListFormValues = {
  itemCode: string;
  arabicName: string;
  englishName: string;
  searchText: string;
  batchNo: string;
  percent: number;
  comection: number;
  startdate: string;
  endDate: string;
  active: boolean;
};

export type SalesPushListSheetRow = SalesPushListFormValues & {
  clientId: string;
  errors: string[];
};

export type SalesPushListCreateRequest = {
  itemCode: string;
  batchNo: string;
  percent: number;
  comection: number;
  startdate: string;
  endDate: string;
  active: boolean;
};

export type SalesPushListUpdateRequest = SalesPushListCreateRequest;

export type SalesPushListBulkSaveRequest = {
  create: SalesPushListCreateRequest[];
  update: Array<SalesPushListCreateRequest & { id: number }>;
  deleteIds: number[];
};

export type SalesPushListBulkSaveResponse = {
  created: number;
  updated: number;
  deleted: number;
};

export type SalesPushListImportRow = {
  excelRowNumber: number;
  itemCode: string;
  batchNo: string;
  arabicName: string;
  englishName: string;
  percentRaw: string;
  comectionRaw: string;
  startdateRaw: string;
  endDateRaw: string;
  activeRaw: string;
  valid: boolean;
  errors: string[];
  parsed: SalesPushListFormValues | null;
};

export type SalesPushListImportPreview = {
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: SalesPushListImportRow[];
};

export type SalesPushListBatchOption = {
  batchNo: string;
  storeName: string;
  expireDate: string | null;
  qty: number;
};
