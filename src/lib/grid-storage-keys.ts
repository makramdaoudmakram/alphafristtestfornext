/** Builds a unified grid preferences storage key for any ERP module. */
export function buildGridPreferencesStorageKey(moduleKey: string): string {
  return `${moduleKey}-grid-preferences`;
}

/** Legacy width-only storage key (migrated automatically when present). */
export function buildLegacyGridWidthStorageKey(moduleKey: string): string {
  return `${moduleKey}-grid-column-widths`;
}

/** Predefined module keys for master-detail grids. */
export const GRID_MODULE_KEYS = {
  purchaseDetail: "purchase",
  returnDetail: "return",
  salesDetail: "sales",
  transferDetail: "transfer",
  inventoryDetail: "inventory",
} as const;

export type GridModuleKey = (typeof GRID_MODULE_KEYS)[keyof typeof GRID_MODULE_KEYS];

export function getGridStorageKeys(moduleKey: string): {
  preferencesKey: string;
  legacyWidthKey: string;
} {
  return {
    preferencesKey: buildGridPreferencesStorageKey(moduleKey),
    legacyWidthKey: buildLegacyGridWidthStorageKey(moduleKey),
  };
}
