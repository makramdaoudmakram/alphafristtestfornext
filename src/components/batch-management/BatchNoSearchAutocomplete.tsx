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
import { listBatchManagement } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { PharmReciveItemLanguage } from "@/types/pharm-recive";

const LOOKUP_DEBOUNCE_MS = 250;
const SUGGESTION_LIMIT = 15;

export type BatchNoSearchResult = {
  id: number | null;
  itemCatalogId: number;
  itemCode: string;
  itemNameAr: string;
  itemNameEn: string;
  batchNo: string;
  storeId: number;
  storeName: string;
  storeNameAr?: string;
  storeNameEn?: string;
  expDate: string | null;
  salesPrice: number;
  costPrice: number;
  qty: number;
};

function itemLabel(
  row: Pick<BatchNoSearchResult, "itemNameAr" | "itemNameEn">,
  language: PharmReciveItemLanguage
) {
  if (language === "ar") {
    return row.itemNameAr.trim() || row.itemNameEn.trim() || "";
  }
  return row.itemNameEn.trim() || row.itemNameAr.trim() || "";
}

type BatchNoSearchAutocompleteProps = {
  value: string;
  token?: string | null;
  language: PharmReciveItemLanguage;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
  onBatchSelected: (batch: BatchNoSearchResult) => void;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export function BatchNoSearchAutocomplete({
  value,
  token,
  language,
  disabled = false,
  placeholder = "Search Batch No...",
  className,
  onChange,
  onBatchSelected,
}: BatchNoSearchAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [highlight, setHighlight] = useState(0);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [wantList, setWantList] = useState(true);
  const [suggestions, setSuggestions] = useState<BatchNoSearchResult[]>([]);
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

  useLayoutEffect(() => {
    if (!showList) return;
    syncMenuPosition();
  }, [showList, syncMenuPosition, suggestions.length]);

  useEffect(() => {
    if (!showList) return;
    const onWin = () => syncMenuPosition();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [showList, syncMenuPosition]);

  useEffect(() => {
    if (!token || disabled) {
      setSuggestions([]);
      setHasSearched(false);
      return;
    }

    const term = value.trim();
    if (!term) {
      setSuggestions([]);
      setHasSearched(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLookupLoading(true);
      void listBatchManagement(token, { batchNo: term })
        .then((items) => {
          if (controller.signal.aborted) return;
          setSuggestions(items.slice(0, SUGGESTION_LIMIT));
          setHasSearched(true);
          setHighlight(0);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setSuggestions([]);
          setHasSearched(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLookupLoading(false);
        });
    }, LOOKUP_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value, token, disabled]);

  const pick = (batch: BatchNoSearchResult) => {
    onBatchSelected(batch);
    onChange(batch.batchNo);
    setWantList(false);
    setSuggestions([]);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight(
        (current) => (current - 1 + suggestions.length) % suggestions.length
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const batch = suggestions[highlight];
      if (batch) pick(batch);
    } else if (event.key === "Escape") {
      setWantList(false);
    }
  };

  return (
    <>
      <div ref={rootRef} className={cn("relative min-w-0", className)}>
        <Input
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={showList ? listId : undefined}
          aria-expanded={showList}
          onFocus={() => setWantList(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setWantList(true);
          }}
          onKeyDown={onKeyDown}
          className={cn("h-9 w-full min-w-0 font-mono text-sm", formControlFocusClass)}
        />
      </div>
      {showList && menuPos && typeof document !== "undefined"
        ? createPortal(
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              className="bg-popover text-popover-foreground z-50 max-h-60 overflow-auto rounded-md border p-1 shadow-md"
              style={{
                position: "fixed",
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
              }}
            >
              {lookupLoading ? (
                <li className="text-muted-foreground px-2 py-1.5 text-sm">
                  Searching...
                </li>
              ) : suggestions.length === 0 ? (
                <li className="text-muted-foreground px-2 py-1.5 text-sm">
                  No batches found.
                </li>
              ) : (
                suggestions.map((batch, index) => (
                  <li
                    key={`${batch.id ?? "new"}-${batch.batchNo}-${index}`}
                    role="option"
                    aria-selected={index === highlight}
                    className={cn(
                      "cursor-pointer rounded-sm px-2 py-1.5 text-sm",
                      index === highlight && "bg-accent text-accent-foreground"
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => pick(batch)}
                  >
                    <div className="font-mono font-medium">{batch.batchNo}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {itemLabel(batch, language) || batch.itemCode || "—"}
                    </div>
                  </li>
                ))
              )}
            </ul>,
            document.body
          )
        : null}
    </>
  );
}
