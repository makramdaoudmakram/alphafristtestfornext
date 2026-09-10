import { API_BASE_URL, getAlfaApiHint } from "@/lib/api-config";
import type {
  StorToPharmAcceptResult,
  StorToPharmPendingList,
} from "@/types/stor-to-pharm";

export class StorToPharmRepositoryError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "StorToPharmRepositoryError";
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

function mapPendingDetail(raw: unknown) {
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

function mapPendingHeader(raw: unknown) {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const detailsRaw = obj.details ?? obj.Details ?? [];
  const fathId =
    readNullableNumber(obj, "fathId", "FathId", "serialNo", "SerialNo") ?? null;

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
    details: Array.isArray(detailsRaw) ? detailsRaw.map(mapPendingDetail) : [],
  };
}

function mapPendingList(raw: unknown): StorToPharmPendingList {
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
    items: Array.isArray(itemsRaw) ? itemsRaw.map(mapPendingHeader) : [],
  };
}

function mapAcceptResult(raw: unknown): StorToPharmAcceptResult {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    id: readNullableNumber(obj, "id", "Id") ?? 0,
    serialNo: readNullableNumber(obj, "serialNo", "SerialNo"),
    movFlag: readNullableNumber(obj, "movFlag", "MovFlag") ?? 0,
    message: readString(obj, "message", "Message"),
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
    throw new StorToPharmRepositoryError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.json();
  return map ? map(raw) : (raw as T);
}

export function getPendingStorToPharm(token: string) {
  return request(token, "PharmReciveH/pending", { method: "GET" }, mapPendingList);
}

export function acceptStorToPharm(token: string, headerId: number) {
  return request(
    token,
    `PharmReciveH/${headerId}/accept`,
    { method: "POST" },
    mapAcceptResult
  );
}
