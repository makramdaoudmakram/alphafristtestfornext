import { computeHeaderTotals } from "@/lib/return-calculations";
import { toUpsertPayload } from "@/lib/return.mapper";
import {
  createReturnRepository,
  ReturnRepositoryError,
} from "@/repository/return.repository";
import type {
  ReturnDetail,
  ReturnDocument,
  ReturnSearchFilters,
  ReturnSearchResult,
} from "@/types/return";
import {
  returnDocumentSchema,
  returnDocumentUpdateSchema,
  type ReturnHeaderFormValues,
} from "@/validation/return.schema";

import { validatePurchaseDetailUnits } from "@/lib/item-unit-options";
import { z } from "zod";

export type SaveReturnInput = {
  header: ReturnHeaderFormValues;
  details: ReturnDetail[];
  recordId?: number | null;
  deletedDetailIds?: number[];
};

export class ReturnService {
  private repository: ReturnType<typeof createReturnRepository>;

  constructor(token: string) {
    this.repository = createReturnRepository(token);
  }

  buildDocument(header: ReturnHeaderFormValues, details: ReturnDetail[]) {
    const totals = computeHeaderTotals(header, details);
    return {
      header: { ...header, ...totals },
      details,
    };
  }

  validateDocument(
    header: ReturnHeaderFormValues,
    details: ReturnDetail[],
    itemByCode?: Map<string, import("@/types/item-catalog").ItemCatalogItem>,
    catalogItems?: readonly import("@/types/item-catalog").ItemCatalogItem[],
    options?: { allowEmptyDetails?: boolean; isUpdate?: boolean }
  ) {
    const document = this.buildDocument(header, details);
    const useUpdateSchema =
      options?.allowEmptyDetails === true ||
      (options?.isUpdate === true && details.length === 0);
    const schema = useUpdateSchema
      ? returnDocumentUpdateSchema
      : returnDocumentSchema;
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

  validateDocumentForApi(
    header: ReturnHeaderFormValues,
    details: ReturnDetail[],
    options?: { allowEmptyDetails?: boolean; isUpdate?: boolean }
  ) {
    const document = this.buildDocument(header, details);
    const useUpdateSchema =
      options?.allowEmptyDetails === true ||
      (options?.isUpdate === true && details.length === 0);
    const schema = useUpdateSchema
      ? returnDocumentUpdateSchema
      : returnDocumentSchema;
    return schema.safeParse(document);
  }

  private resolveRecordId(input: SaveReturnInput): number | null {
    if (input.recordId != null && input.recordId > 0) return input.recordId;
    if (input.header.id != null && input.header.id > 0) return input.header.id;
    return null;
  }

  async search(filters: ReturnSearchFilters): Promise<ReturnSearchResult[]> {
    return this.repository.search(filters);
  }

  async loadNavigationIds(): Promise<number[]> {
    return this.repository.listIds();
  }

  async loadById(id: number): Promise<ReturnDocument> {
    return this.repository.getById(id);
  }

  async save(input: SaveReturnInput): Promise<ReturnDocument> {
    const recordId = this.resolveRecordId(input);
    const isUpdate = recordId != null;
    const allowEmptyDetails = isUpdate && input.details.length === 0;

    const validation = this.validateDocumentForApi(input.header, input.details, {
      allowEmptyDetails,
      isUpdate,
    });
    if (!validation.success) {
      const first = validation.error.issues[0];
      throw new ReturnRepositoryError(first?.message ?? "Validation failed", 400);
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

  async post(id: number): Promise<ReturnDocument> {
    if (id <= 0) {
      throw new ReturnRepositoryError(
        "Could not determine the return document to post. Save or reload it first.",
        400
      );
    }
    return this.repository.post(id);
  }
}

export function createReturnService(token: string) {
  return new ReturnService(token);
}

export { ReturnRepositoryError };
