"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  buildColumnVisibilityMap,
  buildDefaultGridPreferences,
  clearGridPreferencesFromStorage,
  getMenuColumns,
  getRequiredColumnKeys,
  mergeGridPreferences,
  migrateLegacyWidthStorage,
  readGridPreferencesFromStorage,
  writeGridPreferencesToStorage,
} from "@/lib/grid-preferences";
import {
  clampColumnWidth,
  RESIZABLE_COLUMN_MAX_WIDTH,
  RESIZABLE_COLUMN_MIN_WIDTH,
} from "@/lib/resizable-columns";
import type { GridColumnDefinition, GridPreferences } from "@/types/grid-column";

export type ResizeHandleProps = {
  onMouseDown: (event: React.MouseEvent) => void;
  onDoubleClick: (event: React.MouseEvent) => void;
};

export type UseGridPreferencesOptions = {
  storageKey: string;
  columns: readonly GridColumnDefinition[];
  /** Legacy width-only storage key to migrate once. */
  legacyWidthStorageKey?: string;
  minWidth?: number;
  maxWidth?: number;
  gridRootRef?: React.RefObject<HTMLElement | null>;
};

export type UseGridPreferencesResult = {
  preferences: GridPreferences;
  menuColumns: GridColumnDefinition[];
  columnVisibility: Record<string, boolean>;
  visibleColumnKeys: string[];
  isColumnVisible: (columnKey: string) => boolean;
  setColumnVisible: (columnKey: string, visible: boolean) => void;
  showAllColumns: () => void;
  clearOptionalColumns: () => void;
  getWidth: (columnKey: string) => number;
  getColumnStyle: (columnKey: string) => CSSProperties;
  getResizeHandleProps: (columnKey: string) => ResizeHandleProps;
  resetPreferences: () => void;
  isResizing: boolean;
};

function applyWidthToDom(
  root: HTMLElement | null | undefined,
  columnKey: string,
  width: number
) {
  if (!root) return;

  root
    .querySelectorAll<HTMLElement>(`[data-grid-col="${columnKey}"]`)
    .forEach((node) => {
      node.style.width = `${width}px`;
      node.style.minWidth = `${width}px`;
      node.style.maxWidth = `${width}px`;
    });
}

export function useGridPreferences({
  storageKey,
  columns,
  legacyWidthStorageKey,
  minWidth = RESIZABLE_COLUMN_MIN_WIDTH,
  maxWidth = RESIZABLE_COLUMN_MAX_WIDTH,
  gridRootRef,
}: UseGridPreferencesOptions): UseGridPreferencesResult {
  const definitionOrder = useMemo(
    () => columns.map((column) => column.key),
    [columns]
  );
  const requiredKeys = useMemo(() => getRequiredColumnKeys(columns), [columns]);
  const menuColumns = useMemo(() => getMenuColumns(columns), [columns]);
  const defaultPreferences = useMemo(
    () => buildDefaultGridPreferences(columns),
    [columns]
  );

  const [preferences, setPreferences] = useState<GridPreferences>(() => {
    const stored = readGridPreferencesFromStorage(storageKey);
    if (stored) {
      return mergeGridPreferences(columns, stored, minWidth, maxWidth);
    }

    if (legacyWidthStorageKey) {
      const migrated = migrateLegacyWidthStorage(legacyWidthStorageKey, columns);
      if (migrated) {
        return mergeGridPreferences(columns, migrated, minWidth, maxWidth);
      }
    }

    return defaultPreferences;
  });

  const [isResizing, setIsResizing] = useState(false);
  const resizeSessionRef = useRef<{
    columnKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    const stored = readGridPreferencesFromStorage(storageKey);
    if (stored) {
      setPreferences(mergeGridPreferences(columns, stored, minWidth, maxWidth));
      return;
    }

    if (legacyWidthStorageKey) {
      const migrated = migrateLegacyWidthStorage(legacyWidthStorageKey, columns);
      if (migrated) {
        const merged = mergeGridPreferences(columns, migrated, minWidth, maxWidth);
        setPreferences(merged);
        writeGridPreferencesToStorage(storageKey, merged);
      }
    }
  }, [columns, legacyWidthStorageKey, maxWidth, minWidth, storageKey]);

  const persistPreferences = useCallback(
    (next: GridPreferences) => {
      writeGridPreferencesToStorage(storageKey, next);
    },
    [storageKey]
  );

  const updatePreferences = useCallback(
    (updater: (current: GridPreferences) => GridPreferences) => {
      setPreferences((current) => {
        const next = updater(current);
        persistPreferences(next);
        return next;
      });
    },
    [persistPreferences]
  );

  const columnVisibility = useMemo(
    () => buildColumnVisibilityMap(columns, preferences.visibleColumns),
    [columns, preferences.visibleColumns]
  );

  const visibleColumnKeys = useMemo(
    () => definitionOrder.filter((key) => columnVisibility[key]),
    [columnVisibility, definitionOrder]
  );

  const isColumnVisible = useCallback(
    (columnKey: string) => columnVisibility[columnKey] ?? false,
    [columnVisibility]
  );

  const setColumnVisible = useCallback(
    (columnKey: string, visible: boolean) => {
      if (requiredKeys.has(columnKey)) return;

      updatePreferences((current) => {
        const visibleSet = new Set(current.visibleColumns);
        if (visible) visibleSet.add(columnKey);
        else visibleSet.delete(columnKey);

        for (const key of requiredKeys) {
          visibleSet.add(key);
        }

        return {
          ...current,
          visibleColumns: definitionOrder.filter((key) => visibleSet.has(key)),
        };
      });
    },
    [definitionOrder, requiredKeys, updatePreferences]
  );

  const showAllColumns = useCallback(() => {
    updatePreferences((current) => ({
      ...current,
      visibleColumns: [...definitionOrder],
    }));
  }, [definitionOrder, updatePreferences]);

  const clearOptionalColumns = useCallback(() => {
    updatePreferences((current) => ({
      ...current,
      visibleColumns: definitionOrder.filter((key) => requiredKeys.has(key)),
    }));
  }, [definitionOrder, requiredKeys, updatePreferences]);

  const resetPreferences = useCallback(() => {
    clearGridPreferencesFromStorage(storageKey);
    setPreferences({ ...defaultPreferences });

    for (const column of columns) {
      const width =
        defaultPreferences.columnWidths[column.key] ??
        column.defaultWidth ??
        minWidth;
      applyWidthToDom(gridRootRef?.current, column.key, width);
    }
  }, [columns, defaultPreferences, gridRootRef, minWidth, storageKey]);

  const finishResize = useCallback(
    (columnKey: string, width: number) => {
      updatePreferences((current) => ({
        ...current,
        columnWidths: { ...current.columnWidths, [columnKey]: width },
      }));
      setIsResizing(false);
      resizeSessionRef.current = null;
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    },
    [updatePreferences]
  );

  const getResizeHandleProps = useCallback(
    (columnKey: string): ResizeHandleProps => ({
      onMouseDown: (event) => {
        event.preventDefault();
        event.stopPropagation();

        const startWidth =
          preferences.columnWidths[columnKey] ??
          columns.find((column) => column.key === columnKey)?.defaultWidth ??
          minWidth;

        resizeSessionRef.current = {
          columnKey,
          startX: event.clientX,
          startWidth,
        };
        setIsResizing(true);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        const handleMouseMove = (moveEvent: MouseEvent) => {
          const session = resizeSessionRef.current;
          if (!session || session.columnKey !== columnKey) return;

          const delta = moveEvent.clientX - session.startX;
          const nextWidth = clampColumnWidth(
            session.startWidth + delta,
            minWidth,
            maxWidth
          );
          applyWidthToDom(gridRootRef?.current, columnKey, nextWidth);
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);

          const session = resizeSessionRef.current;
          if (!session || session.columnKey !== columnKey) {
            setIsResizing(false);
            document.body.style.removeProperty("cursor");
            document.body.style.removeProperty("user-select");
            return;
          }

          const delta = upEvent.clientX - session.startX;
          const nextWidth = clampColumnWidth(
            session.startWidth + delta,
            minWidth,
            maxWidth
          );
          finishResize(columnKey, nextWidth);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      },
      onDoubleClick: (event) => {
        event.preventDefault();
        event.stopPropagation();

        const defaultWidth =
          defaultPreferences.columnWidths[columnKey] ??
          columns.find((column) => column.key === columnKey)?.defaultWidth ??
          minWidth;

        applyWidthToDom(gridRootRef?.current, columnKey, defaultWidth);
        finishResize(columnKey, defaultWidth);
      },
    }),
    [
      columns,
      defaultPreferences.columnWidths,
      finishResize,
      gridRootRef,
      maxWidth,
      minWidth,
      preferences.columnWidths,
    ]
  );

  const getWidth = useCallback(
    (columnKey: string) =>
      preferences.columnWidths[columnKey] ??
      columns.find((column) => column.key === columnKey)?.defaultWidth ??
      minWidth,
    [columns, minWidth, preferences.columnWidths]
  );

  const getColumnStyle = useCallback(
    (columnKey: string): CSSProperties => {
      const width = getWidth(columnKey);
      return {
        width,
        minWidth: width,
        maxWidth: width,
      };
    },
    [getWidth]
  );

  return {
    preferences,
    menuColumns,
    columnVisibility,
    visibleColumnKeys,
    isColumnVisible,
    setColumnVisible,
    showAllColumns,
    clearOptionalColumns,
    getWidth,
    getColumnStyle,
    getResizeHandleProps,
    resetPreferences,
    isResizing,
  };
}
