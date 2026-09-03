import {
  createInventoryAdjustmentRepository,
  InventoryAdjustmentRepositoryError,
  mapSaveError,
} from "@/repository/inventory-adjustment.repository";
import { toInventoryUpsertPayload } from "@/lib/inventory-adjustment.mapper";
import type {
  InventoryAdjustmentDocument,
  InventoryAdjustmentHeader,
  InventoryAdjustmentDetail,
  InventoryAdjustmentSaveResult,
  InventoryPostingPage,
  InventoryPostingQuery,
} from "@/types/inventory-adjustment";
import type { ItemCatalogItem } from "@/types/item-catalog";
import { validateInventoryDetails } from "@/validation/inventory-adjustment.schema";

export class InventoryAdjustmentService {
  private repository: ReturnType<typeof createInventoryAdjustmentRepository>;

  constructor(token: string) {
    this.repository = createInventoryAdjustmentRepository(token);
  }

  async getById(id: number): Promise<InventoryAdjustmentDocument> {
    return this.repository.getById(id);
  }

  async save(
    header: InventoryAdjustmentHeader,
    details: InventoryAdjustmentDetail[],
    deletedDetailIds: number[] = [],
    itemByCode?: Map<string, ItemCatalogItem>
  ): Promise<InventoryAdjustmentSaveResult> {
    const detailError = validateInventoryDetails(details);
    if (detailError) {
      return { success: false, message: detailError };
    }

    try {
      const payload = toInventoryUpsertPayload(
        header,
        details,
        deletedDetailIds,
        itemByCode
      );
      const document =
        header.id != null && header.id > 0
          ? await this.repository.update(header.id, payload)
          : await this.repository.create(payload);

      return { success: true, document };
    } catch (error) {
      return mapSaveError(error);
    }
  }

  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  async listUnpostedForPosting(
    query: InventoryPostingQuery
  ): Promise<InventoryPostingPage> {
    return this.repository.listUnpostedForPosting(query);
  }

  async post(id: number): Promise<InventoryAdjustmentDocument> {
    return this.repository.post(id);
  }
}

export function createInventoryAdjustmentService(token: string) {
  return new InventoryAdjustmentService(token);
}

export { InventoryAdjustmentRepositoryError };
