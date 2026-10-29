"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  getStockStoreItemPendingMovements,
  getStors,
  searchStockStoreItemSummary,
} from "@/lib/api-client";
import { formatStorDisplayName } from "@/lib/purchase-stores";
import {
  inventoryDisplayFromStoreSummaryTotals,
} from "@/lib/stock-inventory";
import { StoreStockPendingMovementsSheet } from "@/components/inventory/store-stock-pending-movements-sheet";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import type {
  StockStoreItemPendingMovement,
  StockStoreItemSummaryRow,
} from "@/types/stock";
import type { StorItem } from "@/types/stor";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function formatQty(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function cellText(value: string | null | undefined): string {
  return value?.trim() || "—";
}

export function StoreStockSummaryPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [stores, setStores] = useState<StorItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [appliedItemCode, setAppliedItemCode] = useState("");
  const [appliedItemName, setAppliedItemName] = useState("");

  const [items, setItems] = useState<StockStoreItemSummaryRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState<StockStoreItemSummaryRow | null>(null);
  const [sheetMovements, setSheetMovements] = useState<StockStoreItemPendingMovement[]>([]);
  const [sheetLoading, setSheetLoading] = useState(false);

  const storeOptions = useMemo<ComboboxOption[]>(() => {
    return stores
      .map((store) => ({
        value: String(store.id),
        label: formatStorDisplayName(store) || `Store ${store.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [stores]);

  const parsedStoreId = selectedStoreId ? Number(selectedStoreId) : 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

  const openPendingSheet = useCallback(
    async (row: StockStoreItemSummaryRow) => {
      if (row.totalTransferQty <= 0 || !token) return;
      setSheetItem(row);
      setSheetOpen(true);
      setSheetLoading(true);
      setSheetMovements([]);
      try {
        const movements = await getStockStoreItemPendingMovements(
          token,
          row.storeId,
          row.itemCatalogId
        );
        setSheetMovements(movements);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load pending movements"
        );
        setSheetMovements([]);
      } finally {
        setSheetLoading(false);
      }
    },
    [token]
  );

  const columns = useMemo<ColumnDef<StockStoreItemSummaryRow>[]>(
    () => [
      {
        id: "itemCode",
        header: "Item code",
        cell: ({ row }) => cellText(row.original.itemCode),
      },
      {
        id: "itemNameAr",
        header: "Arabic name",
        cell: ({ row }) => cellText(row.original.itemNameAr),
      },
      {
        id: "itemNameEn",
        header: "English name",
        cell: ({ row }) => cellText(row.original.itemNameEn),
      },
      {
        id: "stockQty",
        header: "Stock quantity",
        cell: ({ row }) =>
          formatQty(inventoryDisplayFromStoreSummaryTotals(row.original).stock),
      },
      {
        id: "pendingQty",
        header: "Pending quantity",
        cell: ({ row }) => {
          const display = inventoryDisplayFromStoreSummaryTotals(row.original);
          if (row.original.totalTransferQty <= 0) {
            return formatQty(display.pending);
          }
          return (
            <button
              type="button"
              className="text-primary font-medium underline-offset-4 hover:underline"
              onClick={() => void openPendingSheet(row.original)}
            >
              {formatQty(display.pending)}
            </button>
          );
        },
      },
      {
        id: "availableQty",
        header: "Available quantity",
        cell: ({ row }) =>
          formatQty(inventoryDisplayFromStoreSummaryTotals(row.original).available),
      },
      {
        id: "incomingQty",
        header: "Incoming / unaccepted quantity",
        cell: ({ row }) =>
          formatQty(inventoryDisplayFromStoreSummaryTotals(row.original).incoming),
      },
    ],
    [openPendingSheet]
  );

  const loadItems = useCallback(async () => {
    if (!token || parsedStoreId <= 0) {
      setItems([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const result = await searchStockStoreItemSummary(token, {
        storeId: parsedStoreId,
        itemCode: appliedItemCode,
        itemName: appliedItemName,
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      });
      setItems(result.items);
      setTotalCount(result.totalCount);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load store stock summary";
      setLoadError(message);
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    token,
    parsedStoreId,
    appliedItemCode,
    appliedItemName,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (parsedStoreId <= 0) {
      toast.error("Select a store first.");
      return;
    }
    setAppliedItemCode(itemCode);
    setAppliedItemName(itemName);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  return (
    <PageGuard permission={PERMISSIONS.stock.view}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Store stock summary</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              One row per item for the selected store. Click pending quantity to see
              reservations.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/inventory">Batch inventory</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Select a store (required), then optional item filters.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              onSubmit={handleSearch}
            >
              <div className="space-y-2 sm:col-span-2">
                <Label>Store</Label>
                <SearchableCombobox
                  options={storeOptions}
                  value={selectedStoreId}
                  onValueChange={(value) => {
                    setSelectedStoreId(value);
                    setPagination((current) => ({ ...current, pageIndex: 0 }));
                  }}
                  placeholder="Select store…"
                  searchPlaceholder="Search stores…"
                  emptyMessage="No stores found."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary-item-code">Item code</Label>
                <Input
                  id="summary-item-code"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary-item-name">Item name</Label>
                <Input
                  id="summary-item-name"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-4">
                <Button type="submit" disabled={parsedStoreId <= 0}>
                  Search
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {loadError ? (
          <p className="text-destructive text-sm">{loadError}</p>
        ) : null}

        {parsedStoreId <= 0 ? (
          <p className="text-muted-foreground text-sm">Select a store to load stock summary.</p>
        ) : (
          <DataTable
            columns={columns}
            data={items}
            loading={loading}
            emptyMessage="No items with stock or pending quantity in this store."
            manualPagination
            pageCount={pageCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
          />
        )}

        <StoreStockPendingMovementsSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          item={sheetItem}
          movements={sheetMovements}
          loading={sheetLoading}
        />
      </div>
    </PageGuard>
  );
}
