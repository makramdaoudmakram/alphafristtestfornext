"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";

export type ComboboxOption = {
  value: string;
  label: string;
};

type SearchableComboboxProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  /** Label when value is set but not present in options (legacy / loading). */
  orphanLabel?: string | null;
  /** Larger text for ERP forms (~15% readability bump). */
  size?: "default" | "lg";
  /** Grid keyboard navigation (data-row / data-col). */
  dataRow?: number;
  dataCol?: string;
};

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const DROPDOWN_GAP = 4;
const DROPDOWN_MAX_H = 280;
const VIEWPORT_PAD = 8;

function measureDropdownPosition(trigger: HTMLButtonElement): DropdownPosition {
  const rect = trigger.getBoundingClientRect();
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;
  const spaceBelow = viewportH - rect.bottom - VIEWPORT_PAD;
  const spaceAbove = rect.top - VIEWPORT_PAD;

  // Prefer opening downward; flip up when there isn't enough room below.
  const openUp =
    spaceBelow < Math.min(DROPDOWN_MAX_H, 160) && spaceAbove > spaceBelow;

  const maxHeight = Math.max(
    120,
    Math.min(DROPDOWN_MAX_H, openUp ? spaceAbove - DROPDOWN_GAP : spaceBelow - DROPDOWN_GAP)
  );

  const width = Math.min(Math.max(rect.width, 240), viewportW - VIEWPORT_PAD * 2);
  let left = rect.left;
  if (left + width > viewportW - VIEWPORT_PAD) {
    left = Math.max(VIEWPORT_PAD, viewportW - VIEWPORT_PAD - width);
  }

  const top = openUp
    ? Math.max(VIEWPORT_PAD, rect.top - DROPDOWN_GAP - maxHeight)
    : rect.bottom + DROPDOWN_GAP;

  return { top, left, width, maxHeight };
}

export function SearchableCombobox({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results.",
  disabled = false,
  className,
  orphanLabel,
  size = "default",
  dataRow,
  dataCol,
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [position, setPosition] = React.useState<DropdownPosition | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const lastSelectionRef = React.useRef<{ value: string; label: string } | null>(
    null
  );
  const optionTextClass = size === "lg" ? "text-base" : "text-sm";
  const triggerSizeClass = size === "lg" ? "h-11 min-h-11 text-base" : "";

  const filteredOptions = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query)
    );
  }, [options, search]);

  const selectedLabel = React.useMemo(() => {
    const match = options.find((option) => option.value === value);
    if (match) {
      lastSelectionRef.current = { value, label: match.label };
      return match.label;
    }
    if (lastSelectionRef.current?.value === value) {
      return lastSelectionRef.current.label;
    }
    const orphan = orphanLabel?.trim();
    if (value && orphan) return orphan;
    return undefined;
  }, [options, orphanLabel, value]);

  React.useEffect(() => {
    if (!value) lastSelectionRef.current = null;
  }, [value]);

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    setPosition(measureDropdownPosition(triggerRef.current));
  }, []);

  const closeDropdown = React.useCallback(() => {
    setOpen(false);
    setSearch("");
    setPosition(null);
  }, []);

  const selectOption = React.useCallback(
    (nextValue: string, nextLabel?: string) => {
      if (nextValue && nextLabel) {
        lastSelectionRef.current = { value: nextValue, label: nextLabel };
      } else if (!nextValue) {
        lastSelectionRef.current = null;
      }
      onValueChange(nextValue);
      closeDropdown();
    },
    [closeDropdown, onValueChange]
  );

  const handleOptionPointerDown = React.useCallback(
    (event: React.PointerEvent, nextValue: string, nextLabel?: string) => {
      event.preventDefault();
      event.stopPropagation();
      selectOption(nextValue, nextLabel);
    },
    [selectOption]
  );

  const openDropdown = React.useCallback(() => {
    if (!triggerRef.current) return;
    // Keep the trigger visible so the menu isn't cut off at the page bottom.
    triggerRef.current.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
    // Measure after scroll settles a bit.
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

  const dropdown =
    open && position && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={(node) => {
              panelRef.current = node;
              if (node) {
                node.inert = false;
                node.removeAttribute("inert");
                node.setAttribute("aria-hidden", "false");
              }
            }}
            data-combobox-panel="true"
            className="bg-popover pointer-events-auto fixed z-[400] rounded-md border shadow-md"
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              pointerEvents: "auto",
            }}
          >
            <div className="border-b p-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className={cn(formControlFocusClass, size === "lg" && "h-11 text-base")}
              />
            </div>
            <div
              className="overflow-y-auto p-1"
              style={{ maxHeight: Math.max(80, position.maxHeight - 56) }}
            >
              <button
                type="button"
                className={cn(
                  "hover:bg-accent flex w-full items-center rounded-sm px-2 py-1.5 text-left",
                  optionTextClass
                )}
                onPointerDown={(event) => handleOptionPointerDown(event, "")}
              >
                <Check className={cn("mr-2 size-4", value ? "opacity-0" : "opacity-100")} />
                Clear selection
              </button>
              {filteredOptions.length ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "hover:bg-accent flex w-full items-center rounded-sm px-2 py-1.5 text-left",
                      optionTextClass
                    )}
                    onPointerDown={(event) =>
                      handleOptionPointerDown(event, option.value, option.label)
                    }
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </button>
                ))
              ) : (
                <p className={cn("text-muted-foreground px-2 py-4 text-center", optionTextClass)}>
                  {emptyMessage}
                </p>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      data-combobox-root="true"
      data-combobox-open={open ? "true" : "false"}
      className={cn("relative w-full", className)}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        disabled={disabled}
        data-row={dataRow}
        data-col={dataCol}
        data-combobox-trigger="true"
        className={cn(
          "w-full justify-between font-normal",
          formControlFocusClass,
          triggerSizeClass
        )}
        onClick={() => {
          if (disabled) return;
          if (open) {
            closeDropdown();
          } else {
            openDropdown();
          }
        }}
      >
        <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
          {selectedLabel || placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </Button>
      {dropdown}
    </div>
  );
}
