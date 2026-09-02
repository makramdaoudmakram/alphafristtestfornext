import { computeHeaderTotals } from "@/lib/pharm-recive-calculations";
import { toUpsertPayload } from "@/lib/pharm-recive.mapper";
import {
  createPharmReciveRepository,
  PharmReciveRepositoryError,
} from "@/repository/pharm-recive.repository";
import type {
  PharmReciveDetail,
  PharmReciveDocument,
  PharmReciveSearchFilters,
  PharmReciveSearchResult,
} from "@/types/pharm-recive";
import {
  pharmReciveDocumentSchema,
  type PharmReciveHeaderFormValues,
} from "@/validation/pharm-recive.schema";
import { validatePurchaseDetailUnits } from "@/lib/item-unit-options";

export type SavePharmReciveInput = {
  header: PharmReciveHeaderFormValues;
  details: PharmReciveDetail[];
  recordId?: number | null;
  deletedDetailIds?: number[];
};

export class PharmReciveService {
  private repository: ReturnType<typeof createPharmReciveRepository>;

  constructor(token: string) {
    this.repository = createPharmReciveRepository(token);
  }

  buildDocument(header: PharmReciveHeaderFormValues, details: PharmReciveDetail[]) {
    const totals = computeHeaderTotals(details);
    return {
      header: { ...header, ...totals },
      details,
    };
  }

  validateDocument(
    header: PharmReciveHeaderFormValues,
    details: PharmReciveDetail[],
    itemByCode?: Map<string, import("@/types/item-catalog").ItemCatalogItem>,
    catalogItems?: readonly import("@/types/item-catalog").ItemCatalogItem[]
  ) {
    const document = this.buildDocument(header, details);
    const parsed = pharmReciveDocumentSchema.safeParse(document);
    if (!parsed.success) return parsed;

    const unitMessage = validatePurchaseDetailUnits(
      parsed.data.details.map((row) => ({
        ...row,
        itmSell: row.itmSellPrice,
        bonus: 0,
        itmTaxPrice: 0,
        itmTaxTotal: 0,
        itmExtraDis: 0,
        itmDisMon: 0,
        itmDisPer: 0,
        itmCost: row.itemCostPrice,
        itmNet: 0,
        stdItmStock: row.itmStock,
        stoId: "",
        taxPercent: null,
      })),
      itemByCode ?? new Map(),
      catalogItems
    );
    if (unitMessage) {
      return {
        success: false as const,
        error: {
          issues: [{ message: unitMessage, path: ["details"] }],
        },
      };
    }

    return parsed;
  }

  private resolveRecordId(input: SavePharmReciveInput): number | null {
    if (input.recordId != null && input.recordId > 0) return input.recordId;
    if (input.header.id != null && input.header.id > 0) return input.header.id;
    return null;
  }

  async search(filters: PharmReciveSearchFilters): Promise<PharmReciveSearchResult[]> {
    return this.repository.search(filters);
  }

  async getServerDate(): Promise<string> {
    return this.repository.getServerDate();
  }

  async loadNavigationIds(): Promise<number[]> {
    return this.repository.listIds();
  }

  async loadById(id: number): Promise<PharmReciveDocument> {
    return this.repository.getById(id);
  }

  async getAuditHistory(id: number) {
    return this.repository.getAuditHistory(id);
  }

  async save(input: SavePharmReciveInput): Promise<PharmReciveDocument> {
    const recordId = this.resolveRecordId(input);
    const payload = toUpsertPayload(
      input.header,
      input.details,
      input.deletedDetailIds
    );

    if (recordId != null) {
      return this.repository.update(recordId, payload);
    }
    return this.repository.create(payload);
  }

  async delete(id: number): Promise<void> {
    return this.repository.delete(id);
  }
}

export function createPharmReciveService(token: string) {
  return new PharmReciveService(token);
}

export { PharmReciveRepositoryError };
