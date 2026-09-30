export type PharmStoreReturnPendingDetail = {
  id: number;
  lineNo: number;
  itemCode: string | null;
  itemNameAr: string | null;
  itemNameEn: string | null;
  stockId: number | null;
  batchNo: string | null;
  expDate: string | null;
  unitId: number;
  unitName: string | null;
  unitValue: number | null;
  quantity: number | null;
  sourceStoreId: number | null;
  destinationStoreId: number | null;
};

export type PharmStoreReturnPendingHeader = {
  id: number;
  serialNo: number | null;
  sourceStoreId: number | null;
  sourcePharmacyName: string | null;
  destinationStoreId: number | null;
  destinationStoreName: string | null;
  totalQuantity: number | null;
  returnDate: string | null;
  status: number | null;
  statusText: string | null;
  insertUid: string | null;
  details: PharmStoreReturnPendingDetail[];
};

export type PharmStoreReturnPendingSection = {
  storeId: number | null;
  storeName: string;
  isCurrentStore: boolean;
  items: PharmStoreReturnPendingHeader[];
};

export type PharmStoreReturnPendingPage = {
  activeStoreId: string | null;
  activeStoreName: string | null;
  mainStore: PharmStoreReturnPendingSection;
  expireStore: PharmStoreReturnPendingSection;
  message: string | null;
};

export type PharmStoreReturnAcceptResult = {
  id: number;
  serialNo: number | null;
  status: number;
  message: string;
};
