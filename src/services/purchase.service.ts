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
import { purchaseDocumentSchema } from "@/validation/purchase.schema";

export type SavePurchaseInput = {
  header: PurchaseHeaderFormValues;
  details: PurchaseDetail[];
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

  validateDocument(header: PurchaseHeaderFormValues, details: PurchaseDetail[]) {
    const document = this.buildDocument(header, details);
    return purchaseDocumentSchema.safeParse(document);
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
    const validation = this.validateDocument(input.header, input.details);
    if (!validation.success) {
      const first = validation.error.errors[0];
      throw new PurchaseRepositoryError(first?.message ?? "Validation failed", 400);
    }

    const document = validation.data;
    const payload = toUpsertPayload(document.header, document.details);

    if (document.header.id) {
      return this.repository.update(document.header.id, payload);
    }
    return this.repository.create(payload);
  }

  async remove(id: number): Promise<void> {
    return this.repository.delete(id);
  }
}

export function createPurchaseService(token: string) {
  return new PurchaseService(token);
}

export { PurchaseRepositoryError };
