"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PaginationState } from "@tanstack/react-table";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PackagePlus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getStors, searchStockBatches } from "@/lib/api-client";
import {
  getInventoryStockStatus,
  type InventoryStockStatus,
  inventoryStatusLabel,
} from "@/lib/stock-inventory";
import { InventoryDetailDialog } from "@/components/inventory/inventory-detail-dialog";
import { useInventoryColumns } from "@/components/inventory/inventory-table-columns";
import { StockBarcodePrintDialog } from "@/components/stock/stock-barcode-print-dialog";
import { StockBarcodeScanCard } from "@/components/stock/stock-barcode-scan-card";
import { stockBatchToBarcodeLabel } from "@/components/stock/stock-barcode-label";
import { ActionGuard, PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import { formatStorDisplayName } from "@/lib/purchase-stores";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import type { StockBarcodeLabel, StockBatchItem, StockSearchFilters } from "@/types/stock";
import type { StorItem } from "@/types/stor";

const emptyFilters: StockSearchFilters = {
  itemCode: "",
  itemName: "",
  storeId: "",
  batchNo: "",
  expFrom: "",
  expTo: "",
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function InventoryPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<StockBatchItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StockSearchFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<StockSearchFilters>(emptyFilters);
  const [statusFilter, setStatusFilter] = useState<InventoryStockStatus | "all">("all");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [printLabels, setPrintLabels] = useState<StockBarcodeLabel[]>([]);
  const [highlightBatchNo, setHighlightBatchNo] = useState<string | null>(null);
  const [stores, setStores] = useState<StorItem[]>([]);
  const [detailBatch, setDetailBatch] = useState<StockBatchItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const storeOptions = useMemo<ComboboxOption[]>(() => {
    return [
      { value: "", label: "All locations" },
      ...stores
        .map((store) => ({
          value: String(store.id),
          label: formatStorDisplayName(store) || `Store ${store.id}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
    ];
  }, [stores]);

  const filteredItems = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter(
      (item) => getInventoryStockStatus(item) === statusFilter
    );
  }, [items, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

  const openPrintForBatch = useCallback((batch: StockBatchItem) => {
    setPrintLabels([stockBatchToBarcodeLabel(batch)]);
    setPrintOpen(true);
  }, []);

  const openDetails = useCallback((batch: StockBatchItem) => {
    setDetailBatch(batch);
    setDetailOpen(true);
  }, []);

  const columns = useInventoryColumns({
    onViewDetails: openDetails,
    onPrintBarcode: openPrintForBatch,
  });

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
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      });
      setItems(result.items);
      setTotalCount(result.totalCount);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load inventory";
      setLoadError(message);
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [token, appliedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadItems();
  }, [sessionReady, loadItems]);

  useEffect(() => {
    if (!token) {
      setStores([]);
      return;
    }
    void getStors(token)
      .then(setStores)
      .catch(() => setStores([]));
  }, [token]);

  function patchFilters(partial: Partial<StockSearchFilters>) {
    setFilters((current) => ({ ...current, ...partial }));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setAppliedFilters({ ...filters });
    setHighlightBatchNo(null);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  function handleClear() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setStatusFilter("all");
    setHighlightBatchNo(null);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  const emptyMessage =
    statusFilter === "all"
      ? "No inventory found. Try adjusting your search filters."
      : `No ${inventoryStatusLabel(statusFilter).toLowerCase()} items on this page.`;

  return (
    <PageGuard permission={PERMISSIONS.stock.view}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage and monitor your product inventory.
            </p>
          </div>
          <ActionGuard permission={PERMISSIONS.itemCatalog.create}>
            <Button asChild>
              <Link href="/dashboard/item-catalog">
                <PackagePlus className="mr-2 size-4" />
                Add product
              </Link>
            </Button>
          </ActionGuard>
        </div>

        <StockBarcodeScanCard
          token={token}
          onBatchFound={(result) => {
            setHighlightBatchNo(result.normalizedBatchNo);
            setAppliedFilters((current) => ({
              ...current,
              batchNo: result.normalizedBatchNo,
            }));
            setFilters((current) => ({
              ...current,
              batchNo: result.normalizedBatchNo,
            }));
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Search & filters</CardTitle>
            <CardDescription>
              Server-side search by SKU, product name, batch, store, and expiry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
              onSubmit={handleSearch}
            >
              <div className="space-y-2">
                <Label htmlFor="inventory-item-code">SKU / Item code</Label>
                <Input
                  id="inventory-item-code"
                  value={filters.itemCode ?? ""}
                  onChange={(event) => patchFilters({ itemCode: event.target.value })}
                  placeholder="Search SKU..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventory-item-name">Product name</Label>
                <Input
                  id="inventory-item-name"
                  value={filters.itemName ?? ""}
                  onChange={(event) => patchFilters({ itemName: event.target.value })}
                  placeholder="Arabic or English..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventory-batch-no">Batch number</Label>
                <Input
                  id="inventory-batch-no"
                  value={filters.batchNo ?? ""}
                  onChange={(event) => patchFilters({ batchNo: event.target.value })}
                  placeholder="Barcode / batch..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventory-store">Location</Label>
                <SearchableCombobox
                  value={filters.storeId ?? ""}
                  onValueChange={(value) => patchFilters({ storeId: value })}
                  options={storeOptions}
                  placeholder="All locations"
                  searchPlaceholder="Search store..."
                  emptyMessage="No stores found."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventory-exp-from">Expiry from</Label>
                <Input
                  id="inventory-exp-from"
                  type="date"
                  value={filters.expFrom ?? ""}
                  onChange={(event) => patchFilters({ expFrom: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventory-exp-to">Expiry to</Label>
                <Input
                  id="inventory-exp-to"
                  type="date"
                  value={filters.expTo ?? ""}
                  onChange={(event) => patchFilters({ expTo: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventory-status">Stock status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as InventoryStockStatus | "all")
                  }
                >
                  <SelectTrigger id="inventory-status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 md:col-span-2 lg:col-span-4">
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
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Inventory records</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading inventory..."
                  : `${filteredItems.length.toLocaleString()} shown on this page · ${totalCount.toLocaleString()} total batch record(s)`}
                {highlightBatchNo ? ` · highlighted batch ${highlightBatchNo}` : ""}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void loadItems()}
            >
              <RefreshCw className="mr-2 size-4" />
              Retry
            </Button>
          </CardHeader>
          <CardContent>
            {loadError ? (
              <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-destructive text-sm">{loadError}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadItems()}>
                  Retry
                </Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredItems}
                loading={loading}
                emptyMessage={emptyMessage}
                manualPagination
                pageCount={pageCount}
                pagination={pagination}
                onPaginationChange={setPagination}
                totalRowCount={totalCount}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                showActions={false}
                getRowId={(row) => String(row.id)}
                selectedRowId={
                  highlightBatchNo
                    ? filteredItems
                        .find((item) => item.batchNo === highlightBatchNo)
                        ?.id.toString() ?? null
                    : null
                }
                onRowDoubleClick={openDetails}
              />
            )}

            {!loading && !loadError && filteredItems.length === 0 ? (
              <div className="mt-4 flex justify-center">
                <ActionGuard permission={PERMISSIONS.itemCatalog.create}>
                  <Button asChild variant="secondary">
                    <Link href="/dashboard/item-catalog">Add product</Link>
                  </Button>
                </ActionGuard>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <InventoryDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        batch={detailBatch}
      />

      <StockBarcodePrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        labels={printLabels}
      />
    </PageGuard>
  );
}
