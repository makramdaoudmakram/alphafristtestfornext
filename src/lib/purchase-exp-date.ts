/** Stored/API value: YYYY-MM-01 (day always 1). UI: MM/YYYY text. */

export function expDateToMonthInput(value: string): string {
  if (!value?.trim()) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  // API DateTime JSON: 2026-08-01T00:00:00 or 2026-08-01
  const dateMatch = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  if (dateMatch) return dateMatch[1]!.slice(0, 7);
  const fromMmYyyy = mmYyyyToExpDate(trimmed);
  if (fromMmYyyy) return fromMmYyyy.slice(0, 7);
  return "";
}

export function monthInputToExpDate(month: string): string {
  const normalized = month.trim();
  if (!/^\d{4}-\d{2}$/.test(normalized)) return "";
  const [, m] = normalized.split("-");
  const monthNum = Number(m);
  if (monthNum < 1 || monthNum > 12) return "";
  return `${normalized}-01`;
}

/** Display stored expiry as MM/YYYY */
export function formatExpDateMmYyyy(value: string): string {
  const month = expDateToMonthInput(value);
  if (!month) return "";
  const [y, m] = month.split("-");
  return `${m}/${y}`;
}

/** Parse MM/YYYY (or M/YYYY) to YYYY-MM-01; empty string if invalid/incomplete */
export function mmYyyyToExpDate(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const slash = /^(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (slash) {
    const month = Number(slash[1]);
    const year = slash[2];
    if (month < 1 || month > 12) return "";
    return monthInputToExpDate(`${year}-${String(month).padStart(2, "0")}`);
  }

  const compact = /^(\d{2})(\d{4})$/.exec(trimmed.replace(/\D/g, ""));
  if (compact) {
    const month = Number(compact[1]);
    const year = compact[2];
    if (month < 1 || month > 12) return "";
    return monthInputToExpDate(`${year}-${compact[1]}`);
  }

  return "";
}

/** First day of the current calendar month (YYYY-MM-01), using local time. */
export function firstDayOfCurrentMonth(referenceDate = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function isExpDatePresent(value: string): boolean {
  return Boolean(expDateToMonthInput(value));
}

/** True when stored expiry month is >= the current calendar month. */
export function isExpDateOnOrAfterCurrentMonth(
  value: string,
  referenceDate = new Date()
): boolean {
  const month = expDateToMonthInput(value);
  if (!month) return false;
  const stored = monthInputToExpDate(month);
  if (!stored) return false;
  return stored >= firstDayOfCurrentMonth(referenceDate);
}

export const EXP_DATE_REQUIRED_BEFORE_ADD_ROW =
  "Expiry Date is required before adding another row.";

export const EXP_DATE_BEFORE_CURRENT_MONTH =
  "Expiry Date must be the current month or later.";

/** Validates the last existing PurD row before allowing Add Row. Returns an error message or null. */
export function validatePurchaseDetailExpDateForNewRow(
  expDate: string,
  referenceDate = new Date()
): string | null {
  if (!isExpDatePresent(expDate)) {
    return EXP_DATE_REQUIRED_BEFORE_ADD_ROW;
  }
  if (!isExpDateOnOrAfterCurrentMonth(expDate, referenceDate)) {
    return EXP_DATE_BEFORE_CURRENT_MONTH;
  }
  return null;
}

/** Allow digits and one slash while typing (max MM/YYYY length) */
export function sanitizeMmYyyyTyping(raw: string): string {
  let out = "";
  let slashUsed = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      if (out.replace(/\D/g, "").length >= 6) continue;
      out += ch;
      continue;
    }
    if (ch === "/" && !slashUsed) {
      slashUsed = true;
      out += "/";
    }
  }
  if (out.length === 2 && !out.includes("/") && raw.includes("/")) {
    out += "/";
  }
  return out;
}
