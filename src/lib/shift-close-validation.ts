export type ShiftCloseFormValues = {
  actualCash: string;
  transferAmount: string;
};

export type ShiftCloseFormValidation =
  | { ok: true; actual: number; transfer: number; difference: number }
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

  const transfer = parseNonNegativeMoney(
    values.transferAmount,
    "Head-office transfer amount"
  );
  if (!transfer.ok) return { ok: false, message: transfer.message };

  const difference =
    Math.round((actual.value - transfer.value) * 10 ** MONEY_SCALE) /
    10 ** MONEY_SCALE;

  if (difference < 0) {
    return {
      ok: false,
      message: "Head-office transfer amount cannot exceed actual pharmacy cash.",
    };
  }

  return {
    ok: true,
    actual: actual.value,
    transfer: transfer.value,
    difference,
  };
}

export function formatMoneyDifference(value: number): string {
  return value.toFixed(MONEY_SCALE);
}
