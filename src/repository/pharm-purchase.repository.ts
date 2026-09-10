import { API_BASE_URL, getAlfaApiHint } from "@/lib/api-config";
import {
  mapDocumentFromApi,
  mapSearchResultFromApi,
} from "@/lib/purchase.mapper";
import type {
  PurchaseDocument,
  PurchaseSearchFilters,
  PurchaseSearchResult,
  PurchaseUpsertPayload,
} from "@/types/purchase";
import type { PharmPurchaseContext } from "@/types/pharm-purchase";

export class PharmPurchaseRepositoryError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "PharmPurchaseRepositoryError";
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

function toApiVenBillDate(
  venBillDate: string | null | undefined,
  phtDate: string | null | undefined
): string | null {
  const value = venBillDate?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const fallback = phtDate?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}/.test(fallback)) return fallback.slice(0, 10);
  return value || fallback || null;
}

export function mapPharmPurchaseContextFromApi(
  raw: Record<string, unknown>
): PharmPurchaseContext {
  return {
    parmId: readNullableNumber(raw, "parmId", "ParmId") ?? 0,
    pharmacyName: readString(raw, "pharmacyName", "PharmacyName"),
    costCenterCode: readString(raw, "costCenterCode", "CostCenterCode") || null,
    costCenterName: readString(raw, "costCenterName", "CostCenterName") || null,
    movmentRowId: readNullableNumber(raw, "movmentRowId", "MovmentRowId") ?? 0,
    movId: readNullableNumber(raw, "movId", "MovId"),
    movChiledName: readString(raw, "movChiledName", "MovChiledName") || null,
    storeId: readString(raw, "storeId", "StoreId") || null,
    storeName: readString(raw, "storeName", "StoreName") || null,
    scopeValid: readBoolean(raw, "scopeValid", "ScopeValid"),
    scopeMessage: readString(raw, "scopeMessage", "ScopeMessage") || null,
  };
}

export class PharmPurchaseRepository {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private url(path: string, query?: Record<string, string | undefined>) {
    const normalized = path.replace(/^\//, "");
    const base = `${API_BASE_URL}/${normalized}`;
    if (!query) return base;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  private authHeaders(json = true): HeadersInit {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
    };
    if (json) headers["Content-Type"] = "application/json";
    return headers;
  }

  private async handle<T>(response: Response): Promise<T> {
    if (response.ok) {
      const text = await response.text();
      if (!text) return {} as T;
      return JSON.parse(text) as T;
    }

    const rawText = await response.text();
    let message = `Request failed (${response.status}).`;
    if (rawText) {
      try {
        const body = JSON.parse(rawText) as { message?: string; Message?: string };
        message = body.message ?? body.Message ?? rawText.slice(0, 300);
      } catch {
        message = rawText.slice(0, 300);
      }
    }

    throw new PharmPurchaseRepositoryError(message, response.status);
  }

  async getContext(): Promise<PharmPurchaseContext> {
    const response = await fetch(this.url("PharmPurchaseH/context"), {
      headers: this.authHeaders(),
      cache: "no-store",
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapPharmPurchaseContextFromApi(raw);
  }

  async search(filters: PurchaseSearchFilters): Promise<PurchaseSearchResult[]> {
    const response = await fetch(
      this.url("PharmPurchaseH/search", {
        pthId: filters.pthId,
        venBillNo: filters.venBillNo,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        itmId: filters.itmId,
        itmName: filters.itmName,
        pageSize: "100",
      }),
      { headers: this.authHeaders(), cache: "no-store" }
    );

    const data = await this.handle<unknown>(response);
    const list = Array.isArray(data)
      ? data
      : ((data as { items?: unknown[] }).items ?? []);

    return (list as Record<string, unknown>[]).map(mapSearchResultFromApi);
  }

  async listIds(): Promise<number[]> {
    const response = await fetch(this.url("PharmPurchaseH/ids"), {
      headers: this.authHeaders(),
      cache: "no-store",
    });
    const data = await this.handle<unknown>(response);
    if (Array.isArray(data)) return data as number[];
    const record = data as { items?: number[] };
    return record.items ?? [];
  }

  async getById(id: number): Promise<PurchaseDocument> {
    const response = await fetch(this.url(`PharmPurchaseH/${id}`), {
      headers: this.authHeaders(),
      cache: "no-store",
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapDocumentFromApi(raw);
  }

  private toApiBody(payload: PurchaseUpsertPayload) {
    const h = payload.header;
    const venBillNo =
      h.venBillNo?.trim() || (h.pthId != null ? String(h.pthId) : "");
    const venBillDate = toApiVenBillDate(h.venBillDate, h.phtDate);
    return {
      Header: {
        Id: h.id,
        PthId: h.pthId,
        VenBillNo: venBillNo,
        VenBillDate: venBillDate,
        PhtDate: h.phtDate,
        VenId: h.venId || null,
        MovId: h.movId != null ? Number(h.movId) : null,
        MovmentRowId: h.movmentRowId != null ? Number(h.movmentRowId) : null,
        MovAccount: h.movAccount || null,
        MovAccountsec: h.movAccountsec || null,
        MovAccounttherd: h.movAccounttherd || null,
        MovAccountfourth: h.movAccountfourth || null,
        PthNotice: h.pthNotice,
      },
      Details: payload.details.map((d) => ({
        Id: d.id && d.id > 0 ? d.id : null,
        ItmId: d.itmId,
        ExpDate: d.expDate || null,
        Qnty: d.qnty,
        Bonus: d.bonus,
        ItmPurPrice: d.itmPurPrice,
        ItmSell: d.itmSell,
        ItmTaxPrice: 0,
        ItmTaxTotal: 0,
        ItmExtraDis: 0,
        ItmDisPer: d.itmDisPer,
        ItmDisMon: d.itmDisMon,
        ItmCost: d.itmCost,
        ItmNet: d.itmNet,
        StdItmStock: d.stdItmStock,
        UnitId: d.unitId,
        StoId: d.stoId || null,
      })),
      DeletedDetailIds: payload.deletedDetailIds,
    };
  }

  async create(payload: PurchaseUpsertPayload): Promise<PurchaseDocument> {
    const response = await fetch(this.url("PharmPurchaseH"), {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(this.toApiBody(payload)),
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapDocumentFromApi(raw);
  }

  async update(id: number, payload: PurchaseUpsertPayload): Promise<PurchaseDocument> {
    const response = await fetch(this.url(`PharmPurchaseH/${id}`), {
      method: "PUT",
      headers: this.authHeaders(),
      body: JSON.stringify(this.toApiBody(payload)),
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapDocumentFromApi(raw);
  }

  async post(id: number): Promise<PurchaseDocument> {
    const response = await fetch(this.url(`PharmPurchaseH/${id}/post`), {
      method: "POST",
      headers: this.authHeaders(),
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapDocumentFromApi(raw);
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(this.url(`PharmPurchaseH/${id}`), {
      method: "DELETE",
      headers: this.authHeaders(false),
    });
    if (!response.ok && response.status !== 204) {
      throw new PharmPurchaseRepositoryError(
        `Delete failed (${response.status}). ${getAlfaApiHint()}`,
        response.status
      );
    }
  }
}

export function createPharmPurchaseRepository(token: string) {
  return new PharmPurchaseRepository(token);
}
