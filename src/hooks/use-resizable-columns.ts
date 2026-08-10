"use client";

import type { CSSProperties } from "react";
import {
  useGridPreferences,
  type ResizeHandleProps,
  type UseGridPreferencesOptions,
} from "@/hooks/use-grid-preferences";
import type { GridColumnDefinition } from "@/types/grid-column";

export type { ResizeHandleProps };

export type ResizableColumnDefinition = {
  id: string;
  defaultWidth: number;
};

export type UseResizableColumnsOptions = {
  storageKey: string;
  columns: readonly ResizableColumnDefinition[];
  minWidth?: number;
  maxWidth?: number;
  gridRootRef?: React.RefObject<HTMLElement | null>;
};

export type UseResizableColumnsResult = {
  widths: Record<string, number>;
  getWidth: (columnId: string) => number;
  getColumnStyle: (columnId: string) => CSSProperties;
  getResizeHandleProps: (columnId: string) => ResizeHandleProps;
  resetWidths: () => void;
  isResizing: boolean;
};

function toGridColumns(
  columns: readonly ResizableColumnDefinition[]
): GridColumnDefinition[] {
  return columns.map((column) => ({
    key: column.id,
    title: column.id,
    defaultWidth: column.defaultWidth,
  }));
}

/** @deprecated Prefer `useGridPreferences` for width + visibility + future settings. */
export function useResizableColumns({
  storageKey,
  columns,
  minWidth,
  maxWidth,
  gridRootRef,
}: UseResizableColumnsOptions): UseResizableColumnsResult {
  const gridColumns = toGridColumns(columns);
  const {
    preferences,
    getWidth,
    getColumnStyle,
    getResizeHandleProps,
    resetPreferences,
    isResizing,
  } = useGridPreferences({
    storageKey,
    columns: gridColumns,
    legacyWidthStorageKey: storageKey,
    minWidth,
    maxWidth,
    gridRootRef,
  });

  return {
    widths: preferences.columnWidths,
    getWidth,
    getColumnStyle,
    getResizeHandleProps,
    resetWidths: resetPreferences,
    isResizing,
  };
}
