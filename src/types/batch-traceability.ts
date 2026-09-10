export type BatchTraceabilityCreatorSource = "Purchase" | "Audit" | "Unknown";

export type BatchTraceabilityBatch = {
  batchNo: string;
  stockId: number;
  itemId: number;
  itemCode: string | null;
  itemNameAr: string | null;
  itemNameEn: string | null;
  storeId: number;
  storeName: string | null;
  expDate: string | null;
  purchasePrice: number;
  salesPrice: number;
  costPrice: number;
  currentQty: number;
};

export type BatchTraceabilityCreator = {
  userId: string | null;
  userName: string | null;
  createdAt: string | null;
  source: BatchTraceabilityCreatorSource;
};

export type BatchTraceabilityStoreQty = {
  storeId: number;
  storeName: string | null;
  qty: number;
};

export type BatchTraceabilityCurrentStock = {
  locations: BatchTraceabilityStoreQty[];
  totalCurrentQty: number;
};

export type BatchTraceabilityTimelineEntry = {
  transactionType: string;
  detailId: number;
  lineNo: number;
  headerId: number;
  documentDisplayNo: string | null;
  eventDate: string | null;
  userId: string | null;
  userName: string | null;
  storeId: string | null;
  storeCode: string | null;
  storeName: string | null;
  quantityDelta: number;
  quantityAfter: number | null;
  documentLabel: string | null;
  deepLinkRoute: string | null;
};

export type BatchTraceabilityResult = {
  batch: BatchTraceabilityBatch;
  creator: BatchTraceabilityCreator;
  currentStock: BatchTraceabilityCurrentStock;
  timeline: BatchTraceabilityTimelineEntry[];
};
