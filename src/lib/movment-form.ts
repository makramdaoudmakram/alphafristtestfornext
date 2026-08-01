import type { MovmentItem, MovmentUpsertRequest } from "@/types/movment";

export type MovmentFormValues = {
  movChiledId: string;
  movChiledName: string;
  movParientId: string;
  movSingleStore: boolean;
  movStor: string;
  movStor2: string;
  movAccountEntry1: string;
  movAccountEntry2: string;
  movAccountEntry3: string;
  movAccountEntry4: string;
  movAccountEntry5: string;
  movAccountEntry6: string;
  movAccountEntry7: string;
  movAccountEntry8: string;
  movClint1: string;
  movClint2: string;
  movStockEffict: string;
  movPage: string;
  movActive: boolean;
};

export const emptyMovmentFormValues: MovmentFormValues = {
  movChiledId: "",
  movChiledName: "",
  movParientId: "",
  movSingleStore: false,
  movStor: "",
  movStor2: "",
  movAccountEntry1: "",
  movAccountEntry2: "",
  movAccountEntry3: "",
  movAccountEntry4: "",
  movAccountEntry5: "",
  movAccountEntry6: "",
  movAccountEntry7: "",
  movAccountEntry8: "",
  movClint1: "",
  movClint2: "",
  movStockEffict: "",
  movPage: "",
  movActive: true,
};

/** Next Child ID = max existing movChiledId + 1 (or 1 when none). */
export function getNextMovChiledId(items: MovmentItem[]): string {
  const maxId = items.reduce((max, row) => {
    const value = row.movChiledId;
    if (value == null || !Number.isFinite(value)) return max;
    return Math.max(max, value);
  }, 0);
  return String(maxId + 1);
}

function readOptionalShort(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function readOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function readOptionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function toMovmentFormValues(item: MovmentItem): MovmentFormValues {
  return {
    movChiledId: item.movChiledId != null ? String(item.movChiledId) : "",
    movChiledName: item.movChiledName ?? "",
    movParientId: item.movParientId != null ? String(item.movParientId) : "",
    movSingleStore: item.movSingleStore,
    movStor: item.movStor ?? "",
    movStor2: item.movStor2 ?? "",
    movAccountEntry1: item.movAccountEntry1 ?? "",
    movAccountEntry2: item.movAccountEntry2 ?? "",
    movAccountEntry3: item.movAccountEntry3 ?? "",
    movAccountEntry4: item.movAccountEntry4 ?? "",
    movAccountEntry5: item.movAccountEntry5 ?? "",
    movAccountEntry6: item.movAccountEntry6 ?? "",
    movAccountEntry7: item.movAccountEntry7 ?? "",
    movAccountEntry8: item.movAccountEntry8 ?? "",
    movClint1: item.movClint1 ?? "",
    movClint2: item.movClint2 ?? "",
    movStockEffict:
      item.movStockEffict != null ? String(item.movStockEffict) : "",
    movPage: item.movPage ?? "",
    movActive: !!item.movActive,
  };
}

export function toMovmentUpsertRequest(
  values: MovmentFormValues
): MovmentUpsertRequest {
  return {
    movChiledId: readOptionalShort(values.movChiledId),
    movChiledName: readOptionalString(values.movChiledName),
    movParientId: readOptionalInt(values.movParientId),
    movSingleStore: values.movSingleStore,
    movStor: readOptionalString(values.movStor),
    movStor2: readOptionalString(values.movStor2),
    movAccountEntry1: readOptionalString(values.movAccountEntry1),
    movAccountEntry2: readOptionalString(values.movAccountEntry2),
    movAccountEntry3: readOptionalString(values.movAccountEntry3),
    movAccountEntry4: readOptionalString(values.movAccountEntry4),
    movAccountEntry5: readOptionalString(values.movAccountEntry5),
    movAccountEntry6: readOptionalString(values.movAccountEntry6),
    movAccountEntry7: readOptionalString(values.movAccountEntry7),
    movAccountEntry8: readOptionalString(values.movAccountEntry8),
    movClint1: readOptionalString(values.movClint1),
    movClint2: readOptionalString(values.movClint2),
    movStockEffict: readOptionalInt(values.movStockEffict),
    movPage: readOptionalString(values.movPage),
    movActive: !!values.movActive,
  };
}
