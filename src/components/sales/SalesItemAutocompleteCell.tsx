"use client";

/**
 * Sales row item autocomplete — same UX pattern as
 * `purchase/ItemCatalogAutocompleteCell` (debounced list, portal menu,
 * Enter / arrows / Escape, scanner-friendly Enter resolve).
 *
 * Data source is SalesItemSearch (barcode + stock scopes), not ItemCatalog/lookup,
 * so POS barcode and AvailableQty scopes work.
 */

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
import { searchSalesItems } from "@/lib/api-client";
import {
  resolveSalesSearchType,
  salesItemPrimaryLabel,
  salesItemSecondaryLabel,
} from "@/lib/sales-item-search-ux";
import { cn } from "@/lib/utils";
import type {
  SalesItemSearchHit,
  SalesSearchLanguage,
  SalesStockScope,
} from "@/types/sales-workspace";

const LOOKUP_DEBOUNCE_MS = 250;
const AUTOCOMPLETE_LIMIT = 15;

type SalesItemAutocompleteCellProps = {
  rowIndex: number;
  dataCol?: string;
  value: string;
  token?: string | null;
  language: SalesSearchLanguage;
  stockScope: SalesStockScope;
  disabled: boolean;
  inputClassName?: string;
  onFocusRow: () => void;
  onQueryChange: (text: string) => void;
  onHitSelected: (hit: SalesItemSearchHit) => void;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export function SalesItemAutocompleteCell({
  rowIndex,
  dataCol = "itemName",
  value,
  token,
  language,
  stockScope,
  disabled,
  inputClassName,
  onFocusRow,
  onQueryChange,
  onHitSelected,
}: SalesItemAutocompleteCellProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [highlight, setHighlight] = useState(0);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [wantList, setWantList] = useState(true);
  const [suggestions, setSuggestions] = useState<SalesItemSearchHit[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  const hasQuery = value.trim().length > 0;
  const showList =
    wantList && !disabled && hasQuery && (suggestions.length > 0 || lookupLoading);

  const syncMenuPosition = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 2,
      left: rect.left,
      width: Math.max(rect.width, 420),
    });
  }, []);

  const runSearch = useCallback(
    async (q: string, signal?: AbortSignal) => {
      if (!token) return [] as SalesItemSearchHit[];
      const searchType = resolveSalesSearchType(q);
      const result = await searchSalesItems(token, {
        searchType,
        stockScope,
        search: q,
        take: AUTOCOMPLETE_LIMIT,
      });
      if (signal?.aborted) return [];
      return result.items;
    },
    [token, stockScope]
  );

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
        setSuggestions([]);
        setLookupLoading(false);
        return;
      }
      setLookupLoading(true);
      try {
        const items = await runSearch(q, controller.signal);
        if (controller.signal.aborted) return;
        setSuggestions(items);
      } catch {
        if (controller.signal.aborted) return;
        setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLookupLoading(false);
      }
    }, LOOKUP_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value, wantList, disabled, token, runSearch]);

  useEffect(() => {
    setHighlight(0);
  }, [value, suggestions]);

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

  const applyHit = useCallback(
    (hit: SalesItemSearchHit) => {
      onHitSelected(hit);
      setWantList(false);
      setSuggestions([]);
    },
    [onHitSelected]
  );

  const applyFromPointer = useCallback(
    (hit: SalesItemSearchHit, event: React.SyntheticEvent) => {
      event.preventDefault();
      event.stopPropagation();
      applyHit(hit);
    },
    [applyHit]
  );

  const resolveOnEnter = async () => {
    const q = value.trim();
    if (!q || !token) return;

    if (showList && suggestions.length > 0) {
      applyHit(suggestions[highlight] ?? suggestions[0]);
      return;
    }

    setLookupLoading(true);
    try {
      // Scanner Enter: prefer exact barcode when payload is numeric, else General.
      let items: SalesItemSearchHit[] = [];
      const looksNumeric = /^\d+$/.test(q);
      if (looksNumeric) {
        const barcode = await searchSalesItems(token, {
          searchType: "Barcode",
          stockScope,
          search: q,
          take: AUTOCOMPLETE_LIMIT,
        });
        items = barcode.items;
      }
      if (items.length === 0) {
        const general = await searchSalesItems(token, {
          searchType: "General",
          stockScope,
          search: q,
          take: AUTOCOMPLETE_LIMIT,
        });
        items = general.items;
      }
      if (items.length === 1) {
        applyHit(items[0]);
      } else if (items.length > 1) {
        setSuggestions(items);
        setWantList(true);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setLookupLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      void resolveOnEnter();
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!hasQuery || suggestions.length === 0) return;
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
        data-combobox-panel="true"
        style={{
          position: "fixed",
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
          zIndex: 400,
          pointerEvents: "auto",
        }}
        className="bg-popover pointer-events-auto max-h-52 overflow-y-auto rounded-md border py-1 shadow-md"
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {lookupLoading && suggestions.length === 0 ? (
          <li className="text-muted-foreground px-2 py-1.5 text-xs">
            Searching…
          </li>
        ) : null}
        {suggestions.map((hit, index) => (
          <li
            key={`${hit.itemCatalogId}-${hit.itmCode}-${index}`}
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
              onPointerDown={(e) => applyFromPointer(hit, e)}
              onMouseDown={(e) => applyFromPointer(hit, e)}
              onClick={(e) => applyFromPointer(hit, e)}
              onMouseEnter={() => setHighlight(index)}
            >
              <span className="font-medium">
                {salesItemPrimaryLabel(hit, language)}
              </span>
              <span className="text-muted-foreground whitespace-normal text-xs leading-snug">
                {salesItemSecondaryLabel(hit, stockScope)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div
      ref={rootRef}
      className="relative min-w-[8rem]"
      data-autocomplete-root
      data-combobox-root="true"
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
        placeholder="Scan / code / name…"
        onFocus={() => {
          onFocusRow();
          if (value.trim()) setWantList(true);
        }}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setWantList(true);
        }}
        onKeyDown={onKeyDown}
        className={cn("h-8", formControlFocusClass, inputClassName)}
      />
      {typeof document !== "undefined" && listbox
        ? createPortal(listbox, document.body)
        : null}
    </div>
  );
}
