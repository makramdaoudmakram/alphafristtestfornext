"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { searchStockBatches } from "@/lib/api-client";
import { useStockColumns } from "@/components/stock/stock-table-columns";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StockBatchItem, StockSearchFilters } from "@/types/stock";

const emptyFilters: StockSearchFilters = {
  itemCode: "",
  itemName: "",
  storeId: "",
  expFrom: "",
  expTo: "",
};

export function StockPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<StockBatchItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StockSearchFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<StockSearchFilters>(emptyFilters);
  const [loadError, setLoadError] = useState<string | null>(null);

  const columns = useStockColumns();

  const loadItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const result = await searchStockBatches(token, {
        ...appliedFilters,
        pageNumber: 1,
        pageSize: 200,
      });
      setItems(result.items);
      setTotalCount(result.totalCount);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load stock batches";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token, appliedFilters]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadItems();
  }, [sessionReady, loadItems]);

  function patchFilters(partial: Partial<StockSearchFilters>) {
    setFilters((current) => ({ ...current, ...partial }));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setAppliedFilters({ ...filters });
  }

  function handleClear() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  return (
    <PageGuard permission={PERMISSIONS.stock.view}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock control</CardTitle>
            <CardDescription>
              View on-hand stock by item, store, expiry, and batch prices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
              onSubmit={handleSearch}
            >
              <div className="space-y-2">
                <Label htmlFor="stock-item-code">Item code</Label>
                <Input
                  id="stock-item-code"
                  value={filters.itemCode ?? ""}
                  onChange={(event) => patchFilters({ itemCode: event.target.value })}
                  placeholder="Search code..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-item-name">Item name</Label>
                <Input
                  id="stock-item-name"
                  value={filters.itemName ?? ""}
                  onChange={(event) => patchFilters({ itemName: event.target.value })}
                  placeholder="Arabic or English..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-store">Store</Label>
                <Input
                  id="stock-store"
                  value={filters.storeId ?? ""}
                  onChange={(event) => patchFilters({ storeId: event.target.value })}
                  placeholder="Store id..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-exp-from">Expiry from</Label>
                <Input
                  id="stock-exp-from"
                  type="date"
                  value={filters.expFrom ?? ""}
                  onChange={(event) => patchFilters({ expFrom: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-exp-to">Expiry to</Label>
                <Input
                  id="stock-exp-to"
                  type="date"
                  value={filters.expTo ?? ""}
                  onChange={(event) => patchFilters({ expTo: event.target.value })}
                />
              </div>
              <div className="flex items-end gap-2 md:col-span-2 lg:col-span-5">
                <Button type="submit" disabled={loading}>
                  Search
                </Button>
                <Button type="button" variant="outline" onClick={handleClear} disabled={loading}>
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock batches</CardTitle>
            <CardDescription>
              {loading
                ? "Loading..."
                : `${items.length.toLocaleString()} shown of ${totalCount.toLocaleString()} batch(es)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadError ? (
              <p className="text-sm text-destructive">{loadError}</p>
            ) : (
              <DataTable columns={columns} data={items} loading={loading} />
            )}
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
