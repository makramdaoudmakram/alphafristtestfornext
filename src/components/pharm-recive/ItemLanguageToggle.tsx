"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PharmReciveItemLanguage } from "@/types/pharm-recive";

type ItemLanguageToggleProps = {
  value: PharmReciveItemLanguage;
  onChange: (value: PharmReciveItemLanguage) => void;
  disabled?: boolean;
  className?: string;
};

export function ItemLanguageToggle({
  value,
  onChange,
  disabled = false,
  className,
}: ItemLanguageToggleProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="group"
      aria-label="Item display language"
    >
      <span className="text-muted-foreground text-xs font-medium">Language</span>
      <div className="inline-flex rounded-md border p-0.5">
        <Button
          type="button"
          size="sm"
          variant={value === "en" ? "default" : "ghost"}
          className="h-7 px-3 text-xs"
          disabled={disabled}
          onClick={() => onChange("en")}
        >
          English
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value === "ar" ? "default" : "ghost"}
          className="h-7 px-3 text-xs"
          disabled={disabled}
          onClick={() => onChange("ar")}
        >
          Arabic
        </Button>
      </div>
    </div>
  );
}
