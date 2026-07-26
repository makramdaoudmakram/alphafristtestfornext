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

    const data = await this.handle<number[] | { ids?: number[] }>(response);
    return Array.isArray(data) ? data : (data.ids ?? []);
  }

  async getById(id: number): Promise<PurchaseDocument> {
    const response = await fetch(this.url(`PurTransH/${id}`), {
      headers: this.authHeaders(),
      cache: "no-store",
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapDocumentFromApi(raw);
  }

  async create(payload: PurchaseUpsertPayload): Promise<PurchaseDocument> {
    const response = await fetch(this.url("PurTransH"), {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapDocumentFromApi(raw);
  }

  async update(id: number, payload: PurchaseUpsertPayload): Promise<PurchaseDocument> {
    const response = await fetch(this.url(`PurTransH/${id}`), {
      method: "PUT",
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
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
