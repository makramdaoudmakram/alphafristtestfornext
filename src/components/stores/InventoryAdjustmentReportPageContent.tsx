"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageGuard } from "@/components/permissions/page-guard";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ApiError,
  getInventoryAdjustmentReport,
  getInventoryAdjustmentReportDetail,
  getInventoryAdjustmentReportStores,
  getInventoryAdjustmentReportUnposted,
} from "@/lib/api-client";
import { PERMISSIONS } from "@/lib/route-permissions";
import type {
  InventoryAdjustmentReportDetail,
  InventoryAdjustmentReportHeader,
  InventoryAdjustmentReportStoreOption,
} from "@/types/inventory-adjustment-report";

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQty(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

const ALL_STORES_VALUE = "__all__";

type ReportViewMode = "posted" | "unposted";

export function InventoryAdjustmentReportPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken ?? null;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<InventoryAdjustmentReportHeader[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [storeOptions, setStoreOptions] = useState<
    InventoryAdjustmentReportStoreOption[]
  >([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [storeFilter, setStoreFilter] = useState(ALL_STORES_VALUE);

  const [modalOpen, setModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<InventoryAdjustmentReportDetail | null>(
    null
  );
  const [selectedHeaderId, setSelectedHeaderId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ReportViewMode>("posted");

  const loadSeq = useRef(0);
  const viewingUnposted = viewMode === "unposted";

  const storeIdParam = useMemo(
    () => (storeFilter === ALL_STORES_VALUE ? undefined : storeFilter),
    [storeFilter]
  );

  const loadStores = useCallback(async () => {
    if (!token) return;
    setStoresLoading(true);
    try {
      const stores = await getInventoryAdjustmentReportStores(token);
      setStoreOptions(stores);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load stores";
      toast.error(message);
      setStoreOptions([]);
    } finally {
      setStoresLoading(false);
    }
  }, [token]);

  const loadReport = useCallback(async () => {
    if (!token) return;
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    try {
      const fetchOpts = {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        storeId: storeIdParam,
      };
      const result = viewingUnposted
        ? await getInventoryAdjustmentReportUnposted(token, fetchOpts)
        : await getInventoryAdjustmentReport(token, fetchOpts);
      if (seq !== loadSeq.current) return;
      setItems(result.items);
      setTotalRecords(result.totalRecords);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load inventory adjustment report";
      setError(message);
      setItems([]);
      setTotalRecords(0);
      toast.error(message);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [token, dateFrom, dateTo, storeIdParam, viewingUnposted]);

  const openDetail = useCallback(
    async (headerId: number) => {
      if (!token) return;
      setSelectedHeaderId(headerId);
      setModalOpen(true);
      setDetail(null);
      setDetailError(null);
      setDetailLoading(true);
      try {
        const result = await getInventoryAdjustmentReportDetail(token, headerId);
        setDetail(result);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load adjustment details";
        setDetailError(message);
        toast.error(message);
      } finally {
        setDetailLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!sessionReady || !token) return;
    void loadStores();
  }, [sessionReady, token, loadStores]);

  useEffect(() => {
    if (!sessionReady || !token) return;
    void loadReport();
  }, [sessionReady, token, loadReport]);

  return (
    <PageGuard permission={PERMISSIONS.inventoryAdjustmentReport.view}>
      <div className="flex flex-col gap-4 p-4" dir="auto">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              تقرير تسويات المخزون
              <span className="ms-2 text-base font-normal text-muted-foreground">
                Inventory Adjustment Report
              </span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Default view shows posted adjustments (MovStat = 1). Use{" "}
              <span dir="rtl" className="font-medium">
                الحركات غير المرحلة
              </span>{" "}
              for unposted documents. Values use sales price only.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={viewingUnposted ? "outline" : "default"}
              disabled={loading}
              onClick={() => setViewMode("posted")}
            >
              الحركات المرحلة
            </Button>
            <Button
              type="button"
              variant={viewingUnposted ? "default" : "outline"}
              disabled={loading}
              onClick={() => setViewMode("unposted")}
            >
              الحركات غير المرحلة
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => void loadReport()}
            >
              <RefreshCw className="me-2 size-4" />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>
              Dates filter by adjustment transaction date (inclusive). Store list
              matches your API authorization scope.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="inv-adj-date-from">Start date</Label>
              <Input
                id="inv-adj-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-adj-date-to">End date</Label>
              <Input
                id="inv-adj-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="min-w-[12rem] space-y-2">
              <Label htmlFor="inv-adj-store">Store</Label>
              <Select
                value={storeFilter}
                onValueChange={setStoreFilter}
                disabled={storesLoading}
              >
                <SelectTrigger id="inv-adj-store">
                  <SelectValue
                    placeholder={storesLoading ? "Loading…" : "All Stores"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STORES_VALUE}>All Stores</SelectItem>
                  {storeOptions.map((store) => (
                    <SelectItem key={store.storeId} value={store.storeId}>
                      {store.storeName ?? store.storeId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {viewingUnposted
                ? `Unposted documents (${totalRecords.toLocaleString()})`
                : `Posted documents (${totalRecords.toLocaleString()})`}
            </CardTitle>
            <CardDescription>
              {viewingUnposted
                ? "Unposted adjustments (MovStat = 0). Read-only — opening a document does not post it."
                : "Posted adjustments only (MovStat = 1). Values use sales price only."}{" "}
              Click a row to open item details. Scope is enforced by the API for
              your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : null}
            {!loading && !error && items.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                {viewingUnposted
                  ? "لا توجد حركات غير مرحلة تطابق عوامل التصفية ونطاق صلاحياتك."
                  : "No posted inventory adjustments match your filters and scope."}
              </p>
            ) : null}
            {!loading && items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Store</TableHead>
                    {viewingUnposted ? (
                      <TableHead>Status</TableHead>
                    ) : null}
                    <TableHead className="text-end">Increase value</TableHead>
                    <TableHead className="text-end">Decrease value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow
                      key={row.headerId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => void openDetail(row.headerId)}
                    >
                      <TableCell>{row.adjustmentDate ?? "—"}</TableCell>
                      <TableCell>{row.storeName ?? row.storeId ?? "—"}</TableCell>
                      {viewingUnposted ? (
                        <TableCell>
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                            غير مرحّل
                          </span>
                        </TableCell>
                      ) : null}
                      <TableCell className="text-end">
                        {formatMoney(row.totalIncreaseValue)}
                      </TableCell>
                      <TableCell className="text-end">
                        {formatMoney(row.totalDecreaseValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span>
                Adjustment #{detail?.adjustmentNumber ?? selectedHeaderId ?? "—"}
              </span>
              {detail && !detail.isPosted ? (
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                  غير مرحّل · Unposted
                </span>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              {detail?.adjustmentDate ?? "—"} · {detail?.storeName ?? "—"} ·
              Increase {formatMoney(detail?.totalIncreaseValue)} · Decrease{" "}
              {formatMoney(detail?.totalDecreaseValue)}
              {detail && !detail.isPosted
                ? " · View only (document is not posted)."
                : null}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <p className="text-muted-foreground text-sm">Loading details…</p>
          ) : null}
          {detailError ? (
            <p className="text-destructive text-sm" role="alert">
              {detailError}
            </p>
          ) : null}

          {!detailLoading && detail ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-end">Incr. qty</TableHead>
                    <TableHead className="text-end">Decr. qty</TableHead>
                    <TableHead className="text-end">Sales price</TableHead>
                    <TableHead className="text-end">Increase value</TableHead>
                    <TableHead className="text-end">Decrease value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No detail lines.
                      </TableCell>
                    </TableRow>
                  ) : (
                    detail.lines.map((line, index) => (
                      <TableRow key={`${line.itemCode ?? "line"}-${index}`}>
                        <TableCell>
                          <div className="font-medium">{line.itemCode ?? "—"}</div>
                          <div className="text-muted-foreground text-xs" dir="rtl">
                            {line.itemNameArabic ?? line.itemNameEnglish ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-end">
                          {formatQty(line.increaseQuantity)}
                        </TableCell>
                        <TableCell className="text-end">
                          {formatQty(line.decreaseQuantity)}
                        </TableCell>
                        <TableCell className="text-end">
                          {formatMoney(line.salesPrice)}
                        </TableCell>
                        <TableCell className="text-end">
                          {formatMoney(line.increaseValue)}
                        </TableCell>
                        <TableCell className="text-end">
                          {formatMoney(line.decreaseValue)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {detail.lines.length > 0 ? (
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell>Total</TableCell>
                      <TableCell colSpan={4} />
                      <TableCell className="text-end">
                        {formatMoney(detail.totalIncreaseValue)}
                      </TableCell>
                      <TableCell className="text-end">
                        {formatMoney(detail.totalDecreaseValue)}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </PageGuard>
  );
}
