import { computePharmPurchaseHeaderTotals } from "@/lib/pharm-purchase-calculations";
import { toUpsertPayload } from "@/lib/purchase.mapper";
import {
  createPharmPurchaseRepository,
  PharmPurchaseRepositoryError,
} from "@/repository/pharm-purchase.repository";
import type {
  PurchaseDetail,
  PurchaseDocument,
  PurchaseSearchFilters,
  PurchaseSearchResult,
} from "@/types/purchase";
import type { PharmPurchaseContext } from "@/types/pharm-purchase";
import type { PurchaseHeaderFormValues } from "@/validation/purchase.schema";
import { purchaseDocumentSchema } from "@/validation/purchase.schema";

export class PharmPurchaseService {
  private repository: ReturnType<typeof createPharmPurchaseRepository>;

  constructor(token: string) {
    this.repository = createPharmPurchaseRepository(token);
  }

  getContext(): Promise<PharmPurchaseContext> {
    return this.repository.getContext();
  }

  buildDocument(header: PurchaseHeaderFormValues, details: PurchaseDetail[]) {
    const totals = computePharmPurchaseHeaderTotals(details);
    return {
      header: {
        ...header,
        ...totals,
        purchExtraDisCount: 0,
        totalDisPer: 0,
        pOtherExpenses: 0,
      },
      details,
    };
  }

  validateDocument(header: PurchaseHeaderFormValues, details: PurchaseDetail[]) {
    const document = this.buildDocument(header, details);
    return purchaseDocumentSchema.safeParse(document);
  }

  search(filters: PurchaseSearchFilters): Promise<PurchaseSearchResult[]> {
    return this.repository.search(filters);
  }

  loadNavigationIds(): Promise<number[]> {
    return this.repository.listIds();
  }

  loadById(id: number): Promise<PurchaseDocument> {
    return this.repository.getById(id);
  }

  async save(input: {
    header: PurchaseHeaderFormValues;
    details: PurchaseDetail[];
    recordId?: number | null;
    deletedDetailIds?: number[];
  }): Promise<PurchaseDocument> {
    const validation = this.validateDocument(input.header, input.details);
    if (!validation.success) {
      const first = validation.error.issues[0];
      throw new PharmPurchaseRepositoryError(first?.message ?? "Validation failed", 400);
    }

    const payload = toUpsertPayload(
      validation.data.header,
      validation.data.details,
      input.deletedDetailIds
    );

    const recordId = input.recordId ?? input.header.id;
    if (recordId != null && recordId > 0) {
      return this.repository.update(recordId, payload);
    }
    return this.repository.create(payload);
  }

  post(id: number): Promise<PurchaseDocument> {
    return this.repository.post(id);
  }

  remove(id: number): Promise<void> {
    return this.repository.delete(id);
  }
}

export function createPharmPurchaseService(token: string) {
  return new PharmPurchaseService(token);
}

export { PharmPurchaseRepositoryError };
