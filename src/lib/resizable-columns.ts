export const RESIZABLE_COLUMN_MIN_WIDTH = 80;
export const RESIZABLE_COLUMN_MAX_WIDTH = 800;

export type ColumnWidthMap = Record<string, number>;

export type ResizableColumnDefinition = {
  id: string;
  defaultWidth: number;
};

export function clampColumnWidth(
  width: number,
  minWidth = RESIZABLE_COLUMN_MIN_WIDTH,
  maxWidth = RESIZABLE_COLUMN_MAX_WIDTH
): number {
  return Math.min(maxWidth, Math.max(minWidth, Math.round(width)));
}

export function buildDefaultWidthMap(
  columns: readonly ResizableColumnDefinition[]
): ColumnWidthMap {
  return Object.fromEntries(columns.map((column) => [column.id, column.defaultWidth]));
}

export function mergeStoredWidths(
  defaults: ColumnWidthMap,
  stored: unknown,
  minWidth = RESIZABLE_COLUMN_MIN_WIDTH,
  maxWidth = RESIZABLE_COLUMN_MAX_WIDTH
): ColumnWidthMap {
  if (!stored || typeof stored !== "object") return { ...defaults };

  const merged = { ...defaults };
  for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
    if (!(key in defaults)) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    merged[key] = clampColumnWidth(value, minWidth, maxWidth);
  }
  return merged;
}

export function readColumnWidthsFromStorage(storageKey: string): ColumnWidthMap | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as ColumnWidthMap;
  } catch {
    return null;
  }
}

export function writeColumnWidthsToStorage(
  storageKey: string,
  widths: ColumnWidthMap
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(widths));
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function clearColumnWidthsFromStorage(storageKey: string): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage errors.
  }
}

export function columnWidthStyle(width: number): { width: number; minWidth: number; maxWidth: number } {
  return {
    width,
    minWidth: width,
    maxWidth: width,
  };
}
