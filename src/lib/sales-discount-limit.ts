export type SalesDiscountGroupKind = "None" | "Medicine" | "Accessories";

export type SalesDiscountLimitSource =
  | "Default"
  | "ItemMax"
  | "MedicineExpiry"
  | "AccessoriesExpiry25"
  | "AccessoriesExpiry20";

export type SalesDiscountLimitResult = {
  percent: number;
  source: SalesDiscountLimitSource;
  expiryRuleApplied: boolean;
};

export const SALES_DEFAULT_MAX_DISC = 7;
export const SALES_MEDICINE_EXPIRY_DISC = 20;
export const SALES_ACCESSORIES_NEAR_DISC = 25;
export const SALES_ACCESSORIES_FAR_DISC = 20;
const PERCENT_TOLERANCE = 0.01;

/** ItemCatalog.Itm_Group → Group.GNameEn / GNameAr (no dedicated medicine flag). */
export function classifySalesDiscountGroup(
  nameEn: string | null | undefined,
  nameAr: string | null | undefined
): SalesDiscountGroupKind {
  const en = (nameEn ?? "").trim().toLowerCase();
  const ar = (nameAr ?? "").trim();
  if (isMedicineName(en, ar)) return "Medicine";
  if (isAccessoriesName(en, ar)) return "Accessories";
  return "None";
}

export function resolveSalesDiscountLimit(
  itemMaxDiscPer: number | null | undefined,
  groupNameEn: string | null | undefined,
  groupNameAr: string | null | undefined,
  expiry: string | null | undefined,
  todayIso: string | null | undefined
): SalesDiscountLimitResult {
  const itemLevel =
    itemMaxDiscPer != null && Number.isFinite(itemMaxDiscPer) && itemMaxDiscPer > 0
      ? itemMaxDiscPer
      : SALES_DEFAULT_MAX_DISC;
  const itemSource: SalesDiscountLimitSource =
    itemMaxDiscPer != null && itemMaxDiscPer > 0 ? "ItemMax" : "Default";

  const today = parseDateOnly(todayIso);
  const exp = parseDateOnly(expiry);
  const kind = classifySalesDiscountGroup(groupNameEn, groupNameAr);
  const expiryHit = tryExpiryPercent(kind, exp, today);

  if (expiryHit && expiryHit.percent >= itemLevel) {
    return {
      percent: expiryHit.percent,
      source: expiryHit.source,
      expiryRuleApplied: true,
    };
  }

  return {
    percent: itemLevel,
    source: itemSource,
    expiryRuleApplied: !!expiryHit,
  };
}

export function salesDiscountExceedsMaximum(
  equivalentPercent: number,
  maxPercent: number
): boolean {
  return equivalentPercent > maxPercent + PERCENT_TOLERANCE;
}

export function salesDiscountEquivalentPercent(
  lineGross: number,
  lineDiscount: number
): number {
  if (!(lineGross > 0)) return 0;
  return (lineDiscount / lineGross) * 100;
}

export function maxDiscountValue(lineGross: number, maxPercent: number): number {
  if (!(lineGross > 0) || !(maxPercent > 0)) return 0;
  return Math.round((lineGross * (maxPercent / 100) + Number.EPSILON) * 100) / 100;
}

/** Egypt server display → yyyy-MM-dd for discount windows. */
export function egyptDisplayToIsoDate(display: string | null | undefined): string | null {
  const raw = (display || "").trim();
  if (!raw || raw === "Loading..." || raw === "—") return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(raw);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return null;
}

export function parseDateOnly(
  value: string | null | undefined
): { year: number; month: number } | null {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!iso) return null;
  const year = Number(iso[1]);
  const month = Number(iso[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

function isMedicineName(enLower: string, ar: string): boolean {
  // Live Group.GNameEn is "medicen" (typo), not "Medicine".
  if (enLower.includes("medic")) return true;
  const arNorm = normalizeArabic(ar);
  return arNorm.includes("ادويه") || arNorm.includes("دواء");
}

function normalizeArabic(ar: string): string {
  return ar.replace(/ة/g, "ه").replace(/[أإآ]/g, "ا");
}

function isAccessoriesName(enLower: string, ar: string): boolean {
  if (enLower.includes("accessor")) return true;
  return (
    ar.includes("اكسسوار") || ar.includes("إكسسوار") || ar.includes("أكسسوار")
  );
}

function tryExpiryPercent(
  kind: SalesDiscountGroupKind,
  expiry: { year: number; month: number } | null,
  today: { year: number; month: number } | null
): { percent: number; source: SalesDiscountLimitSource } | null {
  if (kind === "None" || !expiry || !today) return null;
  const currentMonthIndex = today.year * 12 + (today.month - 1);
  const expIndex = expiry.year * 12 + (expiry.month - 1);
  const offset = expIndex - currentMonthIndex;

  if (kind === "Medicine") {
    if (offset >= 1 && offset <= 3) {
      return { percent: SALES_MEDICINE_EXPIRY_DISC, source: "MedicineExpiry" };
    }
    return null;
  }

  if (offset === 0 || offset === 1) {
    return { percent: SALES_ACCESSORIES_NEAR_DISC, source: "AccessoriesExpiry25" };
  }
  if (offset === 2 || offset === 3) {
    return { percent: SALES_ACCESSORIES_FAR_DISC, source: "AccessoriesExpiry20" };
  }
  return null;
}
