"use client";

import { useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Pencil, Search, Trash2 } from "lucide-react";
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
  /** Set false to hide the actions column even when handlers are provided */
  showActions?: boolean;
  className?: string;
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
}: DataTableProps<TData, TValue>) {
  const [globalFilter, setGlobalFilter] = useState("");

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
                onClick={() => onEdit(row.original)}
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
                onClick={() => onDelete(row.original)}
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
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize },
    },
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
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
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
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
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
      />
    </div>
  );
}
