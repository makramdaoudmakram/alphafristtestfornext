import { API_BASE_URL, getAlfaApiHint } from "@/lib/api-config";
import {
  mapDocumentFromApi,
  mapSaveResponseFromApi,
  mapSearchResultFromApi,
} from "@/lib/pharm-recive.mapper";
import type {
  PharmReciveDocument,
  PharmReciveSearchFilters,
  PharmReciveSearchResult,
  PharmReciveUpsertPayload,
  PharmReciveAuditHistoryItem,
} from "@/types/pharm-recive";

type PharmReciveApiValidationError = {
  detailIndex?: number;
  itmCode?: string | null;
  field?: string;
  message?: string;
};

function formatPharmReciveApiError(body: Record<string, unknown>): string | null {
  const errors = body.errors;
  if (!Array.isArray(errors) || errors.length === 0) return null;

  const summary =
    (typeof body.message === "string" && body.message) ||
    "Pharmacy receive document contains validation errors.";

  const lines = errors
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as PharmReciveApiValidationError;
      const index = typeof row.detailIndex === "number" ? row.detailIndex : "?";
      const code = row.itmCode?.trim() || "—";
      const text = row.message?.trim() || "Invalid value.";
      return `Row ${index}: ${code} — ${text}`;
    })
    .filter((line): line is string => Boolean(line));

  if (lines.length === 0) return summary;
  return `${summary}\n${lines.join("\n")}`;
}

function readAuditString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function mapAuditHistoryItem(
  row: Record<string, unknown>
): PharmReciveAuditHistoryItem | null {
  const timestamp =
    readAuditString(row, "timestamp", "Timestamp") ||
    (row.timestamp instanceof Date && !Number.isNaN(row.timestamp.getTime())
      ? row.timestamp.toISOString()
      : "");
  const action = readAuditString(row, "action", "Action") || "UPDATE";
  const userName =
    readAuditString(row, "userName", "UserName") ||
    readAuditString(row, "email", "Email") ||
    "Unknown";
  return {
    timestamp,
    action,
    description: readAuditString(row, "description", "Description"),
    userName: userName,
  };
}

export class PharmReciveRepositoryError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "PharmReciveRepositoryError";
    this.status = status;
  }
}

export class PharmReciveRepository {
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
      throw new PharmReciveRepositoryError(
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
      formatPharmReciveApiError(body) ||
      (typeof body.message === "string" && body.message) ||
      (typeof body.Message === "string" && body.Message) ||
      (response.status === 404
        ? "PharmRecive endpoint not found. Restart the Alfa API after deploying PharmReciveH."
        : rawText
          ? `Request failed (${response.status}): ${rawText.slice(0, 200)}`
          : `Request failed (${response.status}).`);

    throw new PharmReciveRepositoryError(message, response.status);
  }

  async search(filters: PharmReciveSearchFilters): Promise<PharmReciveSearchResult[]> {
    const response = await fetch(
      this.url("PharmReciveH/search", {
        movId: filters.movId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        itmId: filters.itmId,
        itemCode: filters.itmId,
        itmName: filters.itmName,
        pageSize: "100",
      }),
      { headers: this.authHeaders(), cache: "no-store" }
    );

    if (response.status === 404) return [];

    const data = await this.handle<unknown>(response);
    const list = Array.isArray(data)
      ? data
      : ((data as { items?: unknown[] }).items ?? []);

    return list.map((row) => mapSearchResultFromApi(row as Record<string, unknown>));
  }

  async getServerDate(): Promise<string> {
    const response = await fetch(this.url("PharmReciveH/server-date"), {
      headers: this.authHeaders(),
      cache: "no-store",
    });
    const data = await this.handle<Record<string, unknown>>(response);
    const raw = data.date ?? data.Date;
    return typeof raw === "string" ? raw.trim() : "";
  }

  async listIds(): Promise<number[]> {
    const response = await fetch(this.url("PharmReciveH/ids", { pageSize: "5000" }), {
      headers: this.authHeaders(),
      cache: "no-store",
    });
    const data = await this.handle<{ items?: number[] } | number[]>(response);
    if (Array.isArray(data)) return data;
    return data.items ?? [];
  }

  async getById(id: number): Promise<PharmReciveDocument> {
    const response = await fetch(this.url(`PharmReciveH/${id}`), {
      headers: this.authHeaders(),
      cache: "no-store",
    });
    const data = await this.handle<Record<string, unknown>>(response);
    return mapDocumentFromApi(data);
  }

  async getAuditHistory(id: number): Promise<PharmReciveAuditHistoryItem[]> {
    const response = await fetch(this.url(`PharmReciveH/${id}/audit-history`), {
      headers: this.authHeaders(),
      cache: "no-store",
    });
    const data = await this.handle<Record<string, unknown>>(response);
    const items = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.Items)
        ? data.Items
        : [];
    return items
      .map((row) => mapAuditHistoryItem(row as Record<string, unknown>))
      .filter((row): row is PharmReciveAuditHistoryItem => row != null);
  }

  private toApiBody(payload: PharmReciveUpsertPayload) {
    return {
      Header: {
        Id: payload.header.id,
        MovId: payload.header.movId,
        MovmentRowId: payload.header.movmentRowId,
        FathId: payload.header.fathId,
        MovStor: payload.header.movStor,
        MovDis: payload.header.movDis,
        MovDate: payload.header.movDate,
        MonNote: payload.header.monNote,
        AccountDept: payload.header.accountDept,
        AccountCREDIT: payload.header.accountCREDIT,
        MovTotalTaxPrice: payload.header.movTotalTaxPrice,
      },
      Details: payload.details.map((line) => ({
        Id: line.id,
        ItmId: line.itmId,
        ExpDate: line.expDate || null,
        Qnty: line.qnty,
        ItmPurPrice: line.itmPurPrice,
        ItmSellPrice: line.itmSellPrice,
        ItemCostPrice: line.itemCostPrice,
        UnitId: line.unitId,
        ItmStock: line.itmStock,
        BatchNo: line.batchNo || null,
      })),
      DeletedDetailIds: payload.deletedDetailIds ?? [],
    };
  }

  async create(payload: PharmReciveUpsertPayload): Promise<PharmReciveDocument> {
    const response = await fetch(this.url("PharmReciveH"), {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(this.toApiBody(payload)),
    });
    const data = await this.handle<Record<string, unknown>>(response);
    return mapSaveResponseFromApi(data);
  }

  async update(id: number, payload: PharmReciveUpsertPayload): Promise<PharmReciveDocument> {
    const response = await fetch(this.url(`PharmReciveH/${id}`), {
      method: "PUT",
      headers: this.authHeaders(),
      body: JSON.stringify(this.toApiBody(payload)),
    });
    const data = await this.handle<Record<string, unknown>>(response);
    return mapSaveResponseFromApi(data);
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(this.url(`PharmReciveH/${id}`), {
      method: "DELETE",
      headers: this.authHeaders(false),
    });
    if (!response.ok && response.status !== 204) {
      await this.handle(response);
    }
  }
}

export function createPharmReciveRepository(token: string) {
  return new PharmReciveRepository(token);
}

export { PharmReciveRepositoryError as PharmReciveServiceError };
