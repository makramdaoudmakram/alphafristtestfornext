export interface StockBatchItem {
  id: number;
  itemCode: string;
  itemNameAr: string | null;
  itemNameEn: string | null;
  storeId: string;
  expDate: string | null;
  qty: number;
  purshPrice: number;
  salesPrice: number;
  costPrice: number;
  unitId: number | null;
}

export interface StockBalanceItem {
  itemCode: string;
  itemNameAr: string | null;
  itemNameEn: string | null;
  storeId: string | null;
  totalQty: number;
  batchCount: number;
}

export type StockSearchFilters = {
  itemCode?: string;
  itemName?: string;
  storeId?: string;
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
