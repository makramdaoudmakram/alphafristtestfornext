"use client";

import { useCallback, useState } from "react";
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
import type { PurchaseSearchFilters, PurchaseSearchResult } from "@/types/purchase";

type SearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (filters: PurchaseSearchFilters) => Promise<PurchaseSearchResult[]>;
  onSelect: (result: PurchaseSearchResult) => void;
};

export function SearchDialog({
  open,
  onOpenChange,
  onSearch,
  onSelect,
}: SearchDialogProps) {
  const [filters, setFilters] = useState<PurchaseSearchFilters>({});
  const [results, setResults] = useState<PurchaseSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await onSearch(filters);
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
  }, [filters, onSearch]);

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
            Filter by PthId, vendor, invoice number, or date range. Double-click
            or press Enter to load.
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
            <Label htmlFor="search-vendor">Vendor</Label>
            <Input
              id="search-vendor"
              value={filters.vendor ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, vendor: e.target.value }))
              }
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
                  <TableHead>Vendor</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Pht date</TableHead>
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
                    <TableCell>{row.venId || "—"}</TableCell>
                    <TableCell>{row.venBillNo || "—"}</TableCell>
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
