/** ISO date string from API (string or { year, month, day } DateOnly JSON). */
export function stockBarcodeExpDateFromApi(
  value: unknown
): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const year = record.year ?? record.Year;
    const month = record.month ?? record.Month;
    const day = record.day ?? record.Day;
    if (typeof year === "number" && typeof month === "number") {
      const mm = String(month).padStart(2, "0");
      const dd = typeof day === "number" ? String(day).padStart(2, "0") : "01";
      return `${year}-${mm}-${dd}`;
    }
  }
  return null;
}
