"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import type { MovmentLookupItem } from "@/types/movment";
import type { PharmReciveSearchFilters, PharmReciveSearchResult } from "@/types/pharm-recive";

type SearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (filters: PharmReciveSearchFilters) => Promise<PharmReciveSearchResult[]>;
  onSelect: (result: PharmReciveSearchResult) => void;
  movementParentId: number;
  token?: string | null;
};

const emptyFilters: PharmReciveSearchFilters = {
  dateFrom: "",
  dateTo: "",
  itmId: "",
  itmName: "",
};

export function SearchDialog({
  open,
  onOpenChange,
  onSearch,
  onSelect,
  movementParentId,
  token,
}: SearchDialogProps) {
  const [filters, setFilters] = useState<PharmReciveSearchFilters>(emptyFilters);
  const [searchMovement, setSearchMovement] = useState<MovmentLookupItem | null>(null);
  const [results, setResults] = useState<PharmReciveSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setResults([]);
    setSelectedIndex(0);
    setLoading(false);
    setFilters(emptyFilters);
    setSearchMovement(null);
  }, [open]);

  const runSearch = useCallback(async () => {
    const hasCriteria =
      Boolean(filters.dateFrom?.trim()) ||
      Boolean(filters.dateTo?.trim()) ||
      Boolean(filters.itmId?.trim()) ||
      Boolean(filters.itmName?.trim()) ||
      searchMovement?.movChiledId != null;

    if (!hasCriteria) {
      toast.message("Enter at least one search criterion.");
      return;
    }

    setLoading(true);
    try {
      const rows = await onSearch({
        ...filters,
        movId:
          searchMovement?.movChiledId != null
            ? String(searchMovement.movChiledId)
            : undefined,
      });
      setResults(rows);
      setSelectedIndex(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [filters, onSearch, searchMovement?.movChiledId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Search pharmacy receive documents</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Movement</Label>
            <MovementLookup
              parentId={movementParentId}
              token={token}
              value={searchMovement}
              onChange={setSearchMovement}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pr-search-from">Date from</Label>
            <Input
              id="pr-search-from"
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pr-search-to">Date to</Label>
            <Input
              id="pr-search-to"
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pr-search-item">Item code</Label>
            <Input
              id="pr-search-item"
              value={filters.itmId ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, itmId: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pr-search-name">Item name</Label>
            <Input
              id="pr-search-name"
              value={filters.itmName ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, itmName: e.target.value }))}
            />
          </div>
        </div>

        <div className="max-h-64 overflow-auto rounded-md border">
          {loading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>MovId</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total Qty</TableHead>
                  <TableHead>Matched item</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground text-center">
                      No results
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((row, index) => (
                    <TableRow
                      key={row.id}
                      data-state={index === selectedIndex ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => setSelectedIndex(index)}
                      onDoubleClick={() => {
                        onSelect(row);
                        onOpenChange(false);
                      }}
                    >
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.movId ?? "—"}</TableCell>
                      <TableCell>{row.movDate ?? "—"}</TableCell>
                      <TableCell>{row.movTotalqunt}</TableCell>
                      <TableCell>{row.matchedItemCode ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={() => void runSearch()} disabled={loading}>
            Search
          </Button>
          <Button
            type="button"
            disabled={results.length === 0}
            onClick={() => {
              const row = results[selectedIndex];
              if (!row) return;
              onSelect(row);
              onOpenChange(false);
            }}
          >
            Open selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
