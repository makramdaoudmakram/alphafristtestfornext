"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import type { DiagnosticsLookupEntry } from "@/lib/diagnostics/diagnostics-types";
import {
  formatLookupLabel,
  itemToEntry,
  mergeLookupEntries,
} from "@/lib/diagnostics/diagnostics-picker-utils";
import { useDebouncedDiagnosticsLookup } from "@/components/diagnostics/useDebouncedDiagnosticsLookup";

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const DROPDOWN_GAP = 4;
const DROPDOWN_MAX_H = 320;
const VIEWPORT_PAD = 8;

function measureDropdownPosition(trigger: HTMLButtonElement): DropdownPosition {
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
  const width = Math.min(Math.max(rect.width, 280), viewportW - VIEWPORT_PAD * 2);
  let left = rect.left;
  if (left + width > viewportW - VIEWPORT_PAD) {
    left = Math.max(VIEWPORT_PAD, viewportW - VIEWPORT_PAD - width);
  }
  const top = openUp
    ? Math.max(VIEWPORT_PAD, rect.top - DROPDOWN_GAP - maxHeight)
    : rect.bottom + DROPDOWN_GAP;
  return { top, left, width, maxHeight };
}

export function DiagnosticsMultiItemPicker({
  token,
  initialEntries,
  selectedIds,
  onSelectedIdsChange,
  disabled = false,
  className,
}: {
  token: string | undefined;
  initialEntries: DiagnosticsLookupEntry[];
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState<DropdownPosition | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [selectedEntries, setSelectedEntries] = React.useState<
    Map<string, DiagnosticsLookupEntry>
  >(() => new Map());

  const { search, setSearch, entries, error, loading, loadedCount } =
    useDebouncedDiagnosticsLookup({
      token,
      kind: "item",
      initialEntries,
      enabled: open,
    });

  React.useEffect(() => {
    setSelectedEntries((prev) => {
      const next = new Map(prev);
      for (const entry of initialEntries) {
        if (selectedIds.includes(Number(entry.id))) {
          next.set(entry.id, entry);
        }
      }
      for (const id of selectedIds) {
        const key = String(id);
        if (!next.has(key)) {
          next.set(key, {
            id: key,
            name: `Item #${id}`,
            code: key,
          });
        }
      }
      for (const key of [...next.keys()]) {
        if (!selectedIds.includes(Number(key))) next.delete(key);
      }
      return next;
    });
  }, [initialEntries, selectedIds]);

  React.useEffect(() => {
    if (!open) return;
    setSelectedEntries((prev) => {
      const next = new Map(prev);
      for (const entry of entries) {
        if (selectedIds.includes(Number(entry.id))) {
          next.set(entry.id, entry);
        }
      }
      return next;
    });
  }, [entries, open, selectedIds]);

  const displayEntries = React.useMemo(
    () =>
      mergeLookupEntries(
        [...selectedEntries.values()],
        entries
      ),
    [entries, selectedEntries]
  );

  const closeDropdown = React.useCallback(() => {
    setOpen(false);
    setSearch("");
    setPosition(null);
  }, [setSearch]);

  const toggleId = React.useCallback(
    (entry: DiagnosticsLookupEntry) => {
      const id = Number(entry.id);
      if (!Number.isFinite(id)) return;
      setSelectedEntries((prev) => {
        const next = new Map(prev);
        if (selectedIds.includes(id)) next.delete(entry.id);
        else next.set(entry.id, entry);
        return next;
      });
      onSelectedIdsChange(
        selectedIds.includes(id)
          ? selectedIds.filter((x) => x !== id)
          : [...selectedIds, id]
      );
    },
    [onSelectedIdsChange, selectedIds]
  );

  const summary =
    selectedIds.length === 0
      ? "Select items…"
      : `${selectedIds.length} item${selectedIds.length === 1 ? "" : "s"} selected`;

  const openDropdown = React.useCallback(() => {
    if (!triggerRef.current) return;
    setPosition(measureDropdownPosition(triggerRef.current));
    setOpen(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      closeDropdown();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [closeDropdown, open]);

  const dropdown =
    open && position && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            className="bg-popover pointer-events-auto fixed z-[400] rounded-md border shadow-md"
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
              className="overflow-y-auto p-2"
              style={{ maxHeight: Math.max(100, position.maxHeight - 88) }}
            >
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : loading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : displayEntries.length === 0 ? (
                <p className="text-muted-foreground text-center text-sm">
                  No results
                </p>
              ) : (
                displayEntries.map((entry) => {
                  const id = Number(entry.id);
                  const checked = selectedIds.includes(id);
                  return (
                    <label
                      key={entry.id}
                      className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleId(entry)}
                      />
                      <span>{formatLookupLabel(entry)}</span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="text-muted-foreground border-t px-2 py-1.5 text-xs">
              {error
                ? "Lookup failed"
                : loading
                  ? "Searching…"
                  : `${loadedCount} loaded · ${selectedIds.length} selected`}
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
          className={cn(
            "truncate",
            selectedIds.length === 0 && "text-muted-foreground"
          )}
        >
          {summary}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </Button>
      {selectedIds.length > 0 ? (
        <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
          {[...selectedEntries.values()].map((entry) => (
            <li key={entry.id}>{formatLookupLabel(entry)}</li>
          ))}
        </ul>
      ) : null}
      {dropdown}
    </div>
  );
}
