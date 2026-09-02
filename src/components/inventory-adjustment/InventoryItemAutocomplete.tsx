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
import { lookupItemCatalogBySegment } from "@/lib/api-client";
import {
  ITEM_AUTOCOMPLETE_LIMIT,
  suggestionPrimaryLabel,
  suggestionSecondaryLabel,
  type ItemCatalogSearchField,
} from "@/lib/item-catalog-search";
import { cn } from "@/lib/utils";
import type { ItemCatalogItem } from "@/types/item-catalog";

const LOOKUP_DEBOUNCE_MS = 250;

type InventoryItemAutocompleteProps = {
  field: ItemCatalogSearchField;
  value: string;
  token?: string | null;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
  onItemSelected: (item: ItemCatalogItem) => void;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export function InventoryItemAutocomplete({
  field,
  value,
  token,
  disabled = false,
  placeholder = "Search item name… (use two spaces between terms)",
  className,
  onChange,
  onItemSelected,
}: InventoryItemAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [highlight, setHighlight] = useState(0);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [wantList, setWantList] = useState(true);
  const [suggestions, setSuggestions] = useState<ItemCatalogItem[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const showList =
    wantList &&
    !disabled &&
    value.trim().length > 0 &&
    (lookupLoading || hasSearched || !token);

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

  const fetchSuggestions = useCallback(
    async (query: string, signal?: AbortSignal) => {
      if (!token) {
        setSuggestions([]);
        setLookupLoading(false);
        setHasSearched(false);
        return;
      }

      setLookupLoading(true);
      try {
        const items = await lookupItemCatalogBySegment(token, query, field, {
          take: ITEM_AUTOCOMPLETE_LIMIT,
          signal,
        });
        if (signal?.aborted) return;
        setSuggestions(items);
        setHasSearched(true);
      } catch {
        if (signal?.aborted) return;
        setSuggestions([]);
        setHasSearched(true);
      } finally {
        if (!signal?.aborted) setLookupLoading(false);
      }
    },
    [field, token]
  );

  useEffect(() => {
    const q = value.trim();
    if (!wantList || disabled || !q || !token) {
      setSuggestions([]);
      setLookupLoading(false);
      setHasSearched(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchSuggestions(q, controller.signal);
    }, LOOKUP_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, fetchSuggestions, token, value, wantList]);

  useEffect(() => {
    setHighlight(0);
  }, [suggestions, value, field]);

  useLayoutEffect(() => {
    if (!showList) {
      setMenuPos(null);
      return;
    }
    syncMenuPosition();
    window.addEventListener("scroll", syncMenuPosition, true);
    window.addEventListener("resize", syncMenuPosition);
    return () => {
      window.removeEventListener("scroll", syncMenuPosition, true);
      window.removeEventListener("resize", syncMenuPosition);
    };
  }, [showList, syncMenuPosition, value, suggestions.length, lookupLoading, hasSearched]);

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
      onItemSelected(item);
      onChange("");
      setWantList(false);
    },
    [onChange, onItemSelected]
  );

  const applyItemFromPointer = useCallback(
    (item: ItemCatalogItem, event: React.SyntheticEvent) => {
      event.preventDefault();
      event.stopPropagation();
      applyItem(item);
    },
    [applyItem]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (showList && suggestions.length > 0) {
        applyItem(suggestions[highlight]);
        return;
      }
      if (token && value.trim()) {
        void lookupItemCatalogBySegment(token, value.trim(), field, {
          take: ITEM_AUTOCOMPLETE_LIMIT,
        }).then((items) => {
          if (items.length > 0) applyItem(items[0]!);
        });
      }
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
        {!token ? (
          <li className="text-muted-foreground px-2 py-1.5 text-xs">
            Sign in to search items
          </li>
        ) : null}
        {token && lookupLoading && suggestions.length === 0 ? (
          <li className="text-muted-foreground px-2 py-1.5 text-xs">Searching…</li>
        ) : null}
        {token && !lookupLoading && hasSearched && suggestions.length === 0 ? (
          <li className="text-muted-foreground px-2 py-1.5 text-xs">No results found</li>
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
      className={cn("relative min-w-[12rem]", className)}
      data-autocomplete-root
      data-combobox-root="true"
      data-autocomplete-open={showList ? "true" : "false"}
    >
      <Input
        disabled={disabled}
        readOnly={false}
        value={value}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        aria-busy={lookupLoading || undefined}
        autoComplete="off"
        onFocus={() => {
          setWantList(true);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setWantList(true);
        }}
        onKeyDown={onKeyDown}
        className={cn(
          "h-9 bg-yellow-100 focus-visible:bg-yellow-100 dark:bg-yellow-100/90",
          formControlFocusClass
        )}
      />
      {typeof document !== "undefined" && listbox
        ? createPortal(listbox, document.body)
        : null}
    </div>
  );
}
