"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PermissionCheckboxItemProps = {
  id: string | number;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
  labelClassName?: string;
  className?: string;
};

export function PermissionCheckboxItem({
  id,
  label,
  checked,
  onCheckedChange,
  disabled = false,
  compact = false,
  labelClassName,
  className,
}: PermissionCheckboxItemProps) {
  const inputId = `permission-${id}`;

  return (
    <div
      className={cn(
        "hover:bg-muted/50 flex w-full items-center justify-between rounded-md py-1",
        compact ? "px-1" : "px-2",
        className
      )}
    >
      <Label
        htmlFor={inputId}
        className={cn(
          "cursor-pointer font-normal leading-snug text-black",
          compact ? "text-xs" : "text-sm",
          labelClassName
        )}
      >
        {label}
      </Label>
      <Checkbox
        id={inputId}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
    </div>
  );
}
