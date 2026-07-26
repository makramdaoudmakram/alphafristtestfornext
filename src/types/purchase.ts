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
  itmDisPer: number;
  itmDisMon: number;
  itmTaxTotal: number;
  unitId: string;
  /** Computed: quantity × price − discounts + tax */
  lineTotal: number;
};

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
};

export type PurchaseSearchResult = {
  id: number;
  pthId: number;
  venId: string;
  venBillNo: string;
  venBillDate: string | null;
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
  details: Omit<
    PurchaseDetail,
    "clientRowId" | "lineTotal" | "itmNameAr" | "itmNameEn" | "unitId"
  > &
    { unitId?: number }[];
};
