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
import { searchReturnItemsWithStock } from "@/lib/api-client";
import {
  formatReturnItemStockSearchLabel,
  getReturnItemStockSearchDisplayParts,
  RETURN_ITEM_STOCK_SEARCH_DEBOUNCE_MS,
  RETURN_ITEM_STOCK_SEARCH_LIMIT,
} from "@/lib/return-item-stock-search";
import { cn } from "@/lib/utils";
import type { ReturnItemStockSearchItem } from "@/types/stock";

type ReturnItemStockSearchBoxProps = {
  id?: string;
  token?: string | null;
  /** Store id from the selected Movement (MovStor). */
  storeId?: string;
  disabled?: boolean;
  className?: string;
  /** Called when the user picks a search result (Phase 3 — add to detail grid). */
  onItemSelected?: (item: ReturnItemStockSearchItem) => void;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export function ReturnItemStockSearchBox({
  id = "return-item-stock-search",
  token,
  storeId,
  disabled = false,
  className,
  onItemSelected,
}: ReturnItemStockSearchBoxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [wantList, setWantList] = useState(true);
  const [results, setResults] = useState<ReturnItemStockSearchItem[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  const storeReady = Boolean(storeId?.trim());
  const inputDisabled = disabled || !storeReady;

  const showList =
    wantList &&
    !inputDisabled &&
    query.trim().length > 0 &&
    (results.length > 0 || lookupLoading);

  const syncMenuPosition = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 2,
      left: rect.left,
          width: Math.max(rect.width, 800),
    });
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!wantList || inputDisabled || !q || !token || !storeId?.trim()) {
      setResults([]);
      setLookupLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLookupLoading(true);
      try {
        const rows = await searchReturnItemsWithStock(token, q, storeId, {
          take: RETURN_ITEM_STOCK_SEARCH_LIMIT,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setResults(rows);
      } catch {
        if (controller.signal.aborted) return;
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLookupLoading(false);
      }
    }, RETURN_ITEM_STOCK_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, token, storeId, wantList, inputDisabled]);

  useEffect(() => {
    setHighlight(0);
  }, [query, results]);

  useLayoutEffect(() => {
    if (!showList) return;
    syncMenuPosition();
    window.addEventListener("scroll", syncMenuPosition, true);
    window.addEventListener("resize", syncMenuPosition);
    return () => {
      window.removeEventListener("scroll", syncMenuPosition, true);
      window.removeEventListener("resize", syncMenuPosition);
    };
  }, [showList, syncMenuPosition, query, results.length, lookupLoading]);

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
    if (!showList) return;
    const node = listRef.current;
    if (!node) return;

    const unlock = () => {
      node.inert = false;
      node.removeAttribute("inert");
      node.setAttribute("aria-hidden", "false");
      node.style.pointerEvents = "auto";
    };

    unlock();
    const observer = new MutationObserver(unlock);
    observer.observe(node, {
      attributes: true,
      attributeFilter: ["inert", "aria-hidden"],
    });
    return () => observer.disconnect();
  }, [showList, results.length, lookupLoading]);

  useEffect(() => {
    if (!showList || !listRef.current) return;
    const option = listRef.current.querySelector<HTMLElement>(
      `[data-suggestion-index="${highlight}"]`
    );
    option?.scrollIntoView({ block: "nearest" });
  }, [highlight, showList]);

  const applyResult = useCallback(
    (item: ReturnItemStockSearchItem) => {
      onItemSelected?.(item);
      setQuery("");
      setWantList(false);
    },
    [onItemSelected]
  );

  const applyResultFromPointer = useCallback(
    (item: ReturnItemStockSearchItem, event: React.SyntheticEvent) => {
      event.preventDefault();
      event.stopPropagation();
      applyResult(item);
    },
    [applyResult]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (showList && results.length > 0) {
        applyResult(results[highlight]);
      }
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!query.trim() || results.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      setWantList(true);
      if (e.key === "ArrowDown") {
        setHighlight((i) => Math.min(i + 1, results.length - 1));
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
          maxWidth: "min(1000px, 96vw)",
          zIndex: 400,
          pointerEvents: "auto",
        }}
        className="bg-popover pointer-events-auto max-h-52 overflow-y-auto overflow-x-auto rounded-md border py-1 shadow-md"
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {lookupLoading && results.length === 0 ? (
          <li className="text-muted-foreground px-2 py-1.5 text-xs">
            Searching…
          </li>
        ) : null}
        {results.map((item, index) => {
          const { itemName, expDate, totalQuantity, salesPrice } =
            getReturnItemStockSearchDisplayParts(item);
          return (
          <li
            key={`${item.itemCatalogId}-${item.batchNo}-${item.expDate ?? ""}-${item.salesPrice}-${index}`}
            role="option"
            aria-selected={index === highlight}
            aria-label={formatReturnItemStockSearchLabel(item)}
            data-suggestion-index={index}
          >
            <button
              type="button"
              className={cn(
                "hover:bg-accent flex w-full min-w-[760px] items-center gap-3 px-3 py-1.5 text-left text-sm",
                index === highlight && "bg-accent"
              )}
              onPointerDown={(e) => applyResultFromPointer(item, e)}
              onMouseDown={(e) => applyResultFromPointer(item, e)}
              onClick={(e) => applyResultFromPointer(item, e)}
              onMouseEnter={() => setHighlight(index)}
            >
              <span className="min-w-0 flex-1 truncate" title={itemName}>
                {itemName}
              </span>
              <span
                className="text-muted-foreground shrink-0 tabular-nums"
                aria-hidden
              >
                /
              </span>
              <span
                className="w-24 shrink-0 text-end font-medium tabular-nums"
                title="Expiry date"
              >
                {expDate}
              </span>
              <span
                className="text-muted-foreground shrink-0 tabular-nums"
                aria-hidden
              >
                /
              </span>
              <span
                className="w-16 shrink-0 text-end font-medium tabular-nums"
                title="Total quantity"
              >
                {totalQuantity}
              </span>
              <span
                className="text-muted-foreground shrink-0 tabular-nums"
                aria-hidden
              >
                /
              </span>
              <span
                className="w-20 shrink-0 text-end font-medium tabular-nums"
                title="Sales price"
              >
                {salesPrice}
              </span>
            </button>
          </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <Input
        id={id}
        type="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        disabled={inputDisabled}
        value={query}
        placeholder={
          storeReady
            ? "Search item — Name / Exp Date / Qty / Sales Price"
            : "Select a movement first"
        }
        className={formControlFocusClass}
        onChange={(e) => {
          setQuery(e.target.value);
          setWantList(true);
        }}
        onFocus={() => setWantList(true)}
        onKeyDown={onKeyDown}
      />
      {listbox ? createPortal(listbox, document.body) : null}
    </div>
  );
}
