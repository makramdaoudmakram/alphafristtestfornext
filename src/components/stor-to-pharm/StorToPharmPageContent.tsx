"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePharmacyScope } from "@/components/pharmacy/pharmacy-scope-provider";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import {
  StorToPharmService,
  StorToPharmRepositoryError,
} from "@/services/stor-to-pharm.service";
import type { StorToPharmPendingHeader } from "@/types/stor-to-pharm";
import type { PharmReciveItemLanguage } from "@/types/pharm-recive";
import { ItemLanguageToggle } from "@/components/pharm-recive/ItemLanguageToggle";
import {
  getStorToPharmDetailLabels,
  getStorToPharmItemName,
  sortStorToPharmDetails,
  type StorToPharmDetailSortDirection,
} from "@/lib/stor-to-pharm-detail";
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

function displayFathId(header: StorToPharmPendingHeader): string {
  const fathId = header.fathId ?? header.serialNo;
  if (fathId != null && fathId > 0) {
    return String(fathId);
  }
  return "—";
}

type ReceiveAccordionItemProps = {
  header: StorToPharmPendingHeader;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (header: StorToPharmPendingHeader) => void;
  accepting: boolean;
  itemLanguage: PharmReciveItemLanguage;
  detailSortDirection: StorToPharmDetailSortDirection;
};

function ReceiveAccordionItem({
  header,
  open,
  onOpenChange,
  onAccept,
  accepting,
  itemLanguage,
  detailSortDirection,
}: ReceiveAccordionItemProps) {
  const labels = getStorToPharmDetailLabels(itemLanguage);
  const sortedDetails = useMemo(
    () => sortStorToPharmDetails(header.details, itemLanguage, detailSortDirection),
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
                <p className="text-muted-foreground text-xs uppercase">FathId</p>
                <p className="font-medium">{displayFathId(header)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Sending Storage</p>
                <p className="font-medium">
                  {header.sendingStorageName ?? header.sendingStorageId ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Receiving Storage</p>
                <p className="font-medium">
                  {header.receivingStorageName ?? header.receivingStorageId ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Total Quantity</p>
                <p className="font-medium">{formatNumber(header.totalQuantity)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Date</p>
                <p className="font-medium">{formatDate(header.receiveDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Total Sales</p>
                <p className="font-medium">{formatNumber(header.totalSalesPrice)}</p>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 border-t pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.itemName}</TableHead>
                  <TableHead>{labels.quantity}</TableHead>
                  <TableHead>{labels.unit}</TableHead>
                  <TableHead>{labels.batchNo}</TableHead>
                  <TableHead>{labels.expiry}</TableHead>
                  <TableHead className="text-right">{labels.salesPrice}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDetails.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          {labels.code}: {detail.itemCode ?? detail.itmId ?? "—"}
                        </div>
                        <div className="font-medium">
                          {labels.itemName}: {getStorToPharmItemName(detail, itemLanguage)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatNumber(detail.quantity)}</TableCell>
                    <TableCell>{detail.unitName ?? detail.unitId ?? "—"}</TableCell>
                    <TableCell>{detail.batchNo ?? "—"}</TableCell>
                    <TableCell>{formatDate(detail.expDate)}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(detail.salesPrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => onAccept(header)}
                disabled={accepting}
                title="Accept"
              >
                {accepting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 size-4" />
                )}
                Accept
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function formatStorageLabel(
  storageName: string | null,
  storageId: string | null
): string {
  if (storageId && storageName && storageName !== storageId) {
    return `${storageName} (${storageId})`;
  }
  return storageId ?? storageName ?? "—";
}

export function StorToPharmPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";
  const { activePharmacy, ready: scopeReady } = usePharmacyScope();

  const [items, setItems] = useState<StorToPharmPendingHeader[]>([]);
  const [currentPharmacyName, setCurrentPharmacyName] = useState<string | null>(null);
  const [currentStorageId, setCurrentStorageId] = useState<string | null>(null);
  const [currentStorageName, setCurrentStorageName] = useState<string | null>(null);
  const [storageConfigurationMessage, setStorageConfigurationMessage] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({});
  const [confirmHeader, setConfirmHeader] = useState<StorToPharmPendingHeader | null>(null);
  const [itemLanguage, setItemLanguage] = useState<PharmReciveItemLanguage>("en");
  const [detailSortDirection, setDetailSortDirection] =
    useState<StorToPharmDetailSortDirection>("asc");

  const detailLabels = getStorToPharmDetailLabels(itemLanguage);

  const service = useMemo(
    () => (token ? new StorToPharmService(token) : null),
    [token]
  );

  const loadPending = useCallback(async () => {
    if (!service) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const result = await service.getPending();
      setItems(result.items);
      setCurrentPharmacyName(result.currentPharmacyName);
      setCurrentStorageId(result.currentStorageId);
      setCurrentStorageName(result.currentStorageName);
      setStorageConfigurationMessage(result.storageConfigurationMessage);
    } catch (error) {
      setItems([]);
      const message =
        error instanceof StorToPharmRepositoryError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not load pending receive documents.";
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
      toast.success(result.message || "Receive accepted successfully.");
      setConfirmHeader(null);
      setOpenIds((current) => {
        const next = { ...current };
        delete next[confirmHeader.id];
        return next;
      });
      await loadPending();
    } catch (error) {
      toast.error(
        error instanceof StorToPharmRepositoryError
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
      redirectTo="/unauthorized?from=stor-to-pharm&permission=Sales.View"
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Stor To Pharm</h2>
          <p className="text-muted-foreground text-sm">
            Review store shipments pending acceptance at your pharmacy storage.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Pharmacy</CardTitle>
            <CardDescription>
              Pending receives are filtered by{" "}
              <code className="rounded bg-muted px-1 py-0.5">MovDis</code> = your pharmacy
              storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Current Pharmacy:</span>{" "}
              <span className="font-medium">
                {currentPharmacyName ?? activePharmacy?.name ?? "—"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Storage:</span>{" "}
              <span className="font-medium">
                {formatStorageLabel(currentStorageName, currentStorageId)}
              </span>
            </p>
            {storageConfigurationMessage ? (
              <p className="text-destructive text-sm">{storageConfigurationMessage}</p>
            ) : null}
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
                disabled={loading || items.length === 0}
                onClick={() => setDetailSortDirection("asc")}
              >
                {detailLabels.sortAsc}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={detailSortDirection === "desc" ? "default" : "ghost"}
                className="h-7 px-3 text-xs"
                disabled={loading || items.length === 0}
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
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              No pending store-to-pharmacy receives waiting for acceptance.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((header) => (
              <ReceiveAccordionItem
                key={header.id}
                header={header}
                open={Boolean(openIds[header.id])}
                onOpenChange={(open) =>
                  setOpenIds((current) => ({ ...current, [header.id]: open }))
                }
                onAccept={setConfirmHeader}
                accepting={acceptingId === header.id}
                itemLanguage={itemLanguage}
                detailSortDirection={detailSortDirection}
              />
            ))}
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
            <DialogTitle>Accept Receive</DialogTitle>
            <DialogDescription>
              Are you sure you want to accept this receive?
            </DialogDescription>
          </DialogHeader>
          {confirmHeader ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">FathId:</span>{" "}
                {displayFathId(confirmHeader)}
              </p>
              <p>
                <span className="text-muted-foreground">From:</span>{" "}
                {confirmHeader.sendingStorageName ?? confirmHeader.sendingStorageId ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">To:</span>{" "}
                {confirmHeader.receivingStorageName ??
                  confirmHeader.receivingStorageId ??
                  "—"}
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
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageGuard>
  );
}
