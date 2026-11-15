"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
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
import { ApiError, postEmployeePersonalCommission } from "@/lib/api-client";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { EmployeeCommissionPersonalResponse } from "@/types/employee-commission-report";

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function MyCommissionReportPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? null;

  const [password, setPassword] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmployeeCommissionPersonalResponse | null>(null);

  const runReport = async () => {
    if (!token) return;
    if (!password.trim()) {
      toast.error("Enter employee password.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await postEmployeePersonalCommission(token, {
        password: password.trim(),
        dateFrom: dateFrom.trim() || undefined,
        dateTo: dateTo.trim() || undefined,
      });
      setResult(data);
      setPassword("");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not load commission";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageGuard permission={PERMISSIONS.sales.view}>
      <div className="flex flex-col gap-4 p-4" dir="auto">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            عمولتي
            <span className="ms-2 text-base font-normal text-muted-foreground">
              My Commission
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">
            All pharmacies · finalized sales · saved commission only
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Verify employee</CardTitle>
            <CardDescription>Same password used on the Sales screen</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="my-com-password">Password</Label>
              <Input
                id="my-com-password"
                type="password"
                autoComplete="off"
                placeholder="Employee password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="my-com-from">Date from (optional)</Label>
              <Input
                id="my-com-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="my-com-to">Date to (optional)</Label>
              <Input
                id="my-com-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button type="button" onClick={() => void runReport()} disabled={loading}>
              {loading ? "Loading…" : "Show my commission"}
            </Button>
          </CardContent>
        </Card>

        {result ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {result.employeeName ?? "Employee"} · #{result.empId}
                </CardTitle>
                <CardDescription>
                  {result.appliedDateFrom} — {result.appliedDateTo}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  Finalized transactions:{" "}
                  <strong>{result.finalizedTransactionCount}</strong>
                </div>
                <div>
                  Commission lines: <strong>{result.qualifyingLineCount}</strong>
                </div>
                <div>
                  Total commission:{" "}
                  <strong>{formatMoney(result.totalCommission)}</strong>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="overflow-x-auto pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Pharmacy</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-end">Qty</TableHead>
                      <TableHead className="text-end">Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No commission lines in this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      result.lines.map((r, i) => (
                        <TableRow key={`${r.invoiceNo}-${i}`}>
                          <TableCell>{r.invoiceNo}</TableCell>
                          <TableCell>
                            {r.invoiceDateUtc
                              ? new Date(r.invoiceDateUtc).toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell>{r.pharmacyName ?? r.pharmacyId ?? "—"}</TableCell>
                          <TableCell>{r.itemName ?? "—"}</TableCell>
                          <TableCell className="text-end">{r.quantity}</TableCell>
                          <TableCell className="text-end">
                            {formatMoney(r.commission)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </PageGuard>
  );
}