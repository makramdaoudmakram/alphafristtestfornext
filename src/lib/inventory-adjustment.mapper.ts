import type {
  InventoryAdjustmentDetail,
  InventoryAdjustmentDocument,
  InventoryAdjustmentHeader,
  InventoryAdjustmentUpsertPayload,
} from "@/types/inventory-adjustment";
import { computeInventoryAdjustmentSummary } from "@/lib/inventory-adjustment-summary";
import type { ItemCatalogItem } from "@/types/item-catalog";

function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string") return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function readNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function readNullableNumber(
  obj: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = obj[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function formatDateInput(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString().slice(0, 10);
    }
    return trimmed.slice(0, 10);
  }
  return "";
}

let clientRowSeq = 0;

export function nextInventoryDetailClientRowId(): string {
  clientRowSeq += 1;
  return `inv-adj-${Date.now()}-${clientRowSeq}`;
}

export function createEmptyInventoryDetailRow(): InventoryAdjustmentDetail {
  return {
    clientRowId: nextInventoryDetailClientRowId(),
    itmCode: "",
    itemCatalogId: null,
    itmNameAr: "",
    itmNameEn: "",
    batchNo: "",
    expDate: "",
    unitId: null,
    itmStockQty: 0,
    itmIncresQty: 0,
    itemShortQty: 0,
    itmQ: 0,
    differenceQty: 0,
    totalpurchvalue: 0,
    totalsalesvalue: 0,
    itmPPrice: 0,
    itmSalPrice: 0,
    baseItmPPrice: null,
    baseItmSalPrice: null,
    priceQtyNet: null,
    stdItmStock: null,
    stockId: null,
    storeId: null,
    itmCostPrice: 0,
    detailGroupId: 0,
  };
}

/** Unique key for ItmCode + Store + BatchNo duplicate detection. */
export function inventoryDetailRowKey(
  itmCode: string,
  storeId: string,
  batchNo: string
): string {
  return `${itmCode.trim().toLowerCase()}|${storeId.trim()}|${batchNo.trim().toLowerCase()}`;
}

export function emptyInventoryHeader(): InventoryAdjustmentHeader {
  return {
    id: null,
    fhId: null,
    movId: null,
    movmentRowId: null,
    invDat: new Date().toISOString().slice(0, 10),
    invStore: "",
    invNotice: "",
    movStat: null,
    invAccount1: "",
    invAccount2: "",
  };
}

export function mapDetailFromApi(raw: Record<string, unknown>): InventoryAdjustmentDetail {
  const itmStockQty = readNumber(raw, "itmStockQty", "ItmStockQty");
  const itmQ = readNumber(raw, "itmQ", "ItmQ");
  const itmPPrice = readNumber(raw, "itmPPrice", "ItmPPrice");
  const itmSalPrice = readNumber(raw, "itmSalPrice", "ItmSalPrice");
  const diff =
    readNullableNumber(raw, "differenceQty", "DifferenceQty") ?? itmQ - itmStockQty;
  const itmIncresQty =
    readNullableNumber(raw, "itmIncresQty", "ItmIncresQty") ??
    (diff > 0 ? diff : 0);
  const itemShortQty =
    readNullableNumber(raw, "itemShortQty", "ItemShortQty") ??
    (diff < 0 ? Math.abs(diff) : 0);
  const totalpurchvalue = readNumber(
    raw,
    "totalpurchvalue",
    "Totalpurchvalue",
    "totalPurchValue",
    "TotalPurchValue"
  );
  const totalsalesvalue = readNumber(
    raw,
    "totalsalesvalue",
    "Totalsalesvalue",
    "totalSalesValue",
    "TotalSalesValue"
  );

  const row: InventoryAdjustmentDetail = {
    clientRowId: nextInventoryDetailClientRowId(),
    id: readNullableNumber(raw, "id", "Id"),
    itmCode: readString(raw, "itmCode", "ItmCode"),
    itemCatalogId: readNullableNumber(raw, "itemCatalogId", "ItemCatalogId"),
    itmNameAr: readString(raw, "itmNameAr", "ItmNameAr"),
    itmNameEn: readString(raw, "itmNameEn", "ItmNameEn"),
    batchNo: readString(raw, "batchNo", "BatchNo"),
    expDate: formatDateInput(raw.expDate ?? raw.ExpDate),
    unitId: readNullableNumber(raw, "unitId", "UnitId"),
    itmStockQty,
    itmIncresQty,
    itemShortQty,
    itmQ,
    differenceQty: diff,
    totalpurchvalue,
    totalsalesvalue,
    itmPPrice,
    itmSalPrice,
    baseItmPPrice: itmPPrice,
    baseItmSalPrice: itmSalPrice,
    priceQtyNet: 1,
    stdItmStock: readNullableNumber(raw, "stdItmStock", "StdItmStock"),
    stockId: readNullableNumber(raw, "stockId", "StockId"),
    storeId: readNullableNumber(raw, "storeId", "StoreId", "storId", "StorId"),
    itmCostPrice: readNumber(raw, "itmCostPrice", "ItmCostPrice", "costPrice", "CostPrice"),
    detailGroupId: 0,
  };

  return row;
}

export function mapHeaderFromApi(raw: Record<string, unknown>): InventoryAdjustmentHeader {
  return {
    id: readNullableNumber(raw, "id", "Id"),
    fhId: readNullableNumber(raw, "fhId", "FhId"),
    movId: readNullableNumber(raw, "movId", "MovId"),
    movmentRowId: readNullableNumber(raw, "movmentRowId", "MovmentRowId"),
    invDat: formatDateInput(raw.invDat ?? raw.InvDat),
    invStore: readString(raw, "invStore", "InvStore"),
    invNotice: readString(raw, "invNotice", "InvNotice"),
    movStat: readNullableNumber(raw, "movStat", "MovStat"),
    invAccount1: readString(raw, "invAccount1", "InvAccount1"),
    invAccount2: readString(raw, "invAccount2", "InvAccount2"),
    invActTotalSalPriceIncres: readNullableNumber(
      raw,
      "invActTotalSalPriceIncres",
      "InvActTotalSalPriceIncres"
    ),
    invActTotalSalPriceShort: readNullableNumber(
      raw,
      "invActTotalSalPriceShort",
      "InvActTotalSalPriceShort"
    ),
    invActTotalPPriceIncress: readNullableNumber(
      raw,
      "invActTotalPPriceIncress",
      "InvActTotalPPriceIncress"
    ),
    invActTotalPPriceShort: readNullableNumber(
      raw,
      "invActTotalPPriceShort",
      "InvActTotalPPriceShort"
    ),
    invTotalStockQty: readNullableNumber(raw, "invTotalStockQty", "InvTotalStockQty"),
    invTotalIncresQty: readNullableNumber(raw, "invTotalIncresQty", "InvTotalIncresQty"),
    invTotalShortQty: readNullableNumber(raw, "invTotalShortQty", "InvTotalShortQty"),
    netInventory: readNullableNumber(raw, "netInventory", "NetInventory"),
  };
}

export function mapDocumentFromApi(raw: Record<string, unknown>): InventoryAdjustmentDocument {
  const headerSource =
    (raw.header as Record<string, unknown> | undefined) ??
    (raw.Header as Record<string, unknown> | undefined) ??
    raw;

  const detailsRaw =
    (headerSource.inventoryDetails as Record<string, unknown>[] | undefined) ??
    (headerSource.InventoryDetails as Record<string, unknown>[] | undefined) ??
    (raw.inventoryDetails as Record<string, unknown>[] | undefined) ??
    (raw.InventoryDetails as Record<string, unknown>[] | undefined) ??
    (raw.details as Record<string, unknown>[] | undefined) ??
    [];

  return {
    header: mapHeaderFromApi(headerSource),
    details: detailsRaw.map((line) => mapDetailFromApi(line)),
  };
}

export function applyMovementToInventoryHeader(
  header: InventoryAdjustmentHeader,
  movement: {
    movChiledId?: number | null;
    id?: number;
    movAccountEntry1?: string | null;
    movAccountEntry2?: string | null;
  } | null
): InventoryAdjustmentHeader {
  if (!movement) {
    return {
      ...header,
      movId: null,
      movmentRowId: null,
      invAccount1: "",
      invAccount2: "",
    };
  }

  return {
    ...header,
    movId: movement.movChiledId ?? null,
    movmentRowId: movement.id ?? null,
    invAccount1: movement.movAccountEntry1?.trim() ?? "",
    invAccount2: movement.movAccountEntry2?.trim() ?? "",
  };
}

export function toInventoryUpsertPayload(
  header: InventoryAdjustmentHeader,
  details: InventoryAdjustmentDetail[],
  deletedDetailIds: number[] = [],
  itemByCode?: Map<string, ItemCatalogItem>
): InventoryAdjustmentUpsertPayload {
  const summary = computeInventoryAdjustmentSummary(details, itemByCode);
  const decreasePurchaseMagnitude = Math.abs(summary.totalDecreasePurchaseValue);
  const decreaseSalesMagnitude = Math.abs(summary.totalDecreaseSalesValue);

  return {
    header: {
      id: header.id,
      fhId: header.fhId,
      movId: header.movId,
      movmentRowId: header.movmentRowId,
      invDat: header.invDat || undefined,
      invStore: header.invStore || undefined,
      invNotice: header.invNotice || undefined,
      invAccount1: header.invAccount1 || undefined,
      invAccount2: header.invAccount2 || undefined,
      invActTotalSalPriceIncres: summary.totalIncreaseSalesValue,
      invActTotalSalPriceShort: decreaseSalesMagnitude,
      invActTotalPPriceIncress: summary.totalIncreasePurchaseValue,
      invActTotalPPriceShort: decreasePurchaseMagnitude,
      invTotalStockQty: summary.totalQtyBeforeUpdate,
      invTotalIncresQty: summary.totalIncreaseQty,
      invTotalShortQty: summary.totalDecreaseQty,
      netInventory:
        summary.totalIncreasePurchaseValue - decreasePurchaseMagnitude,
    },
    details: details
      .filter((row) => row.itmCode.trim().length > 0)
      .map((row) => ({
        id: row.id,
        itmCode: row.itmCode.trim(),
        itemCatalogId: row.itemCatalogId,
        batchNo: row.batchNo.trim() || undefined,
        expDate: row.expDate.trim() || undefined,
        itmSalPrice: row.itmSalPrice,
        itmPPrice: row.itmPPrice,
        itmQ: row.itmQ,
        itmStockQty: row.itmStockQty,
        itmIncresQty: row.itmIncresQty,
        itemShortQty: row.itemShortQty,
        differenceQty: row.differenceQty,
        totalpurchvalue: row.totalpurchvalue,
        totalsalesvalue: row.totalsalesvalue,
        unitId: row.unitId ?? 0,
        stdItmStock: row.stdItmStock,
      })),
    deletedDetailIds,
  };
}

export function computeInventoryDifference(
  countedQty: number,
  currentQty: number
): number {
  const counted = Number.isFinite(countedQty) ? countedQty : 0;
  const current = Number.isFinite(currentQty) ? currentQty : 0;
  return counted - current;
}
