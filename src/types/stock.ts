export interface StockBatchItem {
  id: number;
  batchNo: string;
  itemCode: string;
  itemNameAr: string | null;
  itemNameEn: string | null;
  storeId: number;
  expDate: string | null;
  qty: number;
  purshPrice: number;
  salesPrice: number;
  costPrice: number;
  allowPrintBarcode: boolean;
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
  salesPrice: number;
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
