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
  /** From movement MovAccountEntry2 */
  movAccount: string;
  /** From movement MovAccountEntry1 */
  movAccountsec: string;
  /** From movement MovAccountEntry3 */
  movAccounttherd: string;
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
};

/** Purchase detail line (dbo.PurTransD) */
export type PurchaseDetail = {
  id: number | null;
  /** Client-only key for React / TanStack Table */
  clientRowId: string;
  itmId: string;
  itmNameAr: string;
  itmNameEn: string;
  cId: number;
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
  /** Computed: quantity × price − discounts + tax */
  lineTotal: number;
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

export type PurchaseDocument = {
  header: PurchaseHeader;
  details: PurchaseDetail[];
};

export type PurchaseSearchFilters = {
  pthId?: string;
  vendor?: string;
  venBillNo?: string;
  dateFrom?: string;
  dateTo?: string;
  /** Selected ItemCatalog.Itm_Code — used to search PurTransD, not the typed name. */
  itmId?: string;
  /** Selected Movement.MovChiledId when Movement is chosen. */
  movId?: string;
};

export type PurchaseSearchResult = {
  id: number;
  pthId: number;
  movementName: string;
  phtDate: string | null;
  pthNetBill: number;
};

export type PurchaseNavigationIds = {
  ids: number[];
  currentIndex: number;
};

/** Payload sent to Alfa API when endpoints are available */
export type PurchaseUpsertPayload = {
  header: Omit<
    PurchaseHeader,
    "noOfItems" | "totalQuantity" | "totalBill" | "totalDesMon" | "totalTax" | "pthNetBill"
  >;
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
