"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  ApiError,
  getItemCard,
  getPharms,
  getStors,
  lookupItemCatalog,
  lookupItemCatalogBySegment,
} from "@/lib/api-client";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
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
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { formatStorDisplayName } from "@/lib/purchase-stores";
import {
  ITEM_AUTOCOMPLETE_LIMIT,
  hasSearchableCatalogQuery,
} from "@/lib/item-catalog-search";
import type { ItemCardResponse } from "@/types/item-card";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PharmItem } from "@/types/pharm";
import type { StorItem } from "@/types/stor";

/** Values stored on MovementFact.DocumentType — not display-only labels. */
const ITEM_CARD_DOCUMENT_TYPES: ComboboxOption[] = [
  { value: "", label: "All Document Types" },
  { value: "Purchase", label: "Purchase" },
  { value: "PharmacyPurchase", label: "Pharmacy Purchase" },
  { value: "Return", label: "Return" },
  { value: "PharmacyReceive", label: "Pharmacy Receive" },
  { value: "InventoryAdjustment", label: "Inventory Adjustment" },
  { value: "Sales", label: "Sales" },
  { value: "SalesReturn", label: "Sales Return" },
  { value: "StockTransfer", label: "Stock Transfer" },
];

function startOfMonthIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}-01`;
}

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatQty(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function formatQtyWithUnit(quantity: number, unitName: string | null): string {
  if (quantity <= 0) return formatQty(0);
  const label = unitName?.trim();
  return label ? `${formatQty(quantity)} ${label}` : formatQty(quantity);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function itemDisplayLabel(
  item: Pick<ItemCatalogItem, "itmCode" | "itmNameAr" | "itmNameEn" | "id">
) {
  const names = [item.itmNameAr, item.itmNameEn].filter(Boolean).join(" · ");
  const name = names || `Item #${item.id}`;
  return item.itmCode ? `${item.itmCode} — ${name}` : name;
}

export function ItemCardPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<ItemCatalogItem[]>([]);
  const [itemLookupLoading, setItemLookupLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemCatalogItem | null>(null);
  const [fromDate, setFromDate] = useState(startOfMonthIso);
  const [toDate, setToDate] = useState(todayIso);
  const [storeId, setStoreId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [stores, setStores] = useState<StorItem[]>([]);
  const [branches, setBranches] = useState<PharmItem[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ItemCardResponse | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLookupsLoading(true);
    void Promise.all([getStors(token), getPharms(token)])
      .then(([storeRows, pharmRows]) => {
        if (cancelled) return;
        setStores(storeRows);
        setBranches(pharmRows);
      })
      .catch((error) => {
        if (cancelled) return;
        setStores([]);
        setBranches([]);
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load stores and branches."
        );
      })
      .finally(() => {
        if (!cancelled) setLookupsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || selectedItem) {
      setMatches([]);
      setItemLookupLoading(false);
      return;
    }

    const useWildcard = search.includes("  ");
    const term = useWildcard ? search : search.trim();
    if (useWildcard) {
      if (!hasSearchableCatalogQuery(term)) {
        setMatches([]);
        setItemLookupLoading(false);
        return;
      }
    } else if (term.length < 1) {
      setMatches([]);
      setItemLookupLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setItemLookupLoading(true);
      const request = useWildcard
        ? lookupItemCatalogBySegment(token, term, null, {
            take: ITEM_AUTOCOMPLETE_LIMIT,
            signal: controller.signal,
            doubleSpaceWildcard: true,
          })
        : lookupItemCatalog(token, term, {
            take: ITEM_AUTOCOMPLETE_LIMIT,
            signal: controller.signal,
          });

      void request
        .then((items) => {
          if (!controller.signal.aborted) setMatches(items);
        })
        .catch(() => {
          if (!controller.signal.aborted) setMatches([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setItemLookupLoading(false);
        });
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [search, token, selectedItem]);

  const storeOptions = useMemo<ComboboxOption[]>(() => {
    const rows = stores
      .map((store) => ({
        value: String(store.id),
        label:
          formatStorDisplayName(store) ||
          store.storEnName?.trim() ||
          `Store ${store.id}`,
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true })
      );
    return [{ value: "", label: "All Stores" }, ...rows];
  }, [stores]);

  const branchOptions = useMemo<ComboboxOption[]>(() => {
    const rows = branches
      .map((branch) => {
        const name = (branch.parmEnName || branch.parmArName || "").trim();
        return {
          value: String(branch.parmId),
          label: name || `Branch ${branch.parmId}`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: "", label: "All Branches" }, ...rows];
  }, [branches]);

  const loadCard = useCallback(
    async (nextPage = 1) => {
      if (!token) {
        toast.error("Sign in required.");
        return;
      }

      setLoading(true);
      try {
        const data = await getItemCard(token, {
          itemId: selectedItem?.id,
          fromDate,
          toDate,
          storeId: storeId || undefined,
          branchId: branchId || undefined,
          documentType: documentType || undefined,
          page: nextPage,
          pageSize: 50,
        });
        setPage(nextPage);
        setResult(data);
      } catch (error) {
        setResult(null);
        toast.error(
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Unable to load item card."
        );
      } finally {
        setLoading(false);
      }
    },
    [token, selectedItem, fromDate, toDate, storeId, branchId, documentType]
  );

  const pageCount = useMemo(() => {
    if (!result) return 1;
    return Math.max(1, Math.ceil(result.totalCount / (result.pageSize || 50)));
  }, [result]);

  const clearSelectedItem = useCallback(() => {
    setSelectedItem(null);
    setSearch("");
    setMatches([]);
  }, []);

  if (!sessionReady) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <PageGuard permission={PERMISSIONS.sales.view}>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Item Card</h2>
          <p className="text-muted-foreground text-sm">
            Item movement history from the reporting database, with opening and
            closing balances.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="size-5" />
              Filters
            </CardTitle>
            <CardDescription>
              Leave Item, Document Type, Store, or Branch on All to skip that
              restriction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="item-card-from">Date From</Label>
                <Input
                  id="item-card-from"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-card-to">Date To</Label>
                <Input
                  id="item-card-to"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-card-search">Item</Label>
                <div className="relative">
                  <Input
                    id="item-card-search"
                    value={selectedItem ? itemDisplayLabel(selectedItem) : search}
                    onChange={(event) => {
                      setSelectedItem(null);
                      setSearch(event.target.value);
                    }}
                    placeholder="Search code, Arabic, English, or barcode"
                    autoComplete="off"
                  />
                  {selectedItem ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
                      onClick={clearSelectedItem}
                      aria-label="Clear item"
                    >
                      <X className="size-4" />
                    </Button>
                  ) : null}
                </div>
                {!selectedItem && (itemLookupLoading || matches.length > 0) ? (
                  <div className="border-border max-h-48 overflow-auto rounded-md border">
                    {itemLookupLoading ? (
                      <p className="text-muted-foreground px-3 py-2 text-sm">
                        Searching…
                      </p>
                    ) : null}
                    {matches.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="hover:bg-muted w-full px-3 py-2 text-left text-sm"
                        onClick={() => {
                          setSelectedItem(item);
                          setSearch("");
                          setMatches([]);
                        }}
                      >
                        <span className="block font-medium">
                          {itemDisplayLabel(item)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Document Type</Label>
                <SearchableCombobox
                  value={documentType}
                  onValueChange={setDocumentType}
                  options={ITEM_CARD_DOCUMENT_TYPES}
                  placeholder="All Document Types"
                  searchPlaceholder="Search document type..."
                  emptyMessage="No document types."
                />
              </div>

              <div className="space-y-2">
                <Label>Store</Label>
                <SearchableCombobox
                  value={storeId}
                  onValueChange={setStoreId}
                  options={storeOptions}
                  placeholder={lookupsLoading ? "Loading stores..." : "All Stores"}
                  searchPlaceholder="Search store..."
                  emptyMessage={
                    lookupsLoading ? "Loading stores..." : "No stores."
                  }
                  disabled={lookupsLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>Branch</Label>
                <SearchableCombobox
                  value={branchId}
                  onValueChange={setBranchId}
                  options={branchOptions}
                  placeholder={
                    lookupsLoading ? "Loading branches..." : "All Branches"
                  }
                  searchPlaceholder="Search branch..."
                  emptyMessage={
                    lookupsLoading ? "Loading branches..." : "No branches."
                  }
                  disabled={lookupsLoading}
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={() => void loadCard(1)}
              disabled={loading}
            >
              {loading ? "Searching…" : "Search"}
            </Button>
          </CardContent>
        </Card>

        {result ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryTile
                label="Opening"
                value={formatQtyWithUnit(
                  result.openingBalance,
                  result.displayUnitName
                )}
              />
              <SummaryTile
                label="Total in"
                value={formatQtyWithUnit(result.totalIn, result.displayUnitName)}
              />
              <SummaryTile
                label="Total out"
                value={formatQtyWithUnit(result.totalOut, result.displayUnitName)}
              />
              <SummaryTile
                label="Net"
                value={formatQtyWithUnit(result.net, result.displayUnitName)}
              />
              <SummaryTile
                label="Closing"
                value={formatQtyWithUnit(
                  result.closingBalance,
                  result.displayUnitName
                )}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Movements</CardTitle>
                <CardDescription>
                  {result.totalCount} row{result.totalCount === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Doc #</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead className="text-right">In</TableHead>
                      <TableHead className="text-right">Out</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-muted-foreground">
                          No movements in this range.
                        </TableCell>
                      </TableRow>
                    ) : (
                      result.items.map((row) => (
                        <TableRow key={`${row.reportingKey}-${row.lineNo}`}>
                          <TableCell>{formatDate(row.date)}</TableCell>
                          <TableCell>{row.documentType || "—"}</TableCell>
                          <TableCell>{row.documentNo ?? row.documentId}</TableCell>
                          <TableCell>{row.storeName || row.storeId || "—"}</TableCell>
                          <TableCell>{row.movementDirection || "—"}</TableCell>
                          <TableCell className="text-right">
                            {formatQtyWithUnit(row.quantityIn, row.unitName)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatQtyWithUnit(row.quantityOut, row.unitName)}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.unitName?.trim() || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatQtyWithUnit(
                              row.balance,
                              result.displayUnitName
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {pageCount > 1 ? (
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading || page <= 1}
                      onClick={() => void loadCard(page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-muted-foreground text-sm">
                      Page {page} of {pageCount}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading || page >= pageCount}
                      onClick={() => void loadCard(page + 1)}
                    >
                      Next
                    </Button>
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

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
