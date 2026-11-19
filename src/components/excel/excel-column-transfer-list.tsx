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
  ITEM_CATALOG_COLUMN_GROUPS,
  itemCatalogColumnSortKey,
} from "@/lib/excel-item-catalog-column-groups";
import {
  buildAvailableColumns,
  buildDisplaySelectedColumns,
  compareColumnNames,
  countOptionalSelectedColumns,
  dedupeColumnNames,
  findProperty,
  getLockedMatchKeyColumns,
  isColumnLocked,
  isHiddenForUpdateTemplate,
  isColumnRemovable,
  isDeleteMode,
  isMatchKeyColumn,
  isPrimaryKeyLocked,
  shouldHidePrimaryKeyOnInsert,
  toFriendlyPropertyName,
  usesAlternateKeyForUpdate,
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

  const displaySelectedColumns = useMemo(
    () => buildDisplaySelectedColumns(metadata, mode, selectedColumns),
    [metadata, mode, selectedColumns]
  );

  useEffect(() => {
    if (focusedSelected >= displaySelectedColumns.length) {
      setFocusedSelected(Math.max(0, displaySelectedColumns.length - 1));
    }
  }, [focusedSelected, displaySelectedColumns.length]);

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
      if (isMatchKeyColumn(metadata, mode, columnName)) return;
      if (isHiddenForUpdateTemplate(metadata, mode, columnName)) return;
      onChange(dedupeColumnNames([...selectedColumns, columnName]));
    },
    [deleteMode, disabled, metadata, mode, onChange, selectedColumns]
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

  const matchKeys = useMemo(
    () => getLockedMatchKeyColumns(metadata, mode),
    [metadata, mode]
  );

  const optionalSelectedCount = useMemo(
    () => countOptionalSelectedColumns(metadata, mode, selectedColumns),
    [metadata, mode, selectedColumns]
  );

  const useGroupedPicker =
    metadata.entityName === "ItemCatalog" && !deleteMode;

  const groupedAvailable = useMemo(() => {
    if (!useGroupedPicker) {
      return [{ id: "all", label: "All Fields", columns: filteredAvailable }];
    }

    const assigned = new Set<string>();
    const groups = ITEM_CATALOG_COLUMN_GROUPS.map((group) => {
      const columns = group.columns
        .filter((name) =>
          filteredAvailable.some(
            (available) => compareColumnNames(available, name) === 0
          )
        )
        .sort((a, b) => itemCatalogColumnSortKey(a) - itemCatalogColumnSortKey(b));
      columns.forEach((name) => assigned.add(name.toLowerCase()));
      return { id: group.id, label: group.label, columns };
    }).filter((group) => group.columns.length > 0);

    const other = filteredAvailable
      .filter((name) => !assigned.has(name.toLowerCase()))
      .sort((a, b) => itemCatalogColumnSortKey(a) - itemCatalogColumnSortKey(b));

    if (other.length > 0) {
      groups.push({ id: "other", label: "Other Fields", columns: other });
    }

    return groups;
  }, [filteredAvailable, useGroupedPicker]);

  const flatGroupedAvailable = useMemo(
    () => dedupeColumnNames(groupedAvailable.flatMap((group) => group.columns)),
    [groupedAvailable]
  );

  const selectAllAvailable = useCallback(() => {
    if (disabled || deleteMode) return;
    const next = new Set(selectedColumns.map((name) => name.toLowerCase()));
    for (const name of availableColumns) {
      next.add(name.toLowerCase());
    }
    const locked = new Set(
      getLockedMatchKeyColumns(metadata, mode).map((name) => name.toLowerCase())
    );
    const merged = availableColumns.filter((name) => next.has(name.toLowerCase()));
    const extras = selectedColumns.filter(
      (name) =>
        !locked.has(name.toLowerCase()) &&
        !availableColumns.some(
          (available) => compareColumnNames(available, name) === 0
        )
    );
    onChange(dedupeColumnNames([...extras, ...merged]));
  }, [availableColumns, deleteMode, disabled, metadata, mode, onChange, selectedColumns]);

  const clearOptionalSelected = useCallback(() => {
    if (disabled || deleteMode) return;
    onChange([]);
  }, [deleteMode, disabled, onChange]);

  const modeHint = useMemo(() => {
    if (deleteMode) return "Delete mode uses the primary key only.";
    if (shouldHidePrimaryKeyOnInsert(metadata, mode)) {
      return "Insert mode omits the identity primary key from the template.";
    }
    if (usesAlternateKeyForUpdate(metadata) && mode === "Update") {
      return "Itm_Code is always included as the matching key (not an update field). Choose only the columns you want to change.";
    }
    if (isPrimaryKeyLocked(metadata, mode)) {
      return "Primary key and required fields stay selected and cannot be removed.";
    }
    return "Required fields stay selected. Column order matches the Excel export order.";
  }, [deleteMode, metadata, mode]);

  return (
    <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-muted-foreground shrink-0 text-xs">{modeHint}</p>

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
        <section
          className="flex max-h-[min(50vh,22rem)] min-h-[12rem] flex-col rounded-lg border md:max-h-[min(48vh,20rem)]"
          aria-label="Available fields"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
            <h3 className="text-sm font-semibold">Available Fields</h3>
            {!deleteMode ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  className="text-primary text-xs font-medium hover:underline disabled:opacity-40"
                  onClick={selectAllAvailable}
                  disabled={disabled || availableColumns.length === 0}
                >
                  Select all
                </button>
                <span className="text-muted-foreground text-xs" aria-hidden>
                  ·
                </span>
                <button
                  type="button"
                  className="text-muted-foreground text-xs font-medium hover:underline disabled:opacity-40"
                  onClick={clearOptionalSelected}
                  disabled={disabled || optionalSelectedCount === 0}
                >
                  Clear all
                </button>
              </div>
            ) : null}
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
            <div className="space-y-3 pr-1">
              {filteredAvailable.length === 0 ? (
                <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                  {availableColumns.length === 0
                    ? "All fields are selected."
                    : "No fields match your search."}
                </p>
              ) : (
                groupedAvailable.map((group) => (
                  <div key={group.id}>
                    {useGroupedPicker ? (
                      <p className="text-muted-foreground mb-1 px-1 text-[11px] font-semibold tracking-wide uppercase">
                        {group.label}
                      </p>
                    ) : null}
                    <div className="space-y-1.5">
                      {group.columns.map((columnName) => {
                        const index = flatGroupedAvailable.indexOf(columnName);
                        return (
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
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </section>

        <section
          className="flex max-h-[min(50vh,22rem)] min-h-[12rem] flex-col rounded-lg border md:max-h-[min(48vh,20rem)]"
          aria-label="Fields to export"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
            <h3 className="text-sm font-semibold">Fields to Export</h3>
            <span className="text-muted-foreground text-xs">
              {optionalSelectedCount} update column
              {optionalSelectedCount === 1 ? "" : "s"}
              {matchKeys.length > 0 ? ` · match: ${matchKeys.join(", ")}` : ""}
            </span>
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
              if (displaySelectedColumns.length === 0) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setFocusedSelected((current) =>
                  Math.min(current + 1, displaySelectedColumns.length - 1)
                );
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setFocusedSelected((current) => Math.max(current - 1, 0));
              }
            }}
          >
            <div className="space-y-1.5 pr-1">
              {displaySelectedColumns.length === 0 ? (
                <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                  Match key only — add update columns from the left.
                </p>
              ) : (
                displaySelectedColumns.map((columnName, index) => {
                  const locked =
                    isColumnLocked(metadata, mode, columnName) ||
                    isMatchKeyColumn(metadata, mode, columnName);
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
