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

type PurchaseApiValidationError = {
  detailIndex?: number;
  itmCode?: string | null;
  itmName?: string | null;
  field?: string;
  message?: string;
};

function formatPurchaseApiError(body: Record<string, unknown>): string | null {
  const errors = body.errors;
  if (!Array.isArray(errors) || errors.length === 0) return null;

  const summary =
    (typeof body.message === "string" && body.message) ||
    "Purchase invoice contains validation errors.";

  const lines = errors
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as PurchaseApiValidationError;
      const index =
        typeof row.detailIndex === "number" ? row.detailIndex : "?";
      const code = row.itmCode?.trim() || "—";
      const text = row.message?.trim() || "Invalid value.";
      return `Row ${index}: ${code} — ${text}`;
    })
    .filter((line): line is string => Boolean(line));

  if (lines.length === 0) return summary;
  return `${summary}\n${lines.join("\n")}`;
}

export class PurchaseRepositoryError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "PurchaseRepositoryError";
    this.status = status;
  }
}

/** HTTP access to Alfa PurTransH endpoints via Next.js proxy (no SQL from React). */
export class PurchaseRepository {
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

  private async parseJson<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new PurchaseRepositoryError(
        `Unexpected response from Alfa API (${getAlfaApiHint()}).`,
        response.status
      );
    }
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
      return this.parseJson<T>(response);
    }

    const rawText = await response.text();
    let body: Record<string, unknown> = {};
    if (rawText) {
      try {
        body = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        body = { message: rawText.slice(0, 500) };
      }
    }

    const message =
      formatPurchaseApiError(body) ||
      (typeof body.message === "string" && body.message) ||
      (typeof body.Message === "string" && body.Message) ||
      (typeof body.title === "string" && body.title) ||
      (typeof body.detail === "string" && body.detail) ||
      (response.status === 404
        ? "Purchase endpoint not found. Restart the Alfa API after deploying PurTransH."
        : rawText
          ? `Request failed (${response.status}): ${rawText.slice(0, 200)}`
          : `Request failed (${response.status}).`);

    throw new PurchaseRepositoryError(message, response.status);
  }

  async search(filters: PurchaseSearchFilters): Promise<PurchaseSearchResult[]> {
    const response = await fetch(
      this.url("PurTransH/search", {
        pthId: filters.pthId,
        vendor: filters.vendor,
        venBillNo: filters.venBillNo,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        itmId: filters.itmId,
        itemCode: filters.itmId,
        movId: filters.movId,
      }),
      { headers: this.authHeaders(), cache: "no-store" }
    );

    if (response.status === 404) {
      return [];
    }

    const data = await this.handle<unknown>(response);
    const list = Array.isArray(data)
      ? data
      : ((data as { items?: unknown[] }).items ?? []);

    return (list as Record<string, unknown>[]).map(mapSearchResultFromApi);
  }

  async listIds(): Promise<number[]> {
    const response = await fetch(this.url("PurTransH/ids"), {
      headers: this.authHeaders(),
      cache: "no-store",
    });

    if (response.status === 404) {
      return [];
    }

    const data = await this.handle<unknown>(response);
    if (Array.isArray(data)) {
      return data;
    }

    const record = data as { items?: number[]; Items?: number[]; ids?: number[] };
    const items = record.items ?? record.Items ?? record.ids;
    return Array.isArray(items) ? items : [];
  }

  async getById(id: number): Promise<PurchaseDocument> {
    const response = await fetch(this.url(`PurTransH/${id}`), {
      headers: this.authHeaders(),
      cache: "no-store",
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapDocumentFromApi(raw);
  }

  /** Build API body with PascalCase property names for reliable ASP.NET binding. */
  private toApiBody(payload: PurchaseUpsertPayload) {
    const h = payload.header;
    const body: Record<string, unknown> = {
      Header: {
        Id: h.id,
        PthId: h.pthId,
        VenBillNo: h.venBillNo,
        VenBillDate: h.venBillDate,
        PhtDate: h.phtDate,
        VenId: h.venId || null,
        MovId: h.movId != null ? Number(h.movId) : null,
        MovmentRowId: h.movmentRowId != null ? Number(h.movmentRowId) : null,
        MovAccount: h.movAccount || null,
        MovAccountsec: h.movAccountsec || null,
        MovAccounttherd: h.movAccounttherd || null,
        MovAccountfourth: h.movAccountfourth || null,
        PurchExtraDisCount: h.purchExtraDisCount,
        TotalDisPer: h.totalDisPer,
        POtherExpenses: h.pOtherExpenses,
        PthNotice: h.pthNotice,
      },
      Details: payload.details.map((d) => ({
        Id: d.id && d.id > 0 ? d.id : null,
        ItmId: d.itmId,
        CId: d.cId,
        ExpDate: d.expDate || null,
        Qnty: d.qnty,
        Bonus: d.bonus,
        ItmPurPrice: d.itmPurPrice,
        ItmSell: d.itmSell,
        ItmTaxPrice: d.itmTaxPrice ?? 0,
        ItmTaxTotal: d.itmTaxTotal,
        ItmExtraDis: d.itmExtraDis,
        ItmDisPer: d.itmDisPer,
        ItmDisMon: d.itmDisMon,
        ItmCost: d.itmCost,
        ItmNet: d.itmNet,
        StdItmStock: d.stdItmStock,
        UnitId: d.unitId,
        StoId: d.stoId || null,
      })),
    };

    if (payload.deletedDetailIds != null && payload.deletedDetailIds.length > 0) {
      body.DeletedDetailIds = payload.deletedDetailIds;
    }

    return body;
  }

  async create(payload: PurchaseUpsertPayload): Promise<PurchaseDocument> {
    const response = await fetch(this.url("PurTransH"), {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(this.toApiBody(payload)),
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapDocumentFromApi(raw);
  }

  async update(id: number, payload: PurchaseUpsertPayload): Promise<PurchaseDocument> {
    const response = await fetch(this.url(`PurTransH/${id}`), {
      method: "PUT",
      headers: this.authHeaders(),
      body: JSON.stringify(this.toApiBody(payload)),
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapDocumentFromApi(raw);
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(this.url(`PurTransH/${id}`), {
      method: "DELETE",
      headers: this.authHeaders(false),
    });
    if (!response.ok && response.status !== 204) {
      const body = await this.parseJson<{ message?: string; Message?: string }>(
        response
      ).catch(() => ({ message: undefined, Message: undefined }));
      const message =
        body.message ??
        body.Message ??
        `Request failed (${response.status}).`;
      throw new PurchaseRepositoryError(message, response.status);
    }
  }
}

export function createPurchaseRepository(token: string) {
  return new PurchaseRepository(token);
}
