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
import { lookupItemCatalog, lookupItemCatalogBySegment } from "@/lib/api-client";
import {
  ITEM_AUTOCOMPLETE_LIMIT,
  hasSearchableCatalogQuery,
  patchDetailFromCatalogItem,
  resolveCatalogItemOnEnter,
  searchItemCatalog,
  searchItemCatalogWithDoubleSpaceWildcard,
  suggestionPrimaryLabel,
  suggestionSecondaryLabel,
  type ItemCatalogSearchField,
} from "@/lib/item-catalog-search";
import { resolveCatalogItemByCode } from "@/lib/item-unit-options";
import { cn } from "@/lib/utils";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PurchaseDetail, PurchaseDetailPatch } from "@/types/purchase";

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
  onChangeRow: (patch: PurchaseDetailPatch) => void;
  onAfterApply?: () => void;
  onItemApplied?: (item: ItemCatalogItem) => void;
  /** Pharmacy Purchase: two consecutive spaces → '%' via lookup-segment. */
  useDoubleSpaceWildcard?: boolean;
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
  onItemApplied,
  useDoubleSpaceWildcard = false,
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

  const hasQuery = useDoubleSpaceWildcard
    ? hasSearchableCatalogQuery(value)
    : value.trim().length > 0;

  const showList =
    wantList &&
    !disabled &&
    hasQuery &&
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
    const q = useDoubleSpaceWildcard ? value : value.trim();
    const canSearch = useDoubleSpaceWildcard
      ? hasSearchableCatalogQuery(value)
      : q.length > 0;
    if (!wantList || disabled || !canSearch) {
      setSuggestions([]);
      setLookupLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (!token) {
        setSuggestions(
          useDoubleSpaceWildcard
            ? searchItemCatalogWithDoubleSpaceWildcard(
                catalogItems,
                field,
                q,
                ITEM_AUTOCOMPLETE_LIMIT
              )
            : searchItemCatalog(catalogItems, field, q, ITEM_AUTOCOMPLETE_LIMIT)
        );
        setLookupLoading(false);
        return;
      }

      setLookupLoading(true);
      try {
        const results = useDoubleSpaceWildcard
          ? await lookupItemCatalogBySegment(token, q, field, {
              take: ITEM_AUTOCOMPLETE_LIMIT,
              signal: controller.signal,
              doubleSpaceWildcard: true,
            })
          : await lookupItemCatalog(token, q, {
              take: ITEM_AUTOCOMPLETE_LIMIT,
              signal: controller.signal,
            });
        if (controller.signal.aborted) return;
        setSuggestions(results);
      } catch {
        if (controller.signal.aborted) return;
        setSuggestions(
          useDoubleSpaceWildcard
            ? searchItemCatalogWithDoubleSpaceWildcard(
                catalogItems,
                field,
                q,
                ITEM_AUTOCOMPLETE_LIMIT
              )
            : searchItemCatalog(catalogItems, field, q, ITEM_AUTOCOMPLETE_LIMIT)
        );
      } finally {
        if (!controller.signal.aborted) setLookupLoading(false);
      }
    }, LOOKUP_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    value,
    field,
    token,
    wantList,
    disabled,
    catalogItems,
    useDoubleSpaceWildcard,
  ]);

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
      if (
        target instanceof Element &&
        target.closest("[data-suggestion-index] button")
      ) {
        return;
      }
      setWantList(false);
    }
    document.addEventListener("mousedown", onDocDown, true);
    return () => document.removeEventListener("mousedown", onDocDown, true);
  }, [showList]);

  // Radix Dialog marks portaled siblings as inert; clicks never reach the list.
  useEffect(() => {
    if (!showList) return;
    const node = listRef.current;
    if (!node) return;

    const unlock = () => {
      node.inert = false;
      node.removeAttribute("inert");
      node.setAttribute("aria-hidden", "false");
      node.style.pointerEvents = "none";
    };

    unlock();
    const observer = new MutationObserver(unlock);
    observer.observe(node, {
      attributes: true,
      attributeFilter: ["inert", "aria-hidden"],
    });
    return () => observer.disconnect();
  }, [showList, suggestions.length, lookupLoading]);

  useEffect(() => {
    if (!showList || !listRef.current) return;
    const option = listRef.current.querySelector<HTMLElement>(
      `[data-suggestion-index="${highlight}"]`
    );
    option?.scrollIntoView({ block: "nearest" });
  }, [highlight, showList]);

  const applyItem = useCallback(
    (item: ItemCatalogItem) => {
      onItemApplied?.(item);
      onChangeRow(patchDetailFromCatalogItem(item));
      setWantList(false);
      if (onAfterApply) {
        requestAnimationFrame(() => onAfterApply());
      }
    },
    [onChangeRow, onAfterApply, onItemApplied]
  );

  const applyItemFromPointer = useCallback(
    (item: ItemCatalogItem, event: React.SyntheticEvent) => {
      event.preventDefault();
      event.stopPropagation();
      applyItem(item);
    },
    [applyItem]
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
      if (showList && suggestions.length > 0) {
        const selected = suggestions[highlight];
        if (selected) applyItem(selected);
        return;
      }

      const query = useDoubleSpaceWildcard ? value : value.trim();
      if (!query) return;

      if (!token) {
        const item = useDoubleSpaceWildcard
          ? searchItemCatalogWithDoubleSpaceWildcard(
              catalogItems,
              field,
              query,
              1
            )[0] ?? null
          : resolveCatalogItemOnEnter(catalogItems, field, query);
        if (item) applyItem(item);
        return;
      }

      void (async () => {
        const map = new Map<string, ItemCatalogItem>();
        for (const row of catalogItems) {
          const code = row.itmCode?.trim().toLowerCase();
          if (code) map.set(code, row);
        }

        if (field === "code") {
          const item = await resolveCatalogItemByCode(
            token,
            query,
            map,
            catalogItems
          );
          if (item) applyItem(item);
          return;
        }

        const results = useDoubleSpaceWildcard
          ? await lookupItemCatalogBySegment(token, query, field, {
              take: ITEM_AUTOCOMPLETE_LIMIT,
              doubleSpaceWildcard: true,
            })
          : await lookupItemCatalog(token, query, {
              take: ITEM_AUTOCOMPLETE_LIMIT,
            });
        const item = resolveCatalogItemOnEnter(results, field, query);
        if (item) applyItem(item);
      })();
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
          pointerEvents: "none",
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
                "pointer-events-auto hover:bg-accent flex w-full flex-col items-start px-2 py-1.5 text-left text-sm",
                index === highlight && "bg-accent"
              )}
              onPointerDown={(e) => applyItemFromPointer(item, e)}
              onMouseDown={(e) => applyItemFromPointer(item, e)}
              onClick={(e) => applyItemFromPointer(item, e)}
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
        onFocus={() => {
          onFocusRow();
          if (useDoubleSpaceWildcard ? hasSearchableCatalogQuery(value) : value.trim()) {
            setWantList(true);
          }
        }}
        onChange={(e) => onInputChange(e.target.value)}
        onBlur={() => {
          window.setTimeout(() => {
            const active = document.activeElement;
            if (listRef.current?.contains(active)) return;
            if (rootRef.current?.contains(active)) return;
            setWantList(false);
          }, 0);
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
