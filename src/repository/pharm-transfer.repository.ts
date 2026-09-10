import { API_BASE_URL, getAlfaApiHint } from "@/lib/api-config";
import type {
  EmployInfoLookup,
  PharmTransferContext,
  PharmTransferDocument,
  PharmTransferHeader,
  PharmTransferSearchResult,
} from "@/types/pharm-transfer";

export class PharmTransferRepositoryError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "PharmTransferRepositoryError";
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

function mapPharmacyOption(raw: unknown) {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    parmId: readNullableNumber(obj, "parmId", "ParmId") ?? 0,
    name: readNullableString(obj, "name", "Name"),
    storeId: readNullableNumber(obj, "storeId", "StoreId") ?? 0,
  };
}

function mapContext(raw: unknown): PharmTransferContext {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const destinationsRaw = obj.destinationPharmacies ?? obj.DestinationPharmacies ?? [];
  return {
    currentPharmacyId: readNullableNumber(obj, "currentPharmacyId", "CurrentPharmacyId") ?? 0,
    currentPharmacyName: readNullableString(
      obj,
      "currentPharmacyName",
      "CurrentPharmacyName"
    ),
    currentStoreId: readNullableNumber(obj, "currentStoreId", "CurrentStoreId") ?? 0,
    currentStoreName: readNullableString(obj, "currentStoreName", "CurrentStoreName"),
    destinationPharmacies: Array.isArray(destinationsRaw)
      ? destinationsRaw.map(mapPharmacyOption)
      : [],
  };
}

function mapDetail(raw: unknown) {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const itemCode = readNullableString(obj, "itemCode", "ItemCode") ?? "";
  const salesPrice = readNullableNumber(obj, "salesPrice", "SalesPrice") ?? 0;
  const costPrice = readNullableNumber(obj, "costPrice", "CostPrice", "purchPrice", "PurchPrice") ?? 0;
  return {
    clientRowId: crypto.randomUUID(),
    id: readNullableNumber(obj, "id", "Id"),
    lineNo: readNullableNumber(obj, "lineNo", "LineNo") ?? undefined,
    itmId: itemCode,
    itemCatalogId: readNullableNumber(obj, "itemCatalogId", "ItemCatalogId"),
    itmNameAr: readNullableString(obj, "itemNameAr", "ItemNameAr"),
    itmNameEn: readNullableString(obj, "itemNameEn", "ItemNameEn"),
    qnty: readNullableNumber(obj, "quantity", "Quantity") ?? 0,
    unitId: readNullableNumber(obj, "unitId", "UnitId") ?? 0,
    unitName: readNullableString(obj, "unitName", "UnitName"),
    itmSell: salesPrice,
    purchPrice: costPrice,
    batchNo: readNullableString(obj, "batchNo", "BatchNo"),
    expDate: readNullableString(obj, "expDate", "ExpDate"),
    stockId: readNullableNumber(obj, "stockId", "StockId"),
    // Bases recovered on unit change via current unit PriceQtyNet (Purchase pattern).
    baseItmSell: undefined,
    baseCostPrice: undefined,
    priceQtyNet: undefined,
  };
}

function mapDocument(raw: unknown): PharmTransferDocument {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const detailsRaw = obj.details ?? obj.Details ?? [];
  const header: PharmTransferHeader = {
    id: readNullableNumber(obj, "id", "Id"),
    movId: readNullableNumber(obj, "movId", "MovId"),
    seial: readNullableNumber(obj, "seial", "Seial"),
    movDis: readNullableNumber(obj, "movDis", "MovDis") ?? 0,
    traDate: readNullableString(obj, "traDate", "TraDate") ?? "",
    deliveryEmployeeCode:
      readNullableString(obj, "deliveryEmployeeCode", "DeliveryEmployeeCode") ?? "",
    deliveryEmployeeName: readNullableString(
      obj,
      "deliveryEmployeeName",
      "DeliveryEmployeeName"
    ),
    receivingEmployeeCode:
      readNullableString(obj, "receivingEmployeeCode", "ReceivingEmployeeCode") ?? "",
    receivingEmployeeName: readNullableString(
      obj,
      "receivingEmployeeName",
      "ReceivingEmployeeName"
    ),
    note: readNullableString(obj, "note", "Note"),
    traTotalq: readNullableNumber(obj, "traTotalq", "TraTotalq"),
    traTotals: readNullableNumber(obj, "traTotals", "TraTotals"),
    traTotalCost: readNullableNumber(obj, "traTotalCost", "TraTotalCost"),
    traFlag: readNullableNumber(obj, "traFlag", "TraFlag"),
  };

  return {
    header,
    details: Array.isArray(detailsRaw) ? detailsRaw.map(mapDetail) : [],
  };
}

function mapSearchResult(raw: unknown): PharmTransferSearchResult {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const traFlag = readNullableNumber(obj, "traFlag", "TraFlag");
  return {
    id: readNullableNumber(obj, "id", "Id") ?? 0,
    movId: readNullableNumber(obj, "movId", "MovId") ?? 0,
    traDate: readNullableString(obj, "traDate", "TraDate"),
    movDis: readNullableNumber(obj, "movDis", "MovDis") ?? 0,
    destinationPharmacyName: readNullableString(
      obj,
      "destinationPharmacyName",
      "DestinationPharmacyName"
    ),
    traTotalq: readNullableNumber(obj, "traTotalq", "TraTotalq"),
    traFlag,
    statusText:
      readNullableString(obj, "statusText", "StatusText") ??
      (traFlag === 1 ? "Not Accept" : traFlag === 2 ? "Accept" : traFlag != null ? String(traFlag) : null),
  };
}

function mapEmployLookup(raw: unknown): EmployInfoLookup {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    id: readNullableNumber(obj, "id", "Id") ?? 0,
    code: readNullableString(obj, "code", "Code"),
    name: readNullableString(obj, "name", "Name"),
    employType: readNullableNumber(obj, "employType", "EmployType") ?? 0,
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
    throw new PharmTransferRepositoryError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.json();
  if (map) {
    if (raw && typeof raw === "object" && "document" in (raw as object)) {
      return map((raw as Record<string, unknown>).document);
    }
    return map(raw);
  }
  return raw as T;
}

export function createPharmTransferRepository(token: string) {
  return {
    getContext(): Promise<PharmTransferContext> {
      return request(token, "PharmTranH/context", { method: "GET" }, mapContext);
    },

    search(filters: {
      itemCode?: string;
      startDate?: string;
      endDate?: string;
    }): Promise<PharmTransferSearchResult[]> {
      const params = new URLSearchParams();
      if (filters.itemCode?.trim()) params.set("itemCode", filters.itemCode.trim());
      if (filters.startDate?.trim()) params.set("startDate", filters.startDate.trim());
      if (filters.endDate?.trim()) params.set("endDate", filters.endDate.trim());
      const query = params.toString();
      return request(
        token,
        `PharmTranH/search${query ? `?${query}` : ""}`,
        { method: "GET" },
        (raw) => (Array.isArray(raw) ? raw.map(mapSearchResult) : [])
      );
    },

    getById(id: number): Promise<PharmTransferDocument> {
      return request(token, `PharmTranH/${id}`, { method: "GET" }, mapDocument);
    },

    create(payload: unknown): Promise<PharmTransferDocument> {
      return request(
        token,
        "PharmTranH",
        { method: "POST", body: JSON.stringify(payload) },
        mapDocument
      );
    },

    update(id: number, payload: unknown): Promise<PharmTransferDocument> {
      return request(
        token,
        `PharmTranH/${id}`,
        { method: "PUT", body: JSON.stringify(payload) },
        mapDocument
      );
    },

    delete(id: number): Promise<void> {
      return request(token, `PharmTranH/${id}`, { method: "DELETE" });
    },

    lookupEmployee(code: string, employType: number): Promise<EmployInfoLookup | null> {
      const params = new URLSearchParams();
      params.set("code", code.trim());
      params.set("employType", String(employType));
      return fetch(
        `${API_BASE_URL}/EmployInfo/lookup-by-code?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      ).then(async (response) => {
        if (response.status === 404) return null;
        if (!response.ok) {
          throw new PharmTransferRepositoryError(await parseError(response), response.status);
        }
        const raw = await response.json();
        return mapEmployLookup(raw);
      });
    },

    lookupEmployeeByPassword(password: string): Promise<EmployInfoLookup | null> {
      return fetch(`${API_BASE_URL}/EmployInfo/lookup-by-password`, {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: password.trim() }),
      }).then(async (response) => {
        if (response.status === 404) return null;
        if (!response.ok) {
          throw new PharmTransferRepositoryError(await parseError(response), response.status);
        }
        const raw = await response.json();
        return mapEmployLookup(raw);
      });
    },
  };
}
