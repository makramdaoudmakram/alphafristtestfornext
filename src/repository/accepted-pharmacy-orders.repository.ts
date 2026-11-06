import { API_BASE_URL, getAlfaApiHint } from "@/lib/api-config";
import type {
  AcceptedPharmacyOrderDetail,
  AcceptedPharmacyOrdersList,
  AcceptedPharmacyOrderQuery,
} from "@/types/accepted-pharmacy-orders";
import type { StockBarcodeLabel } from "@/types/stock";
import type { StorToPharmPendingDetail } from "@/types/stor-to-pharm";

export class AcceptedPharmacyOrdersRepositoryError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "AcceptedPharmacyOrdersRepositoryError";
    this.status = status;
  }
}

function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string") return value;
  }
  return "";
}

function readNullableString(
  obj: Record<string, unknown>,
  ...keys: string[]
): string | null {
  const value = readString(obj, ...keys);
  return value ? value : null;
}

function readNullableNumber(
  obj: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = obj[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function readBoolean(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "boolean") return value;
  }
  return false;
}

function mapDetail(raw: unknown): StorToPharmPendingDetail {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    id: readNullableNumber(obj, "id", "Id") ?? 0,
    lineNo: readNullableNumber(obj, "lineNo", "LineNo") ?? 0,
    itmId: readNullableString(obj, "itmId", "ItmId"),
    itemCode: readNullableString(obj, "itemCode", "ItemCode"),
    itemNameAr: readNullableString(obj, "itemNameAr", "ItemNameAr"),
    itemNameEn: readNullableString(obj, "itemNameEn", "ItemNameEn"),
    itemCatalogId: readNullableNumber(obj, "itemCatalogId", "ItemCatalogId"),
    quantity: readNullableNumber(obj, "quantity", "Quantity"),
    unitId: readNullableNumber(obj, "unitId", "UnitId") ?? 0,
    unitName: readNullableString(obj, "unitName", "UnitName"),
    batchNo: readNullableString(obj, "batchNo", "BatchNo"),
    expDate: readNullableString(obj, "expDate", "ExpDate"),
    salesPrice: readNullableNumber(obj, "salesPrice", "SalesPrice"),
  };
}

function readNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  const value = readNullableNumber(obj, ...keys);
  return value ?? 0;
}

function readNullableIsoDateString(
  obj: Record<string, unknown>,
  ...keys: string[]
): string | null {
  const value = readNullableString(obj, ...keys);
  return value;
}

function normalizeStockBarcodeLabel(item: Record<string, unknown>): StockBarcodeLabel {
  const batchNo = readString(item, "batchNo", "BatchNo");
  const barcodeValue =
    readString(item, "barcodeValue", "BarcodeValue") || batchNo.trim();
  return {
    stockId: readNumber(item, "stockId", "StockId"),
    batchNo,
    barcodeValue,
    itemCode: readString(item, "itemCode", "ItemCode"),
    itemNameAr: readNullableString(item, "itemNameAr", "ItemNameAr"),
    itemNameEn: readNullableString(item, "itemNameEn", "ItemNameEn"),
    storeId: readNumber(item, "storeId", "StoreId"),
    expDate: readNullableIsoDateString(item, "expDate", "ExpDate"),
    qty: readNumber(item, "qty", "Qty"),
    salesPrice: readNumber(item, "salesPrice", "SalesPrice"),
    allowPrintBarcode: readBoolean(item, "allowPrintBarcode", "AllowPrintBarcode"),
  };
}

function mapSummary(raw: unknown) {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const fathId =
    readNullableNumber(obj, "serialNo", "SerialNo", "fathId", "FathId") ?? null;
  return {
    id: readNullableNumber(obj, "id", "Id") ?? 0,
    fathId,
    serialNo: fathId,
    sendingStorageId: readNullableString(obj, "sendingStorageId", "SendingStorageId"),
    sendingStorageName: readNullableString(obj, "sendingStorageName", "SendingStorageName"),
    receivingStorageId: readNullableString(
      obj,
      "receivingStorageId",
      "ReceivingStorageId"
    ),
    receivingStorageName: readNullableString(
      obj,
      "receivingStorageName",
      "ReceivingStorageName"
    ),
    totalQuantity: readNullableNumber(obj, "totalQuantity", "TotalQuantity"),
    receiveDate: readNullableString(obj, "receiveDate", "ReceiveDate"),
    totalSalesPrice: readNullableNumber(obj, "totalSalesPrice", "TotalSalesPrice"),
    movFlag: readNullableNumber(obj, "movFlag", "MovFlag") ?? 0,
  };
}

function mapList(raw: unknown): AcceptedPharmacyOrdersList {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const itemsRaw = obj.items ?? obj.Items ?? [];
  return {
    currentPharmacyName: readNullableString(
      obj,
      "currentPharmacyName",
      "CurrentPharmacyName"
    ),
    currentStorageId: readNullableString(obj, "currentStorageId", "CurrentStorageId"),
    currentStorageName: readNullableString(
      obj,
      "currentStorageName",
      "CurrentStorageName"
    ),
    storageConfigurationMessage: readNullableString(
      obj,
      "storageConfigurationMessage",
      "StorageConfigurationMessage"
    ),
    items: Array.isArray(itemsRaw) ? itemsRaw.map(mapSummary) : [],
    pageNumber: readNullableNumber(obj, "pageNumber", "PageNumber") ?? 1,
    pageSize: readNullableNumber(obj, "pageSize", "PageSize") ?? 20,
    totalCount: readNullableNumber(obj, "totalCount", "TotalCount") ?? 0,
    totalPages: readNullableNumber(obj, "totalPages", "TotalPages") ?? 0,
    hasPreviousPage: readBoolean(obj, "hasPreviousPage", "HasPreviousPage"),
    hasNextPage: readBoolean(obj, "hasNextPage", "HasNextPage"),
  };
}

function mapAcceptedDetail(raw: unknown): AcceptedPharmacyOrderDetail {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const detailsRaw = obj.details ?? obj.Details ?? [];
  const fathId =
    readNullableNumber(obj, "serialNo", "SerialNo", "fathId", "FathId") ?? null;
  return {
    id: readNullableNumber(obj, "id", "Id") ?? 0,
    fathId,
    serialNo: fathId,
    sendingStorageId: readNullableString(obj, "sendingStorageId", "SendingStorageId"),
    sendingStorageName: readNullableString(obj, "sendingStorageName", "SendingStorageName"),
    receivingStorageId: readNullableString(
      obj,
      "receivingStorageId",
      "ReceivingStorageId"
    ),
    receivingStorageName: readNullableString(
      obj,
      "receivingStorageName",
      "ReceivingStorageName"
    ),
    totalQuantity: readNullableNumber(obj, "totalQuantity", "TotalQuantity"),
    receiveDate: readNullableString(obj, "receiveDate", "ReceiveDate"),
    totalSalesPrice: readNullableNumber(obj, "totalSalesPrice", "TotalSalesPrice"),
    details: Array.isArray(detailsRaw) ? detailsRaw.map(mapDetail) : [],
  };
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return readString(body, "message", "Message") || response.statusText;
  } catch {
    return response.statusText || getAlfaApiHint();
  }
}

async function request<T>(
  token: string,
  path: string,
  init?: RequestInit,
  map?: (raw: unknown) => T
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/${path.replace(/^\//, "")}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new AcceptedPharmacyOrdersRepositoryError(await parseError(response), response.status);
  }

  const raw = await response.json();
  return map ? map(raw) : (raw as T);
}

export function getAcceptedPharmacyOrders(
  token: string,
  query: AcceptedPharmacyOrderQuery
): Promise<AcceptedPharmacyOrdersList> {
  const params = new URLSearchParams();
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.pageNumber != null) params.set("pageNumber", String(query.pageNumber));
  if (query.pageSize != null) params.set("pageSize", String(query.pageSize));
  const qs = params.toString();
  return request(
    token,
    `PharmReciveH/accepted${qs ? `?${qs}` : ""}`,
    { method: "GET" },
    mapList
  );
}

export function getAcceptedPharmacyOrderById(
  token: string,
  id: number
): Promise<AcceptedPharmacyOrderDetail> {
  return request(token, `PharmReciveH/accepted/${id}`, { method: "GET" }, mapAcceptedDetail);
}

export function getAcceptedPharmacyOrderStockBarcodeLabels(
  token: string,
  id: number
): Promise<StockBarcodeLabel[]> {
  return request(token, `PharmReciveH/accepted/${id}/stock-batches`, { method: "GET" }, (data) => {
    if (!Array.isArray(data)) return [];
    return data.map((item) =>
      normalizeStockBarcodeLabel(item as Record<string, unknown>)
    );
  });
}
