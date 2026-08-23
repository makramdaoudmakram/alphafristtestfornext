"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MovementLookup } from "@/components/movement/MovementLookup";
import { ItemCatalogAutocompleteCell } from "@/components/purchase/ItemCatalogAutocompleteCell";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { MovmentLookupItem } from "@/types/movment";
import { displaySearchMovementName } from "@/lib/purchase.mapper";
import type { PurchaseSearchFilters, PurchaseSearchResult } from "@/types/purchase";

type SearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (filters: PurchaseSearchFilters) => Promise<PurchaseSearchResult[]>;
  onSelect: (result: PurchaseSearchResult) => void;
  movement: MovmentLookupItem | null;
  onMovementChange: (item: MovmentLookupItem | null) => void;
  movementParentId: number;
  token?: string | null;
  movementDisabled?: boolean;
  catalogItems: ItemCatalogItem[];
};

const emptyFilters: PurchaseSearchFilters = {
  pthId: "",
  venBillNo: "",
  dateFrom: "",
  dateTo: "",
};

export function SearchDialog({
  open,
  onOpenChange,
  onSearch,
  onSelect,
  movement,
  onMovementChange,
  movementParentId,
  token,
  movementDisabled = false,
  catalogItems,
}: SearchDialogProps) {
  const [filters, setFilters] = useState<PurchaseSearchFilters>(emptyFilters);
  const [results, setResults] = useState<PurchaseSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [itmNameEn, setItmNameEn] = useState("");
  const [selectedItemCode, setSelectedItemCode] = useState<string | null>(null);
  const selectedItemCodeRef = useRef<string | null>(null);

  const setItemFilter = useCallback((name: string, code: string | null) => {
    setItmNameEn(name);
    setSelectedItemCode(code);
    selectedItemCodeRef.current = code;
  }, []);

  const resetItemFilter = useCallback(() => {
    setItemFilter("", null);
  }, [setItemFilter]);

  const applySelectedCatalogItem = useCallback(
    (item: ItemCatalogItem) => {
      setItemFilter(item.itmNameEn?.trim() ?? "", item.itmCode?.trim() || null);
    },
    [setItemFilter]
  );

  useEffect(() => {
    if (!open) return;
    setResults([]);
    setSelectedIndex(0);
    setLoading(false);
    setFilters(emptyFilters);
    resetItemFilter();
  }, [open, resetItemFilter]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const itemCode =
        selectedItemCodeRef.current?.trim() ||
        selectedItemCode?.trim() ||
        undefined;
      const selectedMovementId =
        movement?.movChiledId != null ? String(movement.movChiledId) : undefined;
      const data = await onSearch({
        ...filters,
        vendor: movement?.movAccountEntry1?.trim() || undefined,
        itmId: itemCode,
        movId: selectedMovementId,
      });
      setResults(data);
      setSelectedIndex(0);
      if (!data.length) {
        toast.message("No matching purchase documents found.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [filters, selectedItemCode, movement, onSearch]);

  const loadSelected = useCallback(
    (index: number) => {
      const row = results[index];
      if (!row) return;
      onSelect(row);
      onOpenChange(false);
    },
    [onOpenChange, onSelect, results]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Search purchase documents</DialogTitle>
          <DialogDescription>
            Filter by PthId, movement, item name English, invoice number, or date
            range. Double-click or press Enter to load. Search runs only when you
            press Search.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="search-pthId">PthId</Label>
            <Input
              id="search-pthId"
              value={filters.pthId ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, pthId: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="search-vendor">Movement</Label>
            <MovementLookup
              parentId={movementParentId}
              token={token}
              value={movement}
              onChange={onMovementChange}
              disabled={movementDisabled}
              placeholder="Select movement..."
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="search-itm-name-en">Item Name English</Label>
            <ItemCatalogAutocompleteCell
              field="nameEn"
              rowIndex={0}
              dataCol="itmNameEn"
              value={itmNameEn}
              token={token}
              catalogItems={catalogItems}
              disabled={false}
              inputClassName="h-9 w-full"
              onFocusRow={() => undefined}
              onItemApplied={applySelectedCatalogItem}
              onChangeRow={(patch) => {
                if (patch.itmNameEn !== undefined && patch.itmId === undefined) {
                  setItemFilter(patch.itmNameEn, null);
                  return;
                }

                const name =
                  patch.itmNameEn !== undefined ? patch.itmNameEn : itmNameEn;
                const code =
                  patch.itmId !== undefined
                    ? patch.itmId.trim() || null
                    : selectedItemCodeRef.current;
                setItemFilter(name, code);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="search-venBillNo">Invoice number</Label>
            <Input
              id="search-venBillNo"
              value={filters.venBillNo ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, venBillNo: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="search-from">Date from</Label>
              <Input
                id="search-from"
                type="date"
                value={filters.dateFrom ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateFrom: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-to">Date to</Label>
              <Input
                id="search-to"
                type="date"
                value={filters.dateTo ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateTo: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={() => void runSearch()} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </DialogFooter>

        <div className="max-h-64 overflow-auto rounded-md border">
          {loading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PthId</TableHead>
                  <TableHead>MovementName</TableHead>
                  <TableHead>InvoicePhtDate</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={
                      index === selectedIndex ? "bg-muted/50 cursor-pointer" : "cursor-pointer"
                    }
                    onClick={() => setSelectedIndex(index)}
                    onDoubleClick={() => loadSelected(index)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") loadSelected(index);
                    }}
                    tabIndex={0}
                  >
                    <TableCell>{row.pthId}</TableCell>
                    <TableCell>{displaySearchMovementName(row.movementName)}</TableCell>
                    <TableCell>{row.phtDate ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.pthNetBill.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
