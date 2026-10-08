/** Item catalog unit snapshot carried on a row so the Unit combobox never shows NO DATA. */
export type PharmStoreReturnSendUnitFields = {
  itmUnit1: number | null;
  itmUnit2: number | null;
  itmUnit3: number | null;
  itmUnit1Unit2: number | null;
  itmUnit1Unit3: number | null;
};

/** A return line pinned to an exact current-pharmacy stock batch (stockId drives the backend move). */
export type PharmStoreReturnSendDetail = {
  clientRowId: string;
  stockId: number | null;
  itmId: string;
  itmNameAr: string;
  itmNameEn: string;
  batchNo: string;
  expDate: string;
  unitId: number | null;
  qnty: number;
  /** Available unreserved base (Unit3) quantity from the stock search snapshot. */
  baseAvailableQty: number;
  itemCostPrice: number;
  itmSellPrice: number;
  unitFields: PharmStoreReturnSendUnitFields;
};

export type PharmStoreReturnSendDetailPatch = Partial<PharmStoreReturnSendDetail>;

/** One line of the POST PharmStoreReturn body (prices/reservations are resolved server-side). */
export type PharmStoreReturnSendLine = {
  StockId: number;
  ItmId: string;
  Qnty: number;
  UnitId: number;
};

export type PharmStoreReturnSendPayload = {
  MovmentRowId: number;
  Note?: string;
  Details: PharmStoreReturnSendLine[];
};

/** Response of a successful send — the created pending return header. */
export type PharmStoreReturnSendResult = {
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
  detailCount: number;
};
