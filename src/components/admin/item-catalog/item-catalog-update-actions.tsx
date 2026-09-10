"use client";

import { Button } from "@/components/ui/button";

export function ItemCatalogUpdateActions({
  editingId,
  disabled,
  onVendorCodeClick,
  onInternationalCodeClick,
}: {
  editingId: number | null;
  disabled?: boolean;
  onVendorCodeClick: () => void;
  onInternationalCodeClick: () => void;
}) {
  if (!editingId) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
      <span className="text-muted-foreground mr-1 text-sm font-medium">
        Item links
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onVendorCodeClick}
        disabled={disabled}
      >
        Vendor Code
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onInternationalCodeClick}
        disabled={disabled}
      >
        International Extra Code
      </Button>
    </div>
  );
}
