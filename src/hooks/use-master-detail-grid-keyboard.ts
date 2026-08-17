"use client";

import { useCallback, type KeyboardEvent, type RefObject } from "react";

export type UseMasterDetailGridKeyboardOptions = {
  containerRef: RefObject<HTMLElement | null>;
  editableColumns: readonly string[];
  rowCount: number;
  selectedRowIndex: number;
  disabled?: boolean;
  isResizing?: boolean;
  onSelectRow: (index: number) => void;
  onAddRow?: () => void;
  onRemoveRow?: (index: number) => void;
  /** Called after focusing a cell (e.g. select input text). */
  onFocusCell?: (rowIndex: number, columnKey: string) => void;
  /** Map applied column -> next focus column (e.g. item name -> quantity). */
  getFocusColumnAfter?: (
    appliedColumnKey: string,
    visibleEditableColumns: readonly string[]
  ) => string | undefined;
  /** Extend which elements participate in arrow/enter navigation. */
  isGridField?: (target: HTMLElement) => boolean;
  /** Return true to skip default keyboard handling. */
  shouldIgnoreKeyDown?: (target: HTMLElement, event: KeyboardEvent) => boolean;
};

export type UseMasterDetailGridKeyboardResult = {
  handleKeyDown: (event: KeyboardEvent) => void;
  focusCell: (rowIndex: number, columnKey: string) => void;
  focusColumnAfter: (rowIndex: number, appliedColumnKey: string) => void;
};

function defaultIsGridField(target: HTMLElement): boolean {
  return target.tagName === "INPUT" || target.tagName === "BUTTON";
}

function defaultShouldIgnoreKeyDown(target: HTMLElement, event: KeyboardEvent): boolean {
  const autocompleteRoot = target.closest("[data-autocomplete-root]");
  if (autocompleteRoot && event.key === "Enter") {
    return true;
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
      return true;
    }
  }

  return Boolean(target.closest('[data-autocomplete-open="true"]'));
}

export function useMasterDetailGridKeyboard({
  containerRef,
  editableColumns,
  rowCount,
  selectedRowIndex,
  disabled = false,
  isResizing = false,
  onSelectRow,
  onAddRow,
  onRemoveRow,
  onFocusCell,
  getFocusColumnAfter,
  isGridField = defaultIsGridField,
  shouldIgnoreKeyDown = defaultShouldIgnoreKeyDown,
}: UseMasterDetailGridKeyboardOptions): UseMasterDetailGridKeyboardResult {
  const focusCell = useCallback(
    (rowIndex: number, columnKey: string) => {
      const el = containerRef.current?.querySelector<HTMLElement>(
        `[data-row="${rowIndex}"][data-col="${columnKey}"]`
      );
      el?.focus();
      if (el instanceof HTMLInputElement) {
        el.select();
      }
      onFocusCell?.(rowIndex, columnKey);
    },
    [containerRef, onFocusCell]
  );

  const focusColumnAfter = useCallback(
    (rowIndex: number, appliedColumnKey: string) => {
      const next =
        getFocusColumnAfter?.(appliedColumnKey, editableColumns) ??
        editableColumns[editableColumns.indexOf(appliedColumnKey) + 1];

      if (next) {
        focusCell(rowIndex, next);
      }
    },
    [editableColumns, focusCell, getFocusColumnAfter]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled || isResizing) return;

      if (event.key === "Insert" && onAddRow) {
        event.preventDefault();
        onAddRow();
        return;
      }

      if (
        event.key === "Delete" &&
        onRemoveRow &&
        event.target === containerRef.current
      ) {
        event.preventDefault();
        onRemoveRow(selectedRowIndex);
        return;
      }

      const target = event.target as HTMLElement;
      if (shouldIgnoreKeyDown(target, event)) return;
      if (!isGridField(target)) return;

      const rowIndex = Number(target.dataset.row);
      const col = target.dataset.col;
      if (Number.isNaN(rowIndex) || !col) return;

      const colIndex = editableColumns.indexOf(col);
      if (colIndex < 0) return;

      const move = (nextRow: number, nextCol: string) => {
        event.preventDefault();
        onSelectRow(nextRow);
        focusCell(nextRow, nextCol);
      };

      if (event.key === "Enter") {
        const nextCol = editableColumns[colIndex + 1];
        if (nextCol) {
          move(rowIndex, nextCol);
        } else if (rowIndex < rowCount - 1 && editableColumns[0]) {
          move(rowIndex + 1, editableColumns[0]);
        } else if (onAddRow) {
          event.preventDefault();
          onAddRow();
        }
        return;
      }

      if (event.key === "ArrowRight" && colIndex < editableColumns.length - 1) {
        move(rowIndex, editableColumns[colIndex + 1]!);
      } else if (event.key === "ArrowLeft" && colIndex > 0) {
        move(rowIndex, editableColumns[colIndex - 1]!);
      } else if (event.key === "ArrowDown" && rowIndex < rowCount - 1) {
        move(rowIndex + 1, col);
      } else if (event.key === "ArrowUp" && rowIndex > 0) {
        move(rowIndex - 1, col);
      }
    },
    [
      containerRef,
      disabled,
      editableColumns,
      focusCell,
      isGridField,
      isResizing,
      onAddRow,
      onRemoveRow,
      onSelectRow,
      rowCount,
      selectedRowIndex,
      shouldIgnoreKeyDown,
    ]
  );

  return {
    handleKeyDown,
    focusCell,
    focusColumnAfter,
  };
}
