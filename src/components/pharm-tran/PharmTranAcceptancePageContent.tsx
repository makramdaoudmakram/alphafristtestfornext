"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePharmacyScope } from "@/components/pharmacy/pharmacy-scope-provider";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import { PharmTranService, PharmTranRepositoryError } from "@/services/pharm-tran.service";
import type { PharmTranPendingHeader } from "@/types/pharm-tran";
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

function displaySerial(header: PharmTranPendingHeader): string {
  if (header.serialNo != null && header.serialNo > 0) {
    return String(header.serialNo);
  }
  return String(header.id);
}

type TransferAccordionItemProps = {
  header: PharmTranPendingHeader;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (header: PharmTranPendingHeader) => void;
  accepting: boolean;
};

function TransferAccordionItem({
  header,
  open,
  onOpenChange,
  onAccept,
  accepting,
}: TransferAccordionItemProps) {
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
                <p className="text-muted-foreground text-xs uppercase">Transfer No</p>
                <p className="font-medium">{displaySerial(header)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Sending Storage</p>
                <p className="font-medium">
                  {header.sendingPharmacyName ??
                    (header.sendingPharmacyId > 0 ? String(header.sendingPharmacyId) : "—")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Receiving Storage</p>
                <p className="font-medium">
                  {header.receivingPharmacyName ??
                    (header.receivingPharmacyId > 0 ? String(header.receivingPharmacyId) : "—")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Total Quantity</p>
                <p className="font-medium">{formatNumber(header.totalQuantity)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Transfer Date</p>
                <p className="font-medium">{formatDate(header.transferDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Total Sales Price</p>
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
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Batch No</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Purchase Price</TableHead>
                  <TableHead className="text-right">Sales Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {header.details.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell>
                      <div className="font-medium">{detail.itemCode ?? "—"}</div>
                      <div className="text-muted-foreground text-xs">
                        {detail.itemNameEn ?? detail.itemNameAr ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>{formatNumber(detail.quantity)}</TableCell>
                    <TableCell>{detail.unitName ?? detail.unitId ?? "—"}</TableCell>
                    <TableCell>{detail.batchNo ?? "—"}</TableCell>
                    <TableCell>{formatDate(detail.expDate)}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(detail.purchasePrice)}
                    </TableCell>
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

export function PharmTranAcceptancePageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";
  const { activePharmacy, activePharmacyId, ready: scopeReady } = usePharmacyScope();

  const [items, setItems] = useState<PharmTranPendingHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({});
  const [confirmHeader, setConfirmHeader] = useState<PharmTranPendingHeader | null>(null);

  const service = useMemo(
    () => (token ? new PharmTranService(token) : null),
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
    } catch (error) {
      setItems([]);
      const message =
        error instanceof PharmTranRepositoryError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not load pending transfers.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (!sessionReady || !scopeReady) return;
    void loadPending();
  }, [sessionReady, scopeReady, activePharmacyId, loadPending]);

  async function handleAcceptConfirmed() {
    if (!service || !confirmHeader) return;

    setAcceptingId(confirmHeader.id);
    try {
      const result = await service.accept(confirmHeader.id);
      toast.success(result.message || "Transfer accepted successfully.");
      setConfirmHeader(null);
      setOpenIds((current) => {
        const next = { ...current };
        delete next[confirmHeader.id];
        return next;
      });
      await loadPending();
    } catch (error) {
      toast.error(
        error instanceof PharmTranRepositoryError
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
      redirectTo="/unauthorized?from=pharm-tran-acceptance&permission=Sales.View"
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Pharmacy Transfer Acceptance</h2>
          <p className="text-muted-foreground text-sm">
            Review pending transfers for your assigned receiving pharmacy and accept
            physical receipt.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Receiving Pharmacy</CardTitle>
            <CardDescription>
              Pending transfers are filtered by your active pharmacy storage (
              <code>MovDis</code> = current store).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {activePharmacy?.name ?? activePharmacyId ?? "No active pharmacy selected"}
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : loadError ? (
          <Card>
            <CardContent className="space-y-3 py-10 text-center text-sm">
              <p className="text-destructive font-medium">{loadError}</p>
              <p className="text-muted-foreground">
                If this mentions a database migration, stop the API, run{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  dotnet ef database update --context ApplicationDbContext
                </code>
                , then restart the API.
              </p>
              <Button type="button" variant="outline" onClick={() => void loadPending()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              No pending transfers waiting for acceptance.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((header) => (
              <TransferAccordionItem
                key={header.id}
                header={header}
                open={Boolean(openIds[header.id])}
                onOpenChange={(open) =>
                  setOpenIds((current) => ({ ...current, [header.id]: open }))
                }
                onAccept={setConfirmHeader}
                accepting={acceptingId === header.id}
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
            <DialogTitle>Accept Transfer</DialogTitle>
            <DialogDescription>
              Are you sure you want to accept this transfer?
            </DialogDescription>
          </DialogHeader>
          {confirmHeader ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Transfer No:</span>{" "}
                {displaySerial(confirmHeader)}
              </p>
              <p>
                <span className="text-muted-foreground">From:</span>{" "}
                {confirmHeader.sendingPharmacyName ??
                  (confirmHeader.sendingPharmacyId > 0
                    ? String(confirmHeader.sendingPharmacyId)
                    : "—")}
              </p>
              <p>
                <span className="text-muted-foreground">To:</span>{" "}
                {confirmHeader.receivingPharmacyName ??
                  (confirmHeader.receivingPharmacyId > 0
                    ? String(confirmHeader.receivingPharmacyId)
                    : "—")}
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
