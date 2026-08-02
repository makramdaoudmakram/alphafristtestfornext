"use client";

import { useCallback, useMemo, useRef, type KeyboardEvent } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpDateMmYyyyInput } from "@/components/purchase/ExpDateMmYyyyInput";
import { ItemCatalogAutocompleteCell } from "@/components/purchase/ItemCatalogAutocompleteCell";
import { getBranchTypeSelectOptions } from "@/lib/movment-enums";
import { cn } from "@/lib/utils";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PurchaseDetail } from "@/types/purchase";

/** Column keys used for keyboard navigation order (ItmCode hidden in UI) */
const EDITABLE_COLUMNS = [
  "itmNameAr",
  "itmNameEn",
  "qnty",
  "bonus",
  "itmPurPrice",
  "stoId",
  "itmSell",
  "itmDisPer",
  "itmDisMon",
  "itmTaxTotal",
  "expDate",
] as const;

const branchTypeOptions = getBranchTypeSelectOptions();

type EditableColumn = (typeof EDITABLE_COLUMNS)[number];

type DetailsGridProps = {
  rows: PurchaseDetail[];
  /** Used for Enter fallback / enrich — autocomplete search uses token + lookup API. */
  catalogItems: ItemCatalogItem[];
  token?: string | null;
  catalogLoading?: boolean;
  catalogLoaded?: boolean;
  disabled: boolean;
  selectedRowIndex: number;
  onSelectRow: (index: number) => void;
  onChangeRow: (index: number, patch: Partial<PurchaseDetail>) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
};

export function DetailsGrid({
  rows,
  catalogItems,
  token,
  catalogLoading = false,
  catalogLoaded = false,
  disabled,
  selectedRowIndex,
  onSelectRow,
  onChangeRow,
  onAddRow,
  onRemoveRow,
}: DetailsGridProps) {
  const tableRef = useRef<HTMLDivElement>(null);

  const focusCell = useCallback((rowIndex: number, col: EditableColumn) => {
    const el = tableRef.current?.querySelector<HTMLElement>(
      `[data-row="${rowIndex}"][data-col="${col}"]`
    );
    el?.focus();
    if (el instanceof HTMLInputElement) {
      el.select();
    }
  }, []);

  const handleGridKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      if (event.key === "Insert") {
        event.preventDefault();
        onAddRow();
        return;
      }

      if (event.key === "Delete" && event.target === tableRef.current) {
        event.preventDefault();
        onRemoveRow(selectedRowIndex);
        return;
      }

      const target = event.target as HTMLElement;
      const autocompleteRoot = target.closest("[data-autocomplete-root]");
      if (autocompleteRoot && event.key === "Enter") {
        return;
      }
      if (
        autocompleteRoot &&
        (event.key === "ArrowUp" || event.key === "ArrowDown")
      ) {
        const input = autocompleteRoot.querySelector("input");
        const query = input?.value.trim() ?? "";
        if (
          query.length > 0 ||
          autocompleteRoot.getAttribute("data-autocomplete-open") === "true"
        ) {
          return;
        }
      }
      if (target.closest('[data-autocomplete-open="true"]')) return;
      const isGridField =
        target.tagName === "INPUT" ||
        (target.tagName === "BUTTON" && target.dataset.col === "stoId");
      if (!isGridField) return;

      const rowIndex = Number(target.dataset.row);
      const col = target.dataset.col as EditableColumn | undefined;
      if (Number.isNaN(rowIndex) || !col) return;

      const colIndex = EDITABLE_COLUMNS.indexOf(col);

      const move = (nextRow: number, nextCol: EditableColumn) => {
        event.preventDefault();
        onSelectRow(nextRow);
        focusCell(nextRow, nextCol);
      };

      if (event.key === "Enter") {
        const nextCol = EDITABLE_COLUMNS[colIndex + 1];
        if (nextCol) move(rowIndex, nextCol);
        else if (rowIndex < rows.length - 1) move(rowIndex + 1, EDITABLE_COLUMNS[0]!);
        else {
          event.preventDefault();
          onAddRow();
        }
        return;
      }

      if (event.key === "ArrowRight" && colIndex < EDITABLE_COLUMNS.length - 1) {
        move(rowIndex, EDITABLE_COLUMNS[colIndex + 1]!);
      } else if (event.key === "ArrowLeft" && colIndex > 0) {
        move(rowIndex, EDITABLE_COLUMNS[colIndex - 1]!);
      } else if (event.key === "ArrowDown" && rowIndex < rows.length - 1) {
        move(rowIndex + 1, col);
      } else if (event.key === "ArrowUp" && rowIndex > 0) {
        move(rowIndex - 1, col);
      }
    },
    [disabled, focusCell, onAddRow, onRemoveRow, onSelectRow, rows.length, selectedRowIndex]
  );

  const columns = useMemo<ColumnDef<PurchaseDetail>[]>(
    () => [
      {
        id: "line",
        header: "#",
        cell: ({ row }) => row.index + 1,
        size: 40,
      },
      {
        id: "itmNameAr",
        header: "Itm_Name_Ar",
        cell: ({ row }) => (
          <ItemCatalogAutocompleteCell
            field="nameAr"
            rowIndex={row.index}
            dataCol="itmNameAr"
            value={row.original.itmNameAr}
            token={token}
            catalogItems={catalogItems}
            disabled={disabled}
            inputClassName="min-w-[8rem]"
            onFocusRow={() => onSelectRow(row.index)}
            onChangeRow={(patch) => onChangeRow(row.index, patch)}
            onAfterApply={() => focusCell(row.index, "qnty")}
          />
        ),
      },
      {
        id: "itmNameEn",
        header: "Itm_Name_En",
        cell: ({ row }) => (
          <ItemCatalogAutocompleteCell
            field="nameEn"
            rowIndex={row.index}
            dataCol="itmNameEn"
            value={row.original.itmNameEn}
            token={token}
            catalogItems={catalogItems}
            disabled={disabled}
            inputClassName="min-w-[8rem]"
            onFocusRow={() => onSelectRow(row.index)}
            onChangeRow={(patch) => onChangeRow(row.index, patch)}
            onAfterApply={() => focusCell(row.index, "qnty")}
          />
        ),
      },
      {
        accessorKey: "qnty",
        header: "Qty",
        cell: ({ row }) => (
          <Input
            data-row={row.index}
            data-col="qnty"
            type="number"
            step="0.01"
            disabled={disabled}
            value={row.original.qnty}
            onFocus={() => onSelectRow(row.index)}
            onChange={(e) =>
              onChangeRow(row.index, { qnty: Number(e.target.value) || 0 })
            }
            className={cn("h-8 w-20 tabular-nums", formControlFocusClass)}
          />
        ),
      },
      {
        accessorKey: "bonus",
        header: "Bonus",
        cell: ({ row }) => (
          <Input
            data-row={row.index}
            data-col="bonus"
            type="number"
            step="0.01"
            disabled={disabled}
            value={row.original.bonus}
            onFocus={() => onSelectRow(row.index)}
            onChange={(e) =>
              onChangeRow(row.index, { bonus: Number(e.target.value) || 0 })
            }
            className={cn("h-8 w-20 tabular-nums", formControlFocusClass)}
          />
        ),
      },
      {
        accessorKey: "itmPurPrice",
        header: "Purch",
        cell: ({ row }) => (
          <Input
            data-row={row.index}
            data-col="itmPurPrice"
            type="number"
            step="0.01"
            disabled={disabled}
            value={row.original.itmPurPrice}
            onFocus={() => onSelectRow(row.index)}
            onChange={(e) =>
              onChangeRow(row.index, {
                itmPurPrice: Number(e.target.value) || 0,
              })
            }
            className={cn("h-8 w-24 tabular-nums", formControlFocusClass)}
          />
        ),
      },
      {
        accessorKey: "stoId",
        header: "Store",
        cell: ({ row }) => (
          <Select
            value={row.original.stoId?.trim() || undefined}
            onValueChange={(value) => onChangeRow(row.index, { stoId: value })}
            disabled={disabled}
          >
            <SelectTrigger
              className={cn("h-8 w-[5.5rem] text-xs", formControlFocusClass)}
              data-row={row.index}
              data-col="stoId"
              onFocus={() => onSelectRow(row.index)}
            >
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              {branchTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: "itmSell",
        header: "ItmSell",
        cell: ({ row }) => (
          <Input
            data-row={row.index}
            data-col="itmSell"
            type="number"
            step="0.01"
            disabled={disabled}
            value={row.original.itmSell}
            onFocus={() => onSelectRow(row.index)}
            onChange={(e) =>
              onChangeRow(row.index, {
                itmSell: Number(e.target.value) || 0,
              })
            }
            className={cn("h-8 w-24 tabular-nums", formControlFocusClass)}
          />
        ),
      },
      {
        accessorKey: "itmDisPer",
        header: "Disc %",
        cell: ({ row }) => (
          <Input
            data-row={row.index}
            data-col="itmDisPer"
            type="number"
            step="0.01"
            disabled={disabled}
            value={row.original.itmDisPer}
            onFocus={() => onSelectRow(row.index)}
            onChange={(e) =>
              onChangeRow(row.index, { itmDisPer: Number(e.target.value) || 0 })
            }
            className={cn("h-8 w-20 tabular-nums", formControlFocusClass)}
          />
        ),
      },
      {
        accessorKey: "itmDisMon",
        header: "Disc amt",
        cell: ({ row }) => (
          <Input
            data-row={row.index}
            data-col="itmDisMon"
            type="number"
            step="0.01"
            disabled={disabled}
            value={row.original.itmDisMon}
            onFocus={() => onSelectRow(row.index)}
            onChange={(e) =>
              onChangeRow(row.index, { itmDisMon: Number(e.target.value) || 0 })
            }
            className={cn("h-8 w-24 tabular-nums", formControlFocusClass)}
          />
        ),
      },
      {
        accessorKey: "itmTaxTotal",
        header: "Tax",
        cell: ({ row }) => (
          <Input
            data-row={row.index}
            data-col="itmTaxTotal"
            type="number"
            step="0.01"
            disabled={disabled}
            value={row.original.itmTaxTotal}
            onFocus={() => onSelectRow(row.index)}
            onChange={(e) =>
              onChangeRow(row.index, {
                itmTaxTotal: Number(e.target.value) || 0,
              })
            }
            className={cn("h-8 w-20 tabular-nums", formControlFocusClass)}
          />
        ),
      },
      {
        accessorKey: "expDate",
        header: "Exp MM/YYYY",
        cell: ({ row }) => (
          <ExpDateMmYyyyInput
            rowIndex={row.index}
            storedValue={row.original.expDate}
            disabled={disabled}
            onFocusRow={() => onSelectRow(row.index)}
            onCommit={(expDate) => onChangeRow(row.index, { expDate })}
          />
        ),
      },
      {
        accessorKey: "lineTotal",
        header: "Line total",
        cell: ({ row }) => (
          <span className="block px-2 text-right text-sm font-medium tabular-nums">
            {row.original.lineTotal.toFixed(2)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={disabled}
            onClick={() => onRemoveRow(row.index)}
            aria-label="Delete row"
          >
            <Trash2 className="size-4" />
          </Button>
        ),
      },
    ],
    [disabled, catalogItems, token, focusCell, onChangeRow, onRemoveRow, onSelectRow]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.clientRowId,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={onAddRow}
        >
          <Plus className="size-4" />
          Add row
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Keyboard: type in Arabic / English name for autocomplete (max 15).
        ↑↓ to highlight a suggestion, Enter to apply and jump to Qty.
        {catalogLoading ? (
          <span className="text-muted-foreground block pt-1">
            Loading item catalog…
          </span>
        ) : null}
        {catalogLoaded && catalogItems.length === 0 ? (
          <span className="text-destructive block pt-1">
            Item catalog not loaded — stay signed in and confirm the API is running.
          </span>
        ) : null}
      </p>
      <div
        ref={tableRef}
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
        className="rounded-md border outline-none focus-visible:ring-2 focus-visible:ring-orange-300/40"
      >
        <div className="max-h-[min(640px,calc(100vh-11rem))] min-h-[min(520px,58vh)] overflow-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap">
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
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.index === selectedRowIndex ? "selected" : undefined}
                    className={cn(
                      row.index === selectedRowIndex && "bg-muted/40"
                    )}
                    onClick={() => onSelectRow(row.index)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="p-1">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No detail lines. Click Add row or press Insert.
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
