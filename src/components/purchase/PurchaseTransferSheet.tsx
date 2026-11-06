"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MovementLookup } from "@/components/movement/MovementLookup";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, getMovmentById, getNextMovValue } from "@/lib/api-client";
import { PHARM_RECIVE_MOV_PARENT_ID } from "@/lib/pharm-recive-movement";
import {
  buildPharmReciveDetailsFromTransferLines,
  buildPharmReciveTransferPayload,
  defaultTransferQty,
  type PurchaseTransferLineSelection,
  validateMovementSourceStoreForTransfer,
  validateTransferLinesBeforeSubmit,
  validateTransferQuantity,
} from "@/lib/purchase-to-pharm-recive-transfer";
import { createPharmReciveService, PharmReciveRepositoryError } from "@/services/pharm-recive.service";
import { createPurchaseService } from "@/services/purchase.service";
import type { MovmentLookupItem } from "@/types/movment";
import type { PharmReciveDetail } from "@/types/pharm-recive";
import type { PurchaseTransferCandidate } from "@/types/purchase";
import type { PharmReciveHeaderFormValues } from "@/validation/pharm-recive.schema";

type PurchaseTransferSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId: number | null;
  token: string | undefined;
};

function formatQty(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function candidateLabel(candidate: PurchaseTransferCandidate): string {
  return (
    candidate.itemNameEn?.trim() ||
    candidate.itemNameAr?.trim() ||
    candidate.itemId?.trim() ||
    "—"
  );
}

function linesFromCandidates(candidates: PurchaseTransferCandidate[]): PurchaseTransferLineSelection[] {
  return candidates.map((candidate) => ({
    candidate,
    transferQty: candidate.transferable ? defaultTransferQty(candidate.availableQty) : 0,
    included: candidate.transferable && candidate.availableQty > 0,
  }));
}

export function PurchaseTransferSheet({
  open,
  onOpenChange,
  purchaseId,
  token,
}: PurchaseTransferSheetProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lines, setLines] = useState<PurchaseTransferLineSelection[]>([]);
  const [movement, setMovement] = useState<MovmentLookupItem | null>(null);
  const [fathId, setFathId] = useState<number | null>(null);
  const [movDate, setMovDate] = useState("");
  const [movementLoading, setMovementLoading] = useState(false);
  const nextValueRequestRef = useRef(0);

  const pharmReciveService = useMemo(
    () => (token ? createPharmReciveService(token) : null),
    [token]
  );
  const purchaseService = useMemo(
    () => (token ? createPurchaseService(token) : null),
    [token]
  );

  const resetState = useCallback(() => {
    setLines([]);
    setMovement(null);
    setFathId(null);
    setMovDate("");
    setSubmitError(null);
    setLoading(false);
    setSubmitting(false);
    setMovementLoading(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    if (!purchaseService || purchaseId == null || purchaseId <= 0) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setSubmitError(null);

    void (async () => {
      try {
        const [candidatesResponse, serverDate] = await Promise.all([
          purchaseService.getTransferCandidates(purchaseId),
          pharmReciveService?.getServerDate() ?? Promise.resolve(""),
        ]);
        if (cancelled) return;
        setLines(linesFromCandidates(candidatesResponse.candidates));
        setMovDate(serverDate || new Date().toISOString().slice(0, 10));
      } catch (error) {
        if (cancelled) return;
        toast.error(
          error instanceof Error ? error.message : "Could not load transfer candidates."
        );
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, onOpenChange, pharmReciveService, purchaseId, purchaseService, resetState]);

  const handleMovementChange = useCallback(
    async (item: MovmentLookupItem | null) => {
      setMovement(item);
      setFathId(null);
      setSubmitError(null);

      if (!token || !item) return;

      const requestId = ++nextValueRequestRef.current;
      setMovementLoading(true);
      try {
        const full = await getMovmentById(item.id, token);
        if (requestId !== nextValueRequestRef.current) return;

        const mapped: MovmentLookupItem = {
          id: full.id,
          movChiledId: full.movChiledId,
          movChiledName: full.movChiledName,
          movParientId: full.movParientId,
          movStor: full.movStor,
          movStor2: full.movStor2,
          movSingleStore: full.movSingleStore,
          movAccountEntry1: full.movAccountEntry1,
          movAccountEntry2: full.movAccountEntry2,
          movAccountEntry3: full.movAccountEntry3,
          movAccountEntry4: full.movAccountEntry4,
        };
        setMovement(mapped);

        const movChiledId = mapped.movChiledId;
        if (movChiledId == null) {
          toast.error("Selected movement has no MovChiledId.");
          return;
        }

        const result = await getNextMovValue(movChiledId, token);
        if (requestId !== nextValueRequestRef.current) return;

        if (!result.success) {
          toast.error(result.message?.trim() || "Could not get the next serial.");
          return;
        }

        setFathId(result.value);
      } catch (error) {
        if (requestId !== nextValueRequestRef.current) return;
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Could not load movement / next serial."
        );
      } finally {
        if (requestId === nextValueRequestRef.current) {
          setMovementLoading(false);
        }
      }
    },
    [token]
  );

  const updateLine = useCallback(
    (purchaseDetailId: number, patch: Partial<PurchaseTransferLineSelection>) => {
      setLines((rows) =>
        rows.map((row) =>
          row.candidate.purchaseDetailId === purchaseDetailId ? { ...row, ...patch } : row
        )
      );
      setSubmitError(null);
    },
    []
  );

  const storeMismatchError = useMemo(
    () => validateMovementSourceStoreForTransfer(movement, lines),
    [lines, movement]
  );

  const canSubmit =
    !loading &&
    !submitting &&
    !movementLoading &&
    movement != null &&
    fathId != null &&
    fathId > 0 &&
    storeMismatchError == null &&
    validateTransferLinesBeforeSubmit(lines) == null;

  const handleSubmit = useCallback(async () => {
    if (!pharmReciveService || !movement || fathId == null || fathId <= 0) return;

    const lineError = validateTransferLinesBeforeSubmit(lines);
    if (lineError) {
      setSubmitError(lineError);
      return;
    }

    const storeError = validateMovementSourceStoreForTransfer(movement, lines);
    if (storeError) {
      setSubmitError(storeError);
      return;
    }

    const payload = buildPharmReciveTransferPayload({
      movement,
      movDate: movDate || new Date().toISOString().slice(0, 10),
      fathId,
      monNote: `Transfer from purchase #${purchaseId ?? ""}`,
      lines,
    });

    const details: PharmReciveDetail[] = buildPharmReciveDetailsFromTransferLines(lines);

    setSubmitting(true);
    setSubmitError(null);
    try {
      const document = await pharmReciveService.save({
        header: payload.header as PharmReciveHeaderFormValues,
        details,
      });

      const createdId = document.header.id;
      const serial = document.header.fathId;
      toast.success(
        createdId != null
          ? `Pharmacy receive #${serial ?? createdId} created (pending acceptance).`
          : "Pharmacy receive document created (pending acceptance)."
      );
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof PharmReciveRepositoryError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Transfer failed.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    fathId,
    lines,
    movement,
    movDate,
    onOpenChange,
    pharmReciveService,
    purchaseId,
  ]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Transfer to pharmacy receive</SheetTitle>
          <SheetDescription>
            Create a pending pharmacy receive document from saved purchase batches. Stock is
            reserved on submit; acceptance uses the existing workflow.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Movement</p>
            <MovementLookup
              id="purchase-transfer-movement"
              parentId={PHARM_RECIVE_MOV_PARENT_ID}
              token={token}
              value={movement}
              disabled={loading || submitting || movementLoading}
              onChange={(item) => void handleMovementChange(item)}
            />
            {movementLoading ? (
              <p className="text-muted-foreground text-xs">Loading movement serial…</p>
            ) : null}
            {storeMismatchError && movement ? (
              <p className="text-destructive text-sm">{storeMismatchError}</p>
            ) : null}
          </div>

          {loading ? (
            <p className="text-muted-foreground text-sm">Loading purchase lines…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Item</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Purch. qty</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right w-28">Transfer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((row) => {
                  const { candidate } = row;
                  const disabled = !candidate.transferable;
                  const qtyError =
                    row.included && !disabled
                      ? validateTransferQuantity(row.transferQty, candidate.availableQty)
                      : null;

                  return (
                    <TableRow key={candidate.purchaseDetailId} className={disabled ? "opacity-60" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={row.included && !disabled}
                          disabled={disabled || submitting}
                          onChange={(event) =>
                            updateLine(candidate.purchaseDetailId, {
                              included: event.target.checked,
                            })
                          }
                          aria-label={`Include ${candidateLabel(candidate)}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{candidateLabel(candidate)}</div>
                        {disabled && candidate.statusReason ? (
                          <p className="text-muted-foreground text-xs">{candidate.statusReason}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>{candidate.batchNo ?? "—"}</TableCell>
                      <TableCell>{candidate.expDate ?? "—"}</TableCell>
                      <TableCell className="text-right">{formatQty(candidate.purchaseQty)}</TableCell>
                      <TableCell className="text-right">{formatQty(candidate.availableQty)}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          className="h-8 text-right"
                          disabled={disabled || !row.included || submitting}
                          value={row.included && !disabled ? row.transferQty : ""}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            updateLine(candidate.purchaseDetailId, {
                              transferQty: Number.isFinite(parsed) ? parsed : 0,
                            });
                          }}
                        />
                        {qtyError ? (
                          <p className="text-destructive mt-1 text-xs">{qtyError}</p>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {submitError ? <p className="text-destructive text-sm">{submitError}</p> : null}
        </div>

        <SheetFooter className="mt-auto gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit}>
            {submitting ? "Submitting…" : "Create pharmacy receive"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
