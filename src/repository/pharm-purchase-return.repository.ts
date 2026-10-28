import { API_BASE_URL } from "@/lib/api-config";
import { timedFetch } from "@/lib/timed-fetch";
import {
  mapDocumentFromApi,
  mapSaveResponseFromApi,
} from "@/lib/return.mapper";
import { normalizePharmPurchaseReturnExpDateForApi } from "@/lib/pharm-purchase-return-stock-search";
import { mapPharmPurchaseContextFromApi } from "@/repository/pharm-purchase.repository";
import type { PharmPurchaseContext } from "@/types/pharm-purchase";
import type { ReturnDocument, ReturnUpsertPayload } from "@/types/return";

type ReturnApiValidationError = {
  detailIndex?: number;
  itmCode?: string | null;
  itmName?: string | null;
  field?: string;
  message?: string;
};

function formatReturnApiError(body: Record<string, unknown>): string | null {
  const errors = body.errors;
  if (!Array.isArray(errors) || errors.length === 0) return null;

  const summary =
    (typeof body.message === "string" && body.message) ||
    "Return document contains validation errors.";

  const lines = errors
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as ReturnApiValidationError;
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

export class PharmPurchaseReturnRepositoryError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "PharmPurchaseReturnRepositoryError";
    this.status = status;
  }
}

export class PharmPurchaseReturnRepository {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private url(path: string) {
    const normalized = path.replace(/^\//, "");
    return `${API_BASE_URL}/${normalized}`;
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
        const body = JSON.parse(rawText) as Record<string, unknown>;
        message =
          formatReturnApiError(body) ||
          (typeof body.message === "string" && body.message) ||
          (typeof body.Message === "string" && body.Message) ||
          rawText.slice(0, 300);
      } catch {
        message = rawText.slice(0, 300);
      }
    }

    throw new PharmPurchaseReturnRepositoryError(message, response.status);
  }

  async getContext(): Promise<PharmPurchaseContext> {
    const response = await timedFetch(this.url("PharmPurchaseReturnH/context"), {
      headers: this.authHeaders(),
      cache: "no-store",
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapPharmPurchaseContextFromApi(raw);
  }

  async getById(id: number): Promise<ReturnDocument> {
    const response = await timedFetch(this.url(`PharmPurchaseReturnH/${id}`), {
      headers: this.authHeaders(),
      cache: "no-store",
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapDocumentFromApi(raw);
  }

  private toApiBody(payload: ReturnUpsertPayload) {
    const h = payload.header;
    const venBillNo =
      h.venBillNo?.trim() || (h.pthId != null ? String(h.pthId) : "");
    const venBillDate = toApiVenBillDate(h.venBillDate, h.phtDate);

    const body: Record<string, unknown> = {
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
        PurchExtraDisCount: h.purchExtraDisCount,
        TotalDisPer: h.totalDisPer,
        POtherExpenses: h.pOtherExpenses,
        TotalBill: h.totalBill,
        PthNetBill: h.pthNetBill,
        TotalTax: h.totalTax,
        TotalDesMon: h.totalDesMon,
        PthNotice: h.pthNotice,
        EmployCode: h.employCode ?? 0,
      },
      Details: payload.details.map((d) => ({
        Id: d.id && d.id > 0 ? d.id : null,
        ItmId: d.itmId,
        ExpDate:
          normalizePharmPurchaseReturnExpDateForApi(d.expDate) || null,
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
        BatchNo: d.batchNo?.trim() || null,
      })),
    };

    return body;
  }

  async create(payload: ReturnUpsertPayload): Promise<ReturnDocument> {
    const response = await timedFetch(this.url("PharmPurchaseReturnH"), {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(this.toApiBody(payload)),
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapSaveResponseFromApi(raw);
  }
}

export function createPharmPurchaseReturnRepository(token: string) {
  return new PharmPurchaseReturnRepository(token);
}
