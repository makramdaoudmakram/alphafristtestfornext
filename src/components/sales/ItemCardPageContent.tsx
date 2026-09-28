"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { ApiError, getItemCard, lookupItemCatalog } from "@/lib/api-client";
import {
  defaultFromDate,
  defaultToDate,
  formatItemCardDate,
  formatItemCardQuantity,
} from "@/lib/item-card-query";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { ItemCardResponse } from "@/types/item-card";
import { ITEM_CARD_DOCUMENT_TYPES } from "@/types/item-card";
import type { ItemCatalogItem } from "@/types/item-catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 50;

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{formatItemCardQuantity(value)}</p>
      </CardContent>
    </Card>
  );
}

export function ItemCardPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken ?? null;
  const sessionReady = status !== "loading";

  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState<ItemCatalogItem[]>([]);
  const [itemLookupOpen, setItemLookupOpen] = useState(false);
  const [itemLookupLoading, setItemLookupLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemCatalogItem | null>(null);
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [documentType, setDocumentType] = useState<string>("all");
  const [report, setReport] = useState<ItemCardResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const requestSeq = useRef(0);
  const lookupSeq = useRef(0);
  const lookupAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (selectedItem || !token || !itemSearch.trim()) {
      setItemResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      lookupAbort.current?.abort();
      const controller = new AbortController();
      lookupAbort.current = controller;
      const seq = ++lookupSeq.current;
      setItemLookupLoading(true);

      void lookupItemCatalog(token, itemSearch.trim(), {
        take: 20,
        signal: controller.signal,
      })
        .then((rows) => {
          if (seq !== lookupSeq.current) return;
          setItemResults(rows);
          setItemLookupOpen(rows.length > 0);
        })
        .catch((error) => {
          if (seq !== lookupSeq.current) return;
          if (error instanceof DOMException && error.name === "AbortError") return;
          setItemResults([]);
        })
        .finally(() => {
          if (seq === lookupSeq.current) setItemLookupLoading(false);
        });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [itemSearch, selectedItem, token]);

  const loadReport = useCallback(
    async (nextPage: number, resetReport: boolean) => {
      if (!token) {
        toast.error("Sign in required.");
        return;
      }
      if (!selectedItem) {
        toast.error("Select an item to view its movement history.");
        return;
      }

      const seq = ++requestSeq.current;
      setLoading(true);
      if (resetReport) setReport(null);

      try {
        const data = await getItemCard(token, {
          itemId: selectedItem.id,
          fromDate,
          toDate,
          documentType: documentType === "all" ? undefined : documentType,
          page: nextPage,
          pageSize: PAGE_SIZE,
        });

        if (seq !== requestSeq.current) return;
        setReport(data);
        setHasSearched(true);
      } catch (error) {
        if (seq !== requestSeq.current) return;
        setReport(null);
        if (error instanceof ApiError) {
          if (error.status === 401 || error.status === 403) {
            toast.error("You are not authorized to view this report.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.error("Unable to load item card. Please try again.");
        }
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [token, selectedItem, fromDate, toDate, documentType]
  );

  const handleSearch = () => {
    void loadReport(1, true);
  };

  const handleReset = () => {
    requestSeq.current += 1;
    lookupAbort.current?.abort();
    setSelectedItem(null);
    setItemSearch("");
    setItemResults([]);
    setFromDate(defaultFromDate());
    setToDate(defaultToDate());
    setDocumentType("all");
    setReport(null);
    setHasSearched(false);
    setLoading(false);
  };

  const handlePageChange = (nextPage: number) => {
    if (!hasSearched || !selectedItem) return;
    void loadReport(nextPage, false);
  };

  const totalPages =
    report && report.pageSize > 0
      ? Math.max(1, Math.ceil(report.totalCount / report.pageSize))
      : 1;

  if (!sessionReady) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageGuard permission={PERMISSIONS.sales.view}>
      <div className="space-y-4 p-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Item Card</h1>
          <p className="text-sm text-muted-foreground">
            Inventory movement history from reporting data (base units).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Select an item and date range, then search.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="relative min-w-[280px] flex-1 space-y-1">
                <Label htmlFor="item-search">Item</Label>
                <Input
                  id="item-search"
                  value={
                    selectedItem
                      ? [selectedItem.itmCode, selectedItem.itmNameAr ?? selectedItem.itmNameEn]
                          .filter(Boolean)
                          .join(" — ")
                      : itemSearch
                  }
                  readOnly={!!selectedItem}
                  placeholder="Search by code, name, or barcode..."
                  onChange={(event) => {
                    setSelectedItem(null);
                    setItemSearch(event.target.value);
                    setHasSearched(false);
                    setReport(null);
                  }}
                  autoComplete="off"
                />
                {selectedItem ? (
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    <div className="font-medium">
                      {selectedItem.itmCode ?? `#${selectedItem.id}`}
                    </div>
                    <div>{selectedItem.itmNameAr ?? selectedItem.itmNameEn ?? "—"}</div>
                    {selectedItem.itmNameEn && selectedItem.itmNameAr ? (
                      <div className="text-muted-foreground">{selectedItem.itmNameEn}</div>
                    ) : null}
                    <button
                      type="button"
                      className="mt-1 text-xs text-muted-foreground underline"
                      onClick={() => {
                        setSelectedItem(null);
                        setItemSearch("");
                        setHasSearched(false);
                        setReport(null);
                      }}
                    >
                      Clear item
                    </button>
                  </div>
                ) : null}
                {itemLookupOpen && !selectedItem ? (
                  <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow-md">
                    {itemLookupLoading ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                    ) : null}
                    {!itemLookupLoading && itemResults.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No items found.</div>
                    ) : null}
                    {itemResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setSelectedItem(item);
                          setItemLookupOpen(false);
                          setHasSearched(false);
                          setReport(null);
                        }}
                      >
                        <div className="font-medium">{item.itmCode ?? `#${item.id}`}</div>
                        <div>{item.itmNameAr ?? item.itmNameEn ?? "—"}</div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-1">
                <Label htmlFor="from-date">From Date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(event) => {
                    setFromDate(event.target.value);
                    setHasSearched(false);
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="to-date">To Date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(event) => {
                    setToDate(event.target.value);
                    setHasSearched(false);
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label>Document Type</Label>
                <Select
                  value={documentType}
                  onValueChange={(value) => {
                    setDocumentType(value);
                    setHasSearched(false);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {ITEM_CARD_DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSearch} disabled={loading || !selectedItem}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={loading}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {!selectedItem && !hasSearched ? (
          <p className="text-sm text-muted-foreground">
            Select an item to view its movement history.
          </p>
        ) : null}

        {report ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="Opening Balance" value={report.openingBalance} />
              <SummaryCard label="Total IN" value={report.totalIn} />
              <SummaryCard label="Total OUT" value={report.totalOut} />
              <SummaryCard label="Closing Balance" value={report.closingBalance} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Movement History</CardTitle>
              </CardHeader>
              <CardContent>
                {report.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No inventory movements found for the selected period.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Document Type</TableHead>
                          <TableHead>Document No</TableHead>
                          <TableHead>Store</TableHead>
                          <TableHead>Branch</TableHead>
                          <TableHead>Movement</TableHead>
                          <TableHead className="text-right">IN</TableHead>
                          <TableHead className="text-right">OUT</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.items.map((row) => (
                          <TableRow key={row.reportingKey}>
                            <TableCell>{formatItemCardDate(row.date)}</TableCell>
                            <TableCell>{row.documentType}</TableCell>
                            <TableCell>{row.documentNo ?? row.documentId}</TableCell>
                            <TableCell>{row.storeName ?? "—"}</TableCell>
                            <TableCell>{row.branchName ?? "—"}</TableCell>
                            <TableCell>{row.movementDirection || "—"}</TableCell>
                            <TableCell className="text-right">
                              {formatItemCardQuantity(row.quantityIn)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatItemCardQuantity(row.quantityOut)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatItemCardQuantity(row.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {report.totalCount > report.pageSize ? (
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      Page {report.page} of {totalPages} ({report.totalCount} rows)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loading || report.page <= 1}
                        onClick={() => handlePageChange(report.page - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loading || report.page >= totalPages}
                        onClick={() => handlePageChange(report.page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </PageGuard>
  );
}
