export interface StockBatchItem {
  id: number;
  batchNo: string;
  itemCode: string;
  itemNameAr: string | null;
  itemNameEn: string | null;
  storeId: number;
  storeName: string | null;
  expDate: string | null;
  /** Physical on-hand quantity (base units from API). */
  qty: number;
  /** Pending outgoing pharmacy-transfer reservation (base units). */
  transferQty: number;
  /** Authoritative available = qty - transferQty (base units from API). */
  availableQty: number;
  /** Qty in Unit 3 (base qty / Itm_Unit1_Unit3). */
  qtyUnit3: number | null;
  purshPrice: number;
  salesPrice: number;
  costPrice: number;
  allowPrintBarcode: boolean;
  itemCatalogId?: number;
}

export interface StockBalanceItem {
  itemCode: string;
  itemNameAr: string | null;
  itemNameEn: string | null;
  storeId: number | null;
  totalQty: number;
  batchCount: number;
}

/** Return-page item stock search result row (one BatchNo / ExpDate / SalesPrice group). */
export interface ReturnItemStockSearchItem {
  itemCatalogId: number;
  itemCode: string;
  itemNameAr: string | null;
  itemNameEn: string | null;
  itemName: string;
  storeId: number;
  totalQuantity: number;
  /** Pending outgoing transfer reservation for the group (Unit1 display units). */
  transferQty?: number;
  /** Available unreserved quantity for the group (Unit1 display units). */
  availableQty?: number;
  salesPrice: number;
  /** Stock unit cost for the batch (CostPrice, else PurshPrice from API). */
  costPrice: number;
  /** Representative Stock.Id for the batch group. */
  stockId: number | null;
  expDate: string | null;
  batchNo: string;
}

export type StockSearchFilters = {
  itemCode?: string;
  itemName?: string;
  storeId?: string;
  batchNo?: string;
  expFrom?: string;
  expTo?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type StockPagedResult = {
  items: StockBatchItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
};

export interface StockBarcodeLabel {
  stockId: number;
  batchNo: string;
  barcodeValue: string;
  itemCode: string;
  itemNameAr: string | null;
  itemNameEn: string | null;
  storeId: number;
  expDate: string | null;
  qty: number;
  salesPrice: number;
  allowPrintBarcode: boolean;
}

export interface StockBarcodeLookupResult {
  normalizedBatchNo: string;
  batch: StockBatchItem;
}
