/** Purchase header (dbo.PurTransH) — UI / DTO shape */
export type PurchaseHeader = {
  /** Database primary key (PurTransH.Id) */
  id: number | null;
  /** Business document number (PthId) */
  pthId: number | null;
  venBillNo: string;
  venBillDate: string;
  phtDate: string;
  venId: string;
  /** Movement child id (MovChiledId) */
  movId: number | null;
  /** Movment.Id PK — server uses this to map detail StoId/MovId/accounts */
  movmentRowId: number | null;
  /** From movement MovAccountEntry1 (authoritative on save) */
  movAccount: string;
  /** From movement MovAccountEntry2 */
  movAccountsec: string;
  /** From movement MovAccountEntry3 */
  movAccounttherd: string;
  /** From movement MovAccountEntry4 */
  movAccountfourth: string;
  noOfItems: number;
  totalQuantity: number;
  totalBill: number;
  purchExtraDisCount: number;
  totalDisPer: number;
  totalDesMon: number;
  totalTax: number;
  pOtherExpenses: number;
  pthNetBill: number;
  pthNotice: string;
  /** 0 = draft/saved, 1 = reversed (editable), 5 = posted to GeneralLedger */
  movStat: number | null;
};

/** Purchase detail line (dbo.PurTransD) */
export type PurchaseDetail = {
  id: number | null;
  /** Client-only key for React / TanStack Table */
  clientRowId: string;
  itmId: string;
  itmNameAr: string;
  itmNameEn: string;
  expDate: string;
  qnty: number;
  bonus: number;
  itmPurPrice: number;
  itmSell: number;
  /**
   * UI-only Unit 1 / original purchase price. Used so unit changes do not compound.
   * Never persisted or sent to the API.
   */
  baseItmPurPrice?: number;
  /**
   * UI-only Unit 1 / original sales price. Used so unit changes do not compound.
   * Never persisted or sent to the API.
   */
  baseItmSell?: number;
  /**
   * UI-only last PriceQtyNet from GetUnitConversionInfo.
   * Never persisted or sent to the API.
   */
  priceQtyNet?: number | null;
  /**
   * UI-only. Never persisted or sent to the API.
   * null/undefined = empty, 0 = zero, > 0 = percentage.
   */
  taxPercent?: number | null;
  /** null = empty in the UI; 0 and values greater than zero are distinct. */
  itmTaxPrice: number | null;
  itmTaxTotal: number;
  itmExtraDis: number;
  itmDisMon: number;
  itmDisPer: number;
  itmCost: number;
  itmNet: number;
  stdItmStock: number;
  unitId: number | null;
  /** Store from movement MovStor — one value per detail line */
  stoId: string;
  /**
   * Stock.BatchNo from the Return Page search row. Empty for catalog-only lines.
   * Changing quantity must not clear this value.
   */
  batchNo?: string;
  /**
   * Max return qty from the selected search row. UI-only; not sent on purchase save.
   */
  maxReturnQty?: number;
  /** Computed: quantity × price − discounts + tax */
  lineTotal: number;
};

/** Row patch. skipDiscPercent / skipTax keep existing values during item retrieval. */
export type PurchaseDetailPatch = Partial<PurchaseDetail> & {
  skipDiscPercent?: boolean;
  skipTax?: boolean;
};

export type PurTransDExcelPreviewRow = {
  excelRowNumber: number;
  itmId: string;
  itmNameAr: string;
  itmNameEn: string;
  qnty: string;
  bonus: string;
  unitId: string;
  itmPurPrice: string;
  itmSell: string;
  itmTaxPrice: string;
  itmExtraDis: string;
  itmDisPer: string;
  itmDisMon: string;
  expDate: string;
  stoId: string;
};

export type PurTransDExcelFieldError = {
  field: string;
  columnTitle: string;
  message: string;
};

export type PurTransDExcelPreviewRowValidated = PurTransDExcelPreviewRow & {
  isValid: boolean;
  errors: PurTransDExcelFieldError[];
};

export type PurTransDExcelPreview = {
  fileName: string;
  sheetName: string;
  rowCount: number;
  rows: PurTransDExcelPreviewRow[];
};

export type PurTransDExcelPreviewValidated = Omit<
  PurTransDExcelPreview,
  "rows"
> & {
  isValid: boolean;
  rows: PurTransDExcelPreviewRowValidated[];
};

export const PURTRANS_D_EXCEL_VALIDATION_SUMMARY =
  "The Excel file contains invalid data. Please correct the highlighted rows.";

/** Stock batches created or updated when a purchase is saved. */
export type PurchaseStockBatch = {
  stockId: number;
  batchNo: string;
  itemCode: string;
  storeId: number;
  quantityNet: number;
  inserted: boolean;
};

export type PurchaseDocument = {
  header: PurchaseHeader;
  details: PurchaseDetail[];
  stockBatches?: PurchaseStockBatch[];
};

export type PurchaseSearchFilters = {
  pthId?: string;
  venBillNo?: string;
  dateFrom?: string;
  dateTo?: string;
  /** Exact ItemCatalog.Itm_Code — from catalog selection. */
  itmId?: string;
  /** Contains match on ItemCatalog English/Arabic name (typed text without code). */
  itmName?: string;
  /** Movement.MovChiledId when Movement is chosen. */
  movId?: string;
};

export type PurchaseSearchResult = {
  id: number;
  pthId: number;
  movementName: string;
  phtDate: string | null;
  pthNetBill: number;
  /** Populated when search filtered by item. */
  matchedItemCode?: string | null;
  matchedItemNameEn?: string | null;
  /** Derived from MovStat — 5 = Post, otherwise Not Post. */
  postStatus: string;
};

export type PurchaseNavigationIds = {
  ids: number[];
  currentIndex: number;
};

/** Payload sent to Alfa API when endpoints are available */
export type PurchaseUpsertPayload = {
  header: Omit<PurchaseHeader, "noOfItems" | "totalQuantity">;
  details: (Omit<
    PurchaseDetail,
    | "clientRowId"
    | "lineTotal"
    | "itmNameAr"
    | "itmNameEn"
    | "unitId"
    | "taxPercent"
    | "baseItmPurPrice"
    | "baseItmSell"
    | "priceQtyNet"
  > & { unitId?: number; itmTaxPrice: number })[];
  /** Existing PurTransD ids removed on save (update only). */
  deletedDetailIds?: number[];
};

export type PostedPurchaseInvoiceReversalItem = {
  id: number;
  pthId: number;
  vendorName: string;
  venId: string;
  venBillNo: string;
  venBillDate: string | null;
  insertTime: string | null;
  userName: string;
  totalBill: number | null;
  pthNetBill: number | null;
  quantity: number | null;
};

export type PostedPurchaseInvoiceReversalPage = {
  items: PostedPurchaseInvoiceReversalItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
};

export type PostedPurchaseInvoiceReversalQuery = {
  vendorAccountId?: string;
  vendorName?: string;
  pageNumber: number;
  pageSize: number;
};

export type PurchaseInvoiceDraftItem = {
  id: number;
  pthId: number;
  vendorName: string;
  venId: string;
  venBillNo: string;
  venBillDate: string | null;
  phtDate: string | null;
  insertTime: string | null;
  userName: string;
  movementName: string;
  totalBill: number | null;
  pthNetBill: number | null;
  quantity: number | null;
  movStat: number | null;
  status: string;
};

export type PurchaseInvoiceDraftPage = {
  items: PurchaseInvoiceDraftItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
};

export type PurchaseInvoiceDraftQuery = {
  vendorAccountId?: string;
  vendorName?: string;
  pageNumber: number;
  pageSize: number;
};

export type PurchaseInvoiceReverseResult = {
  id: number;
  pthId: number;
  movStat: number | null;
  pthNotice: string;
  reversedLedgerRows: number;
};
