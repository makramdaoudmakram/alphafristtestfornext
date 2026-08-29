"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { usePurchaseInvoiceDraftColumns } from "@/components/purchase/purchase-invoice-draft-table-columns";
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
import { getPurchaseInvoiceDrafts } from "@/lib/api-client";
import { getVendors } from "@/lib/vendor-api";
import { createPurchaseService } from "@/services/purchase.service";
import type { PurchaseInvoiceDraftItem } from "@/types/purchase";

function formatAmount(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function InvoiceDraftPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<PurchaseInvoiceDraftItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [vendorAccountId, setVendorAccountId] = useState("");
  const [vendorOptions, setVendorOptions] = useState<ComboboxOption[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [confirmRow, setConfirmRow] = useState<PurchaseInvoiceDraftItem | null>(null);
  const [postingId, setPostingId] = useState<number | null>(null);

  const pageCount = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

  const loadVendors = useCallback(async () => {
    if (!token) {
      setVendorOptions([]);
      return;
    }

    try {
      const vendors = await getVendors(token);
      setVendorOptions(
        vendors
          .filter((vendor) => vendor.accountId?.trim())
          .map((vendor) => ({
            value: vendor.accountId!.trim(),
            label:
              vendor.vendorNameEn ||
              vendor.vendorNameAr ||
              vendor.accountId!.trim(),
          }))
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load vendors";
      toast.error(message);
    }
  }, [token]);

  const loadInvoices = useCallback(async () => {
    if (!token) {
      setItems([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const page = await getPurchaseInvoiceDrafts(token, {
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        vendorAccountId: vendorAccountId || undefined,
      });
      setItems(page.items);
      setTotalCount(page.totalCount);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load draft purchase invoices";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token, pagination, vendorAccountId]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadVendors();
  }, [sessionReady, loadVendors]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadInvoices();
  }, [sessionReady, loadInvoices]);

  const vendorSelectOptions = useMemo<ComboboxOption[]>(
    () => [{ value: "__all__", label: "All draft invoices" }, ...vendorOptions],
    [vendorOptions]
  );

  const handleVendorChange = useCallback((value: string) => {
    setVendorAccountId(value === "__all__" ? "" : value);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, []);

  const handlePostClick = useCallback((row: PurchaseInvoiceDraftItem) => {
    setConfirmRow(row);
  }, []);

  const columns = usePurchaseInvoiceDraftColumns({
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
    if (!token || !confirmRow) return;

    setPostingId(confirmRow.id);
    try {
      const service = createPurchaseService(token);
      await service.post(confirmRow.id);
      toast.success("Invoice posted successfully.");
      setConfirmRow(null);
      await loadInvoices();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Post failed";
      toast.error(message);
    } finally {
      setPostingId(null);
    }
  }, [confirmRow, loadInvoices, token]);

  const selectedVendorLabel = useMemo(() => {
    if (!confirmRow) return "";
    return confirmRow.vendorName || "—";
  }, [confirmRow]);

  const processing = postingId != null;

  return (
    <PageGuard permission={null}>
      <TooltipProvider>
        <div className="space-y-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard/transactions/purchase">Purchase</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Invoice Draft</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Invoice Draft</h2>
              <p className="text-muted-foreground text-sm">
                Post draft purchase invoices (MovStat = 1) to the General Ledger.
                Posted invoices disappear from this list automatically.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadInvoices()}
              disabled={loading || processing}
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Draft purchase invoices ({totalCount})</CardTitle>
              <CardDescription>
                Search by Vendor name. Only draft invoices (MovStat = 1) are
                retrieved from the server, sorted by Insert Date descending.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid max-w-md gap-2">
                <Label htmlFor="draft-vendor">Vendor</Label>
                <SearchableCombobox
                  value={vendorAccountId || "__all__"}
                  onValueChange={handleVendorChange}
                  options={vendorSelectOptions}
                  placeholder="Search vendor name..."
                  searchPlaceholder="Search vendor name..."
                  emptyMessage="No vendors found."
                  disabled={loading || processing}
                />
              </div>

              {loadError ? (
                <p className="text-destructive text-sm">{loadError}</p>
              ) : null}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="text-muted-foreground h-24 text-center"
                        >
                          Loading draft invoices...
                        </TableCell>
                      </TableRow>
                    ) : table.getRowModel().rows.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="text-muted-foreground h-24 text-center"
                        >
                          {vendorAccountId
                            ? "No draft purchase invoices found for this vendor."
                            : "No draft purchase invoices found."}
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
              <DialogTitle>Post Purchase Invoice?</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <div className="space-y-1">
                    <p>
                      <span className="text-foreground font-medium">Vendor:</span>{" "}
                      {selectedVendorLabel}
                    </p>
                    <p>
                      <span className="text-foreground font-medium">Invoice:</span>{" "}
                      {confirmRow?.venBillNo || confirmRow?.pthId || "—"}
                    </p>
                    <p>
                      <span className="text-foreground font-medium">Net Bill:</span>{" "}
                      {formatAmount(confirmRow?.pthNetBill ?? null)}
                    </p>
                  </div>
                  <p>
                    Are you sure you want to post this invoice? This will create
                    General Ledger entries and set MovStat to posted.
                  </p>
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
