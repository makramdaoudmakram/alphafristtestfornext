"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Search, ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import { getBatchTraceability, ApiError } from "@/lib/api-client";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import type {
  BatchTraceabilityQuery,
  BatchTraceabilityResult,
  BatchTraceabilitySearchResponse,
} from "@/types/batch-traceability";
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
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatQtyDelta(value: number): string {
  if (value > 0) return `+${formatMoney(value)}`;
  if (value < 0) return formatMoney(value);
  return "0";
}

function formatCreatorDisplay(
  userName: string | null | undefined,
  userId: string | null | undefined
): string {
  if (userName?.trim()) return userName.trim();
  if (userId?.trim()) return userId.trim();
  return "—";
}

function formatSourceLabel(source: string): string {
  if (source === "Purchase") return "Purchase";
  if (source === "Audit") return "Audit";
  if (source === "Unknown") return "Unknown";
  return source;
}

function formatExpiryStatusLabel(status: string): string {
  switch (status) {
    case "Expired":
      return "Expired";
    case "NearExpiry":
      return "Near expiry";
    case "Valid":
      return "Valid";
    default:
      return "Unknown expiry";
  }
}

function expiryStatusClass(status: string): string {
  switch (status) {
    case "Expired":
      return "text-destructive font-semibold";
    case "NearExpiry":
      return "text-amber-600 dark:text-amber-400 font-medium";
    case "Valid":
      return "text-emerald-600 dark:text-emerald-400";
    default:
      return "text-muted-foreground";
  }
}

function formatTransactionStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  switch (status) {
    case "Pending":
      return "Pending";
    case "Accepted":
      return "Accepted";
    case "Cancelled":
      return "Cancelled";
    case "Completed":
      return "Completed";
    default:
      return status;
  }
}

function formatMovementKindLabel(kind: string | null | undefined): string {
  if (!kind || kind === "None") return "—";
  if (kind === "Physical") return "Physical";
  if (kind === "Reservation") return "Reserved";
  return kind;
}

function formatTransactionTypeLabel(type: string): string {
  switch (type) {
    case "Purchase":
      return "Purchase";
    case "Return":
      return "Return";
    case "PharmReceive":
      return "Pharm Receive";
    case "InventoryAdjustment":
      return "Inventory Adjustment";
    case "Transfer":
      return "Transfer (send)";
    case "TransferAccept":
      return "Transfer (accept)";
    case "StoreReturn":
      return "Pharmacy-to-store return (send)";
    case "StoreReturnAccept":
      return "Pharmacy-to-store return (accept)";
    case "Sale":
      return "Sale";
    case "SalesReturn":
      return "Sales return";
    default:
      return type;
  }
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function BatchTraceabilityPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const inputRef = useRef<HTMLInputElement>(null);
  const [batchNoInput, setBatchNoInput] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStoreId, setFilterStoreId] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BatchTraceabilitySearchResponse["results"]>(
    []
  );
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async () => {
    if (!token) {
      toast.error("Sign in required.");
      return;
    }

    const value = batchNoInput.trim();
    if (!value) {
      toast.error("Enter a batch number.");
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const query: BatchTraceabilityQuery = {};
      if (filterType.trim()) query.transactionType = filterType.trim();
      if (filterStatus.trim()) query.transactionStatus = filterStatus.trim();
      if (filterStoreId.trim()) query.storeId = filterStoreId.trim();
      const data = await getBatchTraceability(token, value, query);
      setResults(data.results);
    } catch (error) {
      setResults([]);
      if (error instanceof ApiError && error.status === 404) {
        toast.error("Batch not found");
      } else {
        toast.error(error instanceof Error ? error.message : "Search failed.");
      }
      inputRef.current?.select();
    } finally {
      setLoading(false);
    }
  }, [token, batchNoInput, filterType, filterStatus, filterStoreId]);

  if (!sessionReady) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <PageGuard permission={PERMISSIONS.batchTraceability.view}>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Batch Traceability</h2>
          <p className="text-muted-foreground text-sm">
            Search by batch number to view batch details, current stock locations, and
            transaction history per item.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanBarcode className="size-5" />
              Search
            </CardTitle>
            <CardDescription>
              Scan or type a batch number. Normalization is handled by the server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="batch-traceability-search">Batch No</Label>
                <Input
                  id="batch-traceability-search"
                  ref={inputRef}
                  value={batchNoInput}
                  onChange={(event) => setBatchNoInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void runSearch();
                    }
                  }}
                  placeholder="Scan or enter batch number"
                  autoComplete="off"
                  disabled={loading}
                />
              </div>
              <Button type="button" onClick={() => void runSearch()} disabled={loading}>
                <Search className="mr-2 size-4" />
                Search
              </Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="bt-filter-type">Transaction type</Label>
                <Input
                  id="bt-filter-type"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  placeholder="e.g. Sale"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bt-filter-status">Status</Label>
                <Input
                  id="bt-filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  placeholder="Pending, Accepted…"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bt-filter-store">Store ID</Label>
                <Input
                  id="bt-filter-store"
                  value={filterStoreId}
                  onChange={(e) => setFilterStoreId(e.target.value)}
                  placeholder="Store filter"
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : null}

        {!loading && searched && results.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              Batch not found
            </CardContent>
          </Card>
        ) : null}

        {!loading && results.length > 0 ? (
          <div className="space-y-6">
            {results.length > 1 ? (
              <p className="text-muted-foreground text-sm">
                This batch number matches {results.length} items. Each item is shown
                separately below.
              </p>
            ) : null}
            {results.map((result) => (
              <ItemBatchTraceabilitySection
                key={`${result.batch.itemId}-${result.batch.batchNo}`}
                result={result}
                multiItem={results.length > 1}
              />
            ))}
            <p className="text-muted-foreground text-xs leading-relaxed">
              Physical quantity is on-hand stock (<strong>Qty</strong>). Reserved
              quantity is held on transfers/receives (<strong>TransferQty</strong>).
              Available = Qty − TransferQty. Timeline rows distinguish physical
              movement, reservations, pending acceptance, and cancellation. The
              timeline total is not a running balance and may not reconcile to current
              stock without full opening balances.
            </p>
          </div>
        ) : null}
      </div>
    </PageGuard>
  );
}

function ItemBatchTraceabilitySection({
  result,
  multiItem,
}: {
  result: BatchTraceabilityResult;
  multiItem: boolean;
}) {
  const sectionTitle =
    multiItem && result.batch.itemCode
      ? `${result.batch.itemCode} — Batch ${result.batch.batchNo}`
      : "Batch Details";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{sectionTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Batch No" value={result.batch.batchNo} />
            <DetailField label="Item Code" value={result.batch.itemCode ?? "—"} />
            <DetailField label="Arabic Name" value={result.batch.itemNameAr ?? "—"} />
            <DetailField label="English Name" value={result.batch.itemNameEn ?? "—"} />
            <DetailField label="Expiry Date" value={result.batch.expDate ?? "—"} />
            <DetailField
              label="Expiry Status"
              value={formatExpiryStatusLabel(result.batch.expiryStatus)}
            />
            <p className={`text-sm sm:col-span-2 ${expiryStatusClass(result.batch.expiryStatus)}`}>
              Near-expiry threshold: 90 days (UTC calendar).
            </p>
            <DetailField
              label="Purchase Price"
              value={formatMoney(result.batch.purchasePrice)}
            />
            <DetailField
              label="Sales Price"
              value={formatMoney(result.batch.salesPrice)}
            />
            <DetailField label="Cost Price" value={formatMoney(result.batch.costPrice)} />
            <DetailField
              label="Creator"
              value={formatCreatorDisplay(
                result.creator.userName,
                result.creator.userId
              )}
            />
            <DetailField
              label="Created Date"
              value={formatDate(result.creator.createdAt)}
            />
            <DetailField
              label="Creator Source"
              value={formatSourceLabel(result.creator.source)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Stock</CardTitle>
          <CardDescription>
            Physical, reserved, and available quantities by store (ItemId + batch)
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead className="text-right">Physical</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead>Expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.currentStock.locations.map((row) => (
                <TableRow key={row.storeId}>
                  <TableCell>{row.storeName ?? `Store ${row.storeId}`}</TableCell>
                  <TableCell className="text-right">{formatMoney(row.qty)}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(row.transferQty)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(row.availableQty)}
                  </TableCell>
                  <TableCell>{row.expDate ?? "—"}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">
                  {formatMoney(result.currentStock.totalCurrentQty)}
                </TableCell>
                <TableCell className="text-right">
                  {formatMoney(result.currentStock.totalReservedQty)}
                </TableCell>
                <TableCell className="text-right">
                  {formatMoney(result.currentStock.totalAvailableQty)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Timeline</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {result.timeline.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No transaction history found for this batch.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Movement</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Store / Route</TableHead>
                  <TableHead className="text-right">Line Qty</TableHead>
                  <TableHead className="text-right">Physical Δ</TableHead>
                  <TableHead className="text-right">Reserved Δ</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.timeline.map((row) => (
                  <TableRow
                    key={`${row.transactionType}-${row.detailId}-${row.sortSequence}-${row.lineNo}`}
                    className={
                      row.transactionStatus === "Pending"
                        ? "bg-muted/40"
                        : row.transactionStatus === "Cancelled"
                          ? "opacity-70"
                          : undefined
                    }
                  >
                    <TableCell>{formatDate(row.eventDate)}</TableCell>
                    <TableCell>
                      {formatTransactionTypeLabel(row.transactionType)}
                    </TableCell>
                    <TableCell>
                      {formatTransactionStatusLabel(row.transactionStatus)}
                    </TableCell>
                    <TableCell>
                      {formatMovementKindLabel(row.movementKind)}
                    </TableCell>
                    <TableCell>
                      {row.deepLinkRoute ? (
                        <Link
                          href={row.deepLinkRoute}
                          className="text-primary font-medium hover:underline"
                        >
                          {row.documentLabel ?? row.documentDisplayNo ?? "—"}
                        </Link>
                      ) : (
                        row.documentLabel ?? row.documentDisplayNo ?? "—"
                      )}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-sm">
                      {row.storeName ?? row.storeId ?? "—"}
                      {row.sourceStoreId && row.destinationStoreId
                        ? ` (${row.sourceStoreId} → ${row.destinationStoreId})`
                        : null}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatMoney(row.transactionQuantity)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatQtyDelta(row.quantityDelta)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatQtyDelta(row.reservedQuantityDelta)}
                    </TableCell>
                    <TableCell>
                      {formatCreatorDisplay(row.userName, row.userId)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
