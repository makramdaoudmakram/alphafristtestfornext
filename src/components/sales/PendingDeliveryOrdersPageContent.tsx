"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PERMISSIONS } from "@/lib/route-permissions";
import {
  acceptDeliveryOrder,
  ApiError,
  getPendingDeliveryOrders,
  getSalesSaleDetails,
} from "@/lib/api-client";
import type { PendingDeliveryOrder } from "@/types/sales-delivery";
import type { SalesReceiptLine } from "@/types/sales-receipt";

function money(value: number): number {
  return Math.round((value + 0.000001) * 100) / 100;
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return money(value).toFixed(2);
}

export function PendingDeliveryOrdersPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? null;

  const [orders, setOrders] = useState<PendingDeliveryOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One in-flight accept at a time: repeated clicks cannot double-submit.
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  // Accordion state: rows expand independently; item lines load on first open and stay cached.
  const [expandedSthIds, setExpandedSthIds] = useState<number[]>([]);
  const [linesBySthId, setLinesBySthId] = useState<Record<number, SalesReceiptLine[]>>({});
  const [loadingLinesSthId, setLoadingLinesSthId] = useState<number | null>(null);
  const [linesErrorSthId, setLinesErrorSthId] = useState<number | null>(null);

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

  const toggleRow = (order: PendingDeliveryOrder) => {
    const isOpen = expandedSthIds.includes(order.sthId);
    if (!isOpen && !linesBySthId[order.sthId] && loadingLinesSthId !== order.sthId) {
      void loadLines(order.sthId);
    }
    setExpandedSthIds((prev) =>
      isOpen
        ? prev.filter((sthId) => sthId !== order.sthId)
        : [...prev, order.sthId]
    );
  };

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setOrders(await getPendingDeliveryOrders(token));
    } catch (err) {
      setOrders([]);
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load pending delivery orders."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void load();
  }, [token, load]);

  const handleAccept = async (order: PendingDeliveryOrder) => {
    if (!token || acceptingId != null) return;
    setAcceptingId(order.id);
    try {
      const result = await acceptDeliveryOrder(token, order.id);
      // Remove the row only after the backend confirmed the status change.
      setOrders((prev) => prev.filter((row) => row.id !== result.id));
      toast.success(
        `Delivery order for invoice ${result.sthId} accepted.`
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        // Already accepted / out of scope server-side: refresh so the table stays authoritative.
        toast.error(err.message);
        await load();
      } else {
        toast.error(
          err instanceof ApiError ? err.message : "Failed to accept delivery order."
        );
      }
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <PageGuard
      permission={PERMISSIONS.sales.view}
      redirectTo="/unauthorized?from=delivery&permission=Sales.View"
    >
      <div className="flex flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Pending Delivery Orders
            <span className="ms-2 text-base font-normal text-muted-foreground">
              طلبات التوصيل المعلقة
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Delivery orders waiting for the current pharmacy. Accepting an order
            only marks it as accepted; it does not change payment or stock.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Pending delivery orders</CardTitle>
              <CardDescription>
                Current pharmacy only, orders not accepted yet.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || !token}
              onClick={() => void load()}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}

            {loading && orders.length === 0 && !error ? (
              <p className="text-muted-foreground text-sm">
                Loading pending delivery orders…
              </p>
            ) : null}

            {!loading && !error && orders.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No pending delivery orders for this pharmacy.
              </p>
            ) : null}

            {orders.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Delivery Name</TableHead>
                      <TableHead className="text-right">Total Invoice</TableHead>
                      <TableHead>Payment Type</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const isExpanded = expandedSthIds.includes(order.sthId);
                      const lines = linesBySthId[order.sthId];
                      return (
                        <Fragment key={order.id}>
                          <TableRow
                            className="cursor-pointer select-none"
                            onClick={() => toggleRow(order)}
                          >
                            <TableCell className="font-medium">
                              <span
                                aria-hidden
                                className="text-muted-foreground me-1 inline-block w-3"
                              >
                                {isExpanded ? "▾" : "▸"}
                              </span>
                              {order.sthId}
                            </TableCell>
                            <TableCell>{order.deliveryName ?? "—"}</TableCell>
                            <TableCell className="text-right">
                              {formatMoney(order.totalInvoice)}
                            </TableCell>
                            <TableCell>{order.paymentType ?? "—"}</TableCell>
                            {/* Accept must never toggle the accordion. */}
                            <TableCell
                              className="text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                type="button"
                                size="sm"
                                disabled={acceptingId != null}
                                onClick={() => void handleAccept(order)}
                              >
                                {acceptingId === order.id ? "Accepting…" : "Accept"}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded ? (
                            <TableRow>
                              <TableCell colSpan={5} className="bg-muted/30 p-3">
                                {loadingLinesSthId === order.sthId && !lines ? (
                                  <p className="text-muted-foreground text-sm">
                                    Loading items…
                                  </p>
                                ) : linesErrorSthId === order.sthId && !lines ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm text-red-700">
                                      Failed to load invoice items.
                                    </span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => void loadLines(order.sthId)}
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
                                          <TableHead className="text-right">Qty</TableHead>
                                          <TableHead className="text-right">Price</TableHead>
                                          <TableHead className="text-right">Line Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {lines.map((line) => (
                                          <TableRow key={line.lineNo}>
                                            <TableCell>{line.itemCode ?? "—"}</TableCell>
                                            <TableCell>{line.itemName ?? "—"}</TableCell>
                                            <TableCell>{line.unitName ?? "—"}</TableCell>
                                            <TableCell className="text-right">
                                              {line.quantity}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {formatMoney(line.unitPrice)}
                                            </TableCell>
                                            <TableCell className="text-right">
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
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
