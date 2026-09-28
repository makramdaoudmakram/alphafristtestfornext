export type ItemCardRow = {
  date: string | null;
  documentType: string;
  documentId: number;
  documentNo: number | null;
  storeId: string | null;
  storeName: string | null;
  branchId: string | null;
  branchName: string | null;
  movementType: string | null;
  movementDirection: string;
  quantityIn: number;
  quantityOut: number;
  balance: number;
  unitId: number | null;
  unitName: string | null;
  unitValue: number;
  reportingKey: string;
  lineNo: number;
};

export type ItemCardResponse = {
  itemId: number;
  fromDate: string;
  toDateExclusive: string;
  items: ItemCardRow[];
  totalCount: number;
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
  page: number;
  pageSize: number;
};

export type ItemCardQuery = {
  itemId: number;
  fromDate: string;
  toDate: string;
  documentType?: string;
  page?: number;
  pageSize?: number;
};

export const ITEM_CARD_DOCUMENT_TYPES = [
  "Purchase",
  "PharmacyPurchase",
  "Return",
  "PharmacyReceive",
  "StockTransfer",
  "InventoryAdjustment",
  "Sales",
  "SalesReturn",
] as const;
