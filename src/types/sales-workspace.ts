export type SalesStockScope = "CurrentPharmacy" | "Catalog" | "AllPharmacies";

export type SalesSearchLanguage = "Arabic" | "English";

export type DiscountMode = "" | "P" | "V";

export type SalesItemSearchStock = {
  stockId: number;
  batchNo: string;
  expDate: string | null;
  availableQty: number;
  salesPrice: number;
  storId: number;
  storName: string | null;
  parmId: number | null;
  pharmacyName: string | null;
};

export type SalesItemSearchHit = {
  itemCatalogId: number;
  itmCode: string;
  itmNameAr: string;
  itmNameEn: string;
  defSellPrice: number | null;
  defPharmPrice: number | null;
  unit1: number | null;
  unit2: number | null;
  unit3: number | null;
  unit1Unit2: number | null;
  unit1Unit3: number | null;
  itmMaxDiscPer: number | null;
  groupNameEn: string;
  groupNameAr: string;
  stocks: SalesItemSearchStock[];
};

export type SalesItemPharmacyStockResponse = {
  itemCatalogId: number;
  itmCode: string;
  itmNameAr: string;
  itmNameEn: string;
  unit1: number | null;
  unit2: number | null;
  unit3: number | null;
  currentStorId: number;
  currentParmId: number;
  currentPharmacyName: string;
  stocks: SalesItemSearchStock[];
};

export type SalesWorkspaceLine = {
  key: string;
  /** 0 = draft / empty entry row (not saved). */
  itemCatalogId: number;
  itemCode: string;
  itemName: string;
  itmNameAr: string;
  itmNameEn: string;
  /** Working text in the autocomplete cell before an item is resolved. */
  searchText: string;
  stockId: number;
  batchNo: string;
  expDate: string | null;
  storId: number;
  /** Stock.AvailableQty in ConvertToBaseUnit base units (not the selected unit). */
  availableQty: number;
  unit1: number | null;
  unit2: number | null;
  unit3: number | null;
  unit1Unit2: number | null;
  unit1Unit3: number | null;
  itmMaxDiscPer: number | null;
  groupNameEn: string;
  groupNameAr: string;
  unitId: number;
  quantity: number;
  /** Stock.SalesPrice in base Unit1 — never overwrite with converted display price. */
  baseUnitSellPrice: number;
  /** Display/sell price for the selected UnitId (base × priceQtyNet). */
  unitSellPrice: number;
  /** Last PriceQtyNet from UnitConversion (1 for Unit1). */
  priceQtyNet: number;
  /** Inline qty validation vs invoice-local StockId allocation (base units). */
  qtyError: string | null;
  discountMode: DiscountMode;
  discountPercent: number;
  discountValue: number;
  /** When multiple batches match, user must pick one StockId. */
  pendingStocks?: SalesItemSearchStock[];
  /** Batch net qty in Unit 1 at selection time (Sales Return display hint). */
  batchDisplayAvailableQty?: number;
};

export type SalesWorkspaceTab = {
  clientId: string;
  label: string;
  sthId: number | null;
  saved: boolean;
  /** Payment status from backend: 0 = unpaid/pending, 1 = finalized. Null before save. */
  billTyp: number | null;
  egyptTimeDisplay: string;
  /** Password being typed (masked); cleared after successful resolve. */
  salesManPassword: string;
  salesManCode: string;
  salesManId: number | null;
  salesManName: string;
  /** Working text for customer autocomplete before selection. */
  customerSearch: string;
  customerCode: string;
  customerId: number | null;
  customerName: string;
  customerTel: string;
  customerAddress: string;
  lines: SalesWorkspaceLine[];
  globalDiscountMode: DiscountMode;
  globalDiscountPercent: number;
  globalDiscountValue: number;
  /** UI toggle: when false, Sales Service + delivery search are hidden. */
  deliveryEnabled: boolean;
  salesServiceId: number | null;
  serviceCost: number;
  requiresDeliveryEmployee: boolean;
  /** Working text in the Delivery lookup (may be code, name, or "code - name"). */
  deliverySearch: string;
  /** Valid selected Delivery employee (EmployInfo.Id). Null = not selected. */
  deliveryEmployeeId: number | null;
  deliveryCode: string;
  deliveryEmployeeName: string;
  /** Selected SalesKind for pharmacy-scoped payment methods. */
  salesKindId: number | null;
  payments: Record<number, string>;
};

export type CreateSalesReturnRequest = {
  empId: number;
  custId: number;
  customerName: string | null;
  customerTel: string | null;
  customerAddress: string | null;
  globalDiscountMode: string | null;
  globalDiscountPercent: number;
  globalDiscountValue: number;
  lines: Array<{
    itemCatalogId: number;
    stockId: number;
    quantity: number;
    unitId: number;
    unitSellPrice: number;
    discountMode: string | null;
    discountPercent: number;
    discountValue: number;
  }>;
  payments: null;
};

export type CreateSaleRequest = {
  empId: number;
  custId: number | null;
  customerName: string | null;
  customerTel: string | null;
  customerAddress: string | null;
  globalDiscountMode: string | null;
  globalDiscountPercent: number;
  globalDiscountValue: number;
  /** Selected SalesKind; used when DeliveryMandatory must be enforced on create. */
  salesKindId: number | null;
  salesServiceId: number | null;
  deliveryCodeOrPassword: string | null;
  lines: Array<{
    itemCatalogId: number;
    stockId: number;
    quantity: number;
    unitId: number;
    unitSellPrice: number;
    discountMode: string | null;
    discountPercent: number;
    discountValue: number;
    /** SalesTransD.SalerCom (decimal). Omitted on save defaults to 0. */
    salerCom?: number;
  }>;
  payments: Array<{ paymentMethodId: number; amount: number }> | null;
};

export type CreateSaleResponse = {
  sthId: number;
  headerId: number;
  billTyp: number;
  totalBill: number;
  totalBillAfterDisc: number;
  totalBillNet: number;
  serviceCost: number;
  payable: number;
  secInsertDateUtc: string;
  egyptLocalDisplay: string;
};
