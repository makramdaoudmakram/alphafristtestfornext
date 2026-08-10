import {
  clampColumnWidth,
  RESIZABLE_COLUMN_MAX_WIDTH,
  RESIZABLE_COLUMN_MIN_WIDTH,
  type ColumnWidthMap,
} from "@/lib/resizable-columns";
import type { GridColumnDefinition, GridPreferences } from "@/types/grid-column";

export const GRID_PREFERENCES_VERSION = 1;

export type StoredGridPreferences = GridPreferences & {
  version?: number;
};

export function buildDefaultGridPreferences(
  columns: readonly GridColumnDefinition[]
): GridPreferences {
  const columnWidths: ColumnWidthMap = {};
  const visibleColumns: string[] = [];

  for (const column of columns) {
    if (column.defaultWidth != null) {
      columnWidths[column.key] = column.defaultWidth;
    }
    if (column.required || column.defaultVisible !== false) {
      visibleColumns.push(column.key);
    }
  }

  return {
    columnWidths,
    visibleColumns,
    columnOrder: columns.map((column) => column.key),
    frozenColumns: [],
    sort: null,
  };
}

export function getRequiredColumnKeys(
  columns: readonly GridColumnDefinition[]
): Set<string> {
  return new Set(columns.filter((column) => column.required).map((column) => column.key));
}

export function getMenuColumns(
  columns: readonly GridColumnDefinition[]
): GridColumnDefinition[] {
  return columns.filter((column) => !column.hideFromMenu);
}

export function mergeGridPreferences(
  columns: readonly GridColumnDefinition[],
  stored: unknown,
  minWidth = RESIZABLE_COLUMN_MIN_WIDTH,
  maxWidth = RESIZABLE_COLUMN_MAX_WIDTH
): GridPreferences {
  const defaults = buildDefaultGridPreferences(columns);
  const requiredKeys = getRequiredColumnKeys(columns);
  const knownKeys = new Set(columns.map((column) => column.key));
  const definitionOrder = columns.map((column) => column.key);

  if (!stored || typeof stored !== "object") {
    return defaults;
  }

  const input = stored as Partial<GridPreferences>;
  const mergedWidths = { ...defaults.columnWidths };

  if (input.columnWidths && typeof input.columnWidths === "object") {
    for (const [key, value] of Object.entries(input.columnWidths)) {
      if (!knownKeys.has(key)) continue;
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      mergedWidths[key] = clampColumnWidth(value, minWidth, maxWidth);
    }
  }

  const storedVisible = Array.isArray(input.visibleColumns)
    ? input.visibleColumns.filter(
        (key): key is string => typeof key === "string" && knownKeys.has(key)
      )
    : [];

  const visibleSet = new Set<string>(storedVisible);
  for (const key of requiredKeys) {
    visibleSet.add(key);
  }

  if (visibleSet.size === 0) {
    for (const key of defaults.visibleColumns) {
      visibleSet.add(key);
    }
  }

  const visibleColumns = definitionOrder.filter((key) => visibleSet.has(key));

  const columnOrder = Array.isArray(input.columnOrder)
    ? [
        ...input.columnOrder.filter(
          (key): key is string => typeof key === "string" && knownKeys.has(key)
        ),
        ...definitionOrder.filter((key) => !input.columnOrder?.includes(key)),
      ]
    : definitionOrder;

  const frozenColumns = Array.isArray(input.frozenColumns)
    ? input.frozenColumns.filter(
        (key): key is string => typeof key === "string" && knownKeys.has(key)
      )
    : defaults.frozenColumns;

  return {
    columnWidths: mergedWidths,
    visibleColumns,
    columnOrder,
    frozenColumns,
    sort:
      input.sort &&
      typeof input.sort === "object" &&
      typeof input.sort.column === "string" &&
      knownKeys.has(input.sort.column) &&
      (input.sort.direction === "asc" || input.sort.direction === "desc")
        ? input.sort
        : null,
  };
}

export function readGridPreferencesFromStorage(
  storageKey: string
): GridPreferences | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as GridPreferences;
  } catch {
    return null;
  }
}

export function writeGridPreferencesToStorage(
  storageKey: string,
  preferences: GridPreferences
): void {
  if (typeof window === "undefined") return;

  try {
    const payload: StoredGridPreferences = {
      ...preferences,
      version: GRID_PREFERENCES_VERSION,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function clearGridPreferencesFromStorage(storageKey: string): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage errors.
  }
}

/** Migrates legacy width-only storage into unified grid preferences. */
export function migrateLegacyWidthStorage(
  legacyStorageKey: string,
  columns: readonly GridColumnDefinition[]
): GridPreferences | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(legacyStorageKey);
    if (!raw) return null;

    const legacyWidths = JSON.parse(raw) as ColumnWidthMap;
    const defaults = buildDefaultGridPreferences(columns);
    const knownKeys = new Set(columns.map((column) => column.key));
    const columnWidths = { ...defaults.columnWidths };

    for (const [key, value] of Object.entries(legacyWidths)) {
      if (!knownKeys.has(key)) continue;
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      columnWidths[key] = value;
    }

    return {
      ...defaults,
      columnWidths,
    };
  } catch {
    return null;
  }
}

export function buildColumnVisibilityMap(
  columns: readonly GridColumnDefinition[],
  visibleColumns: readonly string[]
): Record<string, boolean> {
  const visibleSet = new Set(visibleColumns);
  const requiredKeys = getRequiredColumnKeys(columns);
  const visibility: Record<string, boolean> = {};

  for (const column of columns) {
    visibility[column.key] =
      requiredKeys.has(column.key) || visibleSet.has(column.key);
  }

  return visibility;
}

export function filterColumnsBySearch(
  columns: readonly GridColumnDefinition[],
  query: string
): GridColumnDefinition[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...columns];

  return columns.filter((column) =>
    column.title.toLowerCase().includes(normalized)
  );
}
