import type { ItemCatalogItem } from "@/types/item-catalog";
import {
  defaultTransferQty,
  type PurchaseTransferLineSelection,
  validateMovementSourceStoreForTransfer,
  validateTransferLinesBeforeSubmit,
  validateTransferQuantity,
} from "@/lib/purchase-to-pharm-recive-transfer";
import {
  isMovementValidForSend,
  toSendPayload,
  validateSendDocument,
  type SendValidationResult,
} from "@/lib/pharm-store-return-send";
import type { MovmentLookupItem } from "@/types/movment";
import type {
  PharmStoreReturnSendDetail,
  PharmStoreReturnSendPayload,
  PharmStoreReturnSendUnitFields,
} from "@/types/pharm-store-return-send";

export type { PurchaseTransferLineSelection };

export {
  defaultTransferQty,
  validateTransferLinesBeforeSubmit,
  validateTransferQuantity,
};

export function buildUnitFieldsFromCatalog(
  item: ItemCatalogItem | undefined
): PharmStoreReturnSendUnitFields {
  return {
    itmUnit1: item?.itmUnit1 ?? null,
    itmUnit2: item?.itmUnit2 ?? null,
    itmUnit3: item?.itmUnit3 ?? null,
    itmUnit1Unit2: item?.itmUnit1Unit2 ?? null,
    itmUnit1Unit3: item?.itmUnit1Unit3 ?? null,
  };
}

export function validatePharmacyStoreScopeForTransfer(
  pharmacyStoreId: string | null | undefined,
  lines: PurchaseTransferLineSelection[]
): string | null {
  const current = pharmacyStoreId?.trim();
  if (!current) return null;

  const included = lines.filter((row) => row.included && row.candidate.transferable);
  for (const row of included) {
    const source = row.candidate.sourceStoreId?.trim();
    if (source && source !== current) {
      return `Purchase stock is in store ${source}, but your pharmacy store is ${current}.`;
    }
  }

  return null;
}

/** Prefer purchase batch source store when lines agree — matches stock being transferred. */
export function resolvePharmacyStoreIdForReturnMovementValidation(
  pharmacyStoreId: string | null | undefined,
  lines: PurchaseTransferLineSelection[]
): string | null | undefined {
  const included = lines.filter((row) => row.included && row.candidate.transferable);
  const stores = new Set(
    included
      .map((row) => row.candidate.sourceStoreId?.trim())
      .filter((value): value is string => Boolean(value))
  );
  if (stores.size === 1) return stores.values().next().value as string;
  return pharmacyStoreId;
}

export function validatePharmPurchaseStoreReturnMovement(
  movement: MovmentLookupItem | null,
  pharmacyStoreId: string | null | undefined,
  lines: PurchaseTransferLineSelection[]
): string | null {
  const storeForMovementCheck = resolvePharmacyStoreIdForReturnMovementValidation(
    pharmacyStoreId,
    lines
  );

  if (!isMovementValidForSend(movement, storeForMovementCheck)) {
    if (movement && !movement.movStor2?.trim()) {
      return "Movement destination store is missing. Wait for movement details to load or pick the movement again.";
    }
    return "Select a pharmacy → main store return movement for your pharmacy.";
  }

  const scopeError = validatePharmacyStoreScopeForTransfer(pharmacyStoreId, lines);
  if (scopeError) return scopeError;

  return validateMovementSourceStoreForTransfer(movement, lines);
}

export function buildSendDetailsFromPharmPurchaseTransferLines(
  lines: PurchaseTransferLineSelection[],
  catalogByCode: Map<string, ItemCatalogItem>
): PharmStoreReturnSendDetail[] {
  return lines
    .filter((row) => row.included && row.candidate.transferable && row.transferQty > 0)
    .map((row) => {
      const candidate = row.candidate;
      const code = candidate.itemId?.trim() ?? "";
      const catalog =
        catalogByCode.get(code) ??
        catalogByCode.get(code.toLowerCase()) ??
        undefined;
      const unitFields = buildUnitFieldsFromCatalog(catalog);

      return {
        clientRowId: `pharm-purch-transfer-${candidate.purchaseDetailId}`,
        stockId: candidate.stockId ?? null,
        itmId: code,
        itmNameEn: candidate.itemNameEn?.trim() ?? "",
        itmNameAr: candidate.itemNameAr?.trim() ?? "",
        batchNo: candidate.batchNo?.trim() ?? "",
        expDate: candidate.expDate?.trim() ?? "",
        unitId: candidate.unitId > 0 ? candidate.unitId : null,
        qnty: row.transferQty,
        baseAvailableQty: candidate.baseAvailableQty,
        itemCostPrice: candidate.itemCostPrice ?? 0,
        itmSellPrice: candidate.itmSellPrice ?? 0,
        unitFields,
      };
    });
}

export function validatePharmPurchaseStoreReturnBeforeSubmit(input: {
  movement: MovmentLookupItem | null;
  pharmacyStoreId: string | null | undefined;
  lines: PurchaseTransferLineSelection[];
  sendDetails: PharmStoreReturnSendDetail[];
}): SendValidationResult | { ok: false; message: string } {
  const lineError = validateTransferLinesBeforeSubmit(input.lines);
  if (lineError) return { ok: false, message: lineError };

  const movementError = validatePharmPurchaseStoreReturnMovement(
    input.movement,
    input.pharmacyStoreId,
    input.lines
  );
  if (movementError) return { ok: false, message: movementError };

  return validateSendDocument(input.movement, input.sendDetails);
}

export function buildPharmPurchaseStoreReturnSendPayload(input: {
  movement: MovmentLookupItem;
  note?: string;
  lines: PurchaseTransferLineSelection[];
  catalogByCode: Map<string, ItemCatalogItem>;
}): PharmStoreReturnSendPayload {
  const details = buildSendDetailsFromPharmPurchaseTransferLines(
    input.lines,
    input.catalogByCode
  );
  return toSendPayload(input.movement.id, input.note, details);
}
