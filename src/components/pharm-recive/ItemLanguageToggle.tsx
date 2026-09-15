"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PharmReciveItemLanguage } from "@/types/pharm-recive";

type ItemLanguageToggleProps = {
  value: PharmReciveItemLanguage;
  onChange: (value: PharmReciveItemLanguage) => void;
  disabled?: boolean;
  className?: string;
  /** Compact header: no "Language" label; options show as E / A. */
  compact?: boolean;
};

export function ItemLanguageToggle({
  value,
  onChange,
  disabled = false,
  className,
  compact = false,
}: ItemLanguageToggleProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        compact && "gap-1",
        className
      )}
      role="group"
      aria-label="Item display language"
    >
      {compact ? null : (
        <span className="text-muted-foreground text-xs font-medium">Language</span>
      )}
      <div className="inline-flex rounded-md border p-0.5">
        <Button
          type="button"
          size="sm"
          variant={value === "en" ? "default" : "ghost"}
          className={cn("h-7 text-xs", compact ? "min-w-7 px-2" : "px-3")}
          disabled={disabled}
          aria-label="English"
          onClick={() => onChange("en")}
        >
          {compact ? "E" : "English"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value === "ar" ? "default" : "ghost"}
          className={cn("h-7 text-xs", compact ? "min-w-7 px-2" : "px-3")}
          disabled={disabled}
          aria-label="Arabic"
          onClick={() => onChange("ar")}
        >
          {compact ? "A" : "Arabic"}
        </Button>
      </div>
    </div>
  );
}
