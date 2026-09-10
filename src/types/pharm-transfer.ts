export type PharmTransferPharmacyOption = {
  parmId: number;
  name: string | null;
  storeId: number;
};

export type PharmTransferContext = {
  currentPharmacyId: number;
  currentPharmacyName: string | null;
  currentStoreId: number;
  currentStoreName: string | null;
  destinationPharmacies: PharmTransferPharmacyOption[];
};

export type PharmTransferDetail = {
  clientRowId: string;
  id?: number | null;
  lineNo?: number;
  itmId: string;
  itemCatalogId?: number | null;
  itmNameAr?: string | null;
  itmNameEn?: string | null;
  qnty: number;
  unitId: number;
  unitName?: string | null;
  /** Sales price for the selected UnitId. */
  itmSell: number;
  /** Converted stock unit cost for the selected UnitId (maps to PharmTranD.PurchPrice). */
  purchPrice?: number | null;
  batchNo?: string | null;
  expDate?: string | null;
  stockId?: number | null;
  /** Available unreserved stock (from search / API) for client validation. */
  stockAvailableQty?: number | null;
  /** Unit-1 / stock base sales price before PriceQtyNet. */
  baseItmSell?: number | null;
  /** Unit-1 / stock base cost price before PriceQtyNet. */
  baseCostPrice?: number | null;
  priceQtyNet?: number | null;
};

export type PharmTransferDetailPatch = Partial<
  Omit<PharmTransferDetail, "clientRowId">
>;

export type PharmTransferHeader = {
  id?: number | null;
  movId?: number | null;
  /** PharmTranH.Seial — depends on PharmTranH.Id after insert. */
  seial?: number | null;
  movDis: number;
  traDate: string;
  deliveryEmployeeCode: string;
  deliveryEmployeeName?: string | null;
  receivingEmployeePassword?: string;
  receivingEmployeeCode: string;
  receivingEmployeeName?: string | null;
  note?: string | null;
  traTotalq?: number | null;
  traTotals?: number | null;
  traTotalCost?: number | null;
  traFlag?: number | null;
};

export type PharmTransferDocument = {
  header: PharmTransferHeader;
  details: PharmTransferDetail[];
};

export type PharmTransferSearchResult = {
  id: number;
  movId: number;
  traDate: string | null;
  movDis: number;
  destinationPharmacyName: string | null;
  traTotalq: number | null;
  /** PharmTranH.TraFlag (spec MovStat / MovFlage). */
  traFlag: number | null;
  /** Friendly status text from API (1=Not Accept, 2=Accept). */
  statusText: string | null;
};

export type PharmTransferSearchFilters = {
  itemCode?: string;
  startDate?: string;
  endDate?: string;
};

export type EmployInfoLookup = {
  id: number;
  code: string | null;
  name: string | null;
  employType: number;
};

export const PHARM_TRANSFER_TRA_FLAG_PENDING = 1;

export const EMPLOY_TYPE_RECEIVING = 1;
export const EMPLOY_TYPE_DELIVERY = 2;
