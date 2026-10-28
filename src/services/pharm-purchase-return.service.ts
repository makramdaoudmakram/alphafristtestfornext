import { computeHeaderTotals } from "@/lib/return-calculations";
import { toUpsertPayload } from "@/lib/return.mapper";
import {
  createPharmPurchaseReturnRepository,
  PharmPurchaseReturnRepositoryError,
} from "@/repository/pharm-purchase-return.repository";
import type { PharmPurchaseContext } from "@/types/pharm-purchase";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { ReturnDetail, ReturnDocument } from "@/types/return";
import { validatePurchaseDetailUnits } from "@/lib/item-unit-options";
import type { ReturnHeaderFormValues } from "@/validation/return.schema";
import { pharmPurchaseReturnDocumentSchema } from "@/validation/pharm-purchase-return.schema";
import { z } from "zod";

export type SavePharmPurchaseReturnInput = {
  header: ReturnHeaderFormValues;
  details: ReturnDetail[];
  /** Resolved catalog map from save — required for unit validation on this page. */
  itemByCode?: Map<string, ItemCatalogItem>;
  catalogItems?: readonly ItemCatalogItem[];
};

export class PharmPurchaseReturnService {
  private repository: ReturnType<typeof createPharmPurchaseReturnRepository>;

  constructor(token: string) {
    this.repository = createPharmPurchaseReturnRepository(token);
  }

  getContext(): Promise<PharmPurchaseContext> {
    return this.repository.getContext();
  }

  loadById(id: number): Promise<ReturnDocument> {
    return this.repository.getById(id);
  }

  buildDocument(header: ReturnHeaderFormValues, details: ReturnDetail[]) {
    const totals = computeHeaderTotals(
      {
        purchExtraDisCount: Number(header.purchExtraDisCount ?? 0),
        totalDisPer: Number(header.totalDisPer ?? 0),
        pOtherExpenses: Number(header.pOtherExpenses ?? 0),
      },
      details
    );
    return {
      header: { ...header, ...totals },
      details,
    };
  }

  validateDocument(
    header: ReturnHeaderFormValues,
    details: ReturnDetail[],
    itemByCode?: Map<string, import("@/types/item-catalog").ItemCatalogItem>,
    catalogItems?: readonly import("@/types/item-catalog").ItemCatalogItem[]
  ) {
    const document = this.buildDocument(header, details);
    const parsed = pharmPurchaseReturnDocumentSchema.safeParse(document);
    if (!parsed.success) return parsed;

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

  async create(input: SavePharmPurchaseReturnInput): Promise<ReturnDocument> {
    const validation = this.validateDocument(
      input.header,
      input.details,
      input.itemByCode,
      input.catalogItems
    );
    if (!validation.success) {
      const first = validation.error.issues[0];
      throw new PharmPurchaseReturnRepositoryError(
        first?.message ?? "Validation failed",
        400
      );
    }

    const payload = toUpsertPayload(
      validation.data.header,
      validation.data.details
    );
    return this.repository.create(payload);
  }
}

export function createPharmPurchaseReturnService(token: string) {
  return new PharmPurchaseReturnService(token);
}

export { PharmPurchaseReturnRepositoryError };
