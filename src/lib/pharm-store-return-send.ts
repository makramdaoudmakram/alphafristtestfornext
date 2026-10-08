import { getItemDefaultUnitId, isUnitIdValidForItem } from "@/lib/item-unit-options";
import { formatReturnItemStockSearchExpDate } from "@/lib/return-item-stock-search";
import type { MovmentLookupItem } from "@/types/movment";
import type { ReturnItemStockSearchItem } from "@/types/stock";
import type {
  PharmStoreReturnSendDetail,
  PharmStoreReturnSendPayload,
  PharmStoreReturnSendUnitFields,
} from "@/types/pharm-store-return-send";

/**
 * Movement parent for Pharmacy → Main Store returns (MovParient "Pharm Return store").
 * Backend SendAsync validates the parent by NAME ("Pharm Return store"), so this id only
 * scopes the movement dropdown; verify it matches the production MovParient row for that name.
 */
export const PHARM_STORE_RETURN_MOV_PARENT_ID = 1007;

let rowSeq = 0;
function nextClientRowId(): string {
  rowSeq += 1;
  return `psr-${Date.now().toString(36)}-${rowSeq}`;
}

export function createEmptySendDetailRow(seed?: number): PharmStoreReturnSendDetail {
  return {
    clientRowId: `psr-new-${seed ?? Math.random().toString(36).slice(2)}`,
    stockId: null,
    itmId: "",
    itmNameAr: "",
    itmNameEn: "",
    batchNo: "",
    expDate: "",
    unitId: null,
    qnty: 1,
    baseAvailableQty: 0,
    itemCostPrice: 0,
    itmSellPrice: 0,
    unitFields: {
      itmUnit1: null,
      itmUnit2: null,
      itmUnit3: null,
      itmUnit1Unit2: null,
      itmUnit1Unit3: null,
    },
  };
}

/** Unit conversion snapshot from the stock search row (already sourced from ItemCatalog). */
export function buildUnitFieldsFromSearch(
  item: ReturnItemStockSearchItem
): PharmStoreReturnSendUnitFields {
  return {
    itmUnit1: item.itmUnit1 ?? null,
    itmUnit2: item.itmUnit2 ?? null,
    itmUnit3: item.itmUnit3 ?? null,
    itmUnit1Unit2: item.itmUnit1Unit2 ?? null,
    itmUnit1Unit3: item.itmUnit1Unit3 ?? null,
  };
}

/** Pin the exact batch (stockId / batch / expiry / cost / price) the user is returning. */
export function buildDetailRowFromStockSearch(
  item: ReturnItemStockSearchItem
): PharmStoreReturnSendDetail {
  const baseAvailableQty = Number.isFinite(item.baseAvailableQty)
    ? Math.max(0, Math.floor(item.baseAvailableQty ?? 0))
    : 0;
  const availableDisplayQty = Number.isFinite(item.availableQty)
    ? Math.max(1, Math.floor(item.availableQty ?? 0))
    : 1;
  const unitFields = buildUnitFieldsFromSearch(item);
  const defaultUnitId = getItemDefaultUnitId(unitFields);

  return {
    clientRowId: nextClientRowId(),
    stockId: item.stockId ?? null,
    itmId: item.itemCode?.trim() ?? "",
    itmNameAr: item.itemNameAr?.trim() ?? "",
    itmNameEn: item.itemNameEn?.trim() ?? "",
    batchNo: item.batchNo?.trim() ?? "",
    expDate: formatReturnItemStockSearchExpDate(item.expDate),
    unitId: defaultUnitId,
    qnty: availableDisplayQty,
    baseAvailableQty,
    itemCostPrice: Number.isFinite(item.costPrice) ? item.costPrice : 0,
    itmSellPrice: Number.isFinite(item.salesPrice) ? item.salesPrice : 0,
    unitFields,
  };
}

/**
 * A movement is only valid for a Pharmacy → Store return when it belongs to the
 * "Pharm Return store" parent (scoped by parentId on the dropdown) and its source
 * store equals the current pharmacy. Destination (MovStor2) must be a real store.
 */
export function isMovementValidForSend(
  movement: MovmentLookupItem | null,
  currentPharmacyStoreId: string | null | undefined
): boolean {
  if (!movement) return false;
  if (movement.id <= 0) return false;
  if (movement.movParientId != null && movement.movParientId !== PHARM_STORE_RETURN_MOV_PARENT_ID) {
    return false;
  }
  const source = movement.movStor?.trim();
  if (!source) return false;
  const current = currentPharmacyStoreId?.trim();
  if (current && source !== current) return false;
  const destination = movement.movStor2?.trim();
  if (!destination) return false;
  return true;
}

/** Base (Unit3) quantity for a row: qnty in the selected unit converted through the catalog factor. */
function toBaseQty(row: PharmStoreReturnSendDetail): number {
  const u = row.unitFields;
  const factor = (() => {
    if (row.unitId != null && u.itmUnit1 != null && row.unitId === u.itmUnit1) {
      return u.itmUnit1Unit3 ?? 1;
    }
    if (row.unitId != null && u.itmUnit2 != null && row.unitId === u.itmUnit2) {
      const perUnit1 = u.itmUnit1Unit2 ?? 0;
      const unit1ToBase = u.itmUnit1Unit3 ?? 1;
      return perUnit1 > 0 ? unit1ToBase / perUnit1 : unit1ToBase;
    }
    // Unit3 / base unit (or any unit not carrying a larger factor).
    return 1;
  })();
  return row.qnty * factor;
}

export type SendValidationResult = { ok: true } | { ok: false; message: string };

/** Mirrors the backend SendAsync checks so the user gets an inline error before the round-trip. */
export function validateSendDocument(
  movement: MovmentLookupItem | null,
  details: PharmStoreReturnSendDetail[]
): SendValidationResult {
  if (!movement || movement.id <= 0) {
    return { ok: false, message: "Movement is required." };
  }
  if (movement.movParientId != null && movement.movParientId !== PHARM_STORE_RETURN_MOV_PARENT_ID) {
    return { ok: false, message: "Selected movement is not a Pharm Return store movement." };
  }
  if (!movement.movStor?.trim()) {
    return { ok: false, message: "Movement source store (current pharmacy) is missing." };
  }
  if (!movement.movStor2?.trim()) {
    return { ok: false, message: "Movement destination store is missing." };
  }

  const lines = details.filter((row) => row.itmId.trim());
  if (lines.length === 0) {
    return { ok: false, message: "At least one detail line with an item is required." };
  }

  for (const [index, row] of lines.entries()) {
    const lineNo = index + 1;
    if (row.stockId == null || row.stockId <= 0) {
      return { ok: false, message: `Line ${lineNo}: select the item from the pharmacy stock search.` };
    }
    if (row.qnty <= 0 || !Number.isFinite(row.qnty)) {
      return { ok: false, message: `Line ${lineNo}: quantity must be greater than zero.` };
    }
    if (row.unitId == null || row.unitId <= 0) {
      return { ok: false, message: `Line ${lineNo}: unit is required.` };
    }
    if (!isUnitIdValidForItem(row.unitFields, row.unitId)) {
      return { ok: false, message: `Line ${lineNo}: unit ${row.unitId} is not valid for item "${row.itmId}".` };
    }
    if (!Number.isInteger(toBaseQty(row))) {
      return {
        ok: false,
        message: `Line ${lineNo}: quantity does not convert to a whole base unit for "${row.itmId}".`,
      };
    }
    if (row.baseAvailableQty > 0 && toBaseQty(row) > row.baseAvailableQty) {
      return {
        ok: false,
        message: `Line ${lineNo}: only ${row.baseAvailableQty} base unit(s) available for "${row.itmId}".`,
      };
    }
  }

  return { ok: true };
}

export function toSendPayload(
  movementRowId: number,
  note: string | null | undefined,
  details: PharmStoreReturnSendDetail[]
): PharmStoreReturnSendPayload {
  return {
    MovmentRowId: movementRowId,
    Note: note?.trim() || undefined,
    Details: details
      .filter((row) => row.itmId.trim() && row.stockId != null && row.stockId > 0)
      .map((row) => ({
        StockId: row.stockId as number,
        ItmId: row.itmId.trim(),
        Qnty: row.qnty,
        UnitId: row.unitId as number,
      })),
  };
}
