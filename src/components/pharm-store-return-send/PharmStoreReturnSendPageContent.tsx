"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getMovmentById, getStors } from "@/lib/api-client";
import { createUnitService } from "@/services/unit.service";
import { buildRowUnitComboboxOptions } from "@/lib/item-unit-options";
import { toMovmentLookupItem } from "@/lib/pharm-recive-movement";
import { formatExpDateMmYyyy } from "@/lib/purchase-exp-date";
import {
  getDefaultMovementStoreId,
  formatStorDisplayName,
} from "@/lib/purchase-stores";
import {
  PHARM_STORE_RETURN_MOV_PARENT_ID,
  buildDetailRowFromStockSearch,
  createEmptySendDetailRow,
  toSendPayload,
  validateSendDocument,
} from "@/lib/pharm-store-return-send";
import {
  PharmStoreReturnRepositoryError,
  PharmStoreReturnService,
} from "@/services/pharm-store-return.service";
import { MovementLookup } from "@/components/movement/MovementLookup";
import { ReturnItemStockSearchBox } from "@/components/return/ReturnItemStockSearchBox";
import { ItemLanguageToggle } from "@/components/pharm-recive/ItemLanguageToggle";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormFieldInlineWrap,
  formControlFocusClass,
} from "@/components/ui/form-field-inline";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { MovmentLookupItem } from "@/types/movment";
import type { ReturnItemStockSearchItem } from "@/types/stock";
import type { StorItem } from "@/types/stor";
import type { UnitItem } from "@/types/unit";
import type { PharmReciveItemLanguage } from "@/types/pharm-recive";
import type {
  PharmStoreReturnSendDetail,
  PharmStoreReturnSendResult,
} from "@/types/pharm-store-return-send";

function machineTodayInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function storeLabel(stores: StorItem[], storeId: string | null | undefined): string {
  const id = storeId?.trim();
  if (!id) return "—";
  const store = stores.find((s) => String(s.id) === id);
  return store ? formatStorDisplayName(store) || id : id;
}

export function PharmStoreReturnSendPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";
  const sessionAuthenticated = status === "authenticated" && !!token;

  const [movement, setMovement] = useState<MovmentLookupItem | null>(null);
  const [details, setDetails] = useState<PharmStoreReturnSendDetail[]>([
    createEmptySendDetailRow(0),
  ]);
  const [note, setNote] = useState("");
  const [itemLanguage, setItemLanguage] = useState<PharmReciveItemLanguage>("en");
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [stores, setStores] = useState<StorItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState<PharmStoreReturnSendResult | null>(null);
  const movementReqRef = useRef(0);

  const service = useMemo(
    () => (token ? new PharmStoreReturnService(token) : null),
    [token]
  );

  useEffect(() => {
    if (!sessionAuthenticated || !token) {
      setUnits([]);
      setStores([]);
      return;
    }
    let cancelled = false;
    void createUnitService(token)
      .listUnits()
      .then(({ units: loaded }) => {
        if (!cancelled) setUnits(loaded);
      })
      .catch(() => {
        if (!cancelled) setUnits([]);
      });
    void getStors(token)
      .then((rows) => {
        if (!cancelled) setStores(rows);
      })
      .catch(() => {
        if (!cancelled) setStores([]);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionAuthenticated, token]);

  const sourceStoreId = getDefaultMovementStoreId(movement);
  const destinationStoreId = movement?.movStor2?.trim() ?? "";

  const handleMovementChange = useCallback(
    (item: MovmentLookupItem | null) => {
      setSent(null);
      if (!item) {
        movementReqRef.current += 1;
        setMovement(null);
        setDetails([createEmptySendDetailRow(0)]);
        return;
      }
      // Show the picked movement immediately; drop rows pinned to the previous source store.
      setMovement(item);
      setDetails([createEmptySendDetailRow(0)]);
      if (!token) return;

      // Movment/lookup omits MovStor2 (and can omit other header fields); the source
      // store for the stock search and the destination store live on the full row.
      // Fetch it, exactly like the Pharm Receive page, so MovStor2 (Main Store) is present.
      const requestId = ++movementReqRef.current;
      void getMovmentById(item.id, token)
        .then((full) => {
          if (requestId !== movementReqRef.current) return;
          setMovement(toMovmentLookupItem(full));
        })
        .catch(() => {
          // Keep the lookup value; Send will surface a clear server error if incomplete.
        });
    },
    [token]
  );

  const handleStockSearchItemSelected = useCallback(
    (item: ReturnItemStockSearchItem) => {
      if (!movement) {
        toast.message("Select a movement first.");
        return;
      }
      const row = buildDetailRowFromStockSearch(item);
      setDetails((current) => {
        const emptyIndex = current.findIndex((line) => !line.itmId.trim());
        if (emptyIndex >= 0) {
          return current.map((line, index) => (index === emptyIndex ? row : line));
        }
        return [...current, row];
      });
      setSent(null);
    },
    [movement]
  );

  const updateRow = useCallback(
    (clientRowId: string, patch: Partial<PharmStoreReturnSendDetail>) => {
      setDetails((current) =>
        current.map((row) => (row.clientRowId === clientRowId ? { ...row, ...patch } : row))
      );
      setSent(null);
    },
    []
  );

  const addRow = useCallback(() => {
    setDetails((current) => [...current, createEmptySendDetailRow(current.length)]);
  }, []);

  const removeRow = useCallback((clientRowId: string) => {
    setDetails((current) => {
      const next = current.filter((row) => row.clientRowId !== clientRowId);
      return next.length ? next : [createEmptySendDetailRow(0)];
    });
    setSent(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!service) return;
    const validation = validateSendDocument(movement, details);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    setSaving(true);
    try {
      const payload = toSendPayload(movement!.id, note, details);
      const result = await service.send(payload);
      setSent(result);
      setDetails([createEmptySendDetailRow(0)]);
      setNote("");
      const label = result.serialNo != null ? `#${result.serialNo}` : `ID ${result.id}`;
      toast.success(`Pharmacy return sent ${label} — awaiting store acceptance.`);
    } catch (error) {
      toast.error(
        error instanceof PharmStoreReturnRepositoryError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not send pharmacy return."
      );
    } finally {
      setSaving(false);
    }
  }, [details, movement, note, service]);

  const editableLines = details.filter((row) => row.itmId.trim()).length;
  const canSave = !!service && !!movement && editableLines > 0 && !saving;

  const handleNew = useCallback(() => {
    movementReqRef.current += 1;
    setMovement(null);
    setDetails([createEmptySendDetailRow(0)]);
    setNote("");
    setSent(null);
  }, []);

  if (!sessionReady) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-3xl" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <PageGuard
      permission={PERMISSIONS.sales.view}
      redirectTo="/unauthorized?from=pharm-to-store-send&permission=Sales.View"
    >
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Pharmacy → Main Store Return</h2>
          <p className="text-muted-foreground text-sm">
            Return stock from the current pharmacy to Main Store. The pharmacy reserves the
            outgoing quantity; the store accepts it from the Pharm-to-Store page.
          </p>
        </div>

        <div className="bg-card flex flex-wrap items-center gap-1 rounded-lg border p-2">
          <Button type="button" size="icon" variant="outline" disabled={saving} onClick={handleNew} aria-label="New" title="New">
            <Plus className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="default"
            disabled={!canSave}
            onClick={() => void handleSave()}
            aria-label="Save"
            title="Save"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          </Button>
          <span className="text-muted-foreground ml-2 text-sm">
            {editableLines > 0
              ? `${editableLines} line(s) · Send to Main Store`
              : "Select a movement, then add items from the pharmacy stock search"}
          </span>
        </div>

        <Card>
          <CardContent className="space-y-3 pt-3">
            <FormFieldInlineWrap
              id="psr-send-movement"
              label="Movement"
              className="sm:grid-cols-[7rem_minmax(0,1fr)] w-full"
              labelClassName="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
            >
              <MovementLookup
                id="psr-send-movement"
                parentId={PHARM_STORE_RETURN_MOV_PARENT_ID}
                token={token}
                value={movement}
                disabled={!sessionAuthenticated || saving}
                onChange={(item) => handleMovementChange(item)}
              />
            </FormFieldInlineWrap>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormFieldInlineWrap
                id="psr-send-source"
                label="From (Pharmacy)"
                className="sm:grid-cols-[7rem_minmax(0,1fr)] w-full"
                labelClassName="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
              >
                <p className="text-sm font-medium">{storeLabel(stores, sourceStoreId)}</p>
              </FormFieldInlineWrap>
              <FormFieldInlineWrap
                id="psr-send-dest"
                label="To (Main Store)"
                className="sm:grid-cols-[7rem_minmax(0,1fr)] w-full"
                labelClassName="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
              >
                <p className="text-sm font-medium">{storeLabel(stores, destinationStoreId)}</p>
              </FormFieldInlineWrap>
            </div>

            <FormFieldInlineWrap
              id="psr-send-search"
              label="Search Item"
              className="sm:grid-cols-[7rem_minmax(0,1fr)] w-full"
              labelClassName="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
            >
              <div className="space-y-2">
                <ReturnItemStockSearchBox
                  token={token}
                  storeId={sourceStoreId}
                  itemLanguage={itemLanguage}
                  preferAvailableQty
                  showBatchDetails
                  disabled={!sessionAuthenticated || !movement || saving}
                  onItemSelected={handleStockSearchItemSelected}
                />
                <ItemLanguageToggle value={itemLanguage} onChange={setItemLanguage} />
              </div>
            </FormFieldInlineWrap>

            <FormFieldInlineWrap
              id="psr-send-note"
              label="Note"
              className="sm:grid-cols-[7rem_minmax(0,1fr)] w-full"
              labelClassName="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
            >
              <Textarea
                id="psr-send-note"
                rows={2}
                disabled={saving}
                className={cn("min-h-[3rem]", formControlFocusClass)}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </FormFieldInlineWrap>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="w-28">Exp MM/YYYY</TableHead>
                    <TableHead className="w-40">Unit</TableHead>
                    <TableHead className="w-28">Quantity</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.map((row, index) => {
                    const hasItem = Boolean(row.itmId.trim());
                    const unitOptions = buildRowUnitComboboxOptions(
                      units,
                      row.unitFields,
                      hasItem
                    );
                    const name =
                      itemLanguage === "ar"
                        ? row.itmNameAr || row.itmId
                        : row.itmNameEn || row.itmId;
                    return (
                      <TableRow key={row.clientRowId}>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {index + 1}
                        </TableCell>
                        <TableCell className="max-w-[18rem] truncate" title={name || "—"}>
                          {hasItem ? name : "—"}
                          {hasItem ? (
                            <span className="text-muted-foreground ml-2 text-xs">
                              {row.itmId}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>{row.batchNo || "—"}</TableCell>
                        <TableCell>{formatExpDateMmYyyy(row.expDate) || "—"}</TableCell>
                        <TableCell>
                          <SearchableCombobox
                            options={unitOptions}
                            value={row.unitId != null ? String(row.unitId) : ""}
                            disabled={saving || !hasItem}
                            placeholder="Unit"
                            onValueChange={(value) =>
                              updateRow(row.clientRowId, { unitId: value ? Number(value) : null })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            disabled={saving || !hasItem}
                            className={cn("h-8 w-full tabular-nums", formControlFocusClass)}
                            value={row.qnty}
                            onChange={(e) =>
                              updateRow(row.clientRowId, { qnty: Number(e.target.value) })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={saving}
                            onClick={() => removeRow(row.clientRowId)}
                            title="Remove"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={addRow}>
                <Plus className="mr-2 size-4" />
                Add line
              </Button>
            </div>

            {sent ? (
              <p className="text-muted-foreground text-sm">
                Sent return #{sent.serialNo ?? sent.id} — {sent.detailCount} line(s) reserved from{" "}
                {storeLabel(stores, String(sent.sourceStoreId ?? ""))} to{" "}
                {sent.destinationStoreName ?? storeLabel(stores, String(sent.destinationStoreId ?? ""))}.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <p className="text-muted-foreground text-xs">
          Return date: {machineTodayInput()} · Stock is reserved on send and moved to the store on
          acceptance (pharmacy OUT / store IN), atomically on the server.
        </p>
      </div>
    </PageGuard>
  );
}
