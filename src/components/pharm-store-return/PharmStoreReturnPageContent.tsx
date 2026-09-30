"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePharmacyScope } from "@/components/pharmacy/pharmacy-scope-provider";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import {
  PharmStoreReturnService,
  PharmStoreReturnRepositoryError,
} from "@/services/pharm-store-return.service";
import type {
  PharmStoreReturnPendingHeader,
  PharmStoreReturnPendingSection,
} from "@/types/pharm-store-return";
import type { PharmReciveItemLanguage } from "@/types/pharm-recive";
import { ItemLanguageToggle } from "@/components/pharm-recive/ItemLanguageToggle";
import {
  getPharmStoreReturnDetailLabels,
  getPharmStoreReturnItemName,
  sortPharmStoreReturnDetails,
  type PharmStoreReturnDetailSortDirection,
} from "@/lib/pharm-store-return-detail";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function displaySerial(header: PharmStoreReturnPendingHeader): string {
  if (header.serialNo != null && header.serialNo > 0) return String(header.serialNo);
  return "—";
}

type ReturnAccordionItemProps = {
  header: PharmStoreReturnPendingHeader;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (header: PharmStoreReturnPendingHeader) => void;
  accepting: boolean;
  itemLanguage: PharmReciveItemLanguage;
  detailSortDirection: PharmStoreReturnDetailSortDirection;
};

function ReturnAccordionItem({
  header,
  open,
  onOpenChange,
  onAccept,
  accepting,
  itemLanguage,
  detailSortDirection,
}: ReturnAccordionItemProps) {
  const labels = getPharmStoreReturnDetailLabels(itemLanguage);
  const sortedDetails = useMemo(
    () => sortPharmStoreReturnDetails(header.details, itemLanguage, detailSortDirection),
    [header.details, itemLanguage, detailSortDirection]
  );

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="hover:bg-muted/40 flex w-full items-start gap-3 px-4 py-4 text-left transition-colors"
          >
            <ChevronDown
              className={cn(
                "text-muted-foreground mt-1 size-4 shrink-0 transition-transform",
                open && "rotate-180"
              )}
            />
            <div className="grid flex-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <div>
                <p className="text-muted-foreground text-xs uppercase">Return</p>
                <p className="font-medium">{displaySerial(header)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Pharmacy</p>
                <p className="font-medium">
                  {header.sourcePharmacyName ?? header.sourceStoreId ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Destination Store</p>
                <p className="font-medium">
                  {header.destinationStoreName ?? header.destinationStoreId ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Status</p>
                <p className="font-medium">{header.statusText ?? "Pending"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Date</p>
                <p className="font-medium">{formatDate(header.returnDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Total Quantity</p>
                <p className="font-medium">{formatNumber(header.totalQuantity)}</p>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 border-t pt-4">
            <p className="text-muted-foreground text-xs">
              Items: {header.details.length}
              {header.insertUid ? ` · User: ${header.insertUid}` : ""}
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.itemName}</TableHead>
                  <TableHead>{labels.stockId}</TableHead>
                  <TableHead>{labels.batchNo}</TableHead>
                  <TableHead>{labels.expiry}</TableHead>
                  <TableHead>{labels.unit}</TableHead>
                  <TableHead>{labels.unitValue}</TableHead>
                  <TableHead className="text-right">{labels.quantity}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDetails.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          {labels.code}: {detail.itemCode ?? "—"}
                        </div>
                        <div className="font-medium">
                          {labels.itemName}: {getPharmStoreReturnItemName(detail, itemLanguage)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{detail.stockId ?? "—"}</TableCell>
                    <TableCell>{detail.batchNo ?? "—"}</TableCell>
                    <TableCell>{formatDate(detail.expDate)}</TableCell>
                    <TableCell>{detail.unitName ?? detail.unitId ?? "—"}</TableCell>
                    <TableCell>{formatNumber(detail.unitValue)}</TableCell>
                    <TableCell className="text-right">{formatNumber(detail.quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => onAccept(header)}
                disabled={accepting}
                title="Accept Return"
              >
                {accepting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 size-4" />
                )}
                Accept Return
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function SectionList({
  section,
  openIds,
  setOpenIds,
  onAccept,
  acceptingId,
  itemLanguage,
  detailSortDirection,
}: {
  section: PharmStoreReturnPendingSection;
  openIds: Record<number, boolean>;
  setOpenIds: Dispatch<SetStateAction<Record<number, boolean>>>;
  onAccept: (header: PharmStoreReturnPendingHeader) => void;
  acceptingId: number | null;
  itemLanguage: PharmReciveItemLanguage;
  detailSortDirection: PharmStoreReturnDetailSortDirection;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{section.storeName}</CardTitle>
        <CardDescription>
          {section.isCurrentStore
            ? "Pending pharmacy returns for the store you are working in."
            : "This section is for the other store. It stays empty while that store is not active."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {section.items.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No pending pharmacy returns.
          </p>
        ) : (
          <div className="space-y-3">
            {section.items.map((header) => (
              <ReturnAccordionItem
                key={header.id}
                header={header}
                open={Boolean(openIds[header.id])}
                onOpenChange={(open) =>
                  setOpenIds((current) => ({ ...current, [header.id]: open }))
                }
                onAccept={onAccept}
                accepting={acceptingId === header.id}
                itemLanguage={itemLanguage}
                detailSortDirection={detailSortDirection}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PharmStoreReturnPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";
  const { activePharmacy, ready: scopeReady } = usePharmacyScope();

  const [mainStore, setMainStore] = useState<PharmStoreReturnPendingSection>({
    storeId: null,
    storeName: "Main Store",
    isCurrentStore: false,
    items: [],
  });
  const [expireStore, setExpireStore] = useState<PharmStoreReturnPendingSection>({
    storeId: null,
    storeName: "Expire Store",
    isCurrentStore: false,
    items: [],
  });
  const [activeStoreName, setActiveStoreName] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({});
  const [confirmHeader, setConfirmHeader] = useState<PharmStoreReturnPendingHeader | null>(null);
  const [itemLanguage, setItemLanguage] = useState<PharmReciveItemLanguage>("en");
  const [detailSortDirection, setDetailSortDirection] =
    useState<PharmStoreReturnDetailSortDirection>("asc");

  const detailLabels = getPharmStoreReturnDetailLabels(itemLanguage);
  const itemCount = mainStore.items.length + expireStore.items.length;

  const service = useMemo(
    () => (token ? new PharmStoreReturnService(token) : null),
    [token]
  );

  const loadPending = useCallback(async () => {
    if (!service) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const result = await service.getPending();
      setMainStore(result.mainStore);
      setExpireStore(result.expireStore);
      setActiveStoreName(result.activeStoreName);
      setPageMessage(result.message);
    } catch (error) {
      setMainStore((current) => ({ ...current, items: [], isCurrentStore: false }));
      setExpireStore((current) => ({ ...current, items: [], isCurrentStore: false }));
      const message =
        error instanceof PharmStoreReturnRepositoryError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not load pending pharmacy returns.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (!sessionReady || !scopeReady) return;
    void loadPending();
  }, [sessionReady, scopeReady, activePharmacy?.parmId, loadPending]);

  async function handleAcceptConfirmed() {
    if (!service || !confirmHeader) return;

    setAcceptingId(confirmHeader.id);
    try {
      const result = await service.accept(confirmHeader.id);
      toast.success(result.message || "Return accepted successfully.");
      setConfirmHeader(null);
      setOpenIds((current) => {
        const next = { ...current };
        delete next[confirmHeader.id];
        return next;
      });
      await loadPending();
    } catch (error) {
      toast.error(
        error instanceof PharmStoreReturnRepositoryError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Accept failed."
      );
    } finally {
      setAcceptingId(null);
    }
  }

  if (!sessionReady || !scopeReady) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <PageGuard
      permission={PERMISSIONS.sales.view}
      redirectTo="/unauthorized?from=pharm-to-store&permission=Sales.View"
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Pharm-to-Store</h2>
          <p className="text-muted-foreground text-sm">
            Review pharmacy returns pending acceptance at Main Store or Expire Store.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Store</CardTitle>
            <CardDescription>
              Pending returns are shown for the store attached to the pharmacy you are working in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Pharmacy:</span>{" "}
              <span className="font-medium">{activePharmacy?.name ?? "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Store:</span>{" "}
              <span className="font-medium">{activeStoreName ?? "—"}</span>
            </p>
            {pageMessage ? <p className="text-destructive text-sm">{pageMessage}</p> : null}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ItemLanguageToggle
            value={itemLanguage}
            onChange={setItemLanguage}
            disabled={loading}
          />
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label={detailLabels.sortBy}
          >
            <span className="text-muted-foreground text-xs font-medium">
              {detailLabels.sortBy}
            </span>
            <div className="inline-flex rounded-md border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={detailSortDirection === "asc" ? "default" : "ghost"}
                className="h-7 px-3 text-xs"
                disabled={loading || itemCount === 0}
                onClick={() => setDetailSortDirection("asc")}
              >
                {detailLabels.sortAsc}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={detailSortDirection === "desc" ? "default" : "ghost"}
                className="h-7 px-3 text-xs"
                disabled={loading || itemCount === 0}
                onClick={() => setDetailSortDirection("desc")}
              >
                {detailLabels.sortDesc}
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : loadError ? (
          <Card>
            <CardContent className="space-y-3 py-10 text-center text-sm">
              <p className="text-destructive font-medium">{loadError}</p>
              <Button type="button" variant="outline" onClick={() => void loadPending()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <SectionList
              section={mainStore}
              openIds={openIds}
              setOpenIds={setOpenIds}
              onAccept={setConfirmHeader}
              acceptingId={acceptingId}
              itemLanguage={itemLanguage}
              detailSortDirection={detailSortDirection}
            />
            <SectionList
              section={expireStore}
              openIds={openIds}
              setOpenIds={setOpenIds}
              onAccept={setConfirmHeader}
              acceptingId={acceptingId}
              itemLanguage={itemLanguage}
              detailSortDirection={detailSortDirection}
            />
          </div>
        )}
      </div>

      <Dialog
        open={confirmHeader != null}
        onOpenChange={(open) => {
          if (!open) setConfirmHeader(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Return</DialogTitle>
            <DialogDescription>
              Are you sure you want to accept this pharmacy return?
            </DialogDescription>
          </DialogHeader>
          {confirmHeader ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Return:</span>{" "}
                {displaySerial(confirmHeader)}
              </p>
              <p>
                <span className="text-muted-foreground">From:</span>{" "}
                {confirmHeader.sourcePharmacyName ?? confirmHeader.sourceStoreId ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">To:</span>{" "}
                {confirmHeader.destinationStoreName ?? confirmHeader.destinationStoreId ?? "—"}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmHeader(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleAcceptConfirmed()}
              disabled={acceptingId != null}
            >
              {acceptingId != null ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 size-4" />
              )}
              Accept Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageGuard>
  );
}
