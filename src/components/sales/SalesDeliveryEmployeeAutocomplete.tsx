"use client";

/**
 * Delivery employee autocomplete for Sales Payment.
 * Debounced search by code/name + Enter resolves exact code.
 * Selected value displays as "CODE - Name" in the same input (no separate Lookup button).
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
import {
  ApiError,
  resolveSaleDeliveryEmployee,
  searchSaleDeliveryEmployees,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { SalesDeliveryEmployee } from "@/types/sales-delivery";

const LOOKUP_DEBOUNCE_MS = 250;
const TAKE = 20;

export function formatDeliveryEmployeeLabel(
  emp: Pick<SalesDeliveryEmployee, "code" | "name">
): string {
  const code = emp.code?.trim() || "";
  const name = emp.name?.trim() || "";
  if (code && name) return `${code} - ${name}`;
  return code || name || "—";
}

type SalesDeliveryEmployeeAutocompleteProps = {
  value: string;
  token?: string | null;
  disabled?: boolean;
  onQueryChange: (text: string) => void;
  onEmployeeSelected: (employee: SalesDeliveryEmployee) => void;
  onResolveFailed?: (message: string) => void;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export function SalesDeliveryEmployeeAutocomplete({
  value,
  token,
  disabled = false,
  onQueryChange,
  onEmployeeSelected,
  onResolveFailed,
}: SalesDeliveryEmployeeAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [highlight, setHighlight] = useState(0);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [wantList, setWantList] = useState(true);
  const [suggestions, setSuggestions] = useState<SalesDeliveryEmployee[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

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
      width: Math.max(rect.width, 320),
    });
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (!wantList || disabled || !q || !token) {
      setSuggestions([]);
      setLookupLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLookupLoading(true);
      try {
        const rows = await searchSaleDeliveryEmployees(token, q, TAKE);
        if (controller.signal.aborted) return;
        setSuggestions(rows);
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
  }, [value, wantList, disabled, token]);

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

  const applyEmployee = useCallback(
    (employee: SalesDeliveryEmployee) => {
      onEmployeeSelected(employee);
      setWantList(false);
      setSuggestions([]);
    },
    [onEmployeeSelected]
  );

  const resolveExactCode = useCallback(async () => {
    if (!token || resolving) return;
    const code = value.trim();
    if (!code) return;

    setResolving(true);
    setWantList(false);
    try {
      const emp = await resolveSaleDeliveryEmployee(token, code);
      applyEmployee(emp);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Delivery employee not found.";
      onResolveFailed?.(message);
    } finally {
      setResolving(false);
    }
  }, [token, resolving, value, applyEmployee, onResolveFailed]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (showList && suggestions.length > 0) {
        applyEmployee(suggestions[highlight] ?? suggestions[0]);
        return;
      }
      void resolveExactCode();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!hasQuery || suggestions.length === 0) return;
      e.preventDefault();
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
          zIndex: 400,
          pointerEvents: "auto",
        }}
        className="bg-popover max-h-52 overflow-y-auto rounded-md border py-1 shadow-md"
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {lookupLoading && suggestions.length === 0 ? (
          <li className="text-muted-foreground px-2 py-1.5 text-xs">
            Searching…
          </li>
        ) : null}
        {suggestions.map((emp, index) => (
          <li
            key={emp.employInfoId}
            role="option"
            aria-selected={index === highlight}
          >
            <button
              type="button"
              className={cn(
                "hover:bg-accent flex w-full flex-col items-start px-2 py-1.5 text-left text-sm",
                index === highlight && "bg-accent"
              )}
              onPointerDown={(e) => {
                e.preventDefault();
                applyEmployee(emp);
              }}
              onMouseEnter={() => setHighlight(index)}
            >
              <span className="font-medium">{formatDeliveryEmployeeLabel(emp)}</span>
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div ref={rootRef} className="relative min-w-[10rem] flex-1">
      <Input
        disabled={disabled || resolving}
        value={value}
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        autoComplete="off"
        placeholder="Enter Delivery Code / Search by Name"
        onFocus={() => {
          if (value.trim()) setWantList(true);
        }}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setWantList(true);
        }}
        onKeyDown={onKeyDown}
        className={cn("h-9", formControlFocusClass)}
      />
      {typeof document !== "undefined" && listbox
        ? createPortal(listbox, document.body)
        : null}
    </div>
  );
}
