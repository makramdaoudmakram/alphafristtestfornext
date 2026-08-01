import { computeHeaderTotals, computeLineTotal } from "@/lib/purchase-calculations";
import { enrichDetailFromCatalog } from "@/lib/item-catalog-search";
import { monthInputToExpDate, expDateToMonthInput } from "@/lib/purchase-exp-date";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type {
  PurchaseDetail,
  PurchaseDocument,
  PurchaseHeader,
  PurchaseSearchResult,
  PurchaseUpsertPayload,
} from "@/types/purchase";
import type { PurchaseHeaderFormValues } from "@/validation/purchase.schema";

function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string") return value;
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

function parseUnitIdForApi(unitId: string): number | undefined {
  const trimmed = unitId?.trim() ?? "";
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (Number.isFinite(n) && n > 0) return n;
  return undefined;
}

function readUnitId(obj: Record<string, unknown>): string {
  for (const key of ["unitId", "UnitId"]) {
    const value = obj[key];
    if (typeof value === "string") return value;
    if (typeof value === "number" && Number.isFinite(value) && value !== 0) {
      return String(value);
    }
  }
  return "";
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
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return "";
}

function formatExpDateFromApi(value: unknown): string {
  if (!value) return "";
  const raw = typeof value === "string" ? value : "";
  const month = expDateToMonthInput(raw);
  return month ? monthInputToExpDate(month) : "";
}

function newClientRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `row-${crypto.randomUUID()}`;
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyDetailRow(): PurchaseDetail {
  return {
    id: null,
    clientRowId: newClientRowId(),
    itmId: "",
    itmNameAr: "",
    itmNameEn: "",
    cId: 0,
    expDate: "",
    qnty: 1,
    bonus: 0,
    itmPurPrice: 0,
    itmSell: 0,
    itmDisPer: 0,
    itmDisMon: 0,
    itmTaxTotal: 0,
    unitId: "",
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
    stoId: "",
    movId: null,
    movmentRowId: null,
    movAccount: "",
    movAccountsec: "",
    movAccounttherd: "",
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

export function mapDetailFromApi(raw: Record<string, unknown>): PurchaseDetail {
  const row: PurchaseDetail = {
    id: readNullableNumber(raw, "id", "Id"),
    clientRowId: newClientRowId(),
    itmId: readString(raw, "itmId", "ItmId"),
    itmNameAr: readString(raw, "itmNameAr", "ItmNameAr"),
    itmNameEn: readString(raw, "itmNameEn", "ItmNameEn"),
    cId: readNumber(raw, "cId", "CId"),
    expDate: formatExpDateFromApi(raw.expDate ?? raw.ExpDate),
    qnty: readNumber(raw, "qnty", "Qnty") || 1,
    bonus: readNumber(raw, "bonus", "Bonus"),
    itmPurPrice: readNumber(raw, "itmPurPrice", "ItmPurPrice"),
    itmSell: readNumber(raw, "itmSell", "ItmSell"),
    itmDisPer: readNumber(raw, "itmDisPer", "ItmDisPer"),
    itmDisMon: readNumber(raw, "itmDisMon", "ItmDisMon"),
    itmTaxTotal: readNumber(raw, "itmTaxTotal", "ItmTaxTotal"),
    unitId: readUnitId(raw),
    lineTotal: 0,
  };
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
    stoId: readString(raw, "stoId", "StoId"),
    movId: readNullableNumber(raw, "movId", "MovId"),
    movmentRowId: readNullableNumber(raw, "movmentRowId", "MovmentRowId"),
    movAccount: readString(raw, "movAccount", "MovAccount"),
    movAccountsec: readString(raw, "movAccountsec", "MovAccountsec"),
    movAccounttherd: readString(raw, "movAccounttherd", "MovAccounttherd"),
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
  };
}

export function mapDocumentFromApi(raw: Record<string, unknown>): PurchaseDocument {
  const header = mapHeaderFromApi(raw);
  const detailsRaw =
    (raw.purTransDetails as Record<string, unknown>[] | undefined) ??
    (raw.PurTransDetails as Record<string, unknown>[] | undefined) ??
    (raw.details as Record<string, unknown>[] | undefined) ??
    [];

  return {
    header,
    details: detailsRaw.map((line) => mapDetailFromApi(line)),
  };
}

export function mapSearchResultFromApi(raw: Record<string, unknown>): PurchaseSearchResult {
  return {
    id: readNumber(raw, "id", "Id"),
    pthId: readNumber(raw, "pthId", "PthId"),
    venId: readString(raw, "venId", "VenId"),
    venBillNo: readString(raw, "venBillNo", "VenBillNo"),
    venBillDate: formatDateInput(raw.venBillDate ?? raw.VenBillDate) || null,
    phtDate: formatDateInput(raw.phtDate ?? raw.PhtDate) || null,
    pthNetBill: readNumber(raw, "pthNetBill", "PthNetBill"),
  };
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
    };
    if (itemByCode && itemByCode.size > 0) {
      merged = enrichDetailFromCatalog(merged, itemByCode);
    }
    merged.lineTotal = computeLineTotal(merged);
    return merged;
  });
}

/** Map selected movement settings onto PurTransH header fields. */
export function applyMovementToHeader(
  header: PurchaseHeaderFormValues,
  movement: {
    id: number;
    movChiledId: number | null;
    movStor: string | null;
    movAccountEntry1: string | null;
    movAccountEntry2: string | null;
    movAccountEntry3: string | null;
  } | null
): PurchaseHeaderFormValues {
  if (!movement) return header;

  const entry1 = movement.movAccountEntry1?.trim() ?? "";
  const entry2 = movement.movAccountEntry2?.trim() ?? "";
  const entry3 = movement.movAccountEntry3?.trim() ?? "";
  const movStor = movement.movStor?.trim() ?? "";

  return {
    ...header,
    movmentRowId: movement.id,
    // Force mapping from movement (do not keep stale empty form values)
    stoId: movStor,
    movId: movement.movChiledId,
    venId: entry1,
    movAccountsec: entry1,
    movAccount: entry2,
    movAccounttherd: entry3,
  };
}

export function toUpsertPayload(
  header: PurchaseHeaderFormValues,
  details: PurchaseDetail[]
): PurchaseUpsertPayload {
  return {
    header: {
      id: header.id,
      pthId: header.pthId,
      venBillNo: header.venBillNo.trim(),
      venBillDate: header.venBillDate,
      phtDate: header.phtDate,
      venId: header.venId?.trim() ?? "",
      stoId: header.stoId?.trim() ?? "",
      movId: header.movId,
      movmentRowId: header.movmentRowId,
      movAccount: header.movAccount?.trim() ?? "",
      movAccountsec: header.movAccountsec?.trim() ?? "",
      movAccounttherd: header.movAccounttherd?.trim() ?? "",
      purchExtraDisCount: Number(header.purchExtraDisCount) || 0,
      totalDisPer: Number(header.totalDisPer) || 0,
      pOtherExpenses: Number(header.pOtherExpenses) || 0,
      pthNotice: header.pthNotice ?? "",
    },
    details: details.map(
      ({
        clientRowId: _c,
        lineTotal: _l,
        itmNameAr: _ar,
        itmNameEn: _en,
        unitId,
        ...rest
      }) => {
        const apiUnitId = parseUnitIdForApi(unitId ?? "");
        const line: Omit<
          PurchaseDetail,
          "clientRowId" | "lineTotal" | "itmNameAr" | "itmNameEn" | "unitId"
        > & { unitId?: number } = {
          id: rest.id,
          itmId: rest.itmId.trim(),
          cId: rest.cId,
          expDate: rest.expDate || "",
          qnty: rest.qnty,
          bonus: rest.bonus,
          itmPurPrice: rest.itmPurPrice,
          itmSell: rest.itmSell,
          itmDisPer: rest.itmDisPer,
          itmDisMon: rest.itmDisMon,
          itmTaxTotal: rest.itmTaxTotal,
        };
        if (apiUnitId !== undefined) line.unitId = apiUnitId;
        return line;
      }
    ),
  };
}
