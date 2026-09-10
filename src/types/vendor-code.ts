export type VendorCodeItem = {
  id: number;
  itmId: number;
  vendorId: number;
  itemCode: string | null;
  vendorCode: string | null;
};

export type VendorCodeWriteRequest = {
  itmId: number;
  vendorId: number;
  itemCode?: string | null;
  vendorCode: string;
};
