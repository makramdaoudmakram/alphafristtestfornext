import { apiFetch } from "@/lib/api-client";
import type {
  PharmExpenseBulkResponse,
  PharmExpenseContext,
  PharmExpenseLineRequest,
} from "@/types/pharm-expense";

function readNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value !== "") return Number(value);
  }
  return 0;
}

function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string") return value;
    if (value != null && typeof value !== "object") return String(value);
  }
  return "";
}

export async function getPharmExpenseContext(
  token: string
): Promise<PharmExpenseContext> {
  const data = await apiFetch<Record<string, unknown>>(
    "PharmExpenses/context",
    {},
    token
  );
  const error = readString(data, "error", "Error");
  return {
    parmId: readNumber(data, "parmId", "ParmId"),
    pharmId: readString(data, "pharmId", "PharmId"),
    pharmacyName: readString(data, "pharmacyName", "PharmacyName") || null,
    movId: readNumber(data, "movId", "MovId"),
    movName: readString(data, "movName", "MovName") || null,
    shiftId: readNumber(data, "shiftId", "ShiftId"),
    hasOpenShift: Boolean(data.hasOpenShift ?? data.HasOpenShift),
    canSave: Boolean(data.canSave ?? data.CanSave),
    error: error || null,
  };
}

export async function savePharmExpensesBulk(
  token: string,
  items: PharmExpenseLineRequest[]
): Promise<PharmExpenseBulkResponse> {
  const data = await apiFetch<Record<string, unknown>>(
    "PharmExpenses/bulk",
    {
      method: "POST",
      body: JSON.stringify({
        items: items.map((item) => ({
          ExpensesDisc: item.expensesDisc,
          ExpensesVal: item.expensesVal,
        })),
      }),
    },
    token
  );

  return {
    savedCount: readNumber(data, "savedCount", "SavedCount"),
    movId: readNumber(data, "movId", "MovId"),
    pharmId: readString(data, "pharmId", "PharmId"),
    shiftId: readNumber(data, "shiftId", "ShiftId"),
    totalExpenses: readNumber(data, "totalExpenses", "TotalExpenses"),
  };
}
