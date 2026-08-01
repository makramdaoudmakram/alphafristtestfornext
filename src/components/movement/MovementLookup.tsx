"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useMovmentLookup } from "@/hooks/useMovmentLookup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import { cn } from "@/lib/utils";
import type { MovmentLookupItem } from "@/types/movment";

export type MovementLookupProps = {
  /** MovParientId / MovParent — required by each transaction page. */
  parentId: number;
  token: string | null | undefined;
  value: MovmentLookupItem | null;
  onChange: (item: MovmentLookupItem | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
};

function optionLabel(item: MovmentLookupItem): string {
  const name = item.movChiledName?.trim();
  if (name) return name;
  if (item.movChiledId != null) return `#${item.movChiledId}`;
  return `#${item.id}`;
}

/**
 * Generic movement autocomplete for transaction pages.
 * Filters active movements for the given parentId; search is by MovChiledName.
 */
export function MovementLookup({
  parentId,
  token,
  value,
  onChange,
  placeholder = "Select movement...",
  searchPlaceholder = "Search by name...",
  emptyMessage = "No movements found.",
  disabled = false,
  className,
}: MovementLookupProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [highlight, setHighlight] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const { items, loading, error } = useMovmentLookup({
    parentId,
    token,
    search,
    enabled: open && !!token && parentId > 0,
  });

  const selectedLabel = value ? optionLabel(value) : null;

  React.useEffect(() => {
    setHighlight(0);
  }, [items, search]);

  React.useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  React.useEffect(() => {
    if (!open || !listRef.current) return;
    const option = listRef.current.querySelector<HTMLElement>(
      `[data-movement-index="${highlight}"]`
    );
    option?.scrollIntoView({ block: "nearest" });
  }, [highlight, open, items]);

  function selectItem(item: MovmentLookupItem | null) {
    onChange(item);
    setOpen(false);
    setSearch("");
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!items.length) return;
      setHighlight((current) => Math.min(current + 1, items.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!items.length) return;
      setHighlight((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const item = items[highlight];
      if (item) selectItem(item);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setSearch("");
    }
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-expanded={open}
        className={cn(
          "w-full justify-between font-normal",
          formControlFocusClass
        )}
        onClick={() => {
          setOpen((current) => !current);
          if (!open) {
            window.setTimeout(() => searchInputRef.current?.focus(), 0);
          } else {
            setSearch("");
          }
        }}
      >
        <span
          className={cn("truncate", !selectedLabel && "text-muted-foreground")}
        >
          {selectedLabel || placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </Button>

      {open ? (
        <div className="bg-popover absolute z-50 mt-1 w-full rounded-md border shadow-md">
          <div className="border-b p-2">
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              autoFocus
              className={formControlFocusClass}
            />
          </div>
          <div ref={listRef} className="max-h-56 overflow-y-auto p-1">
            <button
              type="button"
              className="hover:bg-accent flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm"
              onClick={() => selectItem(null)}
            >
              <Check
                className={cn(
                  "mr-2 size-4",
                  value ? "opacity-0" : "opacity-100"
                )}
              />
              Clear selection
            </button>

            {loading ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 px-2 py-4 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Loading...
              </div>
            ) : error ? (
              <p className="text-destructive px-2 py-4 text-center text-sm">
                {error}
              </p>
            ) : items.length ? (
              items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  data-movement-index={index}
                  className={cn(
                    "hover:bg-accent flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm",
                    index === highlight && "bg-accent"
                  )}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => selectItem(item)}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value?.id === item.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{optionLabel(item)}</span>
                </button>
              ))
            ) : (
              <p className="text-muted-foreground px-2 py-4 text-center text-sm">
                {emptyMessage}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
