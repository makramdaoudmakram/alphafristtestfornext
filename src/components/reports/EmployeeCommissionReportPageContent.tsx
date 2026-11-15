"use client";

import { useCallback, useEffect, useState } from "react";
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
  getEmployeeCommissionDetails,
  getEmployeeCommissionSummary,
} from "@/lib/api-client";
import { PERMISSIONS } from "@/lib/route-permissions";
import type {
  EmployeeCommissionLine,
  EmployeeCommissionSummaryRow,
} from "@/types/employee-commission-report";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function EmployeeCommissionReportPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken ?? null;
  const sessionReady = status !== "loading";

  const [summary, setSummary] = useState<EmployeeCommissionSummaryRow[]>([]);
  const [details, setDetails] = useState<EmployeeCommissionLine[]>([]);
  const [detailsTotal, setDetailsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(todayIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");

  const loadReport = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setLoadError(null);
    try {
      const [summaryRes, detailsRes] = await Promise.all([
        getEmployeeCommissionSummary(token, { dateFrom, dateTo }),
        getEmployeeCommissionDetails(token, {
          dateFrom,
          dateTo,
          empId: selectedEmpId.trim() ? Number(selectedEmpId) : undefined,
        }),
      ]);
      setSummary(summaryRes.rows);
      setDetails(detailsRes.lines);
      setDetailsTotal(detailsRes.totalCommission);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to load report";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token, dateFrom, dateTo, selectedEmpId]);

  useEffect(() => {
    if (!sessionReady || !token) return;
    void loadReport();
  }, [sessionReady, token, loadReport]);

  return (
    <PageGuard permission={PERMISSIONS.employeeCommissionReport.view}>
      <div className="flex flex-col gap-4 p-4" dir="auto">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            عمولة الموظفين
            <span className="ms-2 text-base font-normal text-muted-foreground">
              Employee Commission (all pharmacies)
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Saved <code className="text-xs">SalerCom</code> on finalized sales only; returns excluded.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Management view across all pharmacies</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="ec-date-from">Start date</Label>
              <Input
                id="ec-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ec-date-to">End date</Label>
              <Input
                id="ec-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ec-emp">Employee Id (empty = all)</Label>
              <Input
                id="ec-emp"
                inputMode="numeric"
                placeholder="All employees"
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
              />
            </div>
            <Button type="button" onClick={() => void loadReport()} disabled={loading}>
              <RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Search
            </Button>
          </CardContent>
        </Card>

        {loadError ? <p className="text-destructive text-sm">{loadError}</p> : null}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Employee summary</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-end">Transactions</TableHead>
                  <TableHead className="text-end">Total commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      {loading ? "Loading…" : "No employees with finalized sales in range."}
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.map((r) => (
                    <TableRow
                      key={r.empId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedEmpId(String(r.empId))}
                    >
                      <TableCell>
                        {r.employeeName ?? r.empId}
                        <span className="text-muted-foreground ms-1 text-xs">#{r.empId}</span>
                      </TableCell>
                      <TableCell className="text-end">{r.finalizedTransactionCount}</TableCell>
                      <TableCell className="text-end">{formatMoney(r.totalCommission)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Commission lines</CardTitle>
            <CardDescription>
              Lines with commission &gt; 0 · total {formatMoney(detailsTotal)}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Pharmacy</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-end">Qty</TableHead>
                  <TableHead className="text-end">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {loading ? "Loading…" : "No commission lines in range."}
                    </TableCell>
                  </TableRow>
                ) : (
                  details.map((r, i) => (
                    <TableRow key={`${r.invoiceNo}-${i}`}>
                      <TableCell>{r.invoiceNo}</TableCell>
                      <TableCell>
                        {r.invoiceDateUtc
                          ? new Date(r.invoiceDateUtc).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>{r.pharmacyName ?? r.pharmacyId ?? "—"}</TableCell>
                      <TableCell>{r.employeeName ?? r.empId ?? "—"}</TableCell>
                      <TableCell>{r.itemName ?? "—"}</TableCell>
                      <TableCell className="text-end">{r.quantity}</TableCell>
                      <TableCell className="text-end">{formatMoney(r.commission)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}