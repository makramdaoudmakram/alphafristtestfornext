export type InternationalBarcodeItem = {
  id: number;
  itmId: number;
  itemCode: string | null;
  interBarcode: string | null;
};

export type InternationalBarcodeWriteRequest = {
  itmId: number;
  itemCode?: string | null;
  interBarcode: string;
};
