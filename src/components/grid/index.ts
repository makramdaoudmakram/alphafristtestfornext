export { ColumnVisibilityMenu } from "@/components/grid/column-visibility-menu";
export { MasterDetailGrid } from "@/components/grid/master-detail-grid";
export type { MasterDetailGridProps } from "@/components/grid/master-detail-grid";
export { ResizableTableHead } from "@/components/grid/resizable-table-head";

export { useGridPreferences } from "@/hooks/use-grid-preferences";
export type {
  ResizeHandleProps,
  UseGridPreferencesOptions,
  UseGridPreferencesResult,
} from "@/hooks/use-grid-preferences";

export { useMasterDetailGridKeyboard } from "@/hooks/use-master-detail-grid-keyboard";
export type {
  UseMasterDetailGridKeyboardOptions,
  UseMasterDetailGridKeyboardResult,
} from "@/hooks/use-master-detail-grid-keyboard";

export {
  buildDefaultGridPreferences,
  buildColumnVisibilityMap,
  clearGridPreferencesFromStorage,
  mergeGridPreferences,
  readGridPreferencesFromStorage,
  writeGridPreferencesToStorage,
} from "@/lib/grid-preferences";

export {
  buildGridPreferencesStorageKey,
  buildLegacyGridWidthStorageKey,
  getGridStorageKeys,
  GRID_MODULE_KEYS,
} from "@/lib/grid-storage-keys";

export type {
  GridColumnDefinition,
  GridColumnVisibilityItem,
  GridPreferences,
  GridSortPreference,
} from "@/types/grid-column";
