import { API_BASE_URL, getAlfaApiHint } from "@/lib/api-config";
import { mapDocumentFromApi } from "@/lib/inventory-adjustment.mapper";
import type {
  InventoryAdjustmentDocument,
  InventoryAdjustmentSaveResult,
  InventoryAdjustmentUpsertPayload,
} from "@/types/inventory-adjustment";

type InventoryApiValidationError = {
  detailIndex?: number;
  itmCode?: string | null;
  field?: string;
  message?: string;
};

function formatInventoryApiError(body: Record<string, unknown>): string | null {
  const errors =
    (body.detailErrors as InventoryApiValidationError[] | undefined) ??
    (body.DetailErrors as InventoryApiValidationError[] | undefined);

  if (!Array.isArray(errors) || errors.length === 0) return null;

  const summary =
    (typeof body.message === "string" && body.message) ||
    "Inventory document contains validation errors.";

  const lines = errors
    .map((row) => {
      const index = typeof row.detailIndex === "number" ? row.detailIndex : "?";
      const code = row.itmCode?.trim() || "—";
      const text = row.message?.trim() || "Invalid value.";
      return `Row ${index}: ${code} — ${text}`;
    })
    .filter(Boolean);

  if (lines.length === 0) return summary;
  return `${summary}\n${lines.join("\n")}`;
}

export class InventoryAdjustmentRepositoryError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "InventoryAdjustmentRepositoryError";
    this.status = status;
  }
}

export class InventoryAdjustmentRepository {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private url(path: string) {
    const normalized = path.replace(/^\//, "");
    return `${API_BASE_URL}/${normalized}`;
  }

  private authHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private async parseJson<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new InventoryAdjustmentRepositoryError(
        `Unexpected response from Alfa API (${getAlfaApiHint()}).`,
        response.status
      );
    }
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
      formatInventoryApiError(body) ||
      (typeof body.message === "string" && body.message) ||
      (typeof body.Message === "string" && body.Message) ||
      (response.status === 404
        ? "Inventory endpoint not found. Restart the Alfa API after deploying InventoryH."
        : rawText
          ? rawText.slice(0, 500)
          : `Request failed (${response.status}).`);

    throw new InventoryAdjustmentRepositoryError(message, response.status);
  }

  async getById(id: number): Promise<InventoryAdjustmentDocument> {
    const response = await fetch(this.url(`InventoryH/${id}`), {
      headers: this.authHeaders(),
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapDocumentFromApi(raw);
  }

  async create(payload: InventoryAdjustmentUpsertPayload): Promise<InventoryAdjustmentDocument> {
    const response = await fetch(this.url("InventoryH"), {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapDocumentFromApi(raw);
  }

  async update(
    id: number,
    payload: InventoryAdjustmentUpsertPayload
  ): Promise<InventoryAdjustmentDocument> {
    const response = await fetch(this.url(`InventoryH/${id}`), {
      method: "PUT",
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
    const raw = await this.handle<Record<string, unknown>>(response);
    return mapDocumentFromApi(raw);
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(this.url(`InventoryH/${id}`), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    if (!response.ok && response.status !== 204) {
      const body = await this.parseJson<{ message?: string; Message?: string }>(
        response
      ).catch(() => ({ message: undefined, Message: undefined }));
      const message =
        body.message ??
        body.Message ??
        `Request failed (${response.status}).`;
      throw new InventoryAdjustmentRepositoryError(message, response.status);
    }
  }
}

export function createInventoryAdjustmentRepository(token: string) {
  return new InventoryAdjustmentRepository(token);
}

export function mapSaveError(error: unknown): InventoryAdjustmentSaveResult {
  if (error instanceof InventoryAdjustmentRepositoryError) {
    return { success: false, message: error.message };
  }
  if (error instanceof Error) {
    return { success: false, message: error.message };
  }
  return { success: false, message: "Inventory save failed." };
}
