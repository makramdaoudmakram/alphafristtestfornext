"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MovementLookup } from "@/components/movement/MovementLookup";
import { getMovmentById } from "@/lib/api-client";
import { toMovmentLookupItem } from "@/lib/pharm-recive-movement";
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
import { ensureCatalogItemsForItmCodes } from "@/lib/item-unit-options";
import {
  buildPharmPurchaseStoreReturnSendPayload,
  buildSendDetailsFromPharmPurchaseTransferLines,
  defaultTransferQty,
  type PurchaseTransferLineSelection,
  validatePharmPurchaseStoreReturnBeforeSubmit,
  validatePharmPurchaseStoreReturnMovement,
  validateTransferQuantity,
} from "@/lib/pharm-purchase-to-store-transfer";
import { PHARM_STORE_RETURN_MOV_PARENT_ID } from "@/lib/pharm-store-return-send";
import { createPharmPurchaseService } from "@/services/pharm-purchase.service";
import {
  PharmStoreReturnRepositoryError,
  PharmStoreReturnService,
} from "@/services/pharm-store-return.service";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { MovmentLookupItem } from "@/types/movment";
import type { PurchaseTransferCandidate } from "@/types/purchase";

type PharmPurchaseTransferSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId: number | null;
  purchasePthId: number | null | undefined;
  pharmacyStoreId: string | null | undefined;
  pharmacyStoreName: string | null | undefined;
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

export function PharmPurchaseTransferSheet({
  open,
  onOpenChange,
  purchaseId,
  purchasePthId,
  pharmacyStoreId,
  pharmacyStoreName,
  token,
}: PharmPurchaseTransferSheetProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lines, setLines] = useState<PurchaseTransferLineSelection[]>([]);
  const [movement, setMovement] = useState<MovmentLookupItem | null>(null);
  const [movementLoading, setMovementLoading] = useState(false);
  const movementReqRef = useRef(0);
  const [catalogByCode, setCatalogByCode] = useState<Map<string, ItemCatalogItem>>(
    () => new Map()
  );

  const pharmPurchaseService = useMemo(
    () => (token ? createPharmPurchaseService(token) : null),
    [token]
  );
  const storeReturnService = useMemo(
    () => (token ? new PharmStoreReturnService(token) : null),
    [token]
  );

  const resetState = useCallback(() => {
    setLines([]);
    setMovement(null);
    setMovementLoading(false);
    movementReqRef.current += 1;
    setCatalogByCode(new Map());
    setSubmitError(null);
    setLoading(false);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    if (!pharmPurchaseService || purchaseId == null || purchaseId <= 0 || !token) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setSubmitError(null);

    void (async () => {
      try {
        const candidatesResponse =
          await pharmPurchaseService.getTransferCandidates(purchaseId);
        if (cancelled) return;

        const candidates = candidatesResponse.candidates;
        setLines(linesFromCandidates(candidates));

        const pseudoDetails = candidates
          .map((c) => ({ itmId: c.itemId?.trim() ?? "" }))
          .filter((row) => row.itmId.length > 0);
        const map = await ensureCatalogItemsForItmCodes(
          pseudoDetails,
          new Map(),
          undefined,
          token
        );
        if (!cancelled) setCatalogByCode(map);
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
  }, [open, onOpenChange, pharmPurchaseService, purchaseId, resetState, token]);

  const handleMovementChange = useCallback(
    (item: MovmentLookupItem | null) => {
      setSubmitError(null);
      if (!item) {
        movementReqRef.current += 1;
        setMovement(null);
        setMovementLoading(false);
        return;
      }

      setMovement(item);
      if (!token) return;

      // Movment/lookup omits MovStor2; load the full row like PharmStoreReturn send page.
      const requestId = ++movementReqRef.current;
      setMovementLoading(true);
      void getMovmentById(item.id, token)
        .then((full) => {
          if (requestId !== movementReqRef.current) return;
          setMovement(toMovmentLookupItem(full));
        })
        .catch(() => {
          // Keep lookup row; validation will stay blocked until stores are present.
        })
        .finally(() => {
          if (requestId === movementReqRef.current) setMovementLoading(false);
        });
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

  const movementError = useMemo(() => {
    if (movementLoading) return null;
    return validatePharmPurchaseStoreReturnMovement(movement, pharmacyStoreId, lines);
  }, [lines, movement, movementLoading, pharmacyStoreId]);

  const sendDetails = useMemo(
    () => buildSendDetailsFromPharmPurchaseTransferLines(lines, catalogByCode),
    [catalogByCode, lines]
  );

  const canSubmit =
    !loading &&
    !submitting &&
    !movementLoading &&
    movement != null &&
    movement.id > 0 &&
    movementError == null &&
    validatePharmPurchaseStoreReturnBeforeSubmit({
      movement,
      pharmacyStoreId,
      lines,
      sendDetails,
    }).ok;

  const handleSubmit = useCallback(async () => {
    if (!storeReturnService || !movement || purchaseId == null) return;

    const details = buildSendDetailsFromPharmPurchaseTransferLines(lines, catalogByCode);

    const validation = validatePharmPurchaseStoreReturnBeforeSubmit({
      movement,
      pharmacyStoreId,
      lines,
      sendDetails: details,
    });
    if (!validation.ok) {
      setSubmitError(validation.message);
      return;
    }

    const payload = buildPharmPurchaseStoreReturnSendPayload({
      movement,
      note: `Transfer from pharmacy purchase #${purchasePthId ?? purchaseId}`,
      lines,
      catalogByCode,
    });

    setSubmitting(true);
    setSubmitError(null);
    try {
      const document = await storeReturnService.send(payload);
      const serial = document.serialNo ?? document.id;
      toast.success(
        `Store return #${serial} created (pending main store acceptance).`
      );
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof PharmStoreReturnRepositoryError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Transfer failed.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    catalogByCode,
    lines,
    movement,
    onOpenChange,
    pharmacyStoreId,
    purchaseId,
    purchasePthId,
    storeReturnService,
  ]);

  const destinationStoreId = movement?.movStor2?.trim() ?? "";
  const sourceLabel =
    pharmacyStoreName?.trim() ||
    pharmacyStoreId?.trim() ||
    lines.find((row) => row.candidate.sourceStoreId)?.candidate.sourceStoreId?.trim() ||
    "—";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Transfer to Main Store</SheetTitle>
          <SheetDescription>
            Create a pending pharmacy store return from saved pharmacy purchase batches. Stock is
            reserved on submit; main store acceptance completes the movement.
            {purchasePthId != null ? (
              <>
                {" "}
                Purchase document #{purchasePthId}.
              </>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-2">
          <div className="grid gap-1 text-sm">
            <p>
              <span className="text-muted-foreground">Source store: </span>
              {sourceLabel}
            </p>
            <p>
              <span className="text-muted-foreground">Destination (main store): </span>
              {destinationStoreId ? destinationStoreId : "Select a return movement"}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Movement</p>
            <MovementLookup
              id="pharm-purchase-transfer-movement"
              parentId={PHARM_STORE_RETURN_MOV_PARENT_ID}
              token={token}
              value={movement}
              disabled={loading || submitting || movementLoading}
              onChange={(item) => handleMovementChange(item)}
            />
            {movementLoading ? (
              <p className="text-muted-foreground text-xs">Loading movement stores…</p>
            ) : null}
            {movementError && movement ? (
              <p className="text-destructive text-sm">{movementError}</p>
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
                    <TableRow
                      key={candidate.purchaseDetailId}
                      className={disabled ? "opacity-60" : undefined}
                    >
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
            {submitting ? "Submitting…" : "Create store return"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
