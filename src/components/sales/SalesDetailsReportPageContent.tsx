"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageGuard } from "@/components/permissions/page-guard";
import { usePharmacyScope } from "@/components/pharmacy/pharmacy-scope-provider";
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
import { ApiError, getSalesDetailsReport } from "@/lib/api-client";
import { PERMISSIONS } from "@/lib/route-permissions";
import type {
  SalesDetailsReportLine,
  SalesDetailsReportPage,
} from "@/types/sales-details-report";

const PAGE_SIZE = 20;

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQuantity(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString();
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return value;
}

const PAYMENT_TYPE_NOT_FINALIZED = "Not finalized";

function isNotFinalizedPaymentType(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === PAYMENT_TYPE_NOT_FINALIZED.toLowerCase();
}

function isFormFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function SalesDetailsReportPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken ?? null;
  const sessionReady = status !== "loading";
  const { activePharmacy, ready: scopeReady } = usePharmacyScope();

  const reportZoneRef = useRef<HTMLDivElement>(null);
  const listRequestSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const [items, setItems] = useState<SalesDetailsReportLine[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [historySearchAllowed, setHistorySearchAllowed] = useState(false);
  const [appliedDateFrom, setAppliedDateFrom] = useState<string>("");
  const [appliedDateTo, setAppliedDateTo] = useState<string>("");
  const [pharmacyNameFromApi, setPharmacyNameFromApi] = useState<string | null>(
    null
  );

  const [totalRecords, setTotalRecords] = useState(0);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const [dateFromInput, setDateFromInput] = useState("");
  const [dateToInput, setDateToInput] = useState("");

  const displayUserName =
    session?.user?.name?.trim() ||
    session?.user?.email?.trim() ||
    "—";
  const displayPharmacyName =
    pharmacyNameFromApi ||
    activePharmacy?.name ||
    "—";

  const applyPageMeta = useCallback((page: SalesDetailsReportPage) => {
    setItems(page.items);
    setTotalRecords(page.totalRecords);
    setTotalQuantity(page.totalQuantity);
    setPageNumber(page.pageNumber);
    setHasPreviousPage(page.hasPreviousPage);
    setHasNextPage(page.hasNextPage);
    setTotalPages(Math.max(1, page.totalPages));
    setHistorySearchAllowed(page.historySearchAllowed);
    setAppliedDateFrom(page.appliedDateFrom);
    setAppliedDateTo(page.appliedDateTo);
    setPharmacyNameFromApi(page.pharmacyName);
    if (!page.historySearchAllowed) {
      setDateFromInput(page.appliedDateFrom);
      setDateToInput(page.appliedDateTo);
    }
  }, []);

  const loadReport = useCallback(
    async (opts?: {
      page?: number;
      dateFrom?: string;
      dateTo?: string;
    }) => {
      if (!token) {
        setItems([]);
        setTotalRecords(0);
        setLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const seq = ++listRequestSeq.current;

      setLoading(true);
      setLoadError(null);

      const page = opts?.page ?? pageNumber;
      const dateFrom =
        opts?.dateFrom ??
        (historySearchAllowed ? dateFromInput : undefined);
      const dateTo =
        opts?.dateTo ?? (historySearchAllowed ? dateToInput : undefined);

      try {
        const result = await getSalesDetailsReport(token, {
          pageNumber: page,
          pageSize: PAGE_SIZE,
          dateFrom: historySearchAllowed ? dateFrom || undefined : undefined,
          dateTo: historySearchAllowed ? dateTo || undefined : undefined,
          signal: controller.signal,
        });
        if (seq !== listRequestSeq.current) return;

        applyPageMeta(result);
        if (result.historySearchAllowed) {
          if (!dateFromInput && result.appliedDateFrom) {
            setDateFromInput(result.appliedDateFrom);
          }
          if (!dateToInput && result.appliedDateTo) {
            setDateToInput(result.appliedDateTo);
          }
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (seq !== listRequestSeq.current) return;
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to load sales details report";
        setLoadError(message);
        setItems([]);
        setTotalRecords(0);
        toast.error(message);
      } finally {
        if (seq === listRequestSeq.current) setLoading(false);
      }
    },
    [
      token,
      pageNumber,
      historySearchAllowed,
      dateFromInput,
      dateToInput,
      applyPageMeta,
    ]
  );

  useEffect(() => {
    if (!sessionReady || !scopeReady || !token) return;
    void loadReport({ page: 1 });
    // Initial load when session/pharmacy scope is ready only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, scopeReady, token]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    const zone = reportZoneRef.current;
    if (!zone) return;

    const onContextMenu = (event: MouseEvent) => {
      if (zone.contains(event.target as Node)) {
        event.preventDefault();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isFormFieldTarget(event.target)) return;
      if (!zone.contains(event.target as Node)) return;
      if (!event.ctrlKey && !event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key === "c" || key === "x" || key === "p") {
        event.preventDefault();
      }
    };

    const onBeforePrint = () => {
      if (typeof window !== "undefined") {
        window.alert("Printing is disabled for this report.");
      }
    };

    zone.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("beforeprint", onBeforePrint);

    return () => {
      zone.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("beforeprint", onBeforePrint);
    };
  }, []);

  const handleSearchDates = () => {
    if (!historySearchAllowed) return;
    setPageNumber(1);
    void loadReport({ page: 1, dateFrom: dateFromInput, dateTo: dateToInput });
  };

  const handleRefresh = () => {
    void loadReport({ page: pageNumber });
  };

  const goPrev = () => {
    if (!hasPreviousPage) return;
    const next = Math.max(1, pageNumber - 1);
    setPageNumber(next);
    void loadReport({ page: next });
  };

  const goNext = () => {
    if (!hasNextPage) return;
    const next = pageNumber + 1;
    setPageNumber(next);
    void loadReport({ page: next });
  };

  return (
    <PageGuard permission={PERMISSIONS.salesDetailsReport.view}>
      <style jsx global>{`
        @media print {
          .sales-details-report-print-hide {
            display: none !important;
          }
        }
      `}</style>
      <div
        className="sales-details-report-print-hide flex flex-col gap-4 p-4"
        dir="auto"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            تقرير تفاصيل المبيعات
            <span className="ms-2 text-base font-normal text-muted-foreground">
              Sales Details Report
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">
            One row per sold item for the current pharmacy (server-scoped).
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Report context</CardTitle>
            <CardDescription>
              User: <span className="font-medium">{displayUserName}</span>
              {" · "}
              Pharmacy: <span className="font-medium">{displayPharmacyName}</span>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Date range</CardTitle>
            <CardDescription>
              {historySearchAllowed
                ? "Select a historical range. The API enforces authorization."
                : `Showing the latest three calendar days enforced by the API (${formatDateLabel(appliedDateFrom)} → ${formatDateLabel(appliedDateTo)}).`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            {historySearchAllowed ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sales-details-date-from">From date</Label>
                  <Input
                    id="sales-details-date-from"
                    type="date"
                    value={dateFromInput}
                    onChange={(e) => setDateFromInput(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sales-details-date-to">To date</Label>
                  <Input
                    id="sales-details-date-to"
                    type="date"
                    value={dateToInput}
                    onChange={(e) => setDateToInput(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loading}
                  onClick={handleSearchDates}
                >
                  Apply dates
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Effective period:{" "}
                <strong>{formatDateLabel(appliedDateFrom)}</strong> —{" "}
                <strong>{formatDateLabel(appliedDateTo)}</strong>
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={handleRefresh}
            >
              <RefreshCw className="me-2 size-4" />
              Refresh
            </Button>
          </CardContent>
        </Card>

        <Card ref={reportZoneRef}>
          <CardHeader>
            <CardTitle>
              Sales details ({totalRecords.toLocaleString()} lines)
            </CardTitle>
            <CardDescription>
              Total quantity for the full filtered period:{" "}
              {formatQuantity(totalQuantity)}.
            </CardDescription>
          </CardHeader>
          <CardContent
            className="select-none overflow-x-auto"
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
          >
            {loadError ? (
              <p className="text-destructive text-sm" role="alert">
                {loadError}
              </p>
            ) : null}
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading report…</p>
            ) : null}
            {!loading && !loadError && items.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No sales lines found for this period.
              </p>
            ) : null}
            {!loading && items.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shift No</TableHead>
                      <TableHead>Invoice Serial</TableHead>
                      <TableHead>Payment Type</TableHead>
                      <TableHead>Item (Arabic)</TableHead>
                      <TableHead>Item (English)</TableHead>
                      <TableHead className="text-end">Quantity</TableHead>
                      <TableHead className="text-end">Sales Price</TableHead>
                      <TableHead>Sales Time (Cairo)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row, index) => (
                      <TableRow
                        key={`${row.invoiceSerial}-${index}-${row.itemNameEnglish ?? row.itemNameArabic ?? "line"}`}
                      >
                        <TableCell>{row.shiftNo ?? "—"}</TableCell>
                        <TableCell>{row.invoiceSerial}</TableCell>
                        <TableCell>
                          {row.paymentType ? (
                            isNotFinalizedPaymentType(row.paymentType) ? (
                              <span
                                className="inline-flex rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200"
                                title="غير مُنهى · Not finalized"
                              >
                                {row.paymentType}
                              </span>
                            ) : (
                              row.paymentType
                            )
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell dir="rtl" className="text-right">
                          {row.itemNameArabic ?? "—"}
                        </TableCell>
                        <TableCell dir="ltr" className="text-left">
                          {row.itemNameEnglish ?? "—"}
                        </TableCell>
                        <TableCell className="text-end">
                          {formatQuantity(row.quantity)}
                        </TableCell>
                        <TableCell className="text-end">
                          {formatMoney(row.salesPrice)}
                        </TableCell>
                        <TableCell>{row.salesTime ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            {!loading && totalRecords > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground text-sm">
                  Page {pageNumber} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasPreviousPage || loading}
                    onClick={goPrev}
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasNextPage || loading}
                    onClick={goNext}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
