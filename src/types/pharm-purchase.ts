export type PharmPurchaseContext = {
  parmId: number;
  pharmacyName: string;
  costCenterCode: string | null;
  costCenterName: string | null;
  movmentRowId: number;
  movId: number | null;
  movChiledName: string | null;
  storeId: string | null;
  storeName: string | null;
  scopeValid: boolean;
  scopeMessage: string | null;
};

export type PharmPurchaseItemLanguage = "en" | "ar";
