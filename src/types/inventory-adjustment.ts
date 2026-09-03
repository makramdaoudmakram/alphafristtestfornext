export type InventoryAdjustmentDetail = {

  clientRowId: string;

  id?: number | null;

  itmCode: string;

  itemCatalogId: number | null;

  itmNameAr: string;

  itmNameEn: string;

  batchNo: string;

  expDate: string;

  unitId: number | null;

  itmStockQty: number;

  itmIncresQty: number;

  itemShortQty: number;

  itmQ: number;

  differenceQty: number;

  totalpurchvalue: number;

  totalsalesvalue: number;

  itmPPrice: number;

  itmSalPrice: number;

  baseItmPPrice: number | null;

  baseItmSalPrice: number | null;

  priceQtyNet: number | null;

  stdItmStock: number | null;
  stockId: number | null;
  storeId: number | null;
  itmCostPrice: number;
  /** Frontend-only search group id for row highlighting. Not sent to API. */
  detailGroupId: number;
};



export type InventoryAdjustmentHeader = {

  id: number | null;

  fhId: number | null;

  movId: number | null;

  movmentRowId: number | null;

  invDat: string;

  invStore: string;

  invNotice: string;

  movStat: number | null;

  /** From movement MovAccountEntry1 → persisted as InvAccount1 */
  invAccount1: string;

  /** From movement MovAccountEntry2 → persisted as InvAccount2 */
  invAccount2: string;

  invActTotalSalPriceIncres?: number | null;
  invActTotalSalPriceShort?: number | null;
  invActTotalPPriceIncress?: number | null;
  invActTotalPPriceShort?: number | null;
  invTotalStockQty?: number | null;
  invTotalIncresQty?: number | null;
  invTotalShortQty?: number | null;
  netInventory?: number | null;

};



export type InventoryAdjustmentDocument = {

  header: InventoryAdjustmentHeader;

  details: InventoryAdjustmentDetail[];

};



export type InventoryAdjustmentUpsertPayload = {

  header: {

    id?: number | null;

    fhId?: number | null;

    movId?: number | null;

    movmentRowId?: number | null;

    invDat?: string;

    invStore?: string;

    invNotice?: string;

    invAccount1?: string;

    invAccount2?: string;

    invActTotalSalPriceIncres?: number;

    invActTotalSalPriceShort?: number;

    invActTotalPPriceIncress?: number;

    invActTotalPPriceShort?: number;

    invTotalStockQty?: number;

    invTotalIncresQty?: number;

    invTotalShortQty?: number;

    netInventory?: number;

  };

  details: Array<{

    id?: number | null;

    itmCode: string;

    itemCatalogId?: number | null;

    batchNo?: string;

    expDate?: string;

    itmSalPrice?: number;

    itmPPrice?: number;

    itmQ: number;

    itmStockQty: number;

    itmIncresQty?: number;

    itemShortQty?: number;

    differenceQty?: number;

    totalpurchvalue?: number;

    totalsalesvalue?: number;

    unitId: number;

    stdItmStock?: number | null;

  }>;

  deletedDetailIds: number[];

};



export type InventoryAdjustmentSaveResult = {

  success: boolean;

  message?: string;

  document?: InventoryAdjustmentDocument;

  detailErrors?: Array<{

    detailIndex: number;

    itmCode?: string | null;

    field: string;

    message: string;

  }>;

};

export function isInventoryAdjustmentPosted(
  movStat: number | null | undefined
): boolean {
  return movStat != null && movStat !== 0;
}

export type InventoryPostingListItem = {
  id: number;
  fhId: number | null;
  movId: number | null;
  movementName: string;
  invStore: string;
  storeName: string;
  invDat: string | null;
  invTotalStockQty: number | null;
  invTotalIncresQty: number | null;
  invTotalShortQty: number | null;
  invActTotalSalPriceIncres: number | null;
  invActTotalSalPriceShort: number | null;
  invActTotalPPriceIncress: number | null;
  invActTotalPPriceShort: number | null;
  netInventory: number | null;
  movStat: number | null;
  invAccount1: string;
  invAccount2: string;
};

export type InventoryPostingPage = {
  items: InventoryPostingListItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
};

export type InventoryPostingQuery = {
  pageNumber: number;
  pageSize: number;
  storeId?: string;
};


