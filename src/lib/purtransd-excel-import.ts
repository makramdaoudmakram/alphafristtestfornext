import {
  getMovmentById,
  getNextMovValue,
} from "@/lib/api-client";
import {
  applyPurchaseDetailPatch,
  recalculatePurchaseDetailRow,
} from "@/lib/purchase-calculations";
import { toMovmentLookupItem } from "@/lib/purchase-movement";
import {
  applyMovementStoToDetails,
  applyMovementToHeader,
  createEmptyDetailRow,
  emptyPurchaseHeader,
  headerToFormValues,
} from "@/lib/purchase.mapper";
import { getDefaultMovementStoreId } from "@/lib/purchase-stores";
import { ensureCatalogItemsForItmCodes } from "@/lib/item-unit-options";
import { createPurchaseService } from "@/services/purchase.service";
import type { MovmentLookupItem } from "@/types/movment";
import type {
  PurchaseDetail,
  PurchaseDocument,
  PurTransDExcelPreview,
  PurTransDExcelPreviewRowValidated,
  PurTransDExcelPreviewValidated,
} from "@/types/purchase";

export type PurchaseExcelImportInput = {
  movement: MovmentLookupItem;
  invoiceId: string;
  invoiceDate: string;
  preview: PurTransDExcelPreviewValidated;
};

function parseOptionalNumber(raw: string | null | undefined): number | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRequiredNumber(raw: string, fallback = 0): number {
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function previewToImportBase(
  preview: PurTransDExcelPreviewValidated
): PurTransDExcelPreview {
  return {
    fileName: preview.fileName,
    sheetName: preview.sheetName,
    rowCount: preview.rowCount,
    rows: preview.rows.map(({ isValid, errors, ...row }) => row),
  };
}

export function mapExcelPreviewRowToPurchaseDetail(
  row: PurTransDExcelPreviewRowValidated,
  defaultStoreId: string
): PurchaseDetail {
  const stoId = row.stoId?.trim() || defaultStoreId;
  const taxPrice = parseOptionalNumber(row.itmTaxPrice);

  const base = createEmptyDetailRow(stoId);
  const patched = applyPurchaseDetailPatch(base, {
    itmId: row.itmId.trim(),
    itmNameAr: row.itmNameAr?.trim() ?? "",
    itmNameEn: row.itmNameEn?.trim() ?? "",
    qnty: parseRequiredNumber(row.qnty, 1),
    bonus: parseRequiredNumber(row.bonus, 0),
    unitId: parseOptionalNumber(row.unitId),
    itmPurPrice: parseRequiredNumber(row.itmPurPrice, 0),
    itmSell: parseRequiredNumber(row.itmSell, 0),
    itmTaxPrice: taxPrice,
    itmExtraDis: parseRequiredNumber(row.itmExtraDis, 0),
    itmDisPer: parseRequiredNumber(row.itmDisPer, 0),
    itmDisMon: parseRequiredNumber(row.itmDisMon, 0),
    expDate: row.expDate?.trim() ?? "",
    stoId,
  });

  return recalculatePurchaseDetailRow(patched);
}

export function mapExcelPreviewToPurchaseDetails(
  rows: PurTransDExcelPreviewRowValidated[],
  movement: MovmentLookupItem
): PurchaseDetail[] {
  const defaultStoreId = getDefaultMovementStoreId(movement);
  const details = rows.map((row) =>
    mapExcelPreviewRowToPurchaseDetail(row, defaultStoreId)
  );
  return applyMovementStoToDetails(details, movement);
}

export function validatePurchaseExcelImportHeader(input: {
  movement: MovmentLookupItem | null;
  invoiceId: string;
  invoiceDate: string;
}): string | null {
  if (!input.movement) {
    return "Select a movement before import.";
  }
  if (input.movement.movChiledId == null) {
    return "Selected movement has no MovChiledId.";
  }
  if (!input.invoiceId.trim()) {
    return "Invoice ID is required.";
  }
  if (!input.invoiceDate.trim()) {
    return "Invoice date is required.";
  }
  return null;
}

/** Shown when POST /api/PurTransH fails after the server rolls back the transaction. */
export const PURCHASE_EXCEL_IMPORT_ROLLBACK_HINT =
  "Nothing was saved. The server rolled back the purchase header, detail lines, and stock changes.";

/**
 * Excel import save path (Phases 8–9):
 * - Single POST /api/PurTransH (same as the Purchase page Save)
 * - PurTransHService.CreateAsync runs one DB transaction for PurTransH + PurTransD + Stock
 * - Stock uses StockService.ApplyPurchaseDetailsAsync → UnitConversionService.ConvertToBaseUnit
 *   with quantity = Qty + Bonus (no Excel-specific stock logic on the client)
 */
export function formatPurchaseExcelImportFailureMessage(error: unknown): string {
  const base =
    error instanceof Error ? error.message : "Import failed.";
  if (/rolled back|roll back/i.test(base)) {
    return base;
  }
  return `${base} ${PURCHASE_EXCEL_IMPORT_ROLLBACK_HINT}`;
}

/** Phase 8–9: create PurTransH + PurTransD + Stock via existing purchase save (POST /api/PurTransH). */
export async function importPurTransDExcelPurchase(
  token: string,
  input: PurchaseExcelImportInput
): Promise<PurchaseDocument> {
  const headerError = validatePurchaseExcelImportHeader({
    movement: input.movement,
    invoiceId: input.invoiceId,
    invoiceDate: input.invoiceDate,
  });
  if (headerError) {
    throw new Error(headerError);
  }

  if (!input.preview.isValid) {
    throw new Error("Fix all Excel validation errors before import.");
  }

  const fullMovement = await getMovmentById(input.movement.id, token);
  const movement = toMovmentLookupItem(fullMovement);

  if (movement.movChiledId == null) {
    throw new Error("Selected movement has no MovChiledId.");
  }

  const nextPthId = await getNextMovValue(movement.movChiledId, token);
  if (!nextPthId.success || nextPthId.value <= 0) {
    throw new Error(
      nextPthId.message?.trim() || "Could not allocate the next purchase document number."
    );
  }

  const invoiceDate = input.invoiceDate.trim();
  let header = headerToFormValues(emptyPurchaseHeader());
  header = applyMovementToHeader(header, movement);
  header = {
    ...header,
    pthId: nextPthId.value,
    venBillNo: input.invoiceId.trim(),
    venBillDate: invoiceDate,
    phtDate: invoiceDate,
  };

  const details = mapExcelPreviewToPurchaseDetails(
    input.preview.rows,
    movement
  );

  const itemByCode = await ensureCatalogItemsForItmCodes(
    details.map((row) => ({ itmId: row.itmId })),
    new Map(),
    undefined,
    token
  );

  const service = createPurchaseService(token);
  const validation = service.validateDocument(
    header,
    details,
    itemByCode,
    undefined,
    { isUpdate: false }
  );

  if (!validation.success) {
    const issue = validation.error.issues[0];
    throw new Error(issue?.message ?? "Purchase validation failed.");
  }

  return service.save({
    header: validation.data.header,
    details: validation.data.details,
  });
}
