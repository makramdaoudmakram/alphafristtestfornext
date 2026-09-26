"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  ApiError,
  downloadPurTransDExcelTemplate,
  getItemCatalog,
  getMovmentById,
  getNextMovValue,
  getStors,
  reversePostedPurchaseInvoice,
} from "@/lib/api-client";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { UnitItem } from "@/types/unit";
import {
  getItemUnitIds,
  mergeCatalogItemWithCache,
} from "@/lib/item-unit-options";
import { createUnitService } from "@/services/unit.service";
import { DetailsGrid } from "@/components/purchase/DetailsGrid";
import { DocumentAuditDetails } from "@/components/audit/DocumentAuditDetails";
import {
  HeaderPrimaryFields,
  HeaderTotalsFields,
} from "@/components/purchase/HeaderForm";
import { SearchDialog } from "@/components/purchase/SearchDialog";
import { StockBarcodePrintDialog } from "@/components/stock/stock-barcode-print-dialog";
import { Toolbar } from "@/components/purchase/Toolbar";
import { MovementLookup } from "@/components/movement/MovementLookup";
import { PageGuard } from "@/components/permissions/page-guard";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  FormFieldInlineWrap,
} from "@/components/ui/form-field-inline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveMovementForPurchaseHeader } from "@/lib/purchase-movement";
import {
  applyDefaultStoreToNewDetailRows,
  getDefaultMovementStoreId,
} from "@/lib/purchase-stores";
import { usePurchase } from "@/hooks/usePurchase";
import type { MovmentLookupItem } from "@/types/movment";
import type { StorItem } from "@/types/stor";

/** Purchase transactions use MovParent / MovParientId = 1 */
const PURCHASE_MOV_PARENT_ID = 1;

function formatReverseAmount(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PurchasePageContent() {
  const { data: session, status } = useSession();
  const { canReversePurchase, ready: permissionsReady } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";
  const sessionAuthenticated = status === "authenticated" && !!token;

  const purchase = usePurchase(token);
  const searchParams = useSearchParams();
  const loadedFromUrlRef = useRef<number | null>(null);
  const [catalogItems, setCatalogItems] = useState<ItemCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [stores, setStores] = useState<StorItem[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [itemByCode, setItemByCode] = useState<Map<string, ItemCatalogItem>>(
    () => new Map()
  );
  const [selectedMovement, setSelectedMovement] =
    useState<MovmentLookupItem | null>(null);
  const [pthIdLoading, setPthIdLoading] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const [reverseConfirmOpen, setReverseConfirmOpen] = useState(false);
  const [reversing, setReversing] = useState(false);
  const nextValueAbortRef = useRef<AbortController | null>(null);
  const nextValueRequestRef = useRef(0);
  const movementSyncRequestRef = useRef(0);

  const loadItemCatalog = useCallback(async () => {
    if (!token) {
      setCatalogItems([]);
      setItemByCode(new Map());
      setCatalogLoaded(false);
      setCatalogLoading(false);
    }
  }, [token]);

  const loadUnits = useCallback(async () => {
    if (!token) {
      setUnits([]);
      setUnitsLoading(false);
      return;
    }

    setUnitsLoading(true);
    try {
      const service = createUnitService(token);
      const { units: loaded } = await service.listUnits();
      setUnits(loaded);
    } catch (err) {
      setUnits([]);
      toast.error("Could not load units.", {
        description:
          err instanceof Error
            ? err.message
            : "Check API connection and database migrations.",
      });
    } finally {
      setUnitsLoading(false);
    }
  }, [token]);

  const loadStores = useCallback(async () => {
    if (!token) {
      setStores([]);
      setStoresLoading(false);
      return;
    }

    setStoresLoading(true);
    try {
      setStores(await getStors(token));
    } catch (err) {
      setStores([]);
      toast.error("Could not load stores.", {
        description:
          err instanceof Error
            ? err.message
            : "Check API connection and the Stor table.",
      });
    } finally {
      setStoresLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!sessionAuthenticated) {
      setCatalogItems([]);
      setItemByCode(new Map());
      setCatalogLoaded(true);
      setUnits([]);
      setStores([]);
      return;
    }
    void loadItemCatalog();
    void loadUnits();
    void loadStores();
  }, [sessionReady, sessionAuthenticated, loadItemCatalog, loadUnits, loadStores]);

  const handleCatalogItemApplied = useCallback(
    (item: ItemCatalogItem) => {
      setItemByCode((prev) => {
        const merged = mergeCatalogItemWithCache(item, prev, catalogItems);
        const code = merged.itmCode?.trim().toLowerCase();
        if (!code) return prev;
        const next = new Map(prev);
        next.set(code, merged);

        if (getItemUnitIds(merged).length === 0 && merged.id > 0 && token) {
          void getItemCatalog(merged.id, token)
            .then((full) => {
              setItemByCode((current) => {
                const enriched = mergeCatalogItemWithCache(
                  full,
                  current,
                  catalogItems
                );
                const enrichedCode = enriched.itmCode?.trim().toLowerCase();
                if (!enrichedCode) return current;
                const updated = new Map(current);
                updated.set(enrichedCode, enriched);
                return updated;
              });
            })
            .catch(() => undefined);
        }

        return next;
      });
    },
    [catalogItems, token]
  );

  const {
    form,
    mode,
    details,
    setDetails,
    selectedRowIndex,
    setSelectedRowIndex,
    loading,
    saving,
    posting,
    isPostButtonVisible,
    isTransferButtonVisible,
    isBarcodeButtonVisible,
    isEditable,
    searchOpen,
    setSearchOpen,
    stockBarcodePrintOpen,
    setStockBarcodePrintOpen,
    stockBarcodeLabels,
    barcodeLoading,
    handleNew,
    handleEdit,
    handleSave,
    handlePrintBarcode,
    handleTransfer,
    handlePost,
    handleDelete,
    handleRefresh,
    navigate,
    navState,
    loadRecord,
    runSearch,
    addDetailRow,
    removeDetailRow,
    updateDetailRow,
    computedTotals,
    newRowFocusRequest,
    clearNewRowFocusRequest,
  } = purchase;

  const hasRecord = !!form.watch("id");
  const isPosted = form.watch("movStat") === 5;
  const recordId = form.watch("id");
  const documentNumber = form.watch("pthId");
  const venBillNo = form.watch("venBillNo");
  const pthNetBill = form.watch("pthNetBill");

  const isReverseButtonVisible = useMemo(
    () =>
      permissionsReady &&
      canReversePurchase() &&
      hasRecord &&
      isPosted &&
      mode === "view",
    [permissionsReady, canReversePurchase, hasRecord, isPosted, mode]
  );

  const syncMovementFromLoadedHeader = useCallback(async () => {
    if (!token || recordId == null) return;

    const requestId = ++movementSyncRequestRef.current;
    const savedMovId = form.getValues("movId");

    try {
      const movement = await resolveMovementForPurchaseHeader(
        token,
        PURCHASE_MOV_PARENT_ID,
        form.getValues()
      );
      if (requestId !== movementSyncRequestRef.current) return;
      if (movement) {
        setSelectedMovement(movement);
        form.setValue("movmentRowId", movement.id, {
          shouldDirty: false,
          shouldValidate: false,
        });
      } else if (savedMovId != null) {
        setSelectedMovement({
          id: form.getValues("movmentRowId") ?? 0,
          movChiledId: savedMovId,
          movChiledName: `Movement #${savedMovId}`,
          movParientId: PURCHASE_MOV_PARENT_ID,
          movStor: null,
          movStor2: null,
          movSingleStore: false,
          movAccountEntry1: form.getValues("movAccount") || null,
          movAccountEntry2: form.getValues("movAccountsec") || null,
          movAccountEntry3: form.getValues("movAccounttherd") || null,
          movAccountEntry4: form.getValues("movAccountfourth") || null,
        });
      } else {
        setSelectedMovement(null);
      }
    } catch {
      if (requestId !== movementSyncRequestRef.current) return;
      if (savedMovId != null) {
        setSelectedMovement({
          id: form.getValues("movmentRowId") ?? 0,
          movChiledId: savedMovId,
          movChiledName: `Movement #${savedMovId}`,
          movParientId: PURCHASE_MOV_PARENT_ID,
          movStor: null,
          movStor2: null,
          movSingleStore: false,
          movAccountEntry1: form.getValues("movAccount") || null,
          movAccountEntry2: form.getValues("movAccountsec") || null,
          movAccountEntry3: form.getValues("movAccounttherd") || null,
          movAccountEntry4: form.getValues("movAccountfourth") || null,
        });
      }
    }
  }, [form, recordId, token]);

  const confirmReverse = useCallback(async () => {
    if (!token || recordId == null || recordId <= 0) return;

    setReversing(true);
    try {
      const result = await reversePostedPurchaseInvoice(token, recordId);
      toast.success(
        `Invoice ${venBillNo || result.pthId} reversed. It is now editable so the Vendor can be corrected.`
      );
      setReverseConfirmOpen(false);
      const map = await loadRecord(recordId, itemByCode, catalogItems);
      if (map && map.size > 0) setItemByCode(map);
      await syncMovementFromLoadedHeader();
      setAuditRefreshKey((value) => value + 1);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to reverse the purchase invoice";
      toast.error(message);
    } finally {
      setReversing(false);
    }
  }, [
    catalogItems,
    itemByCode,
    loadRecord,
    recordId,
    syncMovementFromLoadedHeader,
    token,
    venBillNo,
  ]);

  useEffect(() => {
    if (!token || recordId == null) return;
    void syncMovementFromLoadedHeader();
  }, [recordId, syncMovementFromLoadedHeader, token]);

  useEffect(() => {
    if (!token) return;
    const raw = searchParams.get("id");
    const id = raw ? Number(raw) : NaN;
    if (!Number.isFinite(id) || id <= 0) return;
    if (loadedFromUrlRef.current === id) return;
    loadedFromUrlRef.current = id;
    void loadRecord(id, itemByCode, catalogItems);
  }, [token, searchParams, loadRecord, itemByCode, catalogItems]);

  const onNew = useCallback(() => {
    handleNew();
    setSelectedMovement(null);
  }, [handleNew]);

  const applyMovementFields = useCallback(
    (mapped: MovmentLookupItem) => {
      setSelectedMovement(mapped);

      const movChiledId = mapped.movChiledId;
      const entry1 = mapped.movAccountEntry1?.trim() ?? "";
      const entry2 = mapped.movAccountEntry2?.trim() ?? "";
      const entry3 = mapped.movAccountEntry3?.trim() ?? "";
      const entry4 = mapped.movAccountEntry4?.trim() ?? "";
      const defaultStoreId = getDefaultMovementStoreId(mapped);

      form.setValue("movmentRowId", mapped.id, {
        shouldDirty: true,
        shouldValidate: false,
      });
      form.setValue("movId", movChiledId, { shouldDirty: true, shouldValidate: false });
      form.setValue("venId", entry1, { shouldDirty: true, shouldValidate: false });
      form.setValue("movAccount", entry1, { shouldDirty: true, shouldValidate: false });
      form.setValue("movAccountsec", entry2, { shouldDirty: true, shouldValidate: false });
      form.setValue("movAccounttherd", entry3, {
        shouldDirty: true,
        shouldValidate: false,
      });
      form.setValue("movAccountfourth", entry4, {
        shouldDirty: true,
        shouldValidate: false,
      });

      setDetails((rows) => applyDefaultStoreToNewDetailRows(rows, defaultStoreId));
    },
    [form, setDetails]
  );

  const handleMovementChange = useCallback(
    async (item: MovmentLookupItem | null) => {
      movementSyncRequestRef.current += 1;
      const isExistingDocument = (form.getValues("id") ?? 0) > 0;

      if (!item) {
        setSelectedMovement(null);
        form.setValue("movmentRowId", null, { shouldDirty: true, shouldValidate: false });
        form.setValue("movId", null, { shouldDirty: true, shouldValidate: false });
        if (!isExistingDocument) {
          form.setValue("pthId", null, { shouldDirty: true, shouldValidate: false });
        }
        form.setValue("venId", "", { shouldDirty: true, shouldValidate: false });
        form.setValue("movAccountsec", "", { shouldDirty: true, shouldValidate: false });
        form.setValue("movAccount", "", { shouldDirty: true, shouldValidate: false });
        form.setValue("movAccounttherd", "", { shouldDirty: true, shouldValidate: false });
        form.setValue("movAccountfourth", "", { shouldDirty: true, shouldValidate: false });
        setDetails((rows) => applyDefaultStoreToNewDetailRows(rows, ""));
        return;
      }

      // Show immediately from combobox row (lookup), then enrich from GET by id
      applyMovementFields(item);

      if (!token) {
        toast.error("Sign in is required to load the next PthId.");
        return;
      }

      nextValueAbortRef.current?.abort();
      const controller = new AbortController();
      nextValueAbortRef.current = controller;
      const requestId = ++nextValueRequestRef.current;

      if (!isExistingDocument) {
        setPthIdLoading(true);
      }
      try {
        const full = await getMovmentById(item.id, token, {
          signal: controller.signal,
        });

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
        applyMovementFields(mapped);
        if (!getDefaultMovementStoreId(mapped)) {
          toast.message("Selected movement has no stores.", {
            description:
              "Assign a store to the movement, or choose a store on each new line.",
          });
        }

        const movChiledId = mapped.movChiledId;
        if (movChiledId == null) {
          toast.error("Selected movement has no MovChiledId.");
          return;
        }

        // Existing invoices keep their PthId. Next-number preview is for new documents only.
        if (isExistingDocument) return;

        // Preview MaxValue + 1 only. MovValue is reserved when the header is saved.
        const result = await getNextMovValue(movChiledId, token, {
          signal: controller.signal,
        });

        if (requestId !== nextValueRequestRef.current) return;

        if (!result.success) {
          toast.error(result.message?.trim() || "Could not get the next PthId.");
          return;
        }

        form.setValue("pthId", result.value, {
          shouldDirty: true,
          shouldValidate: true,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (requestId !== nextValueRequestRef.current) return;

        toast.error(
          error instanceof ApiError
            ? error.message
            : "Could not load movement / next PthId. Please try again."
        );
      } finally {
        if (requestId === nextValueRequestRef.current) {
          setPthIdLoading(false);
        }
      }
    },
    [applyMovementFields, form, setDetails, token]
  );

  async function handleCreateExcelTemplate() {
    if (!token) {
      toast.error("Sign in to download the Excel template.");
      return;
    }

    setTemplateDownloading(true);
    try {
      const file = await downloadPurTransDExcelTemplate(token);
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Excel template downloaded");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to download the Excel template."
      );
    } finally {
      setTemplateDownloading(false);
    }
  }

  function confirmDelete() {
    toast("Delete this purchase document?", {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: () =>
          void handleDelete().then(() => {
            setSelectedMovement(null);
            setAuditRefreshKey((value) => value + 1);
          }),
      },
      cancel: { label: "Cancel", onClick: () => toast.message("Cancelled") },
    });
  }

  if (!sessionReady) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-3xl" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <PageGuard permission={null}>
      {/* Keep header id registered while the detail card shows a loading skeleton */}
      <input
        type="hidden"
        {...form.register("id", {
          setValueAs: (value) => {
            if (value === "" || value == null) return null;
            const parsed = Number(value);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
          },
        })}
      />
      <div className="space-y-3 print:space-y-2 lg:flex lg:min-h-[calc(100vh-6rem)] lg:flex-col">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Purchase transaction</h2>
          <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium uppercase tracking-wide">
            Mode: {mode}
          </span>
        </div>

        <Toolbar
          mode={mode}
          saving={saving}
          posting={posting}
          loading={loading}
          hasRecord={hasRecord}
          isPosted={isPosted}
          isPostButtonVisible={isPostButtonVisible}
          isReverseButtonVisible={isReverseButtonVisible}
          isTransferButtonVisible={isTransferButtonVisible}
          isBarcodeButtonVisible={isBarcodeButtonVisible}
          barcodeLoading={barcodeLoading}
          reversing={reversing}
          nav={navState}
          onNew={onNew}
          onSave={() => {
            void handleSave(itemByCode, selectedMovement, catalogItems).then(() => {
              setAuditRefreshKey((value) => value + 1);
            });
          }}
          onTransfer={handleTransfer}
          onPost={() => {
            void handlePost(itemByCode, catalogItems).then(() => {
              setAuditRefreshKey((value) => value + 1);
            });
          }}
          onReverse={() => setReverseConfirmOpen(true)}
          onPrintBarcode={() => void handlePrintBarcode()}
          onEdit={handleEdit}
          onDelete={confirmDelete}
          onPrint={() => {
            if (!hasRecord) {
              toast.message("Load or save a document before printing.");
              return;
            }
            window.print();
          }}
          onRefresh={() => {
            void loadItemCatalog();
            void loadUnits();
            void handleRefresh(itemByCode, catalogItems);
            setAuditRefreshKey((value) => value + 1);
          }}
          onFirst={() => void navigate("first", itemByCode, catalogItems)}
          onPrev={() => void navigate("prev", itemByCode, catalogItems)}
          onNext={() => void navigate("next", itemByCode, catalogItems)}
          onLast={() => void navigate("last", itemByCode, catalogItems)}
          onSearch={() => setSearchOpen(true)}
          onCreateExcelTemplate={() => void handleCreateExcelTemplate()}
          excelTemplateDisabled={!token || templateDownloading}
          excelTemplateLoading={templateDownloading}
          excelImportHref="/dashboard/transactions/purchase/import"
        />

        <Card>
          <CardContent className="pt-3">
            {loading ? (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)]">
                <div className="space-y-3">
                  <Skeleton className="h-9 w-full" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <FormFieldInlineWrap
                  id="purchase-movement"
                  label="Movement"
                  className="sm:grid-cols-[4.75rem_minmax(0,1fr)] w-full"
                  labelClassName="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
                >
                  <MovementLookup
                    id="purchase-movement"
                    parentId={PURCHASE_MOV_PARENT_ID}
                    token={token}
                    value={selectedMovement}
                    disabled={!isEditable || pthIdLoading}
                    onChange={(item) => void handleMovementChange(item)}
                  />
                </FormFieldInlineWrap>
                {pthIdLoading ? (
                  <p className="text-muted-foreground text-sm sm:pl-[calc(4.75rem+1rem)]">
                    Loading next PthId…
                  </p>
                ) : null}
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] lg:items-start">
                  <HeaderPrimaryFields
                    key={recordId ?? "new"}
                    form={form}
                    disabled={!isEditable}
                    phtDateReadOnly
                  />
                  <HeaderTotalsFields
                    form={form}
                    disabled={!isEditable}
                    totalDesMon={computedTotals.totalDesMon}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col">
          <CardContent className="min-h-0 flex-1 pt-6">
            <DetailsGrid
              rows={details}
              token={token}
              catalogItems={catalogItems}
              itemByCode={itemByCode}
              units={units}
              unitsLoading={unitsLoading}
              catalogLoading={catalogLoading}
              catalogLoaded={catalogLoaded}
              disabled={!isEditable || loading}
              selectedRowIndex={selectedRowIndex}
              onSelectRow={setSelectedRowIndex}
              onChangeRow={updateDetailRow}
              onCatalogItemApplied={handleCatalogItemApplied}
              stores={stores}
              storesLoading={storesLoading}
              onAddRow={() =>
                addDetailRow(getDefaultMovementStoreId(selectedMovement))
              }
              onRemoveRow={removeDetailRow}
              newRowFocusRequest={newRowFocusRequest}
              onNewRowFocusHandled={clearNewRowFocusRequest}
            />
          </CardContent>
        </Card>

        <DocumentAuditDetails
          token={token}
          entityType="Purchase"
          entityId={recordId}
          documentNumber={documentNumber}
          refreshKey={auditRefreshKey}
        />

        <SearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onSearch={runSearch}
          movementParentId={PURCHASE_MOV_PARENT_ID}
          token={token}
          catalogItems={catalogItems}
          onSelect={async (row) => {
            const map = await loadRecord(row.id, itemByCode, catalogItems);
            if (map && map.size > 0) setItemByCode(map);
            await syncMovementFromLoadedHeader();
          }}
        />

        <StockBarcodePrintDialog
          open={stockBarcodePrintOpen}
          onOpenChange={setStockBarcodePrintOpen}
          labels={stockBarcodeLabels}
        />

        <Dialog
          open={reverseConfirmOpen}
          onOpenChange={(open) => {
            if (!reversing && !open) setReverseConfirmOpen(false);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Reverse Purchase Invoice?</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <div className="space-y-1">
                    <p>
                      <span className="text-foreground font-medium">PthId:</span>{" "}
                      {documentNumber ?? "—"}
                    </p>
                    <p>
                      <span className="text-foreground font-medium">Invoice:</span>{" "}
                      {venBillNo || documentNumber || "—"}
                    </p>
                    <p>
                      <span className="text-foreground font-medium">Net Bill:</span>{" "}
                      {formatReverseAmount(pthNetBill)}
                    </p>
                  </div>
                  <p>
                    This action will create reversing ledger entries, cancel the
                    accounting effect of this invoice, and make the Purchase
                    Invoice editable again.
                  </p>
                  <p>Continue?</p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={reversing}
                onClick={() => setReverseConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={reversing}
                onClick={() => void confirmReverse()}
              >
                <Undo2 className={reversing ? "animate-spin" : undefined} />
                Reverse Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageGuard>
  );
}
