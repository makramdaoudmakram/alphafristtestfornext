"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import {
  formatExpDateMmYyyy,
  mmYyyyToExpDate,
  sanitizeMmYyyyTyping,
} from "@/lib/purchase-exp-date";
import { cn } from "@/lib/utils";

type ExpDateMmYyyyInputProps = {
  rowIndex: number;
  storedValue: string;
  disabled: boolean;
  onFocusRow: () => void;
  onCommit: (expDate: string) => void;
};

export function ExpDateMmYyyyInput({
  rowIndex,
  storedValue,
  disabled,
  onFocusRow,
  onCommit,
}: ExpDateMmYyyyInputProps) {
  const [text, setText] = useState(() => formatExpDateMmYyyy(storedValue));

  useEffect(() => {
    setText(formatExpDateMmYyyy(storedValue));
  }, [storedValue]);

  return (
    <Input
      data-row={rowIndex}
      data-col="expDate"
      type="text"
      inputMode="numeric"
      placeholder="MM/YYYY"
      disabled={disabled}
      title="Expiry month/year (saved as day 1)"
      value={text}
      onFocus={onFocusRow}
      onChange={(e) => {
        const next = sanitizeMmYyyyTyping(e.target.value);
        setText(next);
        const parsed = mmYyyyToExpDate(next);
        if (parsed) onCommit(parsed);
        else if (!next.trim()) onCommit("");
      }}
      onBlur={() => {
        const parsed = mmYyyyToExpDate(text);
        if (parsed) {
          onCommit(parsed);
          setText(formatExpDateMmYyyy(parsed));
          return;
        }
        if (!text.trim()) {
          onCommit("");
          return;
        }
        setText(formatExpDateMmYyyy(storedValue));
      }}
      className={cn("h-8 w-[6.5rem] tabular-nums", formControlFocusClass)}
    />
  );
}
