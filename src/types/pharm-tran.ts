export type PharmTranPendingDetail = {
  id: number;
  lineNo: number;
  itemCode: string | null;
  itemNameAr: string | null;
  itemNameEn: string | null;
  quantity: number | null;
  unitId: number | null;
  unitName: string | null;
  batchNo: string | null;
  expDate: string | null;
  purchasePrice: number | null;
  salesPrice: number | null;
  costPrice: number | null;
};

export type PharmTranPendingHeader = {
  id: number;
  serialNo: number | null;
  sendingPharmacyId: number;
  sendingPharmacyName: string | null;
  receivingPharmacyId: number;
  receivingPharmacyName: string | null;
  totalQuantity: number | null;
  transferDate: string | null;
  totalSalesPrice: number | null;
  details: PharmTranPendingDetail[];
};

export type PharmTranPendingList = {
  items: PharmTranPendingHeader[];
};

export type PharmTranAcceptResult = {
  id: number;
  serialNo: number | null;
  traFlag: number;
  message: string;
};
