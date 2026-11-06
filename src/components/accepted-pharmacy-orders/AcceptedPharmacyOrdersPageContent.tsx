"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Barcode, ChevronLeft, ChevronRight, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePharmacyScope } from "@/components/pharmacy/pharmacy-scope-provider";
import { PageGuard } from "@/components/permissions/page-guard";
import { ItemLanguageToggle } from "@/components/pharm-recive/ItemLanguageToggle";
import { StockBarcodePrintDialog } from "@/components/stock/stock-barcode-print-dialog";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PERMISSIONS } from "@/lib/route-permissions";
import {
  getStorToPharmDetailLabels,
  getStorToPharmItemName,
  sortStorToPharmDetails,
  type StorToPharmDetailSortDirection,
} from "@/lib/stor-to-pharm-detail";
import {
  AcceptedPharmacyOrdersService,
  AcceptedPharmacyOrdersRepositoryError,
} from "@/services/accepted-pharmacy-orders.service";
import type {
  AcceptedPharmacyOrderDetail,
  AcceptedPharmacyOrderSummary,
} from "@/types/accepted-pharmacy-orders";
import type { PharmReciveItemLanguage } from "@/types/pharm-recive";
import type { StockBarcodeLabel } from "@/types/stock";

const DEFAULT_PAGE_SIZE = 20;

function startOfMonthIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}-01`;
}

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function displayFathId(header: { fathId?: number | null; serialNo?: number | null }): string {
  const fathId = header.fathId ?? header.serialNo;
  if (fathId != null && fathId > 0) return String(fathId);
  return "—";
}

function formatStorageLabel(
  storageName: string | null,
  storageId: string | null
): string {
  if (storageId && storageName && storageName !== storageId) {
    return `${storageName} (${storageId})`;
  }
  return storageId ?? storageName ?? "—";
}

export function AcceptedPharmacyOrdersPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";
  const { activePharmacy, ready: scopeReady } = usePharmacyScope();

  const [items, setItems] = useState<AcceptedPharmacyOrderSummary[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  const [dateFrom, setDateFrom] = useState(startOfMonthIso);
  const [dateTo, setDateTo] = useState(todayIso);
  const [appliedDateFrom, setAppliedDateFrom] = useState(startOfMonthIso);
  const [appliedDateTo, setAppliedDateTo] = useState(todayIso);

  const [currentPharmacyName, setCurrentPharmacyName] = useState<string | null>(null);
  const [currentStorageId, setCurrentStorageId] = useState<string | null>(null);
  const [currentStorageName, setCurrentStorageName] = useState<string | null>(null);
  const [storageConfigurationMessage, setStorageConfigurationMessage] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewHeader, setViewHeader] = useState<AcceptedPharmacyOrderDetail | null>(null);
  const [itemLanguage, setItemLanguage] = useState<PharmReciveItemLanguage>("en");
  const [detailSortDirection, setDetailSortDirection] =
    useState<StorToPharmDetailSortDirection>("asc");

  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [stockBarcodePrintOpen, setStockBarcodePrintOpen] = useState(false);
  const [stockBarcodeLabels, setStockBarcodeLabels] = useState<StockBarcodeLabel[]>([]);

  const detailLabels = getStorToPharmDetailLabels(itemLanguage);

  const service = useMemo(
    () => (token ? new AcceptedPharmacyOrdersService(token) : null),
    [token]
  );

  const loadList = useCallback(async () => {
    if (!service) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const result = await service.list({
        dateFrom: appliedDateFrom || null,
        dateTo: appliedDateTo || null,
        pageNumber,
        pageSize,
      });
      setItems(result.items);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
      setHasNextPage(result.hasNextPage);
      setHasPreviousPage(result.hasPreviousPage);
      setCurrentPharmacyName(result.currentPharmacyName);
      setCurrentStorageId(result.currentStorageId);
      setCurrentStorageName(result.currentStorageName);
      setStorageConfigurationMessage(result.storageConfigurationMessage);
    } catch (error) {
      setItems([]);
      const message =
        error instanceof AcceptedPharmacyOrdersRepositoryError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not load accepted receive documents.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [service, appliedDateFrom, appliedDateTo, pageNumber, pageSize]);

  useEffect(() => {
    if (!sessionReady || !scopeReady) return;
    void loadList();
  }, [sessionReady, scopeReady, activePharmacy?.parmId, loadList]);

  function applyDateFilters() {
    setPageNumber(1);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  }

  async function openView(summary: AcceptedPharmacyOrderSummary) {
    if (!service) return;
    setViewOpen(true);
    setViewLoading(true);
    setViewHeader(null);
    try {
      const detail = await service.getById(summary.id);
      setViewHeader(detail);
    } catch (error) {
      setViewOpen(false);
      toast.error(
        error instanceof AcceptedPharmacyOrdersRepositoryError
          ? error.message
          : "Could not load invoice details."
      );
    } finally {
      setViewLoading(false);
    }
  }

  async function handlePrintBarcode() {
    if (!service || !viewHeader) return;
    setBarcodeLoading(true);
    try {
      const labels = await service.getStockBarcodeLabels(viewHeader.id);
      const valid = labels.filter(
        (label) => label.batchNo.trim().length > 0 && label.barcodeValue.trim().length > 0
      );
      if (valid.length === 0) {
        toast.error("No barcode labels are available for eligible items on this invoice.");
        return;
      }
      setStockBarcodeLabels(valid);
      setStockBarcodePrintOpen(true);
    } catch (error) {
      toast.error(
        error instanceof AcceptedPharmacyOrdersRepositoryError
          ? error.message
          : "Could not load barcode labels."
      );
    } finally {
      setBarcodeLoading(false);
    }
  }

  const sortedViewDetails = useMemo(() => {
    if (!viewHeader) return [];
    return sortStorToPharmDetails(viewHeader.details, itemLanguage, detailSortDirection);
  }, [viewHeader, itemLanguage, detailSortDirection]);

  return (
    <PageGuard permission={PERMISSIONS.pharmReciveAcceptedOrders.view}>
      <div className="space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Accepted Pharmacy Orders</CardTitle>
            <CardDescription>
              Store-to-pharmacy invoices accepted at the active pharmacy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Active pharmacy:{" "}
              <span className="font-medium">{currentPharmacyName ?? activePharmacy?.name ?? "—"}</span>
            </p>
            <p>
              Receiving storage:{" "}
              <span className="font-medium">
                {formatStorageLabel(currentStorageName, currentStorageId)}
              </span>
            </p>
            {storageConfigurationMessage ? (
              <p className="text-destructive text-sm">{storageConfigurationMessage}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-wrap items-end gap-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="accepted-date-from">Date from</Label>
              <Input
                id="accepted-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accepted-date-to">Date to</Label>
              <Input
                id="accepted-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="button" onClick={applyDateFilters} disabled={loading}>
              Apply filters
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : loadError ? (
          <Card>
            <CardContent className="space-y-3 py-10 text-center text-sm">
              <p className="text-destructive font-medium">{loadError}</p>
              <Button type="button" variant="outline" onClick={() => void loadList()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              No accepted store-to-pharmacy orders for the selected filters.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>FathId</TableHead>
                    <TableHead>Sending storage</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total qty</TableHead>
                    <TableHead className="text-right">Total sales</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{displayFathId(row)}</TableCell>
                      <TableCell>
                        {row.sendingStorageName ?? row.sendingStorageId ?? "—"}
                      </TableCell>
                      <TableCell>{formatDate(row.receiveDate)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.totalQuantity)}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(row.totalSalesPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" size="sm" variant="outline" onClick={() => void openView(row)}>
                          <Eye className="mr-2 size-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <p className="text-muted-foreground">
                  {totalCount.toLocaleString()} record{totalCount === 1 ? "" : "s"} · Page{" "}
                  {pageNumber} of {Math.max(totalPages, 1)}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasPreviousPage || loading}
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasNextPage || loading}
                    onClick={() => setPageNumber((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-[1400px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]">
            <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
              <DialogTitle>
                Accepted invoice {viewHeader ? displayFathId(viewHeader) : ""}
              </DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {viewLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="text-muted-foreground size-8 animate-spin" />
              </div>
            ) : viewHeader ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase">Sending storage</p>
                      <p className="font-medium">
                        {viewHeader.sendingStorageName ?? viewHeader.sendingStorageId ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase">Receiving storage</p>
                      <p className="font-medium">
                        {viewHeader.receivingStorageName ?? viewHeader.receivingStorageId ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase">Date</p>
                      <p className="font-medium">{formatDate(viewHeader.receiveDate)}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void handlePrintBarcode()}
                    disabled={barcodeLoading}
                  >
                    {barcodeLoading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Barcode className="mr-2 size-4" />
                    )}
                    Print Barcode
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <ItemLanguageToggle
                    value={itemLanguage}
                    onChange={setItemLanguage}
                    disabled={viewLoading}
                  />
                  <div className="inline-flex rounded-md border p-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={detailSortDirection === "asc" ? "default" : "ghost"}
                      className="h-7 px-3 text-xs"
                      onClick={() => setDetailSortDirection("asc")}
                    >
                      {detailLabels.sortAsc}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={detailSortDirection === "desc" ? "default" : "ghost"}
                      className="h-7 px-3 text-xs"
                      onClick={() => setDetailSortDirection("desc")}
                    >
                      {detailLabels.sortDesc}
                    </Button>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{detailLabels.itemName}</TableHead>
                      <TableHead>{detailLabels.quantity}</TableHead>
                      <TableHead>{detailLabels.unit}</TableHead>
                      <TableHead>{detailLabels.batchNo}</TableHead>
                      <TableHead>{detailLabels.expiry}</TableHead>
                      <TableHead className="text-right">{detailLabels.salesPrice}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedViewDetails.map((detail) => (
                      <TableRow key={detail.id}>
                        <TableCell className="min-w-[12rem]">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-xs">
                              {detailLabels.code}: {detail.itemCode ?? detail.itmId ?? "—"}
                            </div>
                            <div className="font-medium">
                              {detailLabels.itemName}:{" "}
                              {getStorToPharmItemName(detail, itemLanguage)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatNumber(detail.quantity)}</TableCell>
                        <TableCell>{detail.unitName ?? detail.unitId ?? "—"}</TableCell>
                        <TableCell>{detail.batchNo ?? "—"}</TableCell>
                        <TableCell>{formatDate(detail.expDate)}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(detail.salesPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
            </div>
          </DialogContent>
        </Dialog>

        <StockBarcodePrintDialog
          open={stockBarcodePrintOpen}
          onOpenChange={setStockBarcodePrintOpen}
          labels={stockBarcodeLabels}
        />
      </div>
    </PageGuard>
  );
}
