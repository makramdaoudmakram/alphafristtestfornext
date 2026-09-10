"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Search, ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import { getBatchTraceability, ApiError } from "@/lib/api-client";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { BatchTraceabilityResult } from "@/types/batch-traceability";
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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchTraceabilityResult | null>(null);
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
      const data = await getBatchTraceability(token, value);
      setResult(data);
    } catch (error) {
      setResult(null);
      if (error instanceof ApiError && error.status === 404) {
        toast.error("Batch not found");
      } else {
        toast.error(error instanceof Error ? error.message : "Search failed.");
      }
      inputRef.current?.select();
    } finally {
      setLoading(false);
    }
  }, [token, batchNoInput]);

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
            transaction history.
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
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : null}

        {!loading && searched && !result ? (
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              Batch not found
            </CardContent>
          </Card>
        ) : null}

        {!loading && result ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Batch Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailField label="Batch No" value={result.batch.batchNo} />
                  <DetailField label="Item Code" value={result.batch.itemCode ?? "—"} />
                  <DetailField label="Arabic Name" value={result.batch.itemNameAr ?? "—"} />
                  <DetailField label="English Name" value={result.batch.itemNameEn ?? "—"} />
                  <DetailField label="Expiry Date" value={result.batch.expDate ?? "—"} />
                  <DetailField
                    label="Purchase Price"
                    value={formatMoney(result.batch.purchasePrice)}
                  />
                  <DetailField
                    label="Sales Price"
                    value={formatMoney(result.batch.salesPrice)}
                  />
                  <DetailField
                    label="Cost Price"
                    value={formatMoney(result.batch.costPrice)}
                  />
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
                <CardDescription>Current stock location</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.currentStock.locations.map((row) => (
                      <TableRow key={row.storeId}>
                        <TableCell>{row.storeName ?? `Store ${row.storeId}`}</TableCell>
                        <TableCell className="text-right">
                          {formatMoney(row.qty)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(result.currentStock.totalCurrentQty)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transaction Timeline</CardTitle>
              </CardHeader>
              <CardContent>
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
                        <TableHead>Document</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.timeline.map((row) => (
                        <TableRow
                          key={`${row.transactionType}-${row.detailId}-${row.lineNo}`}
                        >
                          <TableCell>{formatDate(row.eventDate)}</TableCell>
                          <TableCell>
                            {formatTransactionTypeLabel(row.transactionType)}
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
                          <TableCell>
                            {row.storeName ?? row.storeId ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatQtyDelta(row.quantityDelta)}
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

            <p className="text-muted-foreground text-xs leading-relaxed">
              Batch history currently shows transaction detail records from the existing
              Purchase, Return, Pharmacy Receive, and Inventory Adjustment data. Running
              quantity-after values and historical edit/delete deltas are not included in
              this version.
            </p>
          </>
        ) : null}
      </div>
    </PageGuard>
  );
}
