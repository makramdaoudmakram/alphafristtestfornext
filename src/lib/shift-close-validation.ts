import type {
  ShiftClosingPaymentClassification,
  ShiftPaymentCollectionCloseEntry,
} from "@/types/shift";

export type ShiftCloseFormValues = {
  actualCash: string;
};

export type ShiftCloseFormValidation =
  | { ok: true; actual: number }
  | { ok: false; message: string };

const MONEY_SCALE = 2;

export function parseNonNegativeMoney(
  raw: string,
  fieldLabel: string
): { ok: true; value: number } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: false, message: `${fieldLabel} is required.` };
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, message: `${fieldLabel} is not a valid number.` };
  }

  if (value < 0) {
    return { ok: false, message: `${fieldLabel} cannot be negative.` };
  }

  const rounded = Math.round(value * 10 ** MONEY_SCALE) / 10 ** MONEY_SCALE;
  if (Math.abs(value - rounded) > 0.0001) {
    return {
      ok: false,
      message: `${fieldLabel} must have at most ${MONEY_SCALE} decimal places.`,
    };
  }

  return { ok: true, value: rounded };
}

export function validateShiftCloseForm(
  values: ShiftCloseFormValues
): ShiftCloseFormValidation {
  const actual = parseNonNegativeMoney(
    values.actualCash,
    "Actual pharmacy cash"
  );
  if (!actual.ok) return { ok: false, message: actual.message };

  return { ok: true, actual: actual.value };
}

export function buildShiftClosePaymentCollection(
  classifications: ShiftClosingPaymentClassification[],
  amountsByClassifyId: Record<string, string>
):
  | { ok: true; paymentCollection: ShiftPaymentCollectionCloseEntry[] }
  | { ok: false; message: string } {
  const paymentCollection: ShiftPaymentCollectionCloseEntry[] = [];

  for (const row of classifications) {
    const raw = amountsByClassifyId[String(row.salesClassifyId)] ?? "";
    const trimmed = raw.trim();
    const label = row.displayName?.trim() || `Classification ${row.salesClassifyId}`;

    if (trimmed === "") {
      paymentCollection.push({
        salesClassifyId: row.salesClassifyId,
        actualAmount: 0,
      });
      continue;
    }

    const parsed = parseNonNegativeMoney(trimmed, label);
    if (!parsed.ok) {
      return { ok: false, message: parsed.message };
    }

    paymentCollection.push({
      salesClassifyId: row.salesClassifyId,
      actualAmount: parsed.value,
    });
  }

  return { ok: true, paymentCollection };
}
