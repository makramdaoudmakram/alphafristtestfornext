"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import type { DiagnosticsLookupEntry } from "@/lib/diagnostics/diagnostics-types";
import { formatLookupLabel } from "@/lib/diagnostics/diagnostics-picker-utils";
import { useDebouncedDiagnosticsLookup } from "@/components/diagnostics/useDebouncedDiagnosticsLookup";
import type { DiagnosticsLookupKind } from "@/lib/diagnostics/diagnostics-api";

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const DROPDOWN_GAP = 4;
const DROPDOWN_MAX_H = 280;
const VIEWPORT_PAD = 8;

function measureDropdownPosition(
  trigger: HTMLButtonElement,
  minWidth = 240
): DropdownPosition {
  const rect = trigger.getBoundingClientRect();
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;
  const spaceBelow = viewportH - rect.bottom - VIEWPORT_PAD;
  const spaceAbove = rect.top - VIEWPORT_PAD;
  const openUp =
    spaceBelow < Math.min(DROPDOWN_MAX_H, 160) && spaceAbove > spaceBelow;
  const maxHeight = Math.max(
    120,
    Math.min(DROPDOWN_MAX_H, openUp ? spaceAbove - DROPDOWN_GAP : spaceBelow - DROPDOWN_GAP)
  );
  const width = Math.min(
    Math.max(rect.width, minWidth),
    viewportW - VIEWPORT_PAD * 2
  );
  let left = rect.left;
  if (left + width > viewportW - VIEWPORT_PAD) {
    left = Math.max(VIEWPORT_PAD, viewportW - VIEWPORT_PAD - width);
  }
  const top = openUp
    ? Math.max(VIEWPORT_PAD, rect.top - DROPDOWN_GAP - maxHeight)
    : rect.bottom + DROPDOWN_GAP;
  return { top, left, width, maxHeight };
}

function optionValuesMatch(optionValue: string, current: string): boolean {
  if (optionValue === current) return true;
  if (optionValue === "" || current === "") return false;
  const left = Number(optionValue);
  const right = Number(current);
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
}

export function DiagnosticsLookupCombobox({
  token,
  kind,
  initialEntries,
  value,
  onValueChange,
  placeholder = "Select…",
  disabled = false,
  className,
}: {
  token: string | undefined;
  kind: DiagnosticsLookupKind;
  initialEntries: DiagnosticsLookupEntry[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState<DropdownPosition | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const lastSelectionRef = React.useRef<DiagnosticsLookupEntry | null>(null);

  const { search, setSearch, entries, error, loading, loadedCount } =
    useDebouncedDiagnosticsLookup({
      token,
      kind,
      initialEntries,
      enabled: open,
    });

  const selectedEntry = React.useMemo(() => {
    const match = entries.find((entry) => optionValuesMatch(entry.id, value));
    if (match) {
      lastSelectionRef.current = match;
      return match;
    }
    const fromInitial = initialEntries.find((entry) =>
      optionValuesMatch(entry.id, value)
    );
    if (fromInitial) {
      lastSelectionRef.current = fromInitial;
      return fromInitial;
    }
    if (lastSelectionRef.current?.id === value) {
      return lastSelectionRef.current;
    }
    return null;
  }, [entries, initialEntries, value]);

  React.useEffect(() => {
    if (!value) lastSelectionRef.current = null;
  }, [value]);

  const closeDropdown = React.useCallback(() => {
    setOpen(false);
    setSearch("");
    setPosition(null);
  }, [setSearch]);

  const selectEntry = React.useCallback(
    (entry: DiagnosticsLookupEntry | null) => {
      if (entry) lastSelectionRef.current = entry;
      else lastSelectionRef.current = null;
      onValueChange(entry?.id ?? "");
      closeDropdown();
    },
    [closeDropdown, onValueChange]
  );

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    setPosition(measureDropdownPosition(triggerRef.current));
  }, []);

  const openDropdown = React.useCallback(() => {
    if (!triggerRef.current) return;
    triggerRef.current.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
    requestAnimationFrame(() => {
      if (!triggerRef.current) return;
      setPosition(measureDropdownPosition(triggerRef.current));
      setOpen(true);
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      closeDropdown();
    }
    function handleReposition() {
      updatePosition();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [closeDropdown, open, updatePosition]);

  const selectedLabel = selectedEntry
    ? formatLookupLabel(selectedEntry)
    : undefined;

  const dropdown =
    open && position && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            data-diagnostics-combobox-panel="true"
            className="bg-popover pointer-events-auto fixed z-[400] rounded-md border shadow-md"
            onPointerDown={(event) => event.stopPropagation()}
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
          >
            <div className="border-b p-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or code…"
                autoFocus
                className={formControlFocusClass}
              />
            </div>
            <div
              className="overflow-y-auto p-1"
              style={{ maxHeight: Math.max(80, position.maxHeight - 88) }}
            >
              {error ? (
                <p className="text-destructive px-2 py-3 text-sm">{error}</p>
              ) : loading ? (
                <p className="text-muted-foreground px-2 py-3 text-sm">
                  Loading…
                </p>
              ) : entries.length === 0 ? (
                <p className="text-muted-foreground px-2 py-4 text-center text-sm">
                  No results
                </p>
              ) : (
                entries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="hover:bg-accent flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      selectEntry(entry);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4 shrink-0",
                        optionValuesMatch(entry.id, value)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="truncate">
                      {formatLookupLabel(entry)}
                    </span>
                  </button>
                ))
              )}
            </div>
            <div className="text-muted-foreground border-t px-2 py-1.5 text-xs">
              {error
                ? "Lookup failed"
                : loading
                  ? "Searching…"
                  : `${loadedCount} loaded`}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={cn("relative w-full", className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        disabled={disabled || !token}
        className={cn(
          "w-full justify-between font-normal",
          formControlFocusClass
        )}
        onClick={() => {
          if (disabled || !token) return;
          if (open) closeDropdown();
          else openDropdown();
        }}
      >
        <span
          className={cn("truncate", !selectedLabel && "text-muted-foreground")}
        >
          {selectedLabel || placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </Button>
      {dropdown}
    </div>
  );
}
