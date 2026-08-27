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
import { ItemCatalogAutocompleteCell } from "@/components/return/ItemCatalogAutocompleteCell";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { MovmentLookupItem } from "@/types/movment";
import { hasPurchaseSearchCriteria } from "@/lib/return-search";
import { displaySearchMovementName } from "@/lib/return.mapper";
import type { ReturnSearchFilters, ReturnSearchResult } from "@/types/return";

type SearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (filters: ReturnSearchFilters) => Promise<ReturnSearchResult[]>;
  onSelect: (result: ReturnSearchResult) => void;
  movementParentId: number;
  token?: string | null;
  catalogItems: ItemCatalogItem[];
};

const emptyFilters: ReturnSearchFilters = {
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
  movementParentId,
  token,
  catalogItems,
}: SearchDialogProps) {
  const [filters, setFilters] = useState<ReturnSearchFilters>(emptyFilters);
  const [searchMovement, setSearchMovement] = useState<MovmentLookupItem | null>(
    null
  );
  const [results, setResults] = useState<ReturnSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [itmNameEn, setItmNameEn] = useState("");
  const [selectedItemCode, setSelectedItemCode] = useState<string | null>(null);
  const [searchedByItem, setSearchedByItem] = useState(false);
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
    setSearchedByItem(false);
    setFilters(emptyFilters);
    setSearchMovement(null);
    resetItemFilter();
  }, [open, resetItemFilter]);

  const runSearch = useCallback(async () => {
    const itemCode =
      selectedItemCodeRef.current?.trim() ||
      selectedItemCode?.trim() ||
      undefined;
    const itemName = itmNameEn.trim();
    const selectedMovementId =
      searchMovement?.movChiledId != null
        ? String(searchMovement.movChiledId)
        : undefined;

    if (
      !hasPurchaseSearchCriteria(filters, searchMovement, itemCode, itemName)
    ) {
      toast.error("Enter at least one search condition.");
      return;
    }

    setLoading(true);
    try {
      const data = await onSearch({
        ...filters,
        pthId: filters.pthId?.trim() || undefined,
        venBillNo: filters.venBillNo?.trim() || undefined,
        dateFrom: filters.dateFrom?.trim() || undefined,
        dateTo: filters.dateTo?.trim() || undefined,
        itmId: itemCode,
        itmName: itemCode ? undefined : itemName || undefined,
        movId: selectedMovementId,
      });
      setResults(data);
      setSelectedIndex(0);
      setSearchedByItem(Boolean(itemCode || itemName));
      if (!data.length) {
        toast.message("No matching return documents found.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [filters, itmNameEn, onSearch, searchMovement, selectedItemCode]);

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
          <DialogTitle>Search return documents</DialogTitle>
          <DialogDescription>
            Each field is optional — combine any conditions you need (movement,
            dates, item, PthId, invoice number). Enter at least one, then press
            Search. Double-click or press Enter to load a result.
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
            <Label htmlFor="search-movement">Movement</Label>
            <MovementLookup
              parentId={movementParentId}
              token={token}
              value={searchMovement}
              onChange={setSearchMovement}
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
                  {searchedByItem ? <TableHead>Item</TableHead> : null}
                  <TableHead>InvoicePhtDate</TableHead>
                  <TableHead>PostStatus</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={
                      index === selectedIndex
                        ? "bg-muted/50 cursor-pointer"
                        : "cursor-pointer"
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
                    {searchedByItem ? (
                      <TableCell>
                        {row.matchedItemNameEn?.trim() ||
                          row.matchedItemCode?.trim() ||
                          "—"}
                      </TableCell>
                    ) : null}
                    <TableCell>{row.phtDate ?? "—"}</TableCell>
                    <TableCell>{row.postStatus}</TableCell>
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
