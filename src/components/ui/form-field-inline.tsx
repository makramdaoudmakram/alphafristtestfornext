import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Thin light-orange focus — overrides default green `--ring` on inputs/buttons. */
export const formControlFocusClass =
  "form-field-focus focus-visible:outline-none focus-visible:!ring-0 focus-visible:!border-orange-400/70 focus-visible:!shadow-[0_1px_8px_0_rgba(251,146,60,0.45)]";

export const formFieldInlineCompactGridClass =
  "sm:grid-cols-[5.75rem_minmax(0,1fr)] sm:gap-1.5 gap-1.5";

const inlineGridClass =
  "form-field-inline grid grid-cols-1 items-center gap-2 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-4";

const inlineLabelClass =
  "text-muted-foreground shrink-0 text-sm font-medium sm:text-end";

type FormFieldInlineProps = {
  id: string;
  label: string;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
} & React.ComponentProps<typeof Input>;

export function FormFieldInline({
  id,
  label,
  className,
  labelClassName,
  inputClassName,
  ...inputProps
}: FormFieldInlineProps) {
  return (
    <div className={cn(inlineGridClass, className)}>
      <Label htmlFor={id} className={cn(inlineLabelClass, labelClassName)}>
        {label}
      </Label>
      <Input
        id={id}
        className={cn(formControlFocusClass, inputClassName)}
        {...inputProps}
      />
    </div>
  );
}

export function FormFieldInlineWrap({
  id,
  label,
  className,
  labelClassName,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  labelClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(inlineGridClass, className)}>
      <Label htmlFor={id} className={cn(inlineLabelClass, labelClassName)}>
        {label}
      </Label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
