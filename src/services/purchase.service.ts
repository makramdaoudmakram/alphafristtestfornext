import { computeHeaderTotals } from "@/lib/purchase-calculations";
import { toUpsertPayload } from "@/lib/purchase.mapper";
import {
  createPurchaseRepository,
  PurchaseRepositoryError,
} from "@/repository/purchase.repository";
import type {
  PurchaseDetail,
  PurchaseDocument,
  PurchaseSearchFilters,
  PurchaseSearchResult,
} from "@/types/purchase";
import type { PurchaseHeaderFormValues } from "@/validation/purchase.schema";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { StockBarcodeLabel } from "@/types/stock";
import { purchaseDocumentSchema, purchaseDocumentUpdateSchema } from "@/validation/purchase.schema";
import { validatePurchaseDetailUnits } from "@/lib/item-unit-options";
import { z } from "zod";

export type SavePurchaseInput = {
  header: PurchaseHeaderFormValues;
  details: PurchaseDetail[];
  /** PurTransH.Id — authoritative update key when form state loses id. */
  recordId?: number | null;
  deletedDetailIds?: number[];
};

export class PurchaseService {
  private repository: ReturnType<typeof createPurchaseRepository>;

  constructor(token: string) {
    this.repository = createPurchaseRepository(token);
  }

  /** Merge calculated readonly header totals before validate/save */
  buildDocument(header: PurchaseHeaderFormValues, details: PurchaseDetail[]) {
    const totals = computeHeaderTotals(header, details);
    return {
      header: { ...header, ...totals },
      details,
    };
  }

  validateDocument(
    header: PurchaseHeaderFormValues,
    details: PurchaseDetail[],
    itemByCode?: Map<string, ItemCatalogItem>,
    catalogItems?: readonly ItemCatalogItem[],
    options?: { allowEmptyDetails?: boolean; isUpdate?: boolean }
  ) {
    const document = this.buildDocument(header, details);
    const useUpdateSchema =
      options?.allowEmptyDetails === true ||
      (options?.isUpdate === true && details.length === 0);
    const schema = useUpdateSchema
      ? purchaseDocumentUpdateSchema
      : purchaseDocumentSchema;
    const parsed = schema.safeParse(document);
    if (!parsed.success) return parsed;

    if (details.length === 0) {
      return parsed;
    }

    const unitMessage = validatePurchaseDetailUnits(
      parsed.data.details,
      itemByCode ?? new Map(),
      catalogItems
    );
    if (unitMessage) {
      return {
        success: false as const,
        error: new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: unitMessage,
            path: ["details"],
          },
        ]),
      };
    }

    return parsed;
  }

  /**
   * Validates document shape only. Unit rules are enforced by the API on save.
   */
  validateDocumentForApi(
    header: PurchaseHeaderFormValues,
    details: PurchaseDetail[],
    options?: { allowEmptyDetails?: boolean; isUpdate?: boolean }
  ) {
    const document = this.buildDocument(header, details);
    const useUpdateSchema =
      options?.allowEmptyDetails === true ||
      (options?.isUpdate === true && details.length === 0);
    const schema = useUpdateSchema
      ? purchaseDocumentUpdateSchema
      : purchaseDocumentSchema;
    return schema.safeParse(document);
  }

  private resolveRecordId(input: SavePurchaseInput): number | null {
    if (input.recordId != null && input.recordId > 0) return input.recordId;
    if (input.header.id != null && input.header.id > 0) return input.header.id;
    return null;
  }

  async search(filters: PurchaseSearchFilters): Promise<PurchaseSearchResult[]> {
    return this.repository.search(filters);
  }

  async loadNavigationIds(): Promise<number[]> {
    return this.repository.listIds();
  }

  async loadById(id: number): Promise<PurchaseDocument> {
    return this.repository.getById(id);
  }

  async save(input: SavePurchaseInput): Promise<PurchaseDocument> {
    const recordId = this.resolveRecordId(input);
    const isUpdate = recordId != null;
    const allowEmptyDetails = isUpdate && input.details.length === 0;

    const validation = this.validateDocumentForApi(input.header, input.details, {
      allowEmptyDetails,
      isUpdate,
    });
    if (!validation.success) {
      const first = validation.error.issues[0];
      throw new PurchaseRepositoryError(first?.message ?? "Validation failed", 400);
    }

    const document = validation.data;
    const payload = toUpsertPayload(
      document.header,
      document.details,
      input.deletedDetailIds
    );

    if (recordId != null) {
      return this.repository.update(recordId, payload);
    }
    return this.repository.create(payload);
  }

  async remove(id: number): Promise<void> {
    return this.repository.delete(id);
  }

  async post(id: number): Promise<PurchaseDocument> {
    if (id <= 0) {
      throw new PurchaseRepositoryError(
        "Could not determine the invoice to post. Save or reload the purchase first.",
        400
      );
    }
    return this.repository.post(id);
  }

  async getStockBarcodeLabels(purchaseId: number): Promise<StockBarcodeLabel[]> {
    if (purchaseId <= 0) return [];
    return this.repository.getStockBarcodeLabels(purchaseId);
  }
}

export function createPurchaseService(token: string) {
  return new PurchaseService(token);
}

export { PurchaseRepositoryError };
