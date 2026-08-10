"use client";

import { useMemo, useState } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { filterColumnsBySearch } from "@/lib/grid-preferences";
import { cn } from "@/lib/utils";
import type { GridColumnDefinition } from "@/types/grid-column";

type ColumnVisibilityMenuProps = {
  columns: readonly GridColumnDefinition[];
  isColumnVisible: (columnKey: string) => boolean;
  setColumnVisible: (columnKey: string, visible: boolean) => void;
  showAllColumns: () => void;
  clearOptionalColumns: () => void;
  className?: string;
};

export function ColumnVisibilityMenu({
  columns,
  isColumnVisible,
  setColumnVisible,
  showAllColumns,
  clearOptionalColumns,
  className,
}: ColumnVisibilityMenuProps) {
  const [search, setSearch] = useState("");

  const filteredColumns = useMemo(
    () => filterColumnsBySearch(columns, search),
    [columns, search]
  );

  const optionalColumns = useMemo(
    () => columns.filter((column) => !column.required),
    [columns]
  );

  const allOptionalVisible =
    optionalColumns.length > 0 &&
    optionalColumns.every((column) => isColumnVisible(column.key));

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setSearch("");
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-8 shrink-0", className)}
          aria-label="Show or hide columns"
          title="Columns"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 p-0"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div
          className="space-y-2 p-3"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search column..."
            className="h-8"
            aria-label="Search columns"
          />

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={allOptionalVisible}
                onChange={(event) => {
                  if (event.target.checked) showAllColumns();
                  else clearOptionalColumns();
                }}
              />
              Select All
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={clearOptionalColumns}
            >
              Clear All
            </Button>
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto border-t pt-2">
            {filteredColumns.length === 0 ? (
              <p className="text-muted-foreground px-1 py-2 text-xs">
                No columns match your search.
              </p>
            ) : (
              filteredColumns.map((column) => {
                const checked = isColumnVisible(column.key);
                const disabled = Boolean(column.required);

                return (
                  <label
                    key={column.key}
                    className={cn(
                      "flex items-center gap-2 rounded-sm px-1 py-1.5 text-sm",
                      disabled ? "cursor-not-allowed opacity-70" : "hover:bg-muted/60 cursor-pointer"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onChange={(event) =>
                        setColumnVisible(column.key, event.target.checked)
                      }
                    />
                    <span className="truncate">{column.title}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
