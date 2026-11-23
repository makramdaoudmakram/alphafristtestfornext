"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, getShiftAcceptPending } from "@/lib/api-client";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { ShiftAcceptPendingRow } from "@/types/shift-accept";

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function parseMoneyInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function ShiftAcceptPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken ?? null;
  const sessionReady = status !== "loading";

  const [rows, setRows] = useState<ShiftAcceptPendingRow[]>([]);
  const [receivedByShiftId, setReceivedByShiftId] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setLoadError(null);
    try {
      const result = await getShiftAcceptPending(token);
      setRows(result.rows);
      const initial: Record<number, string> = {};
      for (const row of result.rows) {
        initial[row.shiftId] = String(row.transferValue);
      }
      setReceivedByShiftId(initial);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to load shifts";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady || !token) return;
    void loadPending();
  }, [sessionReady, token, loadPending]);

  const isEmpty = !loading && !loadError && rows.length === 0;

  const transferById = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of rows) map.set(row.shiftId, row.transferValue);
    return map;
  }, [rows]);

  return (
    <PageGuard permission={PERMISSIONS.shiftAccept.view}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Shift Accept</h1>
            <p className="text-muted-foreground text-sm">
              Review pharmacy shift transfers pending head-office acceptance.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!token || loading}
            onClick={() => void loadPending()}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending shifts</CardTitle>
            <CardDescription>Only shifts with Send ledger = 0 are listed (all pharmacies).</CardDescription>
          </CardHeader>
          <CardContent>
            {loadError ? (
              <p className="text-destructive text-sm" role="alert">
                {loadError}
              </p>
            ) : loading && rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : isEmpty ? (
              <p className="text-muted-foreground text-sm">No pending shifts.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pharmacy Name</TableHead>
                      <TableHead>Shift No</TableHead>
                      <TableHead>Shift Open Date &amp; Time</TableHead>
                      <TableHead className="text-end">Transfer Value</TableHead>
                      <TableHead className="text-end">Received Value</TableHead>
                      <TableHead className="text-end">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const transfer = transferById.get(row.shiftId) ?? row.transferValue;
                      const receivedRaw =
                        receivedByShiftId[row.shiftId] ?? String(row.transferValue);
                      return (
                        <TableRow key={row.shiftId}>
                          <TableCell>{row.pharmacyName?.trim() || "—"}</TableCell>
                          <TableCell>{row.scId}</TableCell>
                          <TableCell>{formatDateTime(row.startTime)}</TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatMoney(transfer)}
                          </TableCell>
                          <TableCell className="text-end">
                            <Input
                              className="ms-auto max-w-[9rem] text-end tabular-nums"
                              inputMode="decimal"
                              value={receivedRaw}
                              onChange={(e) => {
                                const next = e.target.value;
                                setReceivedByShiftId((prev) => ({
                                  ...prev,
                                  [row.shiftId]: next,
                                }));
                              }}
                              onBlur={(e) => {
                                const parsed = parseMoneyInput(e.target.value);
                                if (parsed === null) {
                                  toast.error("Enter a valid number for received value.");
                                  setReceivedByShiftId((prev) => ({
                                    ...prev,
                                    [row.shiftId]: String(transfer),
                                  }));
                                }
                              }}
                              aria-label={`Received value for shift ${row.scId}`}
                            />
                          </TableCell>
                          <TableCell className="text-end">
                            <Button type="button" size="sm" variant="default">
                              Accept
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}