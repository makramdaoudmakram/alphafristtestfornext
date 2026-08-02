"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import { lookupItemCatalog } from "@/lib/api-client";
import {
  ITEM_AUTOCOMPLETE_LIMIT,
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

const LOOKUP_DEBOUNCE_MS = 250;

type ItemCatalogAutocompleteCellProps = {
  field: ItemCatalogSearchField;
  rowIndex: number;
  dataCol: string;
  value: string;
  /** Auth token — when set, suggestions come from GET /ItemCatalog/lookup (full table). */
  token?: string | null;
  /** Local catalog fallback (Enter resolve / offline) — not the primary search source. */
  catalogItems: ItemCatalogItem[];
  disabled: boolean;
  inputClassName?: string;
  onFocusRow: () => void;
  onChangeRow: (patch: Partial<PurchaseDetail>) => void;
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
  token,
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
  const [highlight, setHighlight] = useState(0);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  /** False after picking an item or pressing Escape; true again on typing. */
  const [wantList, setWantList] = useState(true);
  const [suggestions, setSuggestions] = useState<ItemCatalogItem[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  const showList =
    wantList &&
    !disabled &&
    value.trim().length > 0 &&
    (suggestions.length > 0 || lookupLoading);

  const syncMenuPosition = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 2,
      left: rect.left,
      width: Math.max(rect.width, 288),
    });
  }, []);

  // Server-side full-table lookup (debounced). Falls back to in-memory filter if offline.
  useEffect(() => {
    const q = value.trim();
    if (!wantList || disabled || !q) {
      setSuggestions([]);
      setLookupLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (!token) {
        setSuggestions(
          searchItemCatalog(catalogItems, field, q, ITEM_AUTOCOMPLETE_LIMIT)
        );
        setLookupLoading(false);
        return;
      }

      setLookupLoading(true);
      try {
        const results = await lookupItemCatalog(token, q, {
          take: ITEM_AUTOCOMPLETE_LIMIT,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setSuggestions(results);
      } catch {
        if (controller.signal.aborted) return;
        // Network/API failure — best-effort local contains search
        setSuggestions(
          searchItemCatalog(catalogItems, field, q, ITEM_AUTOCOMPLETE_LIMIT)
        );
      } finally {
        if (!controller.signal.aborted) setLookupLoading(false);
      }
    }, LOOKUP_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value, field, token, wantList, disabled, catalogItems]);

  useEffect(() => {
    setHighlight(0);
  }, [value, field, suggestions]);

  useLayoutEffect(() => {
    if (!showList) return;
    syncMenuPosition();
    window.addEventListener("scroll", syncMenuPosition, true);
    window.addEventListener("resize", syncMenuPosition);
    return () => {
      window.removeEventListener("scroll", syncMenuPosition, true);
      window.removeEventListener("resize", syncMenuPosition);
    };
  }, [showList, syncMenuPosition, value, suggestions.length, lookupLoading]);

  useEffect(() => {
    if (!showList) return;
    function onDocDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setWantList(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [showList]);

  useEffect(() => {
    if (!showList || !listRef.current) return;
    const option = listRef.current.querySelector<HTMLElement>(
      `[data-suggestion-index="${highlight}"]`
    );
    option?.scrollIntoView({ block: "nearest" });
  }, [highlight, showList]);

  const applyItem = useCallback(
    (item: ItemCatalogItem) => {
      onChangeRow(patchDetailFromCatalogItem(item));
      setWantList(false);
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
    setWantList(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const item =
        showList && suggestions.length > 0
          ? suggestions[highlight]
          : resolveCatalogItemOnEnter(
              suggestions.length > 0 ? suggestions : catalogItems,
              field,
              value
            );
      if (item) applyItem(item);
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!value.trim() || suggestions.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      setWantList(true);
      if (e.key === "ArrowDown") {
        setHighlight((i) => Math.min(i + 1, suggestions.length - 1));
      } else {
        setHighlight((i) => Math.max(i - 1, 0));
      }
      return;
    }

    if (e.key === "Escape" && showList) {
      e.preventDefault();
      e.stopPropagation();
      setWantList(false);
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
        {lookupLoading && suggestions.length === 0 ? (
          <li className="text-muted-foreground px-2 py-1.5 text-xs">
            Searching…
          </li>
        ) : null}
        {suggestions.map((item, index) => (
          <li
            key={`${item.id}-${item.itmCode ?? index}`}
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
        aria-busy={lookupLoading || undefined}
        autoComplete="off"
        onFocus={() => {
          onFocusRow();
          if (value.trim()) setWantList(true);
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
