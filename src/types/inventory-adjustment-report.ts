export type InventoryAdjustmentReportHeader = {
  headerId: number;
  adjustmentNumber: number | null;
  adjustmentDate: string | null;
  storeId: string | null;
  storeName: string | null;
  totalIncreaseValue: number;
  totalDecreaseValue: number;
  isPosted: boolean;
};

export type InventoryAdjustmentReportList = {
  items: InventoryAdjustmentReportHeader[];
  totalRecords: number;
};

export type InventoryAdjustmentReportStoreOption = {
  storeId: string;
  storeName: string | null;
};

export type InventoryAdjustmentReportLine = {
  itemCode: string | null;
  itemNameArabic: string | null;
  itemNameEnglish: string | null;
  increaseQuantity: number;
  decreaseQuantity: number;
  salesPrice: number;
  increaseValue: number;
  decreaseValue: number;
};

export type InventoryAdjustmentReportDetail = {
  headerId: number;
  adjustmentNumber: number | null;
  adjustmentDate: string | null;
  storeId: string | null;
  storeName: string | null;
  totalIncreaseValue: number;
  totalDecreaseValue: number;
  isPosted: boolean;
  lines: InventoryAdjustmentReportLine[];
};
