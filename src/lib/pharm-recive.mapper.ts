import { computeHeaderTotals, computeLineTotal } from "@/lib/pharm-recive-calculations";
import { catalogDefaultPrices } from "@/lib/item-catalog-search";
import { resolveUnitIdForItem } from "@/lib/item-unit-options";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type {
  PharmReciveDetail,
  PharmReciveDocument,
  PharmReciveHeader,
  PharmReciveSearchResult,
  PharmReciveUpsertPayload,
} from "@/types/pharm-recive";
import type { PharmReciveHeaderFormValues } from "@/validation/pharm-recive.schema";

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

function readUnitId(obj: Record<string, unknown>): number | null {
  for (const key of ["unitId", "UnitId"]) {
    const value = obj[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
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
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 10);
    return trimmed.slice(0, 10);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return "";
}

function newClientRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `row-${crypto.randomUUID()}`;
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Stable id for the first empty detail row — avoids SSR/client hydration mismatch. */
export const PHARM_RECIVE_INITIAL_ROW_ID = "row-initial";

export function createEmptyDetailRow(clientRowId?: string): PharmReciveDetail {
  return {
    id: null,
    clientRowId: clientRowId ?? newClientRowId(),
    itmId: "",
    itmNameAr: "",
    itmNameEn: "",
    expDate: "",
    qnty: 1,
    itmPurPrice: 0,
    itmSellPrice: 0,
    itemCostPrice: 0,
    unitId: null,
    itmStock: 0,
    batchNo: "",
    maxSearchQty: undefined,
    lineTotal: 0,
  };
}

export function emptyPharmReciveHeader(): PharmReciveHeader {
  return {
    id: null,
    movId: null,
    movmentRowId: null,
    fathId: null,
    movStor: "",
    movDis: "",
    movDate: "",
    monNote: "",
    accountDept: "",
    accountCREDIT: "",
    movTotalqunt: 0,
    movTotalSalesPrice: 0,
    movTotalPurchPrice: 0,
    movTotalCostPrice: 0,
  };
}

export function headerToFormValues(header: PharmReciveHeader): PharmReciveHeaderFormValues {
  return { ...header };
}

export function documentToFormValues(
  header: PharmReciveHeader,
  details: PharmReciveDetail[]
): PharmReciveHeaderFormValues {
  const lines = details.map((row) => ({
    ...row,
    lineTotal: computeLineTotal(row),
  }));
  return headerToFormValues({
    ...header,
    ...computeHeaderTotals(lines),
  });
}

export function filterDetailsWithItemCode(details: PharmReciveDetail[]): PharmReciveDetail[] {
  return details.filter((row) => row.itmId.trim().length > 0);
}

export function computeDeletedDetailIds(
  initialDetailIds: readonly number[],
  submittedDetails: readonly PharmReciveDetail[],
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

export function mapDetailFromApi(raw: Record<string, unknown>): PharmReciveDetail {
  const row: PharmReciveDetail = {
    id: readNullableNumber(raw, "id", "Id"),
    clientRowId: newClientRowId(),
    itmId: readString(raw, "itmId", "ItmId"),
    itmNameAr: readString(raw, "itmNameAr", "ItmNameAr"),
    itmNameEn: readString(raw, "itmNameEn", "ItmNameEn"),
    expDate: formatDateInput(raw.expDate ?? raw.ExpDate),
    qnty: readNumber(raw, "qnty", "Qnty") || 1,
    itmPurPrice: readNumber(raw, "itmPurPrice", "ItmPurPrice"),
    itmSellPrice: readNumber(raw, "itmSellPrice", "ItmSellPrice"),
    itemCostPrice: readNumber(raw, "itemCostPrice", "ItemCostPrice"),
    unitId: readUnitId(raw),
    itmStock: readNumber(raw, "itmStock", "ItmStock"),
    batchNo: readString(raw, "batchNo", "BatchNo"),
    lineTotal: 0,
  };
  row.lineTotal = computeLineTotal(row);
  return row;
}

export function mapHeaderFromApi(raw: Record<string, unknown>): PharmReciveHeader {
  return {
    id: readNullableNumber(raw, "id", "Id"),
    movId: readNullableNumber(raw, "movId", "MovId"),
    movmentRowId: readNullableNumber(raw, "movmentRowId", "MovmentRowId"),
    fathId: readNullableNumber(raw, "fathId", "FathId"),
    movStor: readString(raw, "movStor", "MovStor"),
    movDis: readString(raw, "movDis", "MovDis"),
    movDate: formatDateInput(raw.movDate ?? raw.MovDate),
    monNote: readString(raw, "monNote", "MonNote"),
    accountDept: readString(raw, "accountDept", "AccountDept"),
    accountCREDIT: readString(raw, "accountCREDIT", "AccountCREDIT"),
    movTotalqunt: readNumber(raw, "movTotalqunt", "MovTotalqunt"),
    movTotalSalesPrice: readNumber(raw, "movTotalSalesPrice", "MovTotalSalesPrice"),
    movTotalPurchPrice: readNumber(raw, "movTotalPurchPrice", "MovTotalPurchPrice"),
    movTotalCostPrice: readNumber(raw, "movTotalCostPrice", "MovTotalCostPrice"),
  };
}

export function mapDocumentFromApi(raw: Record<string, unknown>): PharmReciveDocument {
  const headerSource =
    (raw.header as Record<string, unknown> | undefined) ??
    (raw.Header as Record<string, unknown> | undefined) ??
    (raw.document as Record<string, unknown> | undefined) ??
    (raw.Document as Record<string, unknown> | undefined) ??
    raw;

  const detailsRaw =
    (headerSource.pharmReciveDetails as Record<string, unknown>[] | undefined) ??
    (headerSource.PharmReciveDetails as Record<string, unknown>[] | undefined) ??
    (headerSource.details as Record<string, unknown>[] | undefined) ??
    (raw.pharmReciveDetails as Record<string, unknown>[] | undefined) ??
    (raw.PharmReciveDetails as Record<string, unknown>[] | undefined) ??
    (raw.details as Record<string, unknown>[] | undefined) ??
    [];

  return {
    header: mapHeaderFromApi(headerSource),
    details: detailsRaw.map((line) => mapDetailFromApi(line)),
  };
}

export function mapSaveResponseFromApi(raw: Record<string, unknown>): PharmReciveDocument {
  const hasEnvelope = raw.document != null || raw.Document != null;
  const documentRaw = hasEnvelope
    ? ((raw.document ?? raw.Document) as Record<string, unknown>)
    : raw;
  return mapDocumentFromApi(documentRaw);
}

export function mapSearchResultFromApi(raw: Record<string, unknown>): PharmReciveSearchResult {
  return {
    id: readNumber(raw, "id", "Id"),
    movId: readNullableNumber(raw, "movId", "MovId"),
    movDate: formatDateInput(raw.movDate ?? raw.MovDate) || null,
    movTotalqunt: readNumber(raw, "movTotalqunt", "MovTotalqunt"),
    matchedItemCode: readString(raw, "matchedItemCode", "MatchedItemCode") || null,
    matchedItemNameEn: readString(raw, "matchedItemNameEn", "MatchedItemNameEn") || null,
  };
}

function enrichPharmReciveDetailFromCatalog(
  row: PharmReciveDetail,
  itemByCode: Map<string, ItemCatalogItem>
): PharmReciveDetail {
  const code = row.itmId?.trim();
  if (!code) return row;
  const item = itemByCode.get(code.toLowerCase());
  if (!item) return row;
  const { itmPurPrice, itmSell } = catalogDefaultPrices(item);
  return {
    ...row,
    itmNameAr: row.itmNameAr || item.itmNameAr?.trim() || "",
    itmNameEn: row.itmNameEn || item.itmNameEn?.trim() || "",
    itmPurPrice: row.itmPurPrice || itmPurPrice,
    itmSellPrice: row.itmSellPrice || itmSell,
    itemCostPrice: row.itemCostPrice || itmPurPrice,
    unitId: resolveUnitIdForItem(item, row.unitId),
  };
}

export function mergeSavedDetailsWithPrior(
  saved: PharmReciveDetail[],
  prior: PharmReciveDetail[],
  itemByCode?: Map<string, ItemCatalogItem>
): PharmReciveDetail[] {
  return saved.map((line, index) => {
    const fromPrior = prior[index];
    let merged: PharmReciveDetail = {
      ...line,
      itmNameAr: line.itmNameAr || fromPrior?.itmNameAr || "",
      itmNameEn: line.itmNameEn || fromPrior?.itmNameEn || "",
      batchNo: line.batchNo?.trim() || fromPrior?.batchNo?.trim() || "",
    };
    if (itemByCode && itemByCode.size > 0) {
      merged = enrichPharmReciveDetailFromCatalog(merged, itemByCode);
    }
    merged.lineTotal = computeLineTotal(merged);
    return merged;
  });
}

export function applyMovementToPharmReciveHeader(
  header: PharmReciveHeaderFormValues,
  movement: {
    id: number;
    movChiledId: number | null;
    movStor?: string | null;
    movStor2?: string | null;
    movAccountEntry1: string | null;
    movAccountEntry2: string | null;
  } | null
): PharmReciveHeaderFormValues {
  if (!movement) return header;

  return {
    ...header,
    movmentRowId: movement.id,
    movId: movement.movChiledId,
    movStor: movement.movStor?.trim() ?? "",
    movDis: movement.movStor2?.trim() ?? "",
    accountDept: movement.movAccountEntry2?.trim() ?? "",
    accountCREDIT: movement.movAccountEntry1?.trim() ?? "",
  };
}

export function toUpsertPayload(
  header: PharmReciveHeaderFormValues,
  details: PharmReciveDetail[],
  deletedDetailIds?: number[]
): PharmReciveUpsertPayload {
  const payload: PharmReciveUpsertPayload = {
    header: {
      id: header.id,
      movId: header.movId,
      movmentRowId: header.movmentRowId,
      fathId: header.fathId,
      movStor: header.movStor?.trim() ?? "",
      movDis: header.movDis?.trim() ?? "",
      movDate: header.movDate,
      monNote: header.monNote ?? "",
      accountDept: header.accountDept?.trim() ?? "",
      accountCREDIT: header.accountCREDIT?.trim() ?? "",
      movTotalTaxPrice: undefined,
    },
    details: details.map((detail) => ({
      id: detail.id,
      itmId: detail.itmId.trim(),
      expDate: detail.expDate || "",
      qnty: detail.qnty,
      itmPurPrice: detail.itmPurPrice,
      itmSellPrice: detail.itmSellPrice,
      itemCostPrice: detail.itemCostPrice,
      unitId: detail.unitId ?? 0,
      itmStock: detail.itmStock,
      batchNo: detail.batchNo?.trim() ?? "",
    })),
  };

  if (deletedDetailIds != null && deletedDetailIds.length > 0) {
    payload.deletedDetailIds = [...new Set(deletedDetailIds)];
  }

  return payload;
}
