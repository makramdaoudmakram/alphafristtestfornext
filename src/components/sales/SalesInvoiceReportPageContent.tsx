"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageGuard } from "@/components/permissions/page-guard";
import { SalesThermalReceipt } from "@/components/sales/SalesThermalReceipt";
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
  getFinalizedSalesInvoices,
  getSalesReceipt,
  getSalesSaleDetails,
} from "@/lib/api-client";
import { loadReceiptForPrint } from "@/lib/sales-receipt-print";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { FinalizedSaleListItem } from "@/types/sales-invoice-report";
import type { SalesReceiptLine } from "@/types/sales-receipt";
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

function formatInvoiceDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function SalesInvoiceReportPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken ?? null;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<FinalizedSaleListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [expandedSthIds, setExpandedSthIds] = useState<number[]>([]);
  const [linesBySthId, setLinesBySthId] = useState<Record<number, SalesReceiptLine[]>>({});
  const [loadingLinesSthId, setLoadingLinesSthId] = useState<number | null>(null);
  const [linesErrorSthId, setLinesErrorSthId] = useState<number | null>(null);

  const [printingSthId, setPrintingSthId] = useState<number | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<{
    receipt: import("@/types/sales-receipt").SalesReceipt;
    width: ReceiptPaperWidth;
  } | null>(null);

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
      const page = await getFinalizedSalesInvoices(token, {
        pageNumber,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        signal: controller.signal,
      });
      if (seq !== listRequestSeq.current) return;
      setItems(page.items);
      setTotalCount(page.totalCount);
      setExpandedSthIds([]);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (seq !== listRequestSeq.current) return;
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to load finalized invoices";
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

  const loadLines = useCallback(
    async (sthId: number) => {
      if (!token) return;
      setLoadingLinesSthId(sthId);
      setLinesErrorSthId(null);
      try {
        const details = await getSalesSaleDetails(token, sthId);
        setLinesBySthId((prev) => ({ ...prev, [sthId]: details.lines }));
      } catch {
        setLinesErrorSthId(sthId);
      } finally {
        setLoadingLinesSthId((prev) => (prev === sthId ? null : prev));
      }
    },
    [token]
  );

  const toggleRow = (row: FinalizedSaleListItem) => {
    const isOpen = expandedSthIds.includes(row.sthId);
    if (!isOpen && !linesBySthId[row.sthId] && loadingLinesSthId !== row.sthId) {
      void loadLines(row.sthId);
    }
    setExpandedSthIds((prev) =>
      isOpen ? prev.filter((id) => id !== row.sthId) : [...prev, row.sthId]
    );
  };

  const handlePrint = useCallback(
    async (row: FinalizedSaleListItem) => {
      if (!token) {
        toast.error("Sign in is required.");
        return;
      }

      const targetSthId = row.sthId;
      const seq = ++printRequestSeq.current;
      setPrintingSthId(targetSthId);
      setReceiptToPrint(null);

      try {
        const loaded = await loadReceiptForPrint({
          sthId: targetSthId,
          fetchReceipt: (id) => getSalesReceipt(token, id),
        });
        if (seq !== printRequestSeq.current) return;
        if (!loaded.ok) {
          toast.error(
            loaded.reason === "not-finalized"
              ? "This invoice is not finalized."
              : "Could not load the invoice receipt for printing."
          );
          return;
        }
        if (loaded.receipt.sthId !== targetSthId) {
          toast.error("Receipt did not match the selected invoice.");
          return;
        }
        setReceiptToPrint({ receipt: loaded.receipt, width: receiptPaperWidth });
      } catch (error) {
        if (seq !== printRequestSeq.current) return;
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to print invoice";
        toast.error(message);
      } finally {
        if (seq === printRequestSeq.current) setPrintingSthId(null);
      }
    },
    [token]
  );

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const canGoPrev = pageNumber > 1;
  const canGoNext = pageNumber < pageCount;

  return (
    <PageGuard permission={PERMISSIONS.sales.view}>
      <div className="flex flex-col gap-4 p-4" dir="auto">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            تقرير فواتير المبيعات
            <span className="ms-2 text-base font-normal text-muted-foreground">
              Sales Invoice Report
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Finalized sales invoices for the current pharmacy (server-scoped).
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Search</CardTitle>
            <CardDescription>
              Invoice serial (<code>Sth_Id</code>) or invoice date (for example 2026-04-02).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="sales-invoice-report-search">Search</Label>
              <Input
                id="sales-invoice-report-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Serial or invoice date"
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => void loadList()}
            >
              <RefreshCw className="me-2 size-4" />
              Refresh
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finalized invoices ({totalCount})</CardTitle>
            <CardDescription>Highest invoice number first.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loadError ? (
              <p className="text-destructive text-sm" role="alert">{loadError}</p>
            ) : null}
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading invoices…</p>
            ) : null}
            {!loading && !loadError && items.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No finalized invoices found.
              </p>
            ) : null}
            {!loading && items.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shift No</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Classify Name</TableHead>
                      <TableHead className="text-end">Value</TableHead>
                      <TableHead className="text-end">Print</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row) => {
                      const isExpanded = expandedSthIds.includes(row.sthId);
                      const lines = linesBySthId[row.sthId];
                      return (
                        <Fragment key={row.sthId}>
                          <TableRow
                            className="cursor-pointer select-none"
                            onClick={() => toggleRow(row)}
                          >
                            <TableCell>
                              <span
                                aria-hidden
                                className="text-muted-foreground me-1 inline-block w-3"
                              >
                                {isExpanded ? "▾" : "▸"}
                              </span>
                              {row.scId ?? "—"}
                            </TableCell>
                            <TableCell className="font-medium">{row.sthId}</TableCell>
                            <TableCell>{formatInvoiceDate(row.invoiceDate)}</TableCell>
                            <TableCell>{row.classifyName?.trim() || "—"}</TableCell>
                            <TableCell className="text-end">
                              {formatMoney(row.totalValue)}
                            </TableCell>
                            <TableCell
                              className="text-end"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={printingSthId === row.sthId}
                                onClick={() => void handlePrint(row)}
                              >
                                <Printer className="me-2 size-4" />
                                {printingSthId === row.sthId ? "Loading…" : "Print"}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded ? (
                            <TableRow>
                              <TableCell colSpan={6} className="bg-muted/30 p-3">
                                {loadingLinesSthId === row.sthId && !lines ? (
                                  <p className="text-muted-foreground text-sm">
                                    Loading invoice items…
                                  </p>
                                ) : linesErrorSthId === row.sthId && !lines ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm text-red-700">
                                      Failed to load invoice items.
                                    </span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => void loadLines(row.sthId)}
                                    >
                                      Retry
                                    </Button>
                                  </div>
                                ) : lines && lines.length > 0 ? (
                                  <div className="rounded-md border bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Code</TableHead>
                                          <TableHead>Item</TableHead>
                                          <TableHead>Unit</TableHead>
                                          <TableHead className="text-end">Qty</TableHead>
                                          <TableHead className="text-end">Price</TableHead>
                                          <TableHead className="text-end">Discount</TableHead>
                                          <TableHead className="text-end">Line Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {lines.map((line) => (
                                          <TableRow key={line.lineNo}>
                                            <TableCell>{line.itemCode ?? "—"}</TableCell>
                                            <TableCell dir="auto">
                                              {line.itemName ?? "—"}
                                            </TableCell>
                                            <TableCell>{line.unitName ?? "—"}</TableCell>
                                            <TableCell className="text-end">
                                              {line.quantity}
                                            </TableCell>
                                            <TableCell className="text-end">
                                              {formatMoney(line.unitPrice)}
                                            </TableCell>
                                            <TableCell className="text-end">
                                              {formatMoney(line.lineDiscount)}
                                            </TableCell>
                                            <TableCell className="text-end">
                                              {formatMoney(line.lineNet)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground text-sm">
                                    No item lines on this invoice.
                                  </p>
                                )}
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
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
          <SalesThermalReceipt
            receipt={receiptToPrint.receipt}
            width={receiptToPrint.width}
            onClose={() => setReceiptToPrint(null)}
          />
        ) : null}
      </div>
    </PageGuard>
  );
}
