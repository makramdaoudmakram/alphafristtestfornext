"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageGuard } from "@/components/permissions/page-guard";
import { ShiftClosingThermalReceipt } from "@/components/shift/ShiftClosingThermalReceipt";
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
import { ApiError, getClosedShifts, getShiftClosingReceipt } from "@/lib/api-client";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { ShiftClosingReceipt } from "@/types/shift-closing-receipt";
import type { ClosedShiftListItem } from "@/types/shift-print";
import type { ReceiptPaperWidth } from "@/types/sales-receipt";

const PAGE_SIZE = 20;
const receiptPaperWidth: ReceiptPaperWidth = 80;

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTotalSales(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const parsed = Number.parseFloat(value);
  if (Number.isFinite(parsed)) {
    return parsed.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return value.trim();
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function ShiftPrintPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken ?? null;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<ClosedShiftListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [printingScId, setPrintingScId] = useState<number | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<ShiftClosingReceipt | null>(null);

  const listRequestSeq = useRef(0);
  const printRequestSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPageNumber(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadList = useCallback(async () => {
    if (!token) {
      setItems([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++listRequestSeq.current;

    setLoading(true);
    setLoadError(null);
    try {
      const page = await getClosedShifts(token, {
        pageNumber,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        signal: controller.signal,
      });
      if (seq !== listRequestSeq.current) return;
      setItems(page.items);
      setTotalCount(page.totalCount);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (seq !== listRequestSeq.current) return;
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to load closed shifts";
      setLoadError(message);
      setItems([]);
      setTotalCount(0);
      toast.error(message);
    } finally {
      if (seq === listRequestSeq.current) setLoading(false);
    }
  }, [token, pageNumber, debouncedSearch]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadList();
  }, [sessionReady, loadList]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  const handlePrint = useCallback(
    async (row: ClosedShiftListItem) => {
      if (!token) {
        toast.error("Sign in is required.");
        return;
      }

      const targetScId = row.scId;
      const seq = ++printRequestSeq.current;
      setPrintingScId(targetScId);
      setReceiptToPrint(null);

      try {
        const receipt = await getShiftClosingReceipt(token, targetScId);
        if (seq !== printRequestSeq.current) return;
        if (receipt.summary.scId !== targetScId) {
          toast.error("Receipt did not match the selected shift.");
          return;
        }
        setReceiptToPrint(receipt);
      } catch (error) {
        if (seq !== printRequestSeq.current) return;
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to load shift receipt";
        toast.error(message);
      } finally {
        if (seq === printRequestSeq.current) setPrintingScId(null);
      }
    },
    [token]
  );

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const canGoPrev = pageNumber > 1;
  const canGoNext = pageNumber < pageCount;

  return (
    <PageGuard permission={PERMISSIONS.sales.view}>
      <div className="flex flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Shift Print</h1>
          <p className="text-muted-foreground text-sm">
            Closed shifts for the current pharmacy. Print a historical closing receipt by serial.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Search</CardTitle>
            <CardDescription>
              Shift serial (exact) or start date (for example 2026-03-11).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="shift-print-search">Search</Label>
              <Input
                id="shift-print-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Serial or start date"
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => void loadList()}
            >
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Closed shifts ({totalCount})</CardTitle>
            <CardDescription>Newest serial first.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loadError ? (
              <p className="text-destructive text-sm" role="alert">{loadError}</p>
            ) : null}
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading closed shifts…</p>
            ) : null}
            {!loading && !loadError && items.length === 0 ? (
              <p className="text-muted-foreground text-sm">No closed shifts found.</p>
            ) : null}
            {!loading && items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>TotalSales</TableHead>
                    <TableHead>Send Money</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.scId}>
                      <TableCell>{row.scId}</TableCell>
                      <TableCell>{formatDateTime(row.startTime)}</TableCell>
                      <TableCell>{formatTotalSales(row.totalSales)}</TableCell>
                      <TableCell>{formatMoney(row.sendMoney)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={printingScId === row.scId}
                          onClick={() => void handlePrint(row)}
                        >
                          <Printer className="mr-2 size-4" />
                          {printingScId === row.scId ? "Loading…" : "Print"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || !canGoPrev}
                onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className="text-muted-foreground text-sm">
                Page {pageNumber} of {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || !canGoNext}
                onClick={() => setPageNumber((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>

        {receiptToPrint ? (
          <ShiftClosingThermalReceipt
            receipt={receiptToPrint}
            width={receiptPaperWidth}
            autoPrint
            onClose={() => setReceiptToPrint(null)}
          />
        ) : null}
      </div>
    </PageGuard>
  );
}
