/**
 * Generic ERP grid column definition.
 * Supports current width/visibility features and future order, freeze, sort, filter, export.
 */
export type GridColumnDefinition = {
  key: string;
  title: string;
  /** Default visibility when no user preference exists. Defaults to true. */
  defaultVisible?: boolean;
  /** Required columns cannot be hidden in the visibility menu. */
  required?: boolean;
  defaultWidth?: number;
  /** Hide from the column visibility menu (e.g. spacer columns). */
  hideFromMenu?: boolean;
};

export type GridSortPreference = {
  column: string;
  direction: "asc" | "desc";
};

/** Unified persisted grid preferences (widths, visibility, and future settings). */
export type GridPreferences = {
  columnWidths: Record<string, number>;
  visibleColumns: string[];
  columnOrder?: string[];
  frozenColumns?: string[];
  sort?: GridSortPreference | null;
};

export type GridColumnVisibilityItem = {
  key: string;
  title: string;
  visible: boolean;
  required: boolean;
};
