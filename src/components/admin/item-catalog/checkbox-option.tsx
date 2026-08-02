"use client";

import { cn } from "@/lib/utils";

type CheckboxOptionProps = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

export function CheckboxOption({
  id,
  label,
  checked,
  onChange,
  className,
}: CheckboxOptionProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors",
        className
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="border-input text-primary focus-visible:ring-ring size-4 shrink-0 rounded border focus-visible:ring-2 focus-visible:outline-none"
      />
      <span className="text-foreground text-sm font-normal leading-snug">
        {label}
      </span>
    </label>
  );
}
