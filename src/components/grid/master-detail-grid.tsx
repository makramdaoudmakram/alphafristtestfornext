"use client";

import { useEffect, useMemo, useRef, type KeyboardEvent, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ColumnVisibilityMenu } from "@/components/grid/column-visibility-menu";
import { ResizableTableHead } from "@/components/grid/resizable-table-head";
import { useGridPreferences } from "@/hooks/use-grid-preferences";
import { useMasterDetailGridKeyboard } from "@/hooks/use-master-detail-grid-keyboard";
import { cn } from "@/lib/utils";
import type { GridColumnDefinition } from "@/types/grid-column";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    editable?: boolean;
  }
}

export type MasterDetailGridProps<TData extends RowData> = {
  /** Unique module key used for LocalStorage (e.g. "purchase", "sales"). */
  moduleKey: string;
  /** Optional override for preferences storage key. */
  storageKey?: string;
  /** Optional legacy width-only storage key for migration. */
  legacyWidthStorageKey?: string;
  /** Column metadata: widths, visibility defaults, required flags. */
  columnConfig: readonly GridColumnDefinition[];
  /** TanStack column definitions (cells, headers). */
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  getRowId: (row: TData) => string;
  /** Column keys included in Enter/arrow keyboard navigation (visible subset applied automatically). */
  editableColumns?: readonly string[];
  selectedRowIndex: number;
  onSelectRow: (index: number) => void;
  disabled?: boolean;
  onAddRow?: () => void;
  onRemoveRow?: (index: number) => void;
  /** Toolbar area above the grid (e.g. Add row button). */
  toolbar?: ReactNode;
  /** Helper text below toolbar. */
  hint?: ReactNode;
  emptyMessage?: string;
  className?: string;
  scrollClassName?: string;
  getFocusColumnAfter?: (
    appliedColumnKey: string,
    visibleEditableColumns: readonly string[]
  ) => string | undefined;
  isGridField?: (target: HTMLElement) => boolean;
  shouldIgnoreKeyDown?: (target: HTMLElement, event: KeyboardEvent) => boolean;
  getRowClassName?: (row: TData, index: number) => string | undefined;
  /** Expose keyboard helpers to column cell renderers via render prop context. */
  keyboardRef?: React.MutableRefObject<{
    focusColumnAfter: (rowIndex: number, appliedColumnKey: string) => void;
  } | null>;
};

export function MasterDetailGrid<TData extends RowData>({
  moduleKey,
  storageKey,
  legacyWidthStorageKey,
  columnConfig,
  columns,
  data,
  getRowId,
  editableColumns = [],
  selectedRowIndex,
  onSelectRow,
  disabled = false,
  onAddRow,
  onRemoveRow,
  toolbar,
  hint,
  emptyMessage = "No detail lines.",
  className,
  scrollClassName,
  getFocusColumnAfter,
  isGridField,
  shouldIgnoreKeyDown,
  getRowClassName,
  keyboardRef,
}: MasterDetailGridProps<TData>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRootRef = useRef<HTMLDivElement>(null);

  const resolvedStorageKey = storageKey ?? `${moduleKey}-grid-preferences`;
  const resolvedLegacyKey =
    legacyWidthStorageKey ?? `${moduleKey}-grid-column-widths`;

  const {
    menuColumns,
    columnVisibility,
    isColumnVisible,
    setColumnVisible,
    showAllColumns,
    clearOptionalColumns,
    getWidth,
    getColumnStyle,
    getResizeHandleProps,
    isResizing,
  } = useGridPreferences({
    storageKey: resolvedStorageKey,
    legacyWidthStorageKey: resolvedLegacyKey,
    columns: columnConfig,
    gridRootRef,
  });

  const visibleEditableColumns = useMemo(
    () => editableColumns.filter((columnKey) => isColumnVisible(columnKey)),
    [editableColumns, isColumnVisible]
  );

  const { handleKeyDown, focusColumnAfter } = useMasterDetailGridKeyboard({
    containerRef,
    editableColumns: visibleEditableColumns,
    rowCount: data.length,
    selectedRowIndex,
    disabled,
    isResizing,
    onSelectRow,
    onAddRow,
    onRemoveRow,
    getFocusColumnAfter,
    isGridField,
    shouldIgnoreKeyDown,
  });

  useEffect(() => {
    if (!keyboardRef) return;
    keyboardRef.current = { focusColumnAfter };
  }, [focusColumnAfter, keyboardRef]);

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility },
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  });

  const visibleHeaderCount = table.getVisibleFlatColumns().length;

  return (
    <div className={cn("space-y-2", className)}>
      {toolbar ? <div className="flex items-center justify-end gap-2">{toolbar}</div> : null}
      {hint ? <div className="text-muted-foreground text-xs">{hint}</div> : null}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="rounded-md border outline-none focus-visible:ring-2 focus-visible:ring-orange-300/40"
      >
        <div
          ref={gridRootRef}
          className={cn(
            "max-h-[min(640px,calc(100vh-11rem))] min-h-[min(520px,58vh)] overflow-auto",
            scrollClassName
          )}
        >
          <Table className="table-fixed">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    if (!header.column.getIsVisible()) return null;

                    const columnId = header.column.id;
                    const width = getWidth(columnId);

                    return (
                      <ResizableTableHead
                        key={header.id}
                        columnId={columnId}
                        width={width}
                        resizeHandleProps={getResizeHandleProps(columnId)}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </ResizableTableHead>
                    );
                  })}
                  <TableHead className="bg-background sticky right-0 z-20 w-10 min-w-10 max-w-10 border-l px-1 text-center">
                    <ColumnVisibilityMenu
                      columns={menuColumns}
                      isColumnVisible={isColumnVisible}
                      setColumnVisible={setColumnVisible}
                      showAllColumns={showAllColumns}
                      clearOptionalColumns={clearOptionalColumns}
                    />
                  </TableHead>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.index === selectedRowIndex ? "selected" : undefined}
                    className={cn(
                      row.index === selectedRowIndex && "bg-muted/40",
                      getRowClassName?.(row.original, row.index)
                    )}
                    onClick={() => onSelectRow(row.index)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        data-grid-col={cell.column.id}
                        style={getColumnStyle(cell.column.id)}
                        className="overflow-hidden p-1"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                    <TableCell className="bg-background sticky right-0 z-10 w-10 min-w-10 max-w-10 border-l p-1" />
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={visibleHeaderCount + 1} className="h-24 text-center">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
