"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import { cn } from "@/lib/utils";

function formatNumericDisplay(value: number): string {
  return Number.isFinite(value) ? String(value) : "0";
}

function parseNumericCommit(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

type DetailNumericInputProps = {
  rowIndex: number;
  dataCol: string;
  value: number;
  disabled: boolean;
  step?: string;
  onFocusRow: () => void;
  onCommit: (value: number) => void;
  className?: string;
};

/** Allows empty text while editing; commits a number on blur (empty → 0). */
export function DetailNumericInput({
  rowIndex,
  dataCol,
  value,
  disabled,
  step = "0.01",
  onFocusRow,
  onCommit,
  className,
}: DetailNumericInputProps) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => formatNumericDisplay(value));

  useEffect(() => {
    if (!focused) {
      setText(formatNumericDisplay(value));
    }
  }, [focused, value]);

  return (
    <Input
      data-row={rowIndex}
      data-col={dataCol}
      type="text"
      inputMode="decimal"
      step={step}
      disabled={disabled}
      value={text}
      onFocus={() => {
        onFocusRow();
        setFocused(true);
        setText(formatNumericDisplay(value));
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        const nextValue = parseNumericCommit(text);
        setText(formatNumericDisplay(nextValue));
        if (nextValue !== value) {
          onCommit(nextValue);
        }
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        (e.currentTarget as HTMLInputElement).blur();
      }}
      className={cn("h-8 w-full min-w-0 tabular-nums", formControlFocusClass, className)}
    />
  );
}
