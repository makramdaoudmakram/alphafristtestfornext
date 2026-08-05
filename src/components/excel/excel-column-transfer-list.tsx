"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GripVertical, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ExcelEntityMetadata, ExcelImportMode } from "@/types/excel";
import { cn } from "@/lib/utils";
import {
  buildAvailableColumns,
  compareColumnNames,
  findProperty,
  isColumnLocked,
  isColumnRemovable,
  isDeleteMode,
  isPrimaryKeyLocked,
  shouldHidePrimaryKeyOnInsert,
  toFriendlyPropertyName,
} from "@/components/excel/excel-column-transfer-utils";

type ExcelColumnTransferListProps = {
  metadata: ExcelEntityMetadata;
  mode: ExcelImportMode;
  selectedColumns: string[];
  onChange: (columns: string[]) => void;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  disabled?: boolean;
};

type FieldRowProps = {
  columnName: string;
  metadata: ExcelEntityMetadata;
  locked: boolean;
  disabled?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  showAdd?: boolean;
  showRemove?: boolean;
  tabIndex?: number;
  onFocus?: () => void;
};

const FieldRow = memo(function FieldRow({
  columnName,
  metadata,
  locked,
  disabled = false,
  onAdd,
  onRemove,
  showAdd = false,
  showRemove = false,
  tabIndex = 0,
  onFocus,
}: FieldRowProps) {
  const property = findProperty(metadata, columnName);
  const friendlyName = toFriendlyPropertyName(columnName);
  const required =
    property?.isRequired &&
    !property.isPrimaryKey &&
    !property.isDatabaseGenerated;

  return (
    <div
      role="listitem"
      tabIndex={tabIndex}
      onFocus={onFocus}
      className={cn(
        "focus-visible:ring-ring flex items-center gap-2 rounded-md border px-2 py-2 text-sm outline-none focus-visible:ring-2",
        locked && "bg-muted/50 border-muted",
        required && !property?.isPrimaryKey && "border-primary/20 bg-primary/5",
        !locked && "hover:bg-muted/40"
      )}
      aria-label={`${columnName}, ${friendlyName}${locked ? ", locked" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" && showAdd && onAdd && !disabled) {
          event.preventDefault();
          onAdd();
        }
        if (
          (event.key === "Delete" || event.key === "Backspace") &&
          showRemove &&
          onRemove &&
          !disabled
        ) {
          event.preventDefault();
          onRemove();
        }
      }}
    >
      {!showAdd ? (
        <GripVertical
          className="text-muted-foreground size-4 shrink-0 opacity-60"
          aria-hidden="true"
          data-drag-handle="true"
        />
      ) : (
        <span className="size-4 shrink-0" aria-hidden="true" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{columnName}</p>
        <p className="text-muted-foreground truncate text-xs">{friendlyName}</p>
      </div>

      {property?.isPrimaryKey ? (
        <span className="text-muted-foreground shrink-0 text-[10px] uppercase tracking-wide">
          Key
        </span>
      ) : null}
      {required ? (
        <span className="text-destructive shrink-0 text-xs" aria-label="Required">
          *
        </span>
      ) : null}

      {showAdd ? (
        <button
          type="button"
          className="text-primary hover:bg-primary/10 inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-40"
          onClick={onAdd}
          disabled={disabled}
          aria-label={`Add ${columnName} to export`}
          title={`Add ${columnName}`}
        >
          <Plus className="size-4" />
        </button>
      ) : null}

      {showRemove ? (
        <button
          type="button"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-40"
          onClick={onRemove}
          disabled={disabled || locked || !onRemove}
          aria-label={
            locked
              ? `${columnName} cannot be removed`
              : `Remove ${columnName} from export`
          }
          title={locked ? "Cannot remove" : `Remove ${columnName}`}
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
    </div>
  );
});

export function ExcelColumnTransferList({
  metadata,
  mode,
  selectedColumns,
  onChange,
  templateName,
  onTemplateNameChange,
  disabled = false,
}: ExcelColumnTransferListProps) {
  const [search, setSearch] = useState("");
  const [focusedAvailable, setFocusedAvailable] = useState(0);
  const [focusedSelected, setFocusedSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const deleteMode = isDeleteMode(mode);

  const availableColumns = useMemo(
    () => buildAvailableColumns(metadata, mode, selectedColumns),
    [metadata, mode, selectedColumns]
  );

  const filteredAvailable = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return availableColumns;

    return availableColumns.filter((columnName) => {
      const friendly = toFriendlyPropertyName(columnName).toLowerCase();
      return (
        columnName.toLowerCase().includes(query) || friendly.includes(query)
      );
    });
  }, [availableColumns, search]);

  useEffect(() => {
    setFocusedAvailable(0);
  }, [search, filteredAvailable.length]);

  useEffect(() => {
    if (focusedSelected >= selectedColumns.length) {
      setFocusedSelected(Math.max(0, selectedColumns.length - 1));
    }
  }, [focusedSelected, selectedColumns.length]);

  const addColumn = useCallback(
    (columnName: string) => {
      if (disabled || deleteMode) return;
      if (
        selectedColumns.some(
          (name) => compareColumnNames(name, columnName) === 0
        )
      ) {
        return;
      }
      onChange([...selectedColumns, columnName]);
    },
    [deleteMode, disabled, onChange, selectedColumns]
  );

  const removeColumn = useCallback(
    (columnName: string) => {
      if (disabled || deleteMode) return;
      if (!isColumnRemovable(metadata, mode, columnName)) return;

      onChange(
        selectedColumns.filter(
          (name) => compareColumnNames(name, columnName) !== 0
        )
      );
    },
    [deleteMode, disabled, metadata, mode, onChange, selectedColumns]
  );

  const modeHint = useMemo(() => {
    if (deleteMode) return "Delete mode uses the primary key only.";
    if (shouldHidePrimaryKeyOnInsert(metadata, mode)) {
      return "Insert mode omits the identity primary key from the template.";
    }
    if (isPrimaryKeyLocked(metadata, mode)) {
      return "Primary key and required fields stay selected and cannot be removed.";
    }
    return "Required fields stay selected. Column order matches the Excel export order.";
  }, [deleteMode, metadata, mode]);

  return (
    <div ref={listRef} className="space-y-3">
      <p className="text-muted-foreground text-xs">{modeHint}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <section
          className="flex min-h-[22rem] flex-col rounded-lg border"
          aria-label="Available fields"
        >
          <div className="border-b px-3 py-2">
            <h3 className="text-sm font-semibold">Available Fields</h3>
          </div>

          <div className="space-y-2 border-b px-3 py-2">
            <Label htmlFor="excel-available-search" className="sr-only">
              Search available fields
            </Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                id="excel-available-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search fields…"
                className="pl-8"
                disabled={disabled || deleteMode}
                aria-controls="excel-available-fields-list"
              />
            </div>
          </div>

          <ScrollArea
            id="excel-available-fields-list"
            className="min-h-0 flex-1 p-2"
            role="list"
            aria-label="Available entity properties"
            onKeyDown={(event) => {
              if (filteredAvailable.length === 0) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setFocusedAvailable((current) =>
                  Math.min(current + 1, filteredAvailable.length - 1)
                );
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setFocusedAvailable((current) => Math.max(current - 1, 0));
              }
            }}
          >
            <div className="space-y-1.5 pr-1">
              {filteredAvailable.length === 0 ? (
                <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                  {availableColumns.length === 0
                    ? "All fields are selected."
                    : "No fields match your search."}
                </p>
              ) : (
                filteredAvailable.map((columnName, index) => (
                  <FieldRow
                    key={columnName}
                    columnName={columnName}
                    metadata={metadata}
                    locked={false}
                    disabled={disabled || deleteMode}
                    showAdd
                    tabIndex={index === focusedAvailable ? 0 : -1}
                    onFocus={() => setFocusedAvailable(index)}
                    onAdd={() => addColumn(columnName)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </section>

        <section
          className="flex min-h-[22rem] flex-col rounded-lg border"
          aria-label="Fields to export"
        >
          <div className="border-b px-3 py-2">
            <h3 className="text-sm font-semibold">Fields to Export</h3>
          </div>

          <div className="space-y-2 border-b px-3 py-2">
            <Label htmlFor="excel-template-name">Template Name</Label>
            <Input
              id="excel-template-name"
              value={templateName}
              onChange={(event) => onTemplateNameChange(event.target.value)}
              placeholder="e.g. Company Basic Export"
              disabled={disabled}
              aria-describedby="excel-template-name-hint"
            />
            <p
              id="excel-template-name-hint"
              className="text-muted-foreground text-xs"
            >
              Saved templates will be available in a later phase.
            </p>
          </div>

          <ScrollArea
            className="min-h-0 flex-1 p-2"
            role="list"
            aria-label="Selected export columns"
            onKeyDown={(event) => {
              if (selectedColumns.length === 0) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setFocusedSelected((current) =>
                  Math.min(current + 1, selectedColumns.length - 1)
                );
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setFocusedSelected((current) => Math.max(current - 1, 0));
              }
            }}
          >
            <div className="space-y-1.5 pr-1">
              {selectedColumns.length === 0 ? (
                <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                  Select at least one field to export.
                </p>
              ) : (
                selectedColumns.map((columnName, index) => {
                  const locked = isColumnLocked(metadata, mode, columnName);
                  return (
                    <FieldRow
                      key={columnName}
                      columnName={columnName}
                      metadata={metadata}
                      locked={locked}
                      disabled={disabled}
                      showRemove
                      tabIndex={index === focusedSelected ? 0 : -1}
                      onFocus={() => setFocusedSelected(index)}
                      onRemove={
                        locked ? undefined : () => removeColumn(columnName)
                      }
                    />
                  );
                })
              )}
            </div>
          </ScrollArea>
        </section>
      </div>
    </div>
  );
}

export {
  buildDefaultSelectedColumns,
  buildDefaultTemplateName,
} from "@/components/excel/excel-column-transfer-utils";
