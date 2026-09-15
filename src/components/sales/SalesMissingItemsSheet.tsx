"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiError, createSalesNotExistItems, lookupItemCatalog } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { MissingSalesGridItem } from "@/types/sales-not-exist-item";
import type { SalesSearchLanguage } from "@/types/sales-workspace";

const LOOKUP_DEBOUNCE_MS = 250;
const TAKE = 20;

type SalesMissingItemsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | null;
  language: SalesSearchLanguage;
  custId?: number | null;
};

function itemDisplayName(
  item: Pick<ItemCatalogItem, "itmNameEn" | "itmNameAr" | "itmCode">,
  language: SalesSearchLanguage
): string {
  if (language === "Arabic") {
    return item.itmNameAr?.trim() || item.itmNameEn?.trim() || item.itmCode?.trim() || "—";
  }
  return item.itmNameEn?.trim() || item.itmNameAr?.trim() || item.itmCode?.trim() || "—";
}

export function SalesMissingItemsSheet({
  open,
  onOpenChange,
  token,
  language,
  custId,
}: SalesMissingItemsSheetProps) {
  const listId = useId();
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<ItemCatalogItem[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [wantList, setWantList] = useState(false);
  const [grid, setGrid] = useState<MissingSalesGridItem[]>([]);
  const [saving, setSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSuggestions([]);
    setWantList(false);
    setGrid([]);
  }, [open]);

  useEffect(() => {
    const q = search.trim();
    if (!open || !wantList || !q || !token) {
      setSuggestions([]);
      setLookupLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLookupLoading(true);
      try {
        const rows = await lookupItemCatalog(token, q, {
          take: TAKE,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setSuggestions(rows);
      } catch {
        if (controller.signal.aborted) return;
        setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLookupLoading(false);
      }
    }, LOOKUP_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, wantList, open, token]);

  useEffect(() => {
    if (!wantList) return;
    function onDocDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setWantList(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [wantList]);

  const addItem = (item: ItemCatalogItem) => {
    const id = item.itemCatalogId || item.id;
    if (!id || id <= 0) {
      toast.error("Invalid item.");
      return;
    }
    if (grid.some((row) => row.itemCatalogId === id)) {
      toast.message("Item already added.");
      return;
    }
    const code = item.itmCode?.trim() || "";
    if (!code) {
      toast.error("Selected item has no Item Code.");
      return;
    }
    setGrid((prev) => [
      ...prev,
      {
        itemCatalogId: id,
        itmCode: code,
        itemName: itemDisplayName(item, language),
      },
    ]);
    setSearch("");
    setSuggestions([]);
    setWantList(false);
  };

  const removeItem = (itemCatalogId: number) => {
    setGrid((prev) => prev.filter((row) => row.itemCatalogId !== itemCatalogId));
  };

  const handleSave = async () => {
    if (!token) return;
    if (grid.length === 0) {
      toast.error("Add at least one missing item.");
      return;
    }

    setSaving(true);
    try {
      const result = await createSalesNotExistItems(token, {
        itemCatalogIds: grid.map((row) => row.itemCatalogId),
        custId: custId && custId > 0 ? custId : null,
      });
      toast.success(`Saved ${result.savedCount} missing item(s).`);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to save missing items."
      );
    } finally {
      setSaving(false);
    }
  };

  const showList =
    wantList && search.trim().length > 0 && (suggestions.length > 0 || lookupLoading);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Missing Sales Items</SheetTitle>
        </SheetHeader>

        <div className="grid gap-4 px-4 pb-4">
          <div ref={rootRef} className="relative space-y-2">
            <Label htmlFor="missing-sales-item-search">Search Item</Label>
            <Input
              id="missing-sales-item-search"
              value={search}
              disabled={saving}
              autoComplete="off"
              placeholder="Search item name"
              onFocus={() => {
                if (search.trim()) setWantList(true);
              }}
              onChange={(e) => {
                setSearch(e.target.value);
                setWantList(true);
              }}
            />
            {showList ? (
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                className="bg-popover absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-md border py-1 shadow-md"
              >
                {lookupLoading && suggestions.length === 0 ? (
                  <li className="text-muted-foreground px-2 py-1.5 text-xs">
                    Searching…
                  </li>
                ) : null}
                {suggestions.map((item) => {
                  const id = item.itemCatalogId || item.id;
                  return (
                    <li key={id} role="option">
                      <button
                        type="button"
                        className="hover:bg-accent flex w-full flex-col items-start px-2 py-1.5 text-left text-sm"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addItem(item);
                        }}
                      >
                        <span className="font-medium">
                          {itemDisplayName(item, language)}
                        </span>
                        {item.itmCode ? (
                          <span className="text-muted-foreground text-xs">
                            {item.itmCode}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Selected / Added Items</Label>
            {grid.length === 0 ? (
              <p className="text-muted-foreground text-sm">No items added yet.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {grid.map((row) => (
                  <li
                    key={row.itemCatalogId}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.itemName}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {row.itmCode}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0"
                      disabled={saving}
                      aria-label={`Remove ${row.itemName}`}
                      onClick={() => removeItem(row.itemCatalogId)}
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <SheetFooter className={cn("px-0")}>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || !token || grid.length === 0}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
