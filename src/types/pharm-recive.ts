export type PharmReciveItemLanguage = "en" | "ar";

export type PharmReciveDetail = {
  id: number | null;
  clientRowId: string;
  itmId: string;
  itmNameAr: string;
  itmNameEn: string;
  expDate: string;
  qnty: number;
  itmPurPrice: number;
  itmSellPrice: number;
  itemCostPrice: number;
  unitId: number | null;
  itmStock: number;
  batchNo: string;
  /** Max qty from stock search selection; caps editable quantity for this row. */
  maxSearchQty?: number;
  lineTotal: number;
};

export type PharmReciveDetailPatch = Partial<PharmReciveDetail>;

export type PharmReciveHeader = {
  id: number | null;
  movId: number | null;
  movmentRowId: number | null;
  fathId: number | null;
  movStor: string;
  movDis: string;
  movDate: string;
  monNote: string;
  accountDept: string;
  accountCREDIT: string;
  movTotalqunt: number;
  movTotalSalesPrice: number;
  movTotalPurchPrice: number;
  movTotalCostPrice: number;
};

export type PharmReciveDocument = {
  header: PharmReciveHeader;
  details: PharmReciveDetail[];
};

export type PharmReciveUpsertPayload = {
  header: Omit<PharmReciveHeader, "movTotalqunt" | "movTotalSalesPrice" | "movTotalPurchPrice" | "movTotalCostPrice"> & {
    movTotalTaxPrice?: number;
  };
  details: Array<
    Omit<PharmReciveDetail, "clientRowId" | "lineTotal" | "itmNameAr" | "itmNameEn"> & {
      unitId: number;
    }
  >;
  deletedDetailIds?: number[];
};

export type PharmReciveSearchFilters = {
  movId?: string;
  dateFrom?: string;
  dateTo?: string;
  itmId?: string;
  itmName?: string;
};

export type PharmReciveSearchResult = {
  id: number;
  movId: number | null;
  movDate: string | null;
  movTotalqunt: number;
  matchedItemCode: string | null;
  matchedItemNameEn: string | null;
};

export type PharmReciveAuditHistoryItem = {
  timestamp: string;
  action: string;
  description: string;
  userName: string;
};
