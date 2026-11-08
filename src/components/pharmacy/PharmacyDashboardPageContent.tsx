"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
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
import { ApiError } from "@/lib/api-client";
import {
  cairoMonthStart,
  cairoTodayIso,
  clampRangeToCurrentMonth,
  last7DaysRange,
} from "@/lib/pharmacy-dashboard-dates";
import { getPharmacyDashboard } from "@/lib/pharmacy-dashboard-api";
import { PERMISSIONS } from "@/lib/route-permissions";
import type {
  PharmacyDashboardEmployeeRow,
  PharmacyDashboardMetricComparison,
  PharmacyDashboardPayload,
} from "@/types/pharmacy-dashboard";

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercentChange(metric: PharmacyDashboardMetricComparison): string {
  if (metric.percentUnavailable || metric.percentChange === null) return "New period";
  const sign = metric.percentChange > 0 ? "+" : "";
  return `${sign}${metric.percentChange.toFixed(2)}%`;
}

type EmployeeSortKey = "sales" | "invoices";
type DatePreset = "month" | "last7" | "custom";

function BarChart({
  values,
  max,
  label,
  className = "bg-primary/80",
}: {
  values: number[];
  max: number;
  label: string;
  className?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  return (
    <div className="flex h-40 items-end gap-1" aria-label={label}>
      {values.map((value, index) => (
        <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className={`${className} w-full rounded-t-sm`}
            style={{ height: `${Math.max(4, (value / safeMax) * 100)}%` }}
            title={formatMoney(value)}
          />
        </div>
      ))}
    </div>
  );
}

export function PharmacyDashboardPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken ?? null;
  const sessionReady = status !== "loading";

  const monthBounds = useMemo(
    () => ({ min: cairoMonthStart(), max: cairoTodayIso() }),
    []
  );

  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [customFrom, setCustomFrom] = useState(monthBounds.min);
  const [customTo, setCustomTo] = useState(monthBounds.max);
  const [data, setData] = useState<PharmacyDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeSort, setEmployeeSort] = useState<EmployeeSortKey>("sales");

  const activeRange = useMemo(() => {
    if (datePreset === "month") {
      return { from: monthBounds.min, to: monthBounds.max };
    }
    if (datePreset === "last7") {
      return last7DaysRange();
    }
    return { from: customFrom, to: customTo };
  }, [customFrom, customTo, datePreset, monthBounds]);

  const load = useCallback(async () => {
    if (!token) return;
    const validated = clampRangeToCurrentMonth(activeRange.from, activeRange.to);
    if (validated.error) {
      setError(validated.error);
      toast.error(validated.error);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setData(await getPharmacyDashboard(token, validated));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load pharmacy dashboard";
      setError(message);
      setData(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [activeRange.from, activeRange.to, token]);

  useEffect(() => {
    if (!sessionReady || !token) return;
    void load();
  }, [sessionReady, token, load]);

  const sortedEmployees = useMemo(() => {
    if (!data) return [];
    const rows = [...data.employees];
    rows.sort((a, b) =>
      employeeSort === "sales"
        ? b.totalSales - a.totalSales || b.invoiceCount - a.invoiceCount
        : b.invoiceCount - a.invoiceCount || b.totalSales - a.totalSales
    );
    return rows;
  }, [data, employeeSort]);

  const dailyNetTotals = data?.dailyNetSalesTrend.map((p) => p.netSales) ?? [];
  const dailyNetMax = Math.max(0, ...dailyNetTotals);
  const topEmployees = sortedEmployees.slice(0, 8);
  const employeeBarMax = Math.max(0, ...topEmployees.map((e) => e.totalSales));
  const comparison = data?.periodComparison;

  return (
    <PageGuard permission={PERMISSIONS.sales.view}>
      <div className="space-y-6 p-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Pharmacy Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">
              {data?.overview.pharmacyName ?? "Active pharmacy"} ·{" "}
              {data?.overview.periodLabel ?? "Current month"}
            </p>
            {data?.reporting.lastSqliteSyncedAt ? (
              <p className="text-muted-foreground text-xs">
                Reporting snapshot:{" "}
                {new Date(data.reporting.lastSqliteSyncedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw className="me-2 size-4" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reporting period</CardTitle>
            <CardDescription>
              Current Cairo month only · through today ({monthBounds.min} – {monthBounds.max})
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <PeriodPresetButton
              active={datePreset === "month"}
              label="This month"
              onClick={() => setDatePreset("month")}
            />
            <PeriodPresetButton
              active={datePreset === "last7"}
              label="Last 7 days"
              onClick={() => setDatePreset("last7")}
            />
            <PeriodPresetButton
              active={datePreset === "custom"}
              label="Custom"
              onClick={() => setDatePreset("custom")}
            />
            {datePreset === "custom" ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  className="w-auto"
                  min={monthBounds.min}
                  max={monthBounds.max}
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="date"
                  className="w-auto"
                  min={monthBounds.min}
                  max={monthBounds.max}
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-destructive/40">
            <CardContent className="pt-6 text-destructive text-sm">{error}</CardContent>
          </Card>
        ) : null}

        {!data?.reporting.sqliteSalesAvailable && data ? (
          <Card className="border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30">
            <CardContent className="pt-6 text-sm">
              {data.reporting.sqliteUnavailableReason ??
                "Sales KPIs from SQLite reporting are temporarily unavailable. Expenses and transfer alerts still load from operational data."}
            </CardContent>
          </Card>
        ) : null}

        {loading ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading dashboard…
          </p>
        ) : null}

        {data && !loading ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                title="Net sales"
                value={formatMoney(data.kpis.netSales)}
                icon={<TrendingUp className="size-4 text-violet-600" />}
              />
              <KpiCard
                title="Total sales (finalized)"
                value={formatMoney(data.kpis.totalSales)}
                icon={<TrendingUp className="size-4 text-emerald-600" />}
              />
              <KpiCard
                title="Sales invoices"
                value={data.kpis.invoiceCount.toLocaleString()}
                icon={<TrendingUp className="size-4 text-blue-600" />}
              />
              <KpiCard
                title="Sales returns"
                value={formatMoney(data.kpis.totalReturns)}
                subtitle={`${data.kpis.returnCount} documents`}
                icon={<TrendingDown className="size-4 text-amber-600" />}
              />
              <KpiCard
                title="Pharmacy expenses"
                value={formatMoney(data.kpis.totalExpenses)}
                icon={<TrendingDown className="size-4 text-rose-600" />}
              />
            </div>

            {comparison ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Month-over-month comparison</CardTitle>
                  <CardDescription>
                    Selected period vs{" "}
                    {comparison.comparisonPeriodStart} – {comparison.comparisonPeriodEnd}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <ComparisonMetric title="Net sales" metric={comparison.netSales} />
                    <ComparisonMetric title="Total sales" metric={comparison.totalSales} />
                    <ComparisonMetric title="Returns" metric={comparison.totalReturns} />
                    <ComparisonMetric title="Expenses" metric={comparison.totalExpenses} />
                    <ComparisonMetric
                      title="Invoice count"
                      metric={comparison.invoiceCount}
                      money={false}
                    />
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <PeriodComparisonChart
                      label="Net sales — current vs previous period"
                      current={comparison.netSales.current}
                      previous={comparison.netSales.previous}
                    />
                    <PeriodComparisonChart
                      label="Total sales — current vs previous period"
                      current={comparison.totalSales.current}
                      previous={comparison.totalSales.previous}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <TransferPanel
                title="Incoming — awaiting acceptance"
                empty="No incoming transfers pending acceptance."
                items={data.transfers.incoming}
                icon={<ArrowDownLeft className="size-4" />}
              />
              <TransferPanel
                title="Outgoing — not yet accepted"
                empty="No outgoing transfers awaiting acceptance."
                items={data.transfers.outgoing}
                icon={<ArrowUpRight className="size-4" />}
              />
            </div>

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Employee performance</CardTitle>
                  <CardDescription>
                    Attribution from saved invoice headers (cashier / creator).
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={employeeSort === "sales" ? "default" : "outline"}
                    onClick={() => setEmployeeSort("sales")}
                  >
                    By sales
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={employeeSort === "invoices" ? "default" : "outline"}
                    onClick={() => setEmployeeSort("invoices")}
                  >
                    By invoices
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {sortedEmployees.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No employee sales in this period.</p>
                ) : (
                  <table className="w-full min-w-[36rem] text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-2">Employee</th>
                        <th className="p-2 text-end">Sales</th>
                        <th className="p-2 text-end">Invoices</th>
                        <th className="p-2 text-end">Returns</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEmployees.map((row) => (
                        <EmployeeRow key={row.employeeKey} row={row} />
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Daily net sales</CardTitle>
                  <CardDescription>
                    MovementFact · sales − returns · selected period (Cairo dates)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChart
                    values={dailyNetTotals}
                    max={dailyNetMax}
                    label="Daily net sales"
                    className="bg-violet-600/85"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sales vs returns</CardTitle>
                  <CardDescription>Selected period totals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ComparisonBar
                    label="Sales"
                    value={data.salesReturnsComparison?.salesTotal ?? 0}
                    max={Math.max(
                      data.salesReturnsComparison?.salesTotal ?? 0,
                      data.salesReturnsComparison?.returnsTotal ?? 0,
                      1
                    )}
                    tone="sales"
                  />
                  <ComparisonBar
                    label="Returns"
                    value={data.salesReturnsComparison?.returnsTotal ?? 0}
                    max={Math.max(
                      data.salesReturnsComparison?.salesTotal ?? 0,
                      data.salesReturnsComparison?.returnsTotal ?? 0,
                      1
                    )}
                    tone="returns"
                  />
                  <ComparisonBar
                    label="Net sales"
                    value={data.kpis.netSales}
                    max={Math.max(data.kpis.netSales, 1)}
                    tone="sales"
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top employees — sales</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  values={topEmployees.map((e) => e.totalSales)}
                  max={employeeBarMax}
                  label="Employee sales comparison"
                />
                <div className="text-muted-foreground mt-2 flex flex-wrap gap-2 text-xs">
                  {topEmployees.map((e) => (
                    <span key={e.employeeKey}>{e.employeeName ?? e.employeeKey}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </PageGuard>
  );
}

function PeriodPresetButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button type="button" size="sm" variant={active ? "default" : "outline"} onClick={onClick}>
      {label}
    </Button>
  );
}

function ComparisonMetric({
  title,
  metric,
  money = true,
}: {
  title: string;
  metric: PharmacyDashboardMetricComparison;
  money?: boolean;
}) {
  const fmt = (v: number) => (money ? formatMoney(v) : v.toLocaleString());
  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="font-medium">{title}</div>
      <div className="mt-1 tabular-nums">{fmt(metric.current)}</div>
      <div className="text-muted-foreground text-xs">
        vs {fmt(metric.previous)} · Δ {fmt(metric.difference)} · {formatPercentChange(metric)}
      </div>
    </div>
  );
}

function PeriodComparisonChart({
  label,
  current,
  previous,
}: {
  label: string;
  current: number;
  previous: number;
}) {
  const max = Math.max(current, previous, 1);
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs">{label}</p>
      <div className="space-y-2">
        <ComparisonBar label="Current period" value={current} max={max} tone="sales" />
        <ComparisonBar label="Previous equivalent" value={previous} max={max} tone="returns" />
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {subtitle ? <p className="text-muted-foreground text-xs">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
}

function TransferPanel({
  title,
  empty,
  items,
  icon,
}: {
  title: string;
  empty: string;
  items: PharmacyDashboardPayload["transfers"]["incoming"];
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
          <span className="bg-muted rounded-full px-2 py-0.5 text-xs font-normal">
            {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">{empty}</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.transferId}
              href={item.workflowHref}
              className="hover:bg-muted/60 block rounded-md border p-3 text-sm transition-colors"
            >
              <div className="font-medium">
                Transfer #{item.serialNo ?? item.transferId}
              </div>
              <div className="text-muted-foreground text-xs">
                {item.transferDate ?? "—"} · {item.sendingPharmacyName ?? "?"} →{" "}
                {item.receivingPharmacyName ?? "?"}
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function EmployeeRow({ row }: { row: PharmacyDashboardEmployeeRow }) {
  return (
    <tr className="border-b">
      <td className="p-2">{row.employeeName ?? row.employeeKey}</td>
      <td className="p-2 text-end tabular-nums">{formatMoney(row.totalSales)}</td>
      <td className="p-2 text-end tabular-nums">{row.invoiceCount}</td>
      <td className="p-2 text-end tabular-nums">{formatMoney(row.totalReturns)}</td>
    </tr>
  );
}

function ComparisonBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "sales" | "returns";
}) {
  const pct = Math.max(4, (value / max) * 100);
  const color = tone === "sales" ? "bg-emerald-600" : "bg-amber-600";
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums">{formatMoney(value)}</span>
      </div>
      <div className="bg-muted h-3 w-full overflow-hidden rounded-full">
        <div className={`${color} h-full rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
