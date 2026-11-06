import type { MovmentLookupItem } from "@/types/movment";
import type { PharmReciveDetail, PharmReciveUpsertPayload } from "@/types/pharm-recive";
import type { PurchaseTransferCandidate } from "@/types/purchase";
import {
  applyMovementToPharmReciveHeader,
  emptyPharmReciveHeader,
  toUpsertPayload,
} from "@/lib/pharm-recive.mapper";
import type { PharmReciveHeaderFormValues } from "@/validation/pharm-recive.schema";

export type PurchaseTransferLineSelection = {
  candidate: PurchaseTransferCandidate;
  transferQty: number;
  included: boolean;
};

export function defaultTransferQty(availableQty: number): number {
  if (!Number.isFinite(availableQty) || availableQty <= 0) return 0;
  return availableQty;
}

function formatCandidateLabel(candidate: PurchaseTransferCandidate): string {
  return (
    candidate.itemNameEn?.trim() ||
    candidate.itemNameAr?.trim() ||
    candidate.itemId?.trim() ||
    "Item"
  );
}

/** Base units per one line unit, from server availability (aligned with backend floor cap). */
export function transferLineBasePerUnit(
  candidate: PurchaseTransferCandidate
): number | null {
  const available = candidate.availableQty;
  const baseAvailable = candidate.baseAvailableQty;
  if (!Number.isFinite(available) || available <= 0) return null;
  if (!Number.isFinite(baseAvailable) || baseAvailable <= 0) return null;
  return baseAvailable / available;
}

export function transferQtyToBase(
  candidate: PurchaseTransferCandidate,
  transferQty: number
): number | null {
  const basePerUnit = transferLineBasePerUnit(candidate);
  if (basePerUnit == null || !Number.isFinite(transferQty) || transferQty <= 0) {
    return null;
  }
  return transferQty * basePerUnit;
}

const BASE_QTY_EPSILON = 1e-6;

/** Ensures combined selected lines for the same StockId do not exceed shared base availability. */
export function validateSharedStockBaseAvailability(
  lines: PurchaseTransferLineSelection[]
): string | null {
  const included = lines.filter(
    (row) => row.included && row.candidate.transferable && row.transferQty > 0
  );

  const byStockId = new Map<number, PurchaseTransferLineSelection[]>();
  for (const row of included) {
    const stockId = row.candidate.stockId;
    if (stockId == null || stockId <= 0) continue;
    const group = byStockId.get(stockId) ?? [];
    group.push(row);
    byStockId.set(stockId, group);
  }

  for (const [stockId, group] of byStockId) {
    if (group.length <= 1) continue;

    let totalRequestedBase = 0;
    let sharedBaseAvailable: number | null = null;
    const itemLabels: string[] = [];

    for (const row of group) {
      const requestedBase = transferQtyToBase(row.candidate, row.transferQty);
      if (requestedBase == null) {
        return `${formatCandidateLabel(row.candidate)}: could not convert transfer quantity to base units.`;
      }
      totalRequestedBase += requestedBase;
      if (sharedBaseAvailable == null) {
        sharedBaseAvailable = row.candidate.baseAvailableQty;
      }
      itemLabels.push(formatCandidateLabel(row.candidate));
    }

    if (
      sharedBaseAvailable != null &&
      sharedBaseAvailable > 0 &&
      totalRequestedBase > sharedBaseAvailable + BASE_QTY_EPSILON
    ) {
      const names = [...new Set(itemLabels)].join(", ");
      return `Combined transfer quantity for ${names} exceeds available stock for this batch (StockId ${stockId}). Available base quantity: ${sharedBaseAvailable.toLocaleString(undefined, { maximumFractionDigits: 4 })}.`;
    }
  }

  return null;
}

export function validateTransferQuantity(
  transferQty: number,
  availableQty: number
): string | null {
  if (!Number.isFinite(transferQty) || transferQty <= 0) {
    return "Transfer quantity must be greater than zero.";
  }
  if (!Number.isFinite(availableQty) || transferQty > availableQty) {
    return "Transfer quantity cannot exceed available stock.";
  }
  return null;
}

export function validateMovementSourceStoreForTransfer(
  movement: MovmentLookupItem | null,
  lines: PurchaseTransferLineSelection[]
): string | null {
  if (!movement?.movStor?.trim()) {
    return "Select a pharmacy receive movement with a source store.";
  }

  const movementStore = movement.movStor.trim();
  const included = lines.filter((row) => row.included && row.candidate.transferable);
  if (included.length === 0) {
    return "Select at least one item to transfer.";
  }

  const sourceStores = new Set(
    included
      .map((row) => row.candidate.sourceStoreId?.trim())
      .filter((value): value is string => Boolean(value))
  );

  if (sourceStores.size > 1) {
    return "All selected lines must share the same purchase source store.";
  }

  const lineStore = sourceStores.values().next().value as string | undefined;
  if (!lineStore) {
    return "Selected lines are missing a source store.";
  }

  if (lineStore !== movementStore) {
    return `Movement source store (${movementStore}) does not match the purchase store (${lineStore}).`;
  }

  return null;
}

export function validateTransferLinesBeforeSubmit(
  lines: PurchaseTransferLineSelection[]
): string | null {
  const included = lines.filter((row) => row.included && row.candidate.transferable);
  if (included.length === 0) {
    return "Select at least one item to transfer.";
  }

  for (const row of included) {
    const qtyError = validateTransferQuantity(row.transferQty, row.candidate.availableQty);
    if (qtyError) {
      const label = row.candidate.itemNameEn?.trim() || row.candidate.itemId || "Item";
      return `${label}: ${qtyError}`;
    }
    if (!row.candidate.batchNo?.trim()) {
      return "A selected line is missing batch number.";
    }
    if (!row.candidate.itemId?.trim()) {
      return "A selected line is missing item code.";
    }
    if (!row.candidate.unitId || row.candidate.unitId <= 0) {
      return "A selected line is missing unit.";
    }
  }

  const sharedStockError = validateSharedStockBaseAvailability(lines);
  if (sharedStockError) return sharedStockError;

  return null;
}

export function buildPharmReciveDetailsFromTransferLines(
  lines: PurchaseTransferLineSelection[]
): PharmReciveDetail[] {
  return lines
    .filter((row) => row.included && row.candidate.transferable && row.transferQty > 0)
    .map((row) => {
      const candidate = row.candidate;
      return {
        id: null,
        clientRowId: `transfer-${candidate.purchaseDetailId}`,
        itmId: candidate.itemId?.trim() ?? "",
        itmNameEn: candidate.itemNameEn?.trim() ?? "",
        itmNameAr: candidate.itemNameAr?.trim() ?? "",
        expDate: candidate.expDate?.trim() ?? "",
        qnty: row.transferQty,
        itmPurPrice: candidate.itmPurPrice ?? 0,
        itmSellPrice: candidate.itmSellPrice ?? 0,
        itemCostPrice: candidate.itemCostPrice ?? 0,
        unitId: candidate.unitId,
        itmStock: candidate.stockId ?? 0,
        batchNo: candidate.batchNo?.trim() ?? "",
        maxSearchQty: candidate.availableQty,
        lineTotal: 0,
      };
    });
}

export function buildPharmReciveTransferPayload(input: {
  movement: MovmentLookupItem;
  movDate: string;
  fathId: number;
  monNote?: string;
  lines: PurchaseTransferLineSelection[];
}): PharmReciveUpsertPayload {
  const baseHeader: PharmReciveHeaderFormValues = {
    ...emptyPharmReciveHeader(),
    movDate: input.movDate,
    fathId: input.fathId,
    monNote: input.monNote?.trim() ?? "",
    movFlag: null,
  };

  const header = applyMovementToPharmReciveHeader(baseHeader, input.movement);
  const details = buildPharmReciveDetailsFromTransferLines(input.lines);
  return toUpsertPayload(header, details);
}

export function mapTransferCandidateFromApi(
  raw: Record<string, unknown>
): PurchaseTransferCandidate {
  const readNumber = (...keys: string[]) => {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return 0;
  };

  const readNullableNumber = (...keys: string[]) => {
    for (const key of keys) {
      const value = raw[key];
      if (value === null || value === undefined) continue;
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return null;
  };

  const readString = (...keys: string[]) => {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === "string") return value;
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return "";
  };

  const readBool = (...keys: string[]) => {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === "boolean") return value;
    }
    return false;
  };

  return {
    purchaseDetailId: readNumber("purchaseDetailId", "PurchaseDetailId"),
    itemId: readString("itemId", "ItemId") || null,
    itemNameEn: readString("itemNameEn", "ItemNameEn") || null,
    itemNameAr: readString("itemNameAr", "ItemNameAr") || null,
    stockId: readNullableNumber("stockId", "StockId"),
    batchNo: readString("batchNo", "BatchNo") || null,
    expDate: readString("expDate", "ExpDate") || null,
    sourceStoreId: readString("sourceStoreId", "SourceStoreId") || null,
    unitId: readNumber("unitId", "UnitId"),
    purchaseQty: readNumber("purchaseQty", "PurchaseQty"),
    availableQty: readNumber("availableQty", "AvailableQty"),
    baseAvailableQty: readNumber("baseAvailableQty", "BaseAvailableQty"),
    itmPurPrice: readNullableNumber("itmPurPrice", "ItmPurPrice"),
    itmSellPrice: readNullableNumber("itmSellPrice", "ItmSellPrice"),
    itemCostPrice: readNullableNumber("itemCostPrice", "ItemCostPrice"),
    itmUnit1Unit3: readNullableNumber("itmUnit1Unit3", "ItmUnit1Unit3"),
    transferable: readBool("transferable", "Transferable"),
    statusReason: readString("statusReason", "StatusReason") || null,
  };
}

export function mapTransferCandidatesResponseFromApi(raw: Record<string, unknown>): {
  purchaseId: number;
  candidates: PurchaseTransferCandidate[];
} {
  const purchaseId =
    typeof raw.purchaseId === "number"
      ? raw.purchaseId
      : typeof raw.PurchaseId === "number"
        ? raw.PurchaseId
        : 0;

  const list = raw.candidates ?? raw.Candidates;
  const candidates = Array.isArray(list)
    ? (list as Record<string, unknown>[]).map(mapTransferCandidateFromApi)
    : [];

  return { purchaseId, candidates };
}
