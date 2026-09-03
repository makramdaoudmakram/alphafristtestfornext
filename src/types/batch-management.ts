export type BatchManagementRow = {
  clientRowId: string;
  id: number | null;
  itemCatalogId: number;
  itemCode: string;
  itemNameAr: string;
  itemNameEn: string;
  batchNo: string;
  storeId: number;
  storeName: string;
  storeNameAr: string;
  storeNameEn: string;
  expDate: string;
  salesPrice: number;
  costPrice: number;
  qty: number;
};
