"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
} from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { BookOpen, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  INVENTORY_ADJUSTMENT_POSTING_GRID_COLUMNS,
  INVENTORY_ADJUSTMENT_POSTING_GRID_LEGACY_WIDTH_KEY,
  INVENTORY_ADJUSTMENT_POSTING_GRID_STORAGE_KEY,
  useInventoryAdjustmentPostingColumns,
} from "@/components/inventory-adjustment/inventory-adjustment-posting-table-columns";
import { ResizableTableHead } from "@/components/grid/resizable-table-head";
import { PageGuard } from "@/components/permissions/page-guard";
import { DataTablePagination } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getStors } from "@/lib/api-client";
import { formatExpDateMmYyyy } from "@/lib/purchase-exp-date";
import { formatStorDisplayName } from "@/lib/purchase-stores";
import { useGridPreferences } from "@/hooks/use-grid-preferences";
import { createInventoryAdjustmentService } from "@/services/inventory-adjustment.service";
import { PERMISSIONS } from "@/lib/route-permissions";
import type {
  InventoryAdjustmentDetail,
  InventoryPostingListItem,
} from "@/types/inventory-adjustment";

function formatAmount(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQuantity(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function detailItemName(row: InventoryAdjustmentDetail) {
  return row.itmNameEn.trim() || row.itmNameAr.trim() || row.itmCode || "—";
}

export function InventoryAdjustmentPostingPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<InventoryPostingListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState("");
  const [storeOptions, setStoreOptions] = useState<ComboboxOption[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [confirmRow, setConfirmRow] = useState<InventoryPostingListItem | null>(
    null
  );
  const [postingId, setPostingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailsById, setDetailsById] = useState<
    Map<number, InventoryAdjustmentDetail[]>
  >(() => new Map());
  const [detailsLoadingId, setDetailsLoadingId] = useState<number | null>(null);
  const [detailsErrorById, setDetailsErrorById] = useState<Map<number, string>>(
    () => new Map()
  );
  const gridRootRef = useRef<HTMLDivElement>(null);

  const {
    getWidth,
    getColumnStyle,
    getResizeHandleProps,
  } = useGridPreferences({
    storageKey: INVENTORY_ADJUSTMENT_POSTING_GRID_STORAGE_KEY,
    legacyWidthStorageKey: INVENTORY_ADJUSTMENT_POSTING_GRID_LEGACY_WIDTH_KEY,
    columns: INVENTORY_ADJUSTMENT_POSTING_GRID_COLUMNS,
    gridRootRef,
  });

  const tableWidth = useMemo(
    () =>
      INVENTORY_ADJUSTMENT_POSTING_GRID_COLUMNS.reduce(
        (sum, column) => sum + getWidth(column.key),
        0
      ),
    [getWidth]
  );

  const pageCount = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const service = useMemo(
    () => (token ? createInventoryAdjustmentService(token) : null),
    [token]
  );

  const loadStores = useCallback(async () => {
    if (!token) {
      setStoreOptions([]);
      return;
    }

    try {
      const stores = await getStors(token);
      setStoreOptions(
        stores.map((store) => ({
          value: String(store.id),
          label: formatStorDisplayName(store) || `Store ${store.id}`,
        }))
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load stores";
      toast.error(message);
    }
  }, [token]);

  const loadDocuments = useCallback(async () => {
    if (!service) {
      setItems([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const page = await service.listUnpostedForPosting({
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        storeId: storeId || undefined,
      });
      setItems(page.items);
      setTotalCount(page.totalCount);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load unposted inventory adjustments";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [pagination, service, storeId]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadStores();
  }, [sessionReady, loadStores]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadDocuments();
  }, [sessionReady, loadDocuments]);

  const storeSelectOptions = useMemo<ComboboxOption[]>(
    () => [{ value: "__all__", label: "All stores" }, ...storeOptions],
    [storeOptions]
  );

  const handleStoreChange = useCallback((value: string) => {
    setStoreId(value === "__all__" ? "" : value);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    setExpandedId(null);
  }, []);

  const handlePostClick = useCallback((row: InventoryPostingListItem) => {
    setConfirmRow(row);
  }, []);

  const loadDetails = useCallback(
    async (id: number) => {
      if (!service || detailsById.has(id)) return;

      setDetailsLoadingId(id);
      setDetailsErrorById((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      try {
        const document = await service.getById(id);
        setDetailsById((prev) => {
          const next = new Map(prev);
          next.set(id, document.details);
          return next;
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not load inventory details.";
        setDetailsErrorById((prev) => {
          const next = new Map(prev);
          next.set(id, message);
          return next;
        });
      } finally {
        setDetailsLoadingId(null);
      }
    },
    [detailsById, service]
  );

  const toggleExpanded = useCallback(
    (id: number) => {
      setExpandedId((current) => {
        const next = current === id ? null : id;
        if (next != null) {
          void loadDetails(next);
        }
        return next;
      });
    },
    [loadDetails]
  );

  const columns = useInventoryAdjustmentPostingColumns({
    expandedId,
    postingId,
    onPost: handlePostClick,
  });

  const table = useReactTable({
    data: items,
    columns,
    getRowId: (row) => String(row.id),
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
  });

  const confirmPost = useCallback(async () => {
    if (!service || !confirmRow) return;

    setPostingId(confirmRow.id);
    try {
      await service.post(confirmRow.id);
      toast.success(
        `Inventory adjustment ${confirmRow.fhId ?? confirmRow.id} posted.`
      );
      setConfirmRow(null);
      setExpandedId((current) =>
        current === confirmRow.id ? null : current
      );
      setDetailsById((prev) => {
        const next = new Map(prev);
        next.delete(confirmRow.id);
        return next;
      });
      await loadDocuments();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Post failed";
      toast.error(message);
      await loadDocuments();
    } finally {
      setPostingId(null);
    }
  }, [confirmRow, loadDocuments, service]);

  const processing = postingId != null;

  return (
    <PageGuard permission={PERMISSIONS.stock.view}>
      <TooltipProvider>
        <div className="space-y-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard/transactions/inventory-adjustment">
                    Inventory Adjustment
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Inventory Adjustment Posting</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                Inventory Adjustment Posting
              </h2>
              <p className="text-muted-foreground text-sm">
                Post unposted inventory adjustments (MovStat = 0) to the General
                Ledger. Posted documents disappear from this list automatically.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadDocuments()}
              disabled={loading || processing}
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Unposted inventory adjustments ({totalCount})
              </CardTitle>
              <CardDescription>
                Click a row to expand its InventoryD details. Only unposted
                records are retrieved from the server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid max-w-md gap-2">
                <Label htmlFor="inventory-posting-store">Store</Label>
                <SearchableCombobox
                  value={storeId || "__all__"}
                  onValueChange={handleStoreChange}
                  options={storeSelectOptions}
                  placeholder="Search store name..."
                  searchPlaceholder="Search store name..."
                  emptyMessage="No stores found."
                  disabled={loading || processing}
                />
              </div>

              {loadError ? (
                <p className="text-destructive text-sm">{loadError}</p>
              ) : null}

              <div
                className="overflow-auto rounded-md border"
                ref={gridRootRef}
              >
                <Table
                  className="table-fixed"
                  containerClassName="min-w-full overflow-visible"
                  style={{ width: tableWidth, minWidth: tableWidth }}
                >
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <ResizableTableHead
                            key={header.id}
                            columnId={header.column.id}
                            width={getWidth(header.column.id)}
                            resizeHandleProps={getResizeHandleProps(
                              header.column.id
                            )}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </ResizableTableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="text-muted-foreground h-24 whitespace-normal text-center"
                        >
                          Loading unposted inventory adjustments...
                        </TableCell>
                      </TableRow>
                    ) : table.getRowModel().rows.length ? (
                      table.getRowModel().rows.map((row) => {
                        const expanded = expandedId === row.original.id;
                        const details = detailsById.get(row.original.id);
                        const detailsError = detailsErrorById.get(
                          row.original.id
                        );
                        return (
                          <Fragment key={row.id}>
                            <TableRow
                              data-state={expanded ? "selected" : undefined}
                              className="cursor-pointer"
                              onClick={() => toggleExpanded(row.original.id)}
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell
                                  key={cell.id}
                                  data-grid-col={cell.column.id}
                                  style={getColumnStyle(cell.column.id)}
                                  className="overflow-hidden px-2"
                                >
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                            {expanded ? (
                              <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableCell
                                  colSpan={columns.length}
                                  className="overflow-visible whitespace-normal p-4"
                                >
                                  {detailsLoadingId === row.original.id ? (
                                    <p className="text-muted-foreground text-sm">
                                      Loading details...
                                    </p>
                                  ) : detailsError ? (
                                    <p className="text-destructive text-sm">
                                      {detailsError}
                                    </p>
                                  ) : details && details.length > 0 ? (
                                    <div className="overflow-x-auto rounded-md border bg-background">
                                      <Table containerClassName="overflow-visible min-w-full">
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Item Code</TableHead>
                                            <TableHead>Item Name</TableHead>
                                            <TableHead>Batch No</TableHead>
                                            <TableHead>Exp</TableHead>
                                            <TableHead>Physical</TableHead>
                                            <TableHead>Available</TableHead>
                                            <TableHead>Increase</TableHead>
                                            <TableHead>Decrease</TableHead>
                                            <TableHead>
                                              Purchase Value
                                            </TableHead>
                                            <TableHead>Sales Value</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {details.map((detail) => (
                                            <TableRow key={detail.clientRowId}>
                                              <TableCell className="font-mono text-sm">
                                                {detail.itmCode || "—"}
                                              </TableCell>
                                              <TableCell>
                                                {detailItemName(detail)}
                                              </TableCell>
                                              <TableCell>
                                                {detail.batchNo || "—"}
                                              </TableCell>
                                              <TableCell className="tabular-nums">
                                                {detail.expDate
                                                  ? formatExpDateMmYyyy(
                                                      detail.expDate
                                                    )
                                                  : "—"}
                                              </TableCell>
                                              <TableCell className="tabular-nums">
                                                {formatQuantity(
                                                  detail.itmStockQty
                                                )}
                                              </TableCell>
                                              <TableCell className="tabular-nums">
                                                {formatQuantity(
                                                  Number.isFinite(
                                                    detail.itmAvailableQty
                                                  )
                                                    ? detail.itmAvailableQty
                                                    : detail.itmStockQty
                                                )}
                                              </TableCell>
                                              <TableCell className="tabular-nums text-emerald-600">
                                                {formatQuantity(
                                                  detail.itmIncresQty
                                                )}
                                              </TableCell>
                                              <TableCell className="tabular-nums text-red-600">
                                                {formatQuantity(
                                                  detail.itemShortQty
                                                )}
                                              </TableCell>
                                              <TableCell className="tabular-nums">
                                                {formatAmount(
                                                  detail.totalpurchvalue
                                                )}
                                              </TableCell>
                                              <TableCell className="tabular-nums">
                                                {formatAmount(
                                                  detail.totalsalesvalue
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground text-sm">
                                      No detail rows found for this document.
                                    </p>
                                  )}
                                </TableCell>
                              </TableRow>
                            ) : null}
                          </Fragment>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="text-muted-foreground h-24 whitespace-normal text-center"
                        >
                          {storeId
                            ? "No unposted inventory adjustments found for this store."
                            : "No unposted inventory adjustments found."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <DataTablePagination
                table={table}
                pageSizeOptions={[10, 20, 50, 100]}
                totalRowCount={totalCount}
              />
            </CardContent>
          </Card>
        </div>

        <Dialog
          open={confirmRow != null}
          onOpenChange={(open) => {
            if (!processing && !open) setConfirmRow(null);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Post Inventory Adjustment?</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <div className="space-y-1">
                    <p>
                      <span className="text-foreground font-medium">
                        Document:
                      </span>{" "}
                      {confirmRow?.fhId ?? confirmRow?.id ?? "—"}
                    </p>
                    <p>
                      <span className="text-foreground font-medium">
                        Movement Name:
                      </span>{" "}
                      {confirmRow?.movementName.trim() || "—"}
                    </p>
                    <p>
                      <span className="text-foreground font-medium">
                        Net Inventory:
                      </span>{" "}
                      {formatAmount(confirmRow?.netInventory ?? null)}
                    </p>
                  </div>
                  <p>
                    This will create balanced General Ledger entries from
                    Account1 / Account2 and mark the inventory adjustment as
                    posted.
                  </p>
                  <p>Continue?</p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={processing}
                onClick={() => setConfirmRow(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={processing}
                onClick={() => void confirmPost()}
                className={cn(
                  "border-transparent bg-yellow-500 text-yellow-950 shadow-sm",
                  "hover:bg-yellow-600 hover:text-yellow-950",
                  "focus-visible:ring-yellow-500/40",
                  "disabled:opacity-50"
                )}
              >
                <BookOpen className={processing ? "animate-spin" : undefined} />
                Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </PageGuard>
  );
}
