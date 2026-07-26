"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import {
  patchDetailFromCatalogItem,
  resolveCatalogItemOnEnter,
  searchItemCatalog,
  suggestionPrimaryLabel,
  suggestionSecondaryLabel,
  type ItemCatalogSearchField,
} from "@/lib/item-catalog-search";
import { cn } from "@/lib/utils";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PurchaseDetail } from "@/types/purchase";

type ItemCatalogAutocompleteCellProps = {
  field: ItemCatalogSearchField;
  rowIndex: number;
  dataCol: string;
  value: string;
  catalogItems: ItemCatalogItem[];
  disabled: boolean;
  inputClassName?: string;
  onFocusRow: () => void;
  onChangeRow: (patch: Partial<PurchaseDetail>) => void;
  /** After a catalog row is applied (e.g. focus Qty). */
  onAfterApply?: () => void;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export function ItemCatalogAutocompleteCell({
  field,
  rowIndex,
  dataCol,
  value,
  catalogItems,
  disabled,
  inputClassName,
  onFocusRow,
  onChangeRow,
  onAfterApply,
}: ItemCatalogAutocompleteCellProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);

  const suggestions = useMemo(
    () => searchItemCatalog(catalogItems, field, value),
    [catalogItems, field, value]
  );

  const showList = open && !disabled && suggestions.length > 0;

  const updateMenuPosition = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 2,
      left: rect.left,
      width: Math.max(rect.width, 288),
    });
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [suggestions]);

  useEffect(() => {
    if (!showList || !listRef.current) return;
    const option = listRef.current.querySelector<HTMLElement>(
      `[data-suggestion-index="${highlight}"]`
    );
    option?.scrollIntoView({ block: "nearest" });
  }, [highlight, showList]);

  useLayoutEffect(() => {
    if (!showList) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [showList, updateMenuPosition, suggestions.length, value]);

  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const applyItem = useCallback(
    (item: ItemCatalogItem) => {
      onChangeRow(patchDetailFromCatalogItem(item));
      setOpen(false);
      if (onAfterApply) {
        requestAnimationFrame(() => onAfterApply());
      }
    },
    [onChangeRow, onAfterApply]
  );

  const onInputChange = (text: string) => {
    if (field === "code") onChangeRow({ itmId: text });
    else if (field === "nameAr") onChangeRow({ itmNameAr: text });
    else onChangeRow({ itmNameEn: text });
    setOpen(text.trim().length > 0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const item =
        open && suggestions.length > 0
          ? suggestions[highlight]
          : resolveCatalogItemOnEnter(catalogItems, field, value);
      if (item) applyItem(item);
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const query = value.trim();
      const list = suggestions;
      const canNavigate = open || query.length > 0;
      if (!canNavigate || list.length === 0) return;

      e.preventDefault();
      e.stopPropagation();

      if (!open) {
        setOpen(true);
        setHighlight(e.key === "ArrowUp" ? list.length - 1 : 0);
        return;
      }

      if (e.key === "ArrowDown") {
        setHighlight((i) => Math.min(i + 1, list.length - 1));
      } else {
        setHighlight((i) => Math.max(i - 1, 0));
      }
      return;
    }

    if (e.key === "Escape") {
      if (!open) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };

  const listbox =
    showList && menuPos ? (
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        style={{
          position: "fixed",
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
          zIndex: 9999,
        }}
        className="bg-popover max-h-52 overflow-y-auto rounded-md border py-1 shadow-md"
      >
        {suggestions.map((item, index) => (
          <li
            key={`${item.id}-${item.itmCode}`}
            role="option"
            aria-selected={index === highlight}
            data-suggestion-index={index}
          >
            <button
              type="button"
              className={cn(
                "hover:bg-accent flex w-full flex-col items-start px-2 py-1.5 text-left text-sm",
                index === highlight && "bg-accent"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyItem(item)}
              onMouseEnter={() => setHighlight(index)}
            >
              <span className="font-medium">
                {suggestionPrimaryLabel(item, field)}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {suggestionSecondaryLabel(item, field)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div
      ref={rootRef}
      className="relative min-w-[5.5rem]"
      data-autocomplete-root
      data-autocomplete-open={showList ? "true" : "false"}
    >
      <Input
        data-row={rowIndex}
        data-col={dataCol}
        disabled={disabled}
        value={value}
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        onFocus={() => {
          onFocusRow();
          if (value.trim()) setOpen(true);
        }}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={cn("h-8", formControlFocusClass, inputClassName)}
      />
      {typeof document !== "undefined" && listbox
        ? createPortal(listbox, document.body)
        : null}
    </div>
  );
}
