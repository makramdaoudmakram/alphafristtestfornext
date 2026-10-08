import { API_BASE_URL, getAlfaApiHint } from "@/lib/api-config";
import { timedFetch } from "@/lib/timed-fetch";
import type {
  PharmStoreReturnAcceptResult,
  PharmStoreReturnPendingPage,
  PharmStoreReturnPendingSection,
} from "@/types/pharm-store-return";
import type {
  PharmStoreReturnSendPayload,
  PharmStoreReturnSendResult,
} from "@/types/pharm-store-return-send";

export class PharmStoreReturnRepositoryError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "PharmStoreReturnRepositoryError";
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

function mapPendingDetail(raw: unknown) {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    id: readNullableNumber(obj, "id", "Id") ?? 0,
    lineNo: readNullableNumber(obj, "lineNo", "LineNo") ?? 0,
    itemCode: readNullableString(obj, "itemCode", "ItemCode", "itmId", "ItmId"),
    itemNameAr: readNullableString(obj, "itemNameAr", "ItemNameAr"),
    itemNameEn: readNullableString(obj, "itemNameEn", "ItemNameEn"),
    stockId: readNullableNumber(obj, "stockId", "StockId"),
    batchNo: readNullableString(obj, "batchNo", "BatchNo"),
    expDate: readNullableString(obj, "expDate", "ExpDate"),
    unitId: readNullableNumber(obj, "unitId", "UnitId") ?? 0,
    unitName: readNullableString(obj, "unitName", "UnitName"),
    unitValue: readNullableNumber(obj, "unitValue", "UnitValue"),
    quantity: readNullableNumber(obj, "quantity", "Quantity", "qnty", "Qnty"),
    sourceStoreId: readNullableNumber(obj, "sourceStoreId", "SourceStoreId"),
    destinationStoreId: readNullableNumber(obj, "destinationStoreId", "DestinationStoreId"),
  };
}

function mapPendingHeader(raw: unknown) {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const detailsRaw = obj.details ?? obj.Details ?? [];
  return {
    id: readNullableNumber(obj, "id", "Id") ?? 0,
    serialNo: readNullableNumber(obj, "serialNo", "SerialNo"),
    sourceStoreId: readNullableNumber(obj, "sourceStoreId", "SourceStoreId"),
    sourcePharmacyName: readNullableString(obj, "sourcePharmacyName", "SourcePharmacyName"),
    destinationStoreId: readNullableNumber(obj, "destinationStoreId", "DestinationStoreId"),
    destinationStoreName: readNullableString(
      obj,
      "destinationStoreName",
      "DestinationStoreName"
    ),
    totalQuantity: readNullableNumber(obj, "totalQuantity", "TotalQuantity", "totalQty", "TotalQty"),
    returnDate: readNullableString(obj, "returnDate", "ReturnDate"),
    status: readNullableNumber(obj, "status", "Status", "movFlag", "MovFlag"),
    statusText: readNullableString(obj, "statusText", "StatusText"),
    insertUid: readNullableString(obj, "insertUid", "InsertUid"),
    details: Array.isArray(detailsRaw) ? detailsRaw.map(mapPendingDetail) : [],
  };
}

function mapSection(raw: unknown, fallbackName: string): PharmStoreReturnPendingSection {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const itemsRaw = obj.items ?? obj.Items ?? [];
  return {
    storeId: readNullableNumber(obj, "storeId", "StoreId"),
    storeName: readString(obj, "storeName", "StoreName") || fallbackName,
    isCurrentStore: readBoolean(obj, "isCurrentStore", "IsCurrentStore"),
    items: Array.isArray(itemsRaw) ? itemsRaw.map(mapPendingHeader) : [],
  };
}

function mapPendingPage(raw: unknown): PharmStoreReturnPendingPage {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    activeStoreId: readNullableString(obj, "activeStoreId", "ActiveStoreId"),
    activeStoreName: readNullableString(obj, "activeStoreName", "ActiveStoreName"),
    mainStore: mapSection(obj.mainStore ?? obj.MainStore, "Main Store"),
    expireStore: mapSection(obj.expireStore ?? obj.ExpireStore, "Expire Store"),
    message: readNullableString(obj, "message", "Message"),
  };
}

function mapAcceptResult(raw: unknown): PharmStoreReturnAcceptResult {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    id: readNullableNumber(obj, "id", "Id") ?? 0,
    serialNo: readNullableNumber(obj, "serialNo", "SerialNo"),
    status: readNullableNumber(obj, "status", "Status", "movFlag", "MovFlag") ?? 0,
    message: readString(obj, "message", "Message"),
  };
}

function mapSendResult(raw: unknown): PharmStoreReturnSendResult {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const detailsRaw = obj.details ?? obj.Details;
  return {
    id: readNullableNumber(obj, "id", "Id") ?? 0,
    serialNo: readNullableNumber(obj, "serialNo", "SerialNo"),
    sourceStoreId: readNullableNumber(obj, "sourceStoreId", "SourceStoreId"),
    sourcePharmacyName: readNullableString(obj, "sourcePharmacyName", "SourcePharmacyName"),
    destinationStoreId: readNullableNumber(obj, "destinationStoreId", "DestinationStoreId"),
    destinationStoreName: readNullableString(obj, "destinationStoreName", "DestinationStoreName"),
    totalQuantity: readNullableNumber(obj, "totalQuantity", "TotalQuantity"),
    returnDate: readNullableString(obj, "returnDate", "ReturnDate"),
    status: readNullableNumber(obj, "status", "Status", "movFlag", "MovFlag"),
    statusText: readNullableString(obj, "statusText", "StatusText"),
    detailCount: Array.isArray(detailsRaw) ? detailsRaw.length : 0,
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
  const response = await timedFetch(`${API_BASE_URL}/${path.replace(/^\//, "")}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new PharmStoreReturnRepositoryError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.json();
  return map ? map(raw) : (raw as T);
}

export function getPendingPharmStoreReturn(token: string) {
  return request(token, "PharmStoreReturn/pending", { method: "GET" }, mapPendingPage);
}

export function acceptPharmStoreReturn(token: string, headerId: number) {
  return request(
    token,
    `PharmStoreReturn/${headerId}/accept`,
    { method: "POST" },
    mapAcceptResult
  );
}

export function sendPharmStoreReturn(token: string, payload: PharmStoreReturnSendPayload) {
  return request(
    token,
    "PharmStoreReturn",
    { method: "POST", body: JSON.stringify(payload) },
    mapSendResult
  );
}
