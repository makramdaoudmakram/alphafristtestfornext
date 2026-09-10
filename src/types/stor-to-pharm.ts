export type StorToPharmPendingDetail = {
  id: number;
  lineNo: number;
  itmId: string | null;
  itemCode: string | null;
  itemNameAr: string | null;
  itemNameEn: string | null;
  itemCatalogId: number | null;
  quantity: number | null;
  unitId: number;
  unitName: string | null;
  batchNo: string | null;
  expDate: string | null;
  salesPrice: number | null;
};

export type StorToPharmPendingHeader = {
  id: number;
  /** PharmReciveH.FathId — document serial shown in the header row. */
  fathId: number | null;
  serialNo: number | null;
  sendingStorageId: string | null;
  sendingStorageName: string | null;
  receivingStorageId: string | null;
  receivingStorageName: string | null;
  totalQuantity: number | null;
  receiveDate: string | null;
  totalSalesPrice: number | null;
  details: StorToPharmPendingDetail[];
};

export type StorToPharmPendingList = {
  currentPharmacyName: string | null;
  currentStorageId: string | null;
  currentStorageName: string | null;
  storageConfigurationMessage: string | null;
  items: StorToPharmPendingHeader[];
};

export type StorToPharmAcceptResult = {
  id: number;
  serialNo: number | null;
  movFlag: number;
  message: string;
};
