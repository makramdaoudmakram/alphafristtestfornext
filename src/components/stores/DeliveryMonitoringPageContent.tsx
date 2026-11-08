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
import {
  ApiError,
  getDeliveryMonitoringPendingSales,
  getDeliveryMonitoringPendingTransfers,
  getDeliveryMonitoringStatistics,
} from "@/lib/api-client";
import { PERMISSIONS } from "@/lib/route-permissions";
import type {
  DeliveryMonitoringEmployeeStatistics,
  DeliveryMonitoringPendingSale,
  DeliveryMonitoringPendingTransfer,
} from "@/types/delivery-monitoring";

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatLocalDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultMonthStartIso(): string {
  const now = new Date();
  return formatLocalDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
}

function todayIso(): string {
  return formatLocalDateInput(new Date());
}

export function DeliveryMonitoringPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken ?? null;
  const sessionReady = status !== "loading";

  const [pendingSales, setPendingSales] = useState<DeliveryMonitoringPendingSale[]>(
    []
  );
  const [pendingSalesTotal, setPendingSalesTotal] = useState(0);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState<string | null>(null);

  const [pendingTransfers, setPendingTransfers] = useState<
    DeliveryMonitoringPendingTransfer[]
  >([]);
  const [pendingTransfersTotal, setPendingTransfersTotal] = useState(0);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [transfersError, setTransfersError] = useState<string | null>(null);

  const [statsRows, setStatsRows] = useState<DeliveryMonitoringEmployeeStatistics[]>(
    []
  );
  const [statsTotals, setStatsTotals] = useState({
    sales: 0,
    transfers: 0,
    total: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(defaultMonthStartIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const filteredStatsRows = useMemo(() => {
    const needle = employeeSearch.trim().toLowerCase();
    if (!needle) return statsRows;
    return statsRows.filter((row) => {
      const name = (row.employeeName ?? `#${row.employeeId}`).trim().toLowerCase();
      return name.includes(needle);
    });
  }, [employeeSearch, statsRows]);

  const loadSalesSeq = useRef(0);
  const loadTransfersSeq = useRef(0);
  const loadStatsSeq = useRef(0);

  const loadPendingSales = useCallback(async () => {
    if (!token) return;
    const seq = ++loadSalesSeq.current;
    setSalesLoading(true);
    setSalesError(null);
    try {
      const result = await getDeliveryMonitoringPendingSales(token);
      if (seq !== loadSalesSeq.current) return;
      setPendingSales(result.items);
      setPendingSalesTotal(result.totalRecords);
    } catch (error) {
      if (seq !== loadSalesSeq.current) return;
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to load pending sales deliveries";
      setSalesError(message);
      setPendingSales([]);
      setPendingSalesTotal(0);
      toast.error(message);
    } finally {
      if (seq === loadSalesSeq.current) setSalesLoading(false);
    }
  }, [token]);

  const loadPendingTransfers = useCallback(async () => {
    if (!token) return;
    const seq = ++loadTransfersSeq.current;
    setTransfersLoading(true);
    setTransfersError(null);
    try {
      const result = await getDeliveryMonitoringPendingTransfers(token);
      if (seq !== loadTransfersSeq.current) return;
      setPendingTransfers(result.items);
      setPendingTransfersTotal(result.totalRecords);
    } catch (error) {
      if (seq !== loadTransfersSeq.current) return;
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to load pending pharmacy transfers";
      setTransfersError(message);
      setPendingTransfers([]);
      setPendingTransfersTotal(0);
      toast.error(message);
    } finally {
      if (seq === loadTransfersSeq.current) setTransfersLoading(false);
    }
  }, [token]);

  const loadStatistics = useCallback(
    async (from?: string, to?: string) => {
      if (!token) return;
      const seq = ++loadStatsSeq.current;
      setStatsLoading(true);
      setStatsError(null);
      const useFrom = from ?? dateFrom;
      const useTo = to ?? dateTo;
      try {
        const result = await getDeliveryMonitoringStatistics(token, {
          dateFrom: useFrom,
          dateTo: useTo,
        });
        if (seq !== loadStatsSeq.current) return;
        setStatsRows(result.items);
        setStatsTotals({
          sales: result.totalSalesDeliveries,
          transfers: result.totalAcceptedTransfers,
          total: result.totalCompletedOrders,
        });
        setAppliedFrom(result.appliedDateFrom);
        setAppliedTo(result.appliedDateTo);
      } catch (error) {
        if (seq !== loadStatsSeq.current) return;
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to load delivery statistics";
        setStatsError(message);
        setStatsRows([]);
        setStatsTotals({ sales: 0, transfers: 0, total: 0 });
        toast.error(message);
      } finally {
        if (seq === loadStatsSeq.current) setStatsLoading(false);
      }
    },
    [token, dateFrom, dateTo]
  );

  useEffect(() => {
    if (!sessionReady || !token) return;
    void loadPendingSales();
    void loadPendingTransfers();
    void loadStatistics(dateFrom, dateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, token]);

  const handleSearchStatistics = () => {
    void loadStatistics(dateFrom, dateTo);
  };

  return (
    <PageGuard permission={PERMISSIONS.deliveryMonitoring.view}>
      <div className="flex flex-col gap-4 p-4" dir="auto">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            متابعة المناديب والإحصائيات
            <span className="ms-2 text-base font-normal text-muted-foreground">
              Delivery Monitoring &amp; Statistics
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Company-wide administrative view — all pharmacies, no active-pharmacy
            filter.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="flex max-h-[28rem] flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    طلبات التوصيل المعلقة
                    <span className="ms-2 font-normal text-muted-foreground">
                      Pending delivery orders
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {pendingSalesTotal.toLocaleString()} records · DelivStat P
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={salesLoading}
                  onClick={() => void loadPendingSales()}
                >
                  <RefreshCw className="me-1 size-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-auto">
              {salesError ? (
                <p className="text-destructive text-sm" role="alert">
                  {salesError}
                </p>
              ) : null}
              {salesLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : null}
              {!salesLoading && !salesError && pendingSales.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No pending sales deliveries.
                </p>
              ) : null}
              {!salesLoading && pendingSales.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date &amp; time</TableHead>
                      <TableHead>Pharmacy</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead className="text-end">Order total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSales.map((row) => (
                      <TableRow key={row.deliveryInfoId}>
                        <TableCell>{row.orderDateTimeCairo ?? "—"}</TableCell>
                        <TableCell dir="rtl" className="text-right">
                          {row.pharmacyName ?? "—"}
                        </TableCell>
                        <TableCell>{row.deliveryEmployeeName ?? "—"}</TableCell>
                        <TableCell className="text-end">
                          {formatMoney(row.orderTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </CardContent>
          </Card>

          <Card className="flex max-h-[28rem] flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    تحويلات الصيدليات المعلقة
                    <span className="ms-2 font-normal text-muted-foreground">
                      Pending pharmacy transfers
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {pendingTransfersTotal.toLocaleString()} records · TraFlag 1
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={transfersLoading}
                  onClick={() => void loadPendingTransfers()}
                >
                  <RefreshCw className="me-1 size-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-auto">
              {transfersError ? (
                <p className="text-destructive text-sm" role="alert">
                  {transfersError}
                </p>
              ) : null}
              {transfersLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : null}
              {!transfersLoading && !transfersError && pendingTransfers.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No pending pharmacy transfers.
                </p>
              ) : null}
              {!transfersLoading && pendingTransfers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transfer date</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>From pharmacy</TableHead>
                      <TableHead>To pharmacy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTransfers.map((row) => (
                      <TableRow key={row.transferHeaderId}>
                        <TableCell>
                          {row.transferDateTimeCairo ??
                            row.transferDate ??
                            "—"}
                        </TableCell>
                        <TableCell>{row.deliveryEmployeeName ?? "—"}</TableCell>
                        <TableCell dir="rtl" className="text-right">
                          {row.sourcePharmacyName ?? "—"}
                        </TableCell>
                        <TableCell dir="rtl" className="text-right">
                          {row.destinationPharmacyName ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              أداء المناديب
              <span className="ms-2 text-base font-normal text-muted-foreground">
                Delivery employee performance
              </span>
            </CardTitle>
            <CardDescription>
              Accepted sales deliveries (DelivStat C, SecUpdateDate) and accepted
              transfers (TraFlag 2, TraUpdateDatetime). Applied: {appliedFrom || "—"}{" "}
              → {appliedTo || "—"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="delivery-monitoring-from">From date</Label>
                <Input
                  id="delivery-monitoring-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-monitoring-to">To date</Label>
                <Input
                  id="delivery-monitoring-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={statsLoading}
                onClick={handleSearchStatistics}
              >
                Search
              </Button>
            </div>

            {statsError ? (
              <p className="text-destructive text-sm" role="alert">
                {statsError}
              </p>
            ) : null}
            {statsLoading ? (
              <p className="text-muted-foreground text-sm">Loading statistics…</p>
            ) : null}

            {!statsLoading && !statsError ? (
              <div className="space-y-2">
                <Label htmlFor="delivery-monitoring-employee-search">
                  Search delivery employee
                </Label>
                <Input
                  id="delivery-monitoring-employee-search"
                  type="search"
                  placeholder="Type a name (e.g. Makram)"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  autoComplete="off"
                  className="max-w-md"
                />
              </div>
            ) : null}

            {!statsLoading && !statsError ? (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Delivery employee</TableHead>
                      <TableHead className="text-end">Sales orders</TableHead>
                      <TableHead className="text-end">Accepted transfers</TableHead>
                      <TableHead className="text-end">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statsRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          No completed delivery work in this period.
                        </TableCell>
                      </TableRow>
                    ) : filteredStatsRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          No delivery employees match your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStatsRows.map((row) => (
                        <TableRow key={row.employeeId}>
                          <TableCell>{row.employeeName ?? `#${row.employeeId}`}</TableCell>
                          <TableCell className="text-end">
                            {row.salesDeliveryCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-end">
                            {row.acceptedTransferCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-end">
                            {row.totalCompletedOrders.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {statsRows.length > 0 ? (
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-end">
                          {statsTotals.sales.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-end">
                          {statsTotals.transfers.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-end">
                          {statsTotals.total.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
