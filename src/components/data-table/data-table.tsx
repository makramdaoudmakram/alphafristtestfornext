"use client";

import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Search, Trash2 } from "lucide-react";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type { ColumnDef };

export interface DataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  filterPlaceholder?: string;
  emptyMessage?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
  onEdit?: (row: TData) => void;
  onDelete?: (row: TData) => void;
  editLabel?: string;
  deleteLabel?: string;
  actionsHeader?: string;
  showActions?: boolean;
  className?: string;
  /** Server-side pagination */
  manualPagination?: boolean;
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  totalRowCount?: number;
  /** Server-side sorting */
  manualSorting?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  /** Controlled search (e.g. server filter) */
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  getRowId?: (row: TData) => string;
  selectedRowId?: string | null;
  onRowClick?: (row: TData) => void;
  onRowDoubleClick?: (row: TData) => void;
}

export function DataTable<TData, TValue = unknown>({
  columns,
  data,
  loading = false,
  filterPlaceholder = "Filter rows...",
  emptyMessage = "No results.",
  pageSize = 10,
  pageSizeOptions,
  onEdit,
  onDelete,
  editLabel = "Update",
  deleteLabel = "Delete",
  actionsHeader = "Actions",
  showActions = true,
  className,
  manualPagination = false,
  pageCount,
  pagination: paginationProp,
  onPaginationChange,
  totalRowCount,
  manualSorting = false,
  sorting: sortingProp,
  onSortingChange,
  filterValue,
  onFilterChange,
  getRowId,
  selectedRowId,
  onRowClick,
  onRowDoubleClick,
}: DataTableProps<TData, TValue>) {
  const [internalFilter, setInternalFilter] = useState("");
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const globalFilter = filterValue ?? internalFilter;
  const setGlobalFilter = onFilterChange ?? setInternalFilter;
  const pagination = paginationProp ?? internalPagination;
  const setPagination = onPaginationChange ?? setInternalPagination;
  const sorting = sortingProp ?? internalSorting;
  const setSorting = onSortingChange ?? setInternalSorting;

  const tableColumns = useMemo(() => {
    const baseColumns = [...columns];

    if (showActions && (onEdit || onDelete)) {
      baseColumns.push({
        id: "actions",
        header: actionsHeader,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {onEdit ? (
              <Button
                type="button"
                variant="update"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row.original);
                }}
              >
                <Pencil className="size-3.5" />
                {editLabel}
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(row.original);
                }}
              >
                <Trash2 className="size-3.5" />
                {deleteLabel}
              </Button>
            ) : null}
          </div>
        ),
      } as ColumnDef<TData, TValue>);
    }

    return baseColumns;
  }, [
    columns,
    showActions,
    onEdit,
    onDelete,
    editLabel,
    deleteLabel,
    actionsHeader,
  ]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    state: {
      globalFilter: manualPagination ? undefined : globalFilter,
      pagination,
      sorting,
    },
    onGlobalFilterChange: manualPagination ? undefined : setGlobalFilter,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    ...(manualPagination
      ? {
          manualPagination: true,
          manualSorting: manualSorting,
          pageCount: pageCount ?? 1,
          ...(manualSorting
            ? {}
            : { getSortedRowModel: getSortedRowModel() }),
        }
      : {
          getFilteredRowModel: getFilteredRowModel(),
          getPaginationRowModel: getPaginationRowModel(),
          getSortedRowModel: getSortedRowModel(),
        }),
    enableSorting: manualSorting || !manualPagination,
    manualSorting,
  });

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder={filterPlaceholder}
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 font-medium"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {sorted === "asc" ? (
                            <ArrowUp className="ml-1 size-3.5" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="ml-1 size-3.5" />
                          ) : (
                            <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
                          )}
                        </Button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={tableColumns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const rowId = getRowId?.(row.original) ?? row.id;
                const selected = selectedRowId != null && selectedRowId === rowId;
                return (
                  <TableRow
                    key={row.id}
                    data-state={selected ? "selected" : undefined}
                    className={cn(
                      (onRowClick || onRowDoubleClick) && "cursor-pointer",
                      selected && "bg-muted/50"
                    )}
                    onClick={() => onRowClick?.(row.original)}
                    onDoubleClick={() => onRowDoubleClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={tableColumns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        table={table}
        pageSizeOptions={pageSizeOptions}
        totalRowCount={totalRowCount}
      />
    </div>
  );
}
