import { computeHeaderTotals, computeLineTotal } from "@/lib/purchase-calculations";
import { enrichDetailFromCatalog } from "@/lib/item-catalog-search";
import { monthInputToExpDate, expDateToMonthInput } from "@/lib/purchase-exp-date";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type {
  PurchaseDetail,
  PurchaseDocument,
  PurchaseHeader,
  PurchaseSearchResult,
  PurchaseStockBatch,
  PurchaseUpsertPayload,
} from "@/types/purchase";
import type { PurchaseHeaderFormValues } from "@/validation/purchase.schema";

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

function readUnitId(obj: Record<string, unknown>): number | null {
  for (const key of ["unitId", "UnitId"]) {
    const value = obj[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return null;
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
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return "";
}

function formatExpDateFromApi(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw =
    typeof value === "string"
      ? value
      : value instanceof Date
        ? value.toISOString()
        : String(value);
  const month = expDateToMonthInput(raw);
  return month ? monthInputToExpDate(month) : "";
}

function newClientRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `row-${crypto.randomUUID()}`;
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyDetailRow(stoId = ""): PurchaseDetail {
  return {
    id: null,
    clientRowId: newClientRowId(),
    itmId: "",
    itmNameAr: "",
    itmNameEn: "",
    expDate: "",
    qnty: 1,
    bonus: 0,
    itmPurPrice: 0,
    itmSell: 0,
    taxPercent: null,
    itmTaxPrice: null,
    itmTaxTotal: 0,
    itmExtraDis: 0,
    itmDisMon: 0,
    itmDisPer: 0,
    itmCost: 0,
    itmNet: 0,
    stdItmStock: 0,
    unitId: null,
    stoId,
    batchNo: "",
    maxReturnQty: undefined,
    lineTotal: 0,
  };
}

export function emptyPurchaseHeader(): PurchaseHeader {
  return {
    id: null,
    pthId: null,
    venBillNo: "",
    venBillDate: "",
    phtDate: new Date().toISOString().slice(0, 10),
    venId: "",
    movId: null,
    movmentRowId: null,
    movAccount: "",
    movAccountsec: "",
    movAccounttherd: "",
    movAccountfourth: "",
    noOfItems: 0,
    totalQuantity: 0,
    totalBill: 0,
    purchExtraDisCount: 0,
    totalDisPer: 0,
    totalDesMon: 0,
    totalTax: 0,
    pOtherExpenses: 0,
    pthNetBill: 0,
    pthNotice: "",
    movStat: null,
  };
}

export function headerToFormValues(header: PurchaseHeader): PurchaseHeaderFormValues {
  return { ...header };
}

/** After GET/POST/PUT, merge API header with line-based totals for the form. */
export function documentToFormValues(
  header: PurchaseHeader,
  details: PurchaseDetail[]
): PurchaseHeaderFormValues {
  const lines = details.map((row) => ({
    ...row,
    lineTotal: computeLineTotal(row),
  }));
  return headerToFormValues({
    ...header,
    ...computeHeaderTotals(header, lines),
  });
}

/** Drop blank lines (no item code) before validate/save. */
export function filterDetailsWithItemCode(details: PurchaseDetail[]): PurchaseDetail[] {
  return details.filter((row) => row.itmId.trim().length > 0);
}

/** Detail ids present on load but absent from the save payload were deleted in the UI. */
export function computeDeletedDetailIds(
  initialDetailIds: readonly number[],
  submittedDetails: readonly PurchaseDetail[],
  trackedDeletedIds: readonly number[]
): number[] {
  const submittedIds = new Set(
    submittedDetails
      .map((row) => row.id)
      .filter((id): id is number => id != null && id > 0)
  );
  const removedSinceLoad = initialDetailIds.filter((id) => !submittedIds.has(id));
  return [...new Set([...trackedDeletedIds, ...removedSinceLoad])];
}

export function mapDetailFromApi(raw: Record<string, unknown>): PurchaseDetail {
  const row: PurchaseDetail = {
    id: readNullableNumber(raw, "id", "Id"),
    clientRowId: newClientRowId(),
    itmId: readString(raw, "itmId", "ItmId"),
    itmNameAr: readString(raw, "itmNameAr", "ItmNameAr"),
    itmNameEn: readString(raw, "itmNameEn", "ItmNameEn"),
    expDate: formatExpDateFromApi(raw.expDate ?? raw.ExpDate),
    qnty: readNumber(raw, "qnty", "Qnty") || 1,
    bonus: readNumber(raw, "bonus", "Bonus"),
    itmPurPrice: readNumber(raw, "itmPurPrice", "ItmPurPrice"),
    itmSell: readNumber(raw, "itmSell", "ItmSell"),
    taxPercent: null,
    itmTaxPrice: readNumber(raw, "itmTaxPrice", "ItmTaxPrice"),
    itmTaxTotal: readNumber(raw, "itmTaxTotal", "ItmTaxTotal"),
    itmExtraDis: readNumber(raw, "itmExtraDis", "ItmExtraDis"),
    itmDisMon: readNumber(raw, "itmDisMon", "ItmDisMon"),
    itmDisPer: readNumber(raw, "itmDisPer", "ItmDisPer"),
    itmCost: readNumber(raw, "itmCost", "ItmCost"),
    itmNet: readNumber(raw, "itmNet", "ItmNet"),
    stdItmStock: readNumber(raw, "stdItmStock", "StdItmStock"),
    unitId: readUnitId(raw),
    stoId: readString(raw, "stoId", "StoId"),
    batchNo: readString(raw, "batchNo", "BatchNo"),
    lineTotal: 0,
  };
  if (row.batchNo?.trim() && Number.isFinite(row.stdItmStock) && row.stdItmStock > 0) {
    row.maxReturnQty = row.stdItmStock;
  }
  row.lineTotal = computeLineTotal(row);
  return row;
}

export function mapHeaderFromApi(raw: Record<string, unknown>): PurchaseHeader {
  return {
    id: readNullableNumber(raw, "id", "Id"),
    pthId: readNullableNumber(raw, "pthId", "PthId"),
    venBillNo: readString(raw, "venBillNo", "VenBillNo"),
    venBillDate: formatDateInput(raw.venBillDate ?? raw.VenBillDate),
    phtDate: formatDateInput(raw.phtDate ?? raw.PhtDate),
    venId: readString(raw, "venId", "VenId"),
    movId: readNullableNumber(raw, "movId", "MovId"),
    movmentRowId: readNullableNumber(raw, "movmentRowId", "MovmentRowId"),
    movAccount: readString(raw, "movAccount", "MovAccount"),
    movAccountsec: readString(raw, "movAccountsec", "MovAccountsec"),
    movAccounttherd: readString(raw, "movAccounttherd", "MovAccounttherd"),
    movAccountfourth: readString(raw, "movAccountfourth", "MovAccountfourth"),
    noOfItems: readNumber(raw, "noOfItems", "NoOfItems"),
    totalQuantity: readNumber(raw, "totalQuantity", "TotalQuantity"),
    totalBill: readNumber(raw, "totalBill", "TotalBill"),
    purchExtraDisCount: readNumber(raw, "purchExtraDisCount", "PurchExtraDisCount"),
    totalDisPer: readNumber(raw, "totalDisPer", "TotalDisPer"),
    totalDesMon: readNumber(raw, "totalDesMon", "TotalDesMon"),
    totalTax: readNumber(raw, "totalTax", "TotalTax"),
    pOtherExpenses: readNumber(raw, "pOtherExpenses", "POtherExpenses"),
    pthNetBill: readNumber(raw, "pthNetBill", "PthNetBill"),
    pthNotice: readString(raw, "pthNotice", "PthNotice"),
    movStat: readNullableNumber(raw, "movStat", "MovStat"),
  };
}

export function mapDocumentFromApi(raw: Record<string, unknown>): PurchaseDocument {
  const headerSource =
    (raw.header as Record<string, unknown> | undefined) ??
    (raw.Header as Record<string, unknown> | undefined) ??
    (raw.document as Record<string, unknown> | undefined) ??
    (raw.Document as Record<string, unknown> | undefined) ??
    raw;
  const header = mapHeaderFromApi(headerSource);
  const detailsRaw =
    (headerSource.purTransDetails as Record<string, unknown>[] | undefined) ??
    (headerSource.PurTransDetails as Record<string, unknown>[] | undefined) ??
    (headerSource.details as Record<string, unknown>[] | undefined) ??
    (raw.purTransDetails as Record<string, unknown>[] | undefined) ??
    (raw.PurTransDetails as Record<string, unknown>[] | undefined) ??
    (raw.details as Record<string, unknown>[] | undefined) ??
    [];

  return {
    header,
    details: detailsRaw.map((line) => mapDetailFromApi(line)),
  };
}

function readBoolField(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "boolean") return value;
  }
  return false;
}

export function mapPurchaseStockBatch(raw: Record<string, unknown>): PurchaseStockBatch {
  return {
    stockId: readNumber(raw, "stockId", "StockId"),
    batchNo: readString(raw, "batchNo", "BatchNo"),
    itemCode: readString(raw, "itemCode", "ItemCode"),
    storeId: readNumber(raw, "storeId", "StoreId"),
    quantityNet: readNumber(raw, "quantityNet", "QuantityNet"),
    inserted: readBoolField(raw, "inserted", "Inserted"),
  };
}

/** Save/create/update response: { document, stockBatches } or legacy flat document. */
export function mapSaveResponseFromApi(raw: Record<string, unknown>): PurchaseDocument {
  const hasEnvelope = raw.document != null || raw.Document != null;
  const documentRaw = hasEnvelope
    ? ((raw.document ?? raw.Document) as Record<string, unknown>)
    : raw;
  const document = mapDocumentFromApi(documentRaw);
  const batchesRaw = raw.stockBatches ?? raw.StockBatches;
  if (!Array.isArray(batchesRaw) || batchesRaw.length === 0) {
    return document;
  }

  return {
    ...document,
    stockBatches: batchesRaw.map((batch) =>
      mapPurchaseStockBatch(batch as Record<string, unknown>)
    ),
  };
}

export function mapSearchResultFromApi(raw: Record<string, unknown>): PurchaseSearchResult {
  return {
    id: readNumber(raw, "id", "Id"),
    pthId: readNumber(raw, "pthId", "PthId"),
    movementName: readString(
      raw,
      "movementName",
      "MovementName",
      "movChiledName",
      "MovChiledName"
    ),
    phtDate: formatDateInput(raw.phtDate ?? raw.PhtDate) || null,
    pthNetBill: readNumber(raw, "pthNetBill", "PthNetBill"),
    matchedItemCode:
      readString(raw, "matchedItemCode", "MatchedItemCode") || null,
    matchedItemNameEn:
      readString(raw, "matchedItemNameEn", "MatchedItemNameEn") || null,
    postStatus:
      readString(raw, "postStatus", "PostStatus").trim() || "Not Post",
  };
}

/** Search-grid Movement name: real name when present, otherwise ------. */
export function displaySearchMovementName(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? "";
  return trimmed ? trimmed : "------";
}

export function mergeSavedDetailsWithPrior(
  saved: PurchaseDetail[],
  prior: PurchaseDetail[],
  itemByCode?: Map<string, ItemCatalogItem>
): PurchaseDetail[] {
  return saved.map((line, index) => {
    const fromPrior = prior[index];
    let merged: PurchaseDetail = {
      ...line,
      itmNameAr: line.itmNameAr || fromPrior?.itmNameAr || "",
      itmNameEn: line.itmNameEn || fromPrior?.itmNameEn || "",
      batchNo: line.batchNo?.trim() || fromPrior?.batchNo?.trim() || "",
      taxPercent: fromPrior?.taxPercent ?? line.taxPercent ?? null,
    };
    if (itemByCode && itemByCode.size > 0) {
      merged = enrichDetailFromCatalog(merged, itemByCode);
    }
    merged.lineTotal = computeLineTotal(merged);
    return merged;
  });
}

/** Map selected movement settings onto PurTransH header fields (StoId is on detail lines). */
export function applyMovementToHeader(
  header: PurchaseHeaderFormValues,
  movement: {
    id: number;
    movChiledId: number | null;
    movAccountEntry1: string | null;
    movAccountEntry2: string | null;
    movAccountEntry3: string | null;
    movAccountEntry4: string | null;
  } | null
): PurchaseHeaderFormValues {
  if (!movement) return header;

  const entry1 = movement.movAccountEntry1?.trim() ?? "";
  const entry2 = movement.movAccountEntry2?.trim() ?? "";
  const entry3 = movement.movAccountEntry3?.trim() ?? "";
  const entry4 = movement.movAccountEntry4?.trim() ?? "";

  return {
    ...header,
    movmentRowId: movement.id,
    movId: movement.movChiledId,
    venId: entry1,
    movAccount: entry1,
    movAccountsec: entry2,
    movAccounttherd: entry3,
    movAccountfourth: entry4,
  };
}

/** Apply the Movement's first store onto detail lines that have no StoreId. */
export function applyMovementStoToDetails(
  details: PurchaseDetail[],
  movement: { movStor?: string | null; movStor2?: string | null } | null
): PurchaseDetail[] {
  if (!movement) return details;
  const defaultStoreId =
    movement.movStor?.trim() || movement.movStor2?.trim() || "";
  if (!defaultStoreId) return details;
  return details.map((row) => ({
    ...row,
    stoId: row.stoId?.trim() || defaultStoreId,
  }));
}

export function toUpsertPayload(
  header: PurchaseHeaderFormValues,
  details: PurchaseDetail[],
  deletedDetailIds?: number[]
): PurchaseUpsertPayload {
  const payload: PurchaseUpsertPayload = {
    header: {
      id: header.id,
      pthId: header.pthId,
      venBillNo: header.venBillNo.trim(),
      venBillDate: header.venBillDate,
      phtDate: header.phtDate,
      venId: header.venId?.trim() ?? "",
      movId: header.movId,
      movmentRowId: header.movmentRowId,
      movAccount: header.movAccount?.trim() ?? "",
      movAccountsec: header.movAccountsec?.trim() ?? "",
      movAccounttherd: header.movAccounttherd?.trim() ?? "",
      movAccountfourth: header.movAccountfourth?.trim() ?? "",
      purchExtraDisCount: Number(header.purchExtraDisCount) || 0,
      totalDisPer: Number(header.totalDisPer) || 0,
      pOtherExpenses: Number(header.pOtherExpenses) || 0,
      totalBill: Number(header.totalBill) || 0,
      pthNetBill: Number(header.pthNetBill) || 0,
      totalTax: Number(header.totalTax) || 0,
      totalDesMon: Number(header.purchExtraDisCount) || 0,
      pthNotice: header.pthNotice ?? "",
      movStat: header.movStat ?? null,
    },
    details: details.map((detail) => {
      const unitId = detail.unitId;
      const line: Omit<
        PurchaseDetail,
        | "clientRowId"
        | "lineTotal"
        | "itmNameAr"
        | "itmNameEn"
        | "unitId"
        | "taxPercent"
        | "baseItmPurPrice"
        | "baseItmSell"
        | "priceQtyNet"
        | "maxReturnQty"
      > & { unitId?: number; itmTaxPrice: number } = {
        id: detail.id,
        itmId: detail.itmId.trim(),
        expDate: detail.expDate || "",
        qnty: detail.qnty,
        bonus: detail.bonus,
        itmPurPrice: detail.itmPurPrice,
        itmSell: detail.itmSell,
        itmTaxPrice: detail.itmTaxPrice ?? 0,
        itmTaxTotal: detail.itmTaxTotal,
        itmExtraDis: detail.itmExtraDis,
        itmDisPer: detail.itmDisPer,
        itmDisMon: detail.itmDisMon,
        itmCost: detail.itmCost,
        itmNet: detail.itmNet,
        stdItmStock: detail.stdItmStock,
        stoId: detail.stoId?.trim() ?? "",
        batchNo: detail.batchNo?.trim() ?? "",
      };
      if (unitId != null && unitId > 0) line.unitId = unitId;
      return line;
    }),
  };

  if (deletedDetailIds != null && deletedDetailIds.length > 0) {
    payload.deletedDetailIds = [...new Set(deletedDetailIds)];
  }

  return payload;
}
