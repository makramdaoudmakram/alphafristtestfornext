import { API_BASE_URL, getAlfaApiHint } from "@/lib/api-config";
import type {
  PharmTranAcceptResult,
  PharmTranPendingList,
} from "@/types/pharm-tran";

export class PharmTranRepositoryError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "PharmTranRepositoryError";
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
    itemCode: readNullableString(obj, "itemCode", "ItemCode"),
    itemNameAr: readNullableString(obj, "itemNameAr", "ItemNameAr"),
    itemNameEn: readNullableString(obj, "itemNameEn", "ItemNameEn"),
    quantity: readNullableNumber(obj, "quantity", "Quantity"),
    unitId: readNullableNumber(obj, "unitId", "UnitId"),
    unitName: readNullableString(obj, "unitName", "UnitName"),
    batchNo: readNullableString(obj, "batchNo", "BatchNo"),
    expDate: readNullableString(obj, "expDate", "ExpDate"),
    purchasePrice: readNullableNumber(obj, "purchasePrice", "PurchasePrice"),
    salesPrice: readNullableNumber(obj, "salesPrice", "SalesPrice"),
    costPrice: readNullableNumber(obj, "costPrice", "CostPrice"),
  };
}

function mapPendingHeader(raw: unknown) {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const detailsRaw = obj.details ?? obj.Details ?? [];

  return {
    id: readNullableNumber(obj, "id", "Id") ?? 0,
    serialNo: readNullableNumber(obj, "serialNo", "SerialNo"),
    sendingPharmacyId: readNullableNumber(obj, "sendingPharmacyId", "SendingPharmacyId") ?? 0,
    sendingPharmacyName: readNullableString(obj, "sendingPharmacyName", "SendingPharmacyName"),
    receivingPharmacyId:
      readNullableNumber(obj, "receivingPharmacyId", "ReceivingPharmacyId") ?? 0,
    receivingPharmacyName: readNullableString(
      obj,
      "receivingPharmacyName",
      "ReceivingPharmacyName"
    ),
    totalQuantity: readNullableNumber(obj, "totalQuantity", "TotalQuantity"),
    transferDate: readNullableString(obj, "transferDate", "TransferDate"),
    totalSalesPrice: readNullableNumber(obj, "totalSalesPrice", "TotalSalesPrice"),
    details: Array.isArray(detailsRaw) ? detailsRaw.map(mapPendingDetail) : [],
  };
}

function mapPendingList(raw: unknown): PharmTranPendingList {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const itemsRaw = obj.items ?? obj.Items ?? [];
  return {
    items: Array.isArray(itemsRaw) ? itemsRaw.map(mapPendingHeader) : [],
  };
}

function mapAcceptResult(raw: unknown): PharmTranAcceptResult {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    id: readNullableNumber(obj, "id", "Id") ?? 0,
    serialNo: readNullableNumber(obj, "serialNo", "SerialNo"),
    traFlag: readNullableNumber(obj, "traFlag", "TraFlag") ?? 0,
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
    throw new PharmTranRepositoryError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.json();
  return map ? map(raw) : (raw as T);
}

export function getPendingPharmTransfers(token: string) {
  return request(token, "PharmTranH/pending", { method: "GET" }, mapPendingList);
}

export function acceptPharmTransfer(token: string, headerId: number) {
  return request(
    token,
    `PharmTranH/${headerId}/accept`,
    { method: "POST" },
    mapAcceptResult
  );
}
