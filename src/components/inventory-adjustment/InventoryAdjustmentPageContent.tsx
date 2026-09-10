"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  fetchAllItemCatalogItems,
  getItemCatalog,
  getNextMovValue,
  getStors,
  getUnitConversionInfo,
  searchStockBatchesForInventoryAdjustment,
} from "@/lib/api-client";
import { convertBaseStockQtyToUnit } from "@/lib/inventory-adjustment-qty";
import {
  applyInventoryUnitPrices,
  inventoryAdjustmentConversionQty,
  recomputeInventoryDetailFromAdjustment,
  resolveInventoryBatchBasePrices,
} from "@/lib/inventory-adjustment-detail";
import { createEmptyInventoryDetailRow, inventoryDetailRowKey } from "@/lib/inventory-adjustment.mapper";
import {
  getItemDefaultUnitId,
  getItemUnitIds,
  mergeCatalogItemWithCache,
} from "@/lib/item-unit-options";
import type { ItemCatalogSearchField } from "@/lib/item-catalog-search";
import {
  formatStorDisplayName,
  getDefaultMovementStoreId,
} from "@/lib/purchase-stores";
import { MovementLookup } from "@/components/movement/MovementLookup";
import { ItemLanguageToggle } from "@/components/pharm-recive/ItemLanguageToggle";
import { InventoryItemAutocomplete } from "@/components/inventory-adjustment/InventoryItemAutocomplete";
import { InventoryAdjustmentDetailsGrid } from "@/components/inventory-adjustment/InventoryAdjustmentDetailsGrid";
import { InventoryAdjustmentSummary } from "@/components/inventory-adjustment/InventoryAdjustmentSummary";
import { InventoryAdjustmentToolbar } from "@/components/inventory-adjustment/InventoryAdjustmentToolbar";
import { DocumentAuditDetails } from "@/components/audit/DocumentAuditDetails";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormFieldInline,
  FormFieldInlineWrap,
} from "@/components/ui/form-field-inline";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { createUnitService } from "@/services/unit.service";
import { useInventoryAdjustment } from "@/hooks/useInventoryAdjustment";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { MovmentLookupItem } from "@/types/movment";
import type { PharmReciveItemLanguage } from "@/types/pharm-recive";
import type { StockBatchItem } from "@/types/stock";
import type { StorItem } from "@/types/stor";
import type { UnitItem } from "@/types/unit";
import type { InventoryAdjustmentDetail } from "@/types/inventory-adjustment";
import { isInventoryAdjustmentPosted } from "@/types/inventory-adjustment";

/** Inventory adjustment uses MovParent / MovParientId = 6 */
const INVENTORY_MOV_PARENT_ID = 6;

function itemSearchField(language: PharmReciveItemLanguage): ItemCatalogSearchField {
  return language === "ar" ? "nameAr" : "nameEn";
}

export function InventoryAdjustmentPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";
  const sessionAuthenticated = status === "authenticated" && !!token;

  const {
    form,
    mode,
    isEditable,
    details,
    latestDetailGroupId,
    saving,
    loading,
    recordId,
    resetForm,
    loadRecord,
    applyMovement,
    prependDetailRows,
    updateDetailRow,
    removeDetailRow,
    handleNew,
    handleEdit,
    handleDelete,
    handleSave,
  } = useInventoryAdjustment(token);

  const {
    setValue,
    watch,
    formState: { errors },
  } = form;

  const invStore = watch("invStore") ?? "";
  const invDat = watch("invDat") ?? "";
  const invNotice = watch("invNotice") ?? "";
  const movStat = watch("movStat");

  const [catalogItems, setCatalogItems] = useState<ItemCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [stores, setStores] = useState<StorItem[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [itemByCode, setItemByCode] = useState<Map<string, ItemCatalogItem>>(
    () => new Map()
  );
  const [selectedMovement, setSelectedMovement] =
    useState<MovmentLookupItem | null>(null);
  const [itemLanguage, setItemLanguage] = useState<PharmReciveItemLanguage>("en");
  const [itemQuery, setItemQuery] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [pthIdLoading, setPthIdLoading] = useState(false);
  const [selectedDetailIndex, setSelectedDetailIndex] = useState(0);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  const movementStoreId = useMemo(
    () => getDefaultMovementStoreId(selectedMovement),
    [selectedMovement]
  );

  const storeDisplayName = useMemo(() => {
    const storeId = movementStoreId.trim();
    if (!storeId) return "—";
    const store = stores.find((s) => String(s.id) === storeId);
    return store ? formatStorDisplayName(store) || storeId : storeId;
  }, [movementStoreId, stores]);

  const hasRecord = recordId != null && recordId > 0;
  const isPosted = isInventoryAdjustmentPosted(movStat);
  const fhId = watch("fhId");

  const loadCatalog = useCallback(async () => {
    if (!token) {
      setCatalogItems([]);
      setItemByCode(new Map());
      setCatalogLoading(false);
      return;
    }

    setCatalogLoading(true);
    try {
      const items = await fetchAllItemCatalogItems(token);
      setCatalogItems(items);
      const map = new Map<string, ItemCatalogItem>();
      for (const item of items) {
        const code = item.itmCode?.trim().toLowerCase();
        if (code) map.set(code, item);
      }
      setItemByCode(map);
    } catch {
      setCatalogItems([]);
      toast.error("Could not load item catalog.");
    } finally {
      setCatalogLoading(false);
    }
  }, [token]);

  const loadUnits = useCallback(async () => {
    if (!token) {
      setUnits([]);
      return;
    }
    try {
      setUnits(await createUnitService(token).listUnits().then((r) => r.units));
    } catch {
      setUnits([]);
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
    } catch {
      setStores([]);
      toast.error("Could not load stores.");
    } finally {
      setStoresLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!sessionAuthenticated) return;
    void loadCatalog();
    void loadUnits();
    void loadStores();
  }, [sessionReady, sessionAuthenticated, loadCatalog, loadUnits, loadStores]);

  const handleMovementChange = useCallback(
    (movement: MovmentLookupItem | null) => {
      setSelectedMovement(movement);
      applyMovement(movement);

      const defaultStore = getDefaultMovementStoreId(movement);
      setValue("invStore", defaultStore, { shouldValidate: true });

      if (movement?.movChiledId && token) {
        setPthIdLoading(true);
        void getNextMovValue(movement.movChiledId, token)
          .then((next) => {
            if (next?.value != null && next.value > 0) {
              setValue("fhId", next.value);
            }
          })
          .catch(() => undefined)
          .finally(() => setPthIdLoading(false));
      } else {
        setValue("fhId", null);
      }
    },
    [applyMovement, setValue, token]
  );

  const cacheCatalogItem = useCallback(
    (item: ItemCatalogItem) => {
      setItemByCode((prev) => {
        const merged = mergeCatalogItemWithCache(item, prev, catalogItems);
        const code = merged.itmCode?.trim().toLowerCase();
        if (!code) return prev;
        const next = new Map(prev);
        next.set(code, merged);
        return next;
      });

      if (getItemUnitIds(item).length === 0 && item.id > 0 && token) {
        void getItemCatalog(item.id, token)
          .then((full) => {
            setItemByCode((current) => {
              const enriched = mergeCatalogItemWithCache(full, current, catalogItems);
              const code = enriched.itmCode?.trim().toLowerCase();
              if (!code) return current;
              const updated = new Map(current);
              updated.set(code, enriched);
              return updated;
            });
          })
          .catch(() => undefined);
      }
    },
    [catalogItems, token]
  );

  const buildDetailFromBatch = useCallback(
    async (
      item: ItemCatalogItem,
      batch: StockBatchItem,
      storeId: string
    ): Promise<InventoryAdjustmentDetail | null> => {
      if (!token) return null;

      const itemCode = item.itmCode?.trim() ?? batch.itemCode.trim();
      const unitId = getItemDefaultUnitId(item);
      if (!itemCode || unitId == null || unitId <= 0) {
        toast.error("Item has no default unit configured.");
        return null;
      }

      const converted = await convertBaseStockQtyToUnit(
        token,
        itemCode,
        unitId,
        batch.qty
      );
      if (converted.error) {
        toast.error(converted.error);
        return null;
      }

      const currentQty = converted.qty;
      const priceInfo = await getUnitConversionInfo(token, itemCode, unitId, 1);
      if (priceInfo.errorMessage?.trim()) {
        toast.error(priceInfo.errorMessage.trim());
        return null;
      }

      const factor =
        priceInfo.conversionValue != null &&
        Number.isFinite(priceInfo.conversionValue) &&
        priceInfo.conversionValue > 0
          ? priceInfo.conversionValue
          : priceInfo.quantityNet != null &&
              Number.isFinite(priceInfo.quantityNet) &&
              priceInfo.quantityNet > 0
            ? priceInfo.quantityNet
            : batch.qty > 0 && currentQty > 0
              ? batch.qty / currentQty
              : 1;
      const toSelectedUnit = (baseQty: number) =>
        factor > 0 ? baseQty / factor : baseQty;

      const availableBase = Number.isFinite(batch.availableQty)
        ? batch.availableQty
        : batch.qty - (batch.transferQty ?? 0);
      const transferBase = Number.isFinite(batch.transferQty)
        ? batch.transferQty
        : 0;
      const availableQty = toSelectedUnit(availableBase);
      const transferQty = toSelectedUnit(transferBase);

      const { baseItmPPrice, baseItmSalPrice } = resolveInventoryBatchBasePrices(
        item,
        batch
      );
      const priceFields = applyInventoryUnitPrices(
        {
          ...createEmptyInventoryDetailRow(),
          itmQ: currentQty,
          itmPPrice: baseItmPPrice,
          itmSalPrice: baseItmSalPrice,
          baseItmPPrice,
          baseItmSalPrice,
          priceQtyNet: null,
        },
        priceInfo.priceQtyNet
      );
      const row: InventoryAdjustmentDetail = {
        ...createEmptyInventoryDetailRow(),
        itmCode: itemCode,
        itemCatalogId: item.id > 0 ? item.id : null,
        itmNameAr: item.itmNameAr?.trim() ?? batch.itemNameAr?.trim() ?? "",
        itmNameEn: item.itmNameEn?.trim() ?? batch.itemNameEn?.trim() ?? "",
        batchNo: batch.batchNo,
        expDate: batch.expDate?.slice(0, 10) ?? "",
        unitId,
        itmStockQty: currentQty,
        itmAvailableQty: availableQty,
        itmTransferQty: transferQty,
        itmIncresQty: 0,
        itemShortQty: 0,
        itmQ: currentQty,
        stdItmStock: batch.qty,
        stdAvailableStock: availableBase,
        stdTransferQty: transferBase,
        stockId: batch.id,
        storeId: batch.storeId,
        itmCostPrice: batch.costPrice * (priceFields.priceQtyNet ?? 1),
        ...priceFields,
      };

      return {
        ...row,
        ...recomputeInventoryDetailFromAdjustment(row),
      };
    },
    [token]
  );

  const handleItemSelected = useCallback(
    async (item: ItemCatalogItem) => {
      if (!isEditable) {
        toast.message("Switch to edit mode to add items.");
        return;
      }

      cacheCatalogItem(item);

      const storeId = movementStoreId.trim() || invStore.trim();
      if (!storeId) {
        toast.message("Select a movement and store first.");
        return;
      }

      const itemCode = item.itmCode?.trim();
      if (!itemCode || !token) return;

      setBatchLoading(true);

      try {
        const result = await searchStockBatchesForInventoryAdjustment(token, {
          itemCode,
          storeId,
          pageSize: 500,
        });

        const normalizedCode = itemCode.toLowerCase();
        const batches = result.items.filter(
          (batch) =>
            batch.itemCode.trim().toLowerCase() === normalizedCode &&
            String(batch.storeId) === storeId
        );

        if (batches.length === 0) {
          toast.message("No stock batches found for this item in the selected store.");
          return;
        }

        const existingKeys = new Set(
          details.map((row) =>
            inventoryDetailRowKey(row.itmCode, storeId, row.batchNo)
          )
        );

        const newRows: InventoryAdjustmentDetail[] = [];
        for (const batch of batches) {
          const key = inventoryDetailRowKey(itemCode, storeId, batch.batchNo);
          if (existingKeys.has(key)) continue;

          const row = await buildDetailFromBatch(item, batch, storeId);
          if (row) newRows.push(row);
        }

        if (newRows.length === 0) {
          toast.message("All batches for this item are already in the list.");
          return;
        }

        prependDetailRows(newRows);
        setSelectedDetailIndex(0);
        setItemQuery("");
      } catch (error) {
        toast.error("Could not load stock batches.", {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setBatchLoading(false);
      }
    },
    [
      buildDetailFromBatch,
      cacheCatalogItem,
      details,
      invStore,
      isEditable,
      movementStoreId,
      prependDetailRows,
      token,
    ]
  );

  const handleUnitChange = useCallback(
    async (index: number, unitId: number) => {
      const row = details[index];
      if (!row || !token) return;

      const baseQty = row.stdItmStock ?? 0;
      const baseAvailable = row.stdAvailableStock ?? row.itmAvailableQty;
      const baseTransfer = row.stdTransferQty ?? row.itmTransferQty;
      const converted = await convertBaseStockQtyToUnit(
        token,
        row.itmCode,
        unitId,
        baseQty
      );
      if (converted.error) {
        toast.error(converted.error);
        return;
      }

      const oldStockQty = row.itmStockQty;
      const newStockQty = converted.qty;
      const scale =
        oldStockQty > 0 && Number.isFinite(oldStockQty)
          ? newStockQty / oldStockQty
          : 1;
      const newIncresQty = row.itmIncresQty * scale;
      const newShortQty = row.itemShortQty * scale;
      const factor =
        baseQty > 0 && newStockQty > 0 ? baseQty / newStockQty : scale > 0 ? 1 / scale : 1;
      const toSelectedUnit = (base: number) =>
        Number.isFinite(base) && factor > 0 ? base / factor : base * scale;

      const scaledRow = {
        ...row,
        itmStockQty: newStockQty,
        itmAvailableQty: toSelectedUnit(
          Number.isFinite(baseAvailable) ? baseAvailable : 0
        ),
        itmTransferQty: toSelectedUnit(
          Number.isFinite(baseTransfer) ? baseTransfer : 0
        ),
        itmIncresQty: newIncresQty,
        itemShortQty: newShortQty,
      };

      const priceInfo = await getUnitConversionInfo(
        token,
        row.itmCode,
        unitId,
        inventoryAdjustmentConversionQty(scaledRow)
      );
      if (priceInfo.errorMessage?.trim()) {
        toast.error(priceInfo.errorMessage.trim());
        return;
      }

      const priceFields = applyInventoryUnitPrices(scaledRow, priceInfo.priceQtyNet);

      const merged = {
        ...scaledRow,
        unitId,
        ...priceFields,
      };

      updateDetailRow(row.clientRowId, {
        ...merged,
        ...recomputeInventoryDetailFromAdjustment(merged),
      });
    },
    [details, token, updateDetailRow]
  );

  const handleChangeDetailRow = useCallback(
    (index: number, patch: Partial<InventoryAdjustmentDetail>) => {
      const row = details[index];
      if (!row) return;
      updateDetailRow(row.clientRowId, patch);
    },
    [details, updateDetailRow]
  );

  const handleRemoveDetailRow = useCallback(
    (index: number) => {
      const row = details[index];
      if (!row) return;
      removeDetailRow(row.clientRowId);
      setSelectedDetailIndex((prev) =>
        Math.max(0, Math.min(prev, details.length - 2))
      );
    },
    [details, removeDetailRow]
  );

  function onNew() {
    handleNew();
    setSelectedMovement(null);
    setItemQuery("");
  }

  function confirmDelete() {
    toast("Delete this inventory adjustment document?", {
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

  function handleRefresh() {
    void loadCatalog();
    void loadUnits();
    void loadStores();
    if (recordId != null && recordId > 0) {
      void loadRecord(recordId);
    }
    setAuditRefreshKey((value) => value + 1);
  }

  const searchField = itemSearchField(itemLanguage);

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
    <PageGuard permission={PERMISSIONS.stock.view}>
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
      <div className="space-y-3 lg:flex lg:min-h-[calc(100vh-6rem)] lg:flex-col">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Inventory Adjustment</h2>
          <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium uppercase tracking-wide">
            Mode: {mode}
          </span>
        </div>

        <InventoryAdjustmentToolbar
          mode={mode}
          saving={saving}
          loading={loading}
          hasRecord={hasRecord}
          isPosted={isPosted}
          onNew={onNew}
          onSave={() => {
            void handleSave(itemByCode).then((saved) => {
              if (saved) setAuditRefreshKey((value) => value + 1);
            });
          }}
          onEdit={handleEdit}
          onDelete={confirmDelete}
          onRefresh={handleRefresh}
        />

        <Card>
          <CardHeader>
            <CardTitle>Header</CardTitle>
            <CardDescription>
              Select movement and store, then search items to build the adjustment detail.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormFieldInlineWrap id="inv-movement" label="Movement">
                    <MovementLookup
                      parentId={INVENTORY_MOV_PARENT_ID}
                      token={token}
                      value={selectedMovement}
                      onChange={handleMovementChange}
                      disabled={!isEditable || saving || hasRecord}
                    />
                  </FormFieldInlineWrap>

                  <FormFieldInlineWrap id="inv-store" label="Store">
                    <p className="text-sm font-medium">
                      {storesLoading ? "Loading stores…" : storeDisplayName}
                    </p>
                    {errors.invStore?.message ? (
                      <p className="text-destructive mt-1 text-xs">{errors.invStore.message}</p>
                    ) : null}
                  </FormFieldInlineWrap>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormFieldInline
                    id="inv-doc-no"
                    label="Doc No"
                    readOnly
                    value={
                      pthIdLoading
                        ? "…"
                        : fhId != null && fhId > 0
                          ? String(fhId)
                          : "—"
                    }
                    inputClassName="bg-muted/50 tabular-nums"
                  />
                  <FormFieldInline
                    id="inv-date"
                    label="Date"
                    type="date"
                    readOnly
                    tabIndex={-1}
                    value={invDat}
                    onMouseDown={(event) => event.preventDefault()}
                    onKeyDown={(event) => event.preventDefault()}
                    inputClassName="bg-muted/50 font-medium tabular-nums opacity-90 pointer-events-none"
                  />
                </div>

                <FormFieldInlineWrap id="inv-comment" label="Comment">
                  <Textarea
                    rows={2}
                    disabled={!isEditable || saving}
                    value={invNotice}
                    onChange={(e) => setValue("invNotice", e.target.value)}
                    placeholder="Optional notice for this inventory count"
                  />
                </FormFieldInlineWrap>

                <ItemLanguageToggle
                  value={itemLanguage}
                  onChange={setItemLanguage}
                  disabled={saving}
                />

                <FormFieldInlineWrap id="inv-item" label="Item">
                  <InventoryItemAutocomplete
                    field={searchField}
                    value={itemQuery}
                    token={token}
                    disabled={!isEditable || saving}
                    onChange={setItemQuery}
                    onItemSelected={(item) => {
                      void handleItemSelected(item);
                    }}
                  />
                </FormFieldInlineWrap>

                {batchLoading ? (
                  <Skeleton className="h-10 w-full max-w-md" />
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col">
          <CardContent className="min-h-0 flex-1 space-y-4 pt-6">
            <InventoryAdjustmentDetailsGrid
              details={details}
              language={itemLanguage}
              units={units}
              itemByCode={itemByCode}
              disabled={!isEditable || saving || loading}
              latestDetailGroupId={latestDetailGroupId}
              selectedRowIndex={selectedDetailIndex}
              onSelectRow={setSelectedDetailIndex}
              onChangeRow={handleChangeDetailRow}
              onRemoveRow={handleRemoveDetailRow}
              onUnitChange={(index, unitId) => {
                void handleUnitChange(index, unitId);
              }}
            />

            <InventoryAdjustmentSummary details={details} itemByCode={itemByCode} />
          </CardContent>
        </Card>

        <DocumentAuditDetails
          token={token}
          entityType="InventoryAdjustment"
          entityId={recordId}
          documentNumber={fhId}
          refreshKey={auditRefreshKey}
        />
      </div>
    </PageGuard>
  );
}
