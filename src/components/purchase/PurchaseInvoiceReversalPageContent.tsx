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
import { RefreshCw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { usePurchaseInvoiceReversalColumns } from "@/components/purchase/purchase-invoice-reversal-table-columns";
import { PageGuard } from "@/components/permissions/page-guard";
import { usePermissions } from "@/components/permissions/permission-provider";
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
import {
  getPostedPurchaseInvoicesForReversal,
  reversePostedPurchaseInvoice,
} from "@/lib/api-client";
import { getVendors } from "@/lib/vendor-api";
import type { PostedPurchaseInvoiceReversalItem } from "@/types/purchase";

function formatAmount(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PurchaseInvoiceReversalPageContent() {
  const { data: session, status } = useSession();
  const { canReversePurchase, ready: permissionsReady } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<PostedPurchaseInvoiceReversalItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [vendorAccountId, setVendorAccountId] = useState("");
  const [vendorOptions, setVendorOptions] = useState<ComboboxOption[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [confirmRow, setConfirmRow] =
    useState<PostedPurchaseInvoiceReversalItem | null>(null);
  const [reversingId, setReversingId] = useState<number | null>(null);

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
      const page = await getPostedPurchaseInvoicesForReversal(token, {
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
          : "Failed to load posted purchase invoices";
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
    () => [{ value: "__all__", label: "All posted invoices" }, ...vendorOptions],
    [vendorOptions]
  );

  const handleVendorChange = useCallback((value: string) => {
    setVendorAccountId(value === "__all__" ? "" : value);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, []);

  const handleReverseClick = useCallback(
    (row: PostedPurchaseInvoiceReversalItem) => {
      setConfirmRow(row);
    },
    []
  );

  const columns = usePurchaseInvoiceReversalColumns({
    reversingId,
    onReverse: handleReverseClick,
    showReverseAction: permissionsReady && canReversePurchase(),
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

  const confirmReverse = useCallback(async () => {
    if (!token || !confirmRow) return;

    setReversingId(confirmRow.id);
    try {
      const result = await reversePostedPurchaseInvoice(token, confirmRow.id);
      toast.success(
        `Invoice ${confirmRow.venBillNo || result.pthId} reversed. It is now editable so the Vendor can be corrected.`
      );
      setConfirmRow(null);
      await loadInvoices();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to reverse the purchase invoice";
      toast.error(message);
    } finally {
      setReversingId(null);
    }
  }, [confirmRow, loadInvoices, token]);

  const selectedVendorLabel = useMemo(() => {
    if (!confirmRow) return "";
    return confirmRow.vendorName || "—";
  }, [confirmRow]);

  const processing = reversingId != null;

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
                <BreadcrumbPage>Purchase Invoice Reversal</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Purchase Invoice Reversal</h2>
              <p className="text-muted-foreground text-sm">
                Reverse a posted Purchase Invoice by creating opposite ledger
                entries. The original invoice becomes editable so the Vendor can
                be corrected.
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
              <CardTitle>Posted purchase invoices ({totalCount})</CardTitle>
              <CardDescription>
                Search by Vendor name. Only posted invoices are retrieved from
                the server, one page at a time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid max-w-md gap-2">
                <Label htmlFor="reversal-vendor">Vendor</Label>
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
                          Loading posted invoices...
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
                            ? "No posted purchase invoices found for this vendor."
                            : "No posted purchase invoices found."}
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
              <DialogTitle>Reverse Purchase Invoice?</DialogTitle>
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
                    This action will create reversing ledger entries, cancel the
                    accounting effect of this invoice, and make the Purchase
                    Invoice editable again.
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
                onClick={() => void confirmReverse()}
              >
                <Undo2 className={processing ? "animate-spin" : undefined} />
                Reverse Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </PageGuard>
  );
}
