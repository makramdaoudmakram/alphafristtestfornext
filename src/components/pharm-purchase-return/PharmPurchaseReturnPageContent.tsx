"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  getCurrentOpenShift,
  getItemCatalog,
  getNextMovValue,
  getStors,
  getUnitConversionInfo,
} from "@/lib/api-client";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { UnitItem } from "@/types/unit";
import { createUnitService } from "@/services/unit.service";
import { DetailsGrid } from "@/components/return/DetailsGrid";
import { HeaderPrimaryFields } from "@/components/purchase/HeaderForm";
import { Toolbar } from "@/components/purchase/Toolbar";
import { ReturnItemStockSearchBox } from "@/components/return/ReturnItemStockSearchBox";
import { ItemLanguageToggle } from "@/components/pharm-recive/ItemLanguageToggle";
import { PharmPurchaseEmployeeShiftFields } from "@/components/pharm-purchase/PharmPurchaseEmployeeShiftFields";
import { PharmPurchaseHeaderTotals } from "@/components/pharm-purchase/PharmPurchaseHeaderTotals";
import { PageGuard } from "@/components/permissions/page-guard";
import { usePharmacyScope } from "@/components/pharmacy/pharmacy-scope-provider";
import { FormFieldInlineWrap } from "@/components/ui/form-field-inline";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePharmPurchaseReturn } from "@/hooks/usePharmPurchaseReturn";
import { applyReturnDetailPatch } from "@/lib/return-calculations";
import { applyMovementToHeader, createEmptyDetailRow } from "@/lib/return.mapper";
import {
  applyDefaultStoreToNewDetailRows,
  getDefaultMovementStoreId,
} from "@/lib/return-stores";
import { findEmptyDetailRowIndex } from "@/lib/return-item-stock-search";
import { patchDetailFromPharmPurchaseReturnStockSearch } from "@/lib/pharm-purchase-return-stock-search";
import { applyPriceQtyNetToBasePrices } from "@/lib/return-unit-conversion";
import {
  computeTotalDiscount,
  computeTotalSalesValue,
} from "@/lib/pharm-purchase-calculations";
import {
  findCatalogItemByCode,
  getCanonicalItemCatalogCode,
  getItemDefaultUnitId,
  getItemUnitIds,
  indexCatalogItem,
  mergeCatalogItemWithCache,
} from "@/lib/item-unit-options";
import { createPharmPurchaseReturnService } from "@/services/pharm-purchase-return.service";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { PharmPurchaseContext, PharmPurchaseItemLanguage } from "@/types/pharm-purchase";
import type { MovmentLookupItem } from "@/types/movment";
import type { StorItem } from "@/types/stor";
import type { ReturnItemStockSearchItem } from "@/types/stock";

export function PharmPurchaseReturnPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";
  const sessionAuthenticated = status === "authenticated" && !!token;
  const { activePharmacy, activePharmacyId } = usePharmacyScope();

  const {
    form,
    mode,
    setDetails,
    details,
    selectedRowIndex,
    setSelectedRowIndex,
    loading: returnLoading,
    saving,
    isEditable: returnEditable,
    handleNew,
    handleSave: saveReturn,
    handleRefresh,
    loadRecord,
    addDetailRow,
    removeDetailRow,
    updateDetailRow,
  } = usePharmPurchaseReturn(token);

  const searchParams = useSearchParams();
  const loadedFromUrlRef = useRef<number | null>(null);
  const movementSetupKeyRef = useRef<string | null>(null);

  const [context, setContext] = useState<PharmPurchaseContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
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
  const [itemLanguage, setItemLanguage] =
    useState<PharmPurchaseItemLanguage>("en");
  const [pthIdLoading, setPthIdLoading] = useState(false);
  const [openShiftNumber, setOpenShiftNumber] = useState<number | null>(null);

  const selectedMovement = useMemo<MovmentLookupItem | null>(() => {
    if (!context?.scopeValid || context.movmentRowId <= 0) return null;
    return {
      id: context.movmentRowId,
      movChiledId: context.movId,
      movChiledName: context.movChiledName,
      movParientId: 2,
      movStor: context.storeId,
      movStor2: null,
      movSingleStore: true,
      movAccountEntry1: null,
      movAccountEntry2: null,
      movAccountEntry3: null,
      movAccountEntry4: null,
    };
  }, [context]);

  const loadContext = useCallback(async () => {
    if (!token) {
      setContext(null);
      setContextLoading(false);
      return;
    }

    setContextLoading(true);
    try {
      const service = createPharmPurchaseReturnService(token);
      const next = await service.getContext();
      setContext(next);
      if (!next.scopeValid) {
        toast.error(next.scopeMessage ?? "Pharmacy scope is invalid.");
      }
    } catch (error) {
      setContext(null);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load pharmacy purchase return context."
      );
    } finally {
      setContextLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadContext();
  }, [loadContext, activePharmacyId]);

  const scopeValid = Boolean(context?.scopeValid);

  useEffect(() => {
    if (!token || !scopeValid) {
      setOpenShiftNumber(null);
      return;
    }
    let cancelled = false;
    void getCurrentOpenShift(token)
      .then((shiftStatus) => {
        if (cancelled) return;
        setOpenShiftNumber(shiftStatus.hasOpenShift ? shiftStatus.scId : null);
      })
      .catch(() => {
        if (!cancelled) setOpenShiftNumber(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, scopeValid]);

  const loadItemCatalog = useCallback(async () => {
    if (!token) {
      setCatalogItems([]);
      setItemByCode(new Map());
      setCatalogLoaded(false);
      setCatalogLoading(false);
    }
  }, [token]);

  const loadUnits = useCallback(async () => {
    if (!token) return;
    setUnitsLoading(true);
    try {
      const unitService = createUnitService(token);
      const { units: loaded } = await unitService.listUnits();
      setUnits(loaded);
    } finally {
      setUnitsLoading(false);
    }
  }, [token]);

  const loadStores = useCallback(async () => {
    if (!token) return;
    setStoresLoading(true);
    try {
      setStores(await getStors(token));
    } finally {
      setStoresLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadItemCatalog();
    void loadUnits();
    void loadStores();
  }, [token, loadItemCatalog, loadUnits, loadStores]);

  useEffect(() => {
    if (!context?.scopeValid || !selectedMovement || mode !== "new" || !token) {
      return;
    }

    const setupKey = `${activePharmacyId ?? "none"}:${context.movmentRowId}:${mode}`;
    if (movementSetupKeyRef.current === setupKey) {
      return;
    }
    movementSetupKeyRef.current = setupKey;

    form.setValue("movId", context.movId ?? null, { shouldDirty: true });
    form.setValue("movmentRowId", context.movmentRowId, { shouldDirty: true });

    const header = applyMovementToHeader(form.getValues(), selectedMovement);
    form.reset({ ...form.getValues(), ...header });

    const storeId = getDefaultMovementStoreId(selectedMovement);
    if (storeId) {
      setDetails((rows) => applyDefaultStoreToNewDetailRows(rows, storeId));
    }
  }, [
    activePharmacyId,
    context,
    form,
    mode,
    selectedMovement,
    setDetails,
    token,
  ]);

  useEffect(() => {
    if (mode === "new") {
      movementSetupKeyRef.current = null;
    }
  }, [mode]);

  const totalSalesValue = useMemo(
    () => computeTotalSalesValue(details),
    [details]
  );
  const totalDiscount = useMemo(
    () => computeTotalDiscount(details),
    [details]
  );

  const handleCatalogItemApplied = useCallback(
    (item: ItemCatalogItem) => {
      setItemByCode((prev) => {
        const merged = mergeCatalogItemWithCache(item, prev, catalogItems);
        const hasCode =
          merged.itmCode?.trim() || merged.itmCode2?.trim();
        if (!hasCode) return prev;

        const next = new Map(prev);
        indexCatalogItem(next, merged, catalogItems);

        if (getItemUnitIds(merged).length === 0 && merged.id > 0 && token) {
          void getItemCatalog(merged.id, token)
            .then((full) => {
              setItemByCode((current) => {
                const updated = new Map(current);
                indexCatalogItem(updated, full, catalogItems);
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

  const handleStockSearchItemSelected = useCallback(
    async (searchResult: ReturnItemStockSearchItem) => {
      if (!returnEditable || !token) return;

      const storeId = getDefaultMovementStoreId(selectedMovement);

      let catalogItem =
        findCatalogItemByCode(searchResult.itemCode, itemByCode, catalogItems) ??
        null;

      if (!catalogItem && searchResult.itemCatalogId > 0) {
        try {
          catalogItem = await getItemCatalog(searchResult.itemCatalogId, token);
        } catch {
          catalogItem = null;
        }
      }

      if (!catalogItem) {
        toast.error(`Item "${searchResult.itemCode}" was not found in catalog.`);
        return;
      }

      if (getItemUnitIds(catalogItem).length === 0 && catalogItem.id > 0) {
        try {
          catalogItem = await getItemCatalog(catalogItem.id, token);
        } catch {
          toast.error("Could not load item unit conversion data.");
          return;
        }
      }

      handleCatalogItemApplied(catalogItem);

      const searchCode = searchResult.itemCode?.trim();
      const canonicalCode = getCanonicalItemCatalogCode(catalogItem);
      const aliasCodes = [searchCode, canonicalCode].filter(
        (code): code is string => Boolean(code?.trim())
      );
      if (aliasCodes.length > 0) {
        setItemByCode((prev) => {
          const next = new Map(prev);
          const merged = mergeCatalogItemWithCache(catalogItem, next, catalogItems);
          indexCatalogItem(next, merged, catalogItems);
          for (const code of aliasCodes) {
            next.set(code.trim().toLowerCase(), merged);
          }
          return next;
        });
      }

      const patchOrError = patchDetailFromPharmPurchaseReturnStockSearch(
        catalogItem,
        searchResult,
        storeId
      );
      if ("error" in patchOrError) {
        toast.error(patchOrError.error);
        return;
      }
      const patch = patchOrError;

      const emptyIndex = findEmptyDetailRowIndex(details);
      const targetIndex = emptyIndex >= 0 ? emptyIndex : details.length;

      setSelectedRowIndex(targetIndex);
      setDetails((rows) => {
        if (emptyIndex >= 0 && emptyIndex < rows.length) {
          return rows.map((row, index) =>
            index === emptyIndex ? applyReturnDetailPatch(row, patch) : row
          );
        }
        return [
          ...rows,
          applyReturnDetailPatch(createEmptyDetailRow(storeId), patch),
        ];
      });

      const itemCode =
        getCanonicalItemCatalogCode(catalogItem) ||
        searchResult.itemCode.trim();
      const unitId = getItemDefaultUnitId(catalogItem);
      if (!itemCode || unitId == null || unitId <= 0) return;

      try {
        const info = await getUnitConversionInfo(token, itemCode, unitId, 1);
        const nextPrices = applyPriceQtyNetToBasePrices(
          patch.baseItmPurPrice ?? 0,
          patch.baseItmSell ?? searchResult.salesPrice,
          info.priceQtyNet
        );
        updateDetailRow(targetIndex, {
          unitId,
          itmPurPrice: nextPrices.itmPurPrice,
          itmSell: nextPrices.itmSell,
          baseItmPurPrice: patch.baseItmPurPrice,
          baseItmSell: patch.baseItmSell,
          priceQtyNet: info.priceQtyNet,
          skipDiscPercent: true,
          skipTax: true,
        });
      } catch {
        // Best-effort unit conversion.
      }
    },
    [
      catalogItems,
      details,
      handleCatalogItemApplied,
      itemByCode,
      returnEditable,
      selectedMovement,
      setDetails,
      setSelectedRowIndex,
      token,
      updateDetailRow,
    ]
  );

  const handleSave = useCallback(() => {
    if (!context?.scopeValid) {
      toast.error(context?.scopeMessage ?? "Pharmacy scope is invalid.");
      return;
    }
    void saveReturn(itemByCode, selectedMovement, catalogItems);
  }, [catalogItems, context, itemByCode, saveReturn, selectedMovement]);

  useEffect(() => {
    const idParam = searchParams.get("id");
    if (!idParam || !token || loadedFromUrlRef.current === Number(idParam)) return;
    const id = Number(idParam);
    if (!Number.isFinite(id) || id <= 0) return;
    loadedFromUrlRef.current = id;
    void loadRecord(id, itemByCode, catalogItems);
  }, [searchParams, token, loadRecord, itemByCode, catalogItems]);

  const recordId = form.watch("id");
  const pthId = form.watch("pthId");
  const hasRecord = recordId != null && recordId > 0;

  useEffect(() => {
    if (mode !== "new" || !token || !context?.scopeValid || context.movId == null) {
      return;
    }
    if (pthId != null && pthId > 0) {
      const next = String(pthId);
      if (form.getValues("venBillNo") !== next) {
        form.setValue("venBillNo", next, { shouldDirty: false });
      }
      if (form.getValues("venBillDate") !== next) {
        form.setValue("venBillDate", next, { shouldDirty: false });
      }
      return;
    }

    const controller = new AbortController();
    setPthIdLoading(true);
    void getNextMovValue(context.movId, token, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (form.getValues("id")) return;
        if (result.success && result.value > 0) {
          form.setValue("pthId", result.value, { shouldDirty: false });
          form.setValue("venBillNo", String(result.value), {
            shouldDirty: false,
          });
          form.setValue("venBillDate", String(result.value), {
            shouldDirty: false,
          });
        } else if (!result.success) {
          toast.error(result.message?.trim() || "Could not get the next PthId.");
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load the next PthId. Please try again."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPthIdLoading(false);
      });

    return () => controller.abort();
  }, [context, form, mode, pthId, token]);

  const isEditable = returnEditable && context?.scopeValid === true;
  const loading = returnLoading || contextLoading;
  const toolbarMode = mode === "new" ? "new" : "view";

  return (
    <PageGuard
      permission={PERMISSIONS.sales.view}
      redirectTo="/unauthorized?from=sales&permission=Sales.View"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 print:gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">Pharmacy Purchase Return</h1>
            <p className="text-muted-foreground text-sm">
              Active pharmacy: {activePharmacy?.name ?? "None"}
            </p>
          </div>
          <ItemLanguageToggle
            value={itemLanguage}
            onChange={setItemLanguage}
            disabled={loading}
          />
        </div>

        <Toolbar
          mode={toolbarMode}
          saving={saving}
          posting={false}
          loading={loading}
          hasRecord={hasRecord}
          isPosted={false}
          isPostButtonVisible={false}
          isTransferButtonVisible={false}
          isBarcodeButtonVisible={false}
          barcodeLoading={false}
          nav={{ atFirst: true, atLast: true, hasRecords: false }}
          onNew={handleNew}
          onSave={handleSave}
          onTransfer={() => undefined}
          onPost={() => undefined}
          onPrintBarcode={() => undefined}
          onEdit={() => undefined}
          onDelete={() => undefined}
          onPrint={() => window.print()}
          onRefresh={() => {
            void loadContext();
            void loadItemCatalog();
            void handleRefresh(itemByCode, catalogItems);
          }}
          onFirst={() => undefined}
          onPrev={() => undefined}
          onNext={() => undefined}
          onLast={() => undefined}
          onSearch={() => undefined}
          onCreateExcelTemplate={() => undefined}
          excelImportHref="#"
          showExcelActions={false}
          showEditButton={false}
          showDeleteButton={false}
          showPrintButton={false}
          showSearchButton={false}
        />

        <Card>
          <CardContent className="pt-3">
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <FormFieldInlineWrap
                    id="pharm-return-name"
                    label="Pharmacy"
                    className="sm:grid-cols-[5.5rem_minmax(0,1fr)]"
                    labelClassName="text-sm font-semibold sm:text-end"
                  >
                    <Input
                      readOnly
                      disabled
                      value={context?.pharmacyName ?? ""}
                      className="bg-muted/50"
                    />
                  </FormFieldInlineWrap>
                  <FormFieldInlineWrap
                    id="pharm-return-cost-center"
                    label="Cost Center"
                    className="sm:grid-cols-[5.5rem_minmax(0,1fr)]"
                    labelClassName="text-sm font-semibold sm:text-end"
                  >
                    <Input
                      readOnly
                      disabled
                      value={
                        context?.costCenterCode
                          ? `${context.costCenterCode}${context.costCenterName ? ` — ${context.costCenterName}` : ""}`
                          : ""
                      }
                      className="bg-muted/50"
                    />
                  </FormFieldInlineWrap>
                  <FormFieldInlineWrap
                    id="pharm-return-movement"
                    label="Movement"
                    className="sm:grid-cols-[5.5rem_minmax(0,1fr)]"
                    labelClassName="text-sm font-semibold sm:text-end"
                  >
                    <Input
                      readOnly
                      disabled
                      value={
                        context?.movChiledName
                          ? `${context.movChiledName}${context.movId != null ? ` (#${context.movId})` : ""}`
                          : context?.scopeMessage ?? "Not configured"
                      }
                      className="bg-muted/50"
                    />
                  </FormFieldInlineWrap>
                  <FormFieldInlineWrap
                    id="pharm-return-store"
                    label="Store"
                    className="sm:grid-cols-[5.5rem_minmax(0,1fr)]"
                    labelClassName="text-sm font-semibold sm:text-end"
                  >
                    <Input
                      readOnly
                      disabled
                      value={context?.storeName ?? context?.storeId ?? ""}
                      className="bg-muted/50"
                    />
                  </FormFieldInlineWrap>
                </div>

                <FormFieldInlineWrap
                  id="pharm-return-item-search-wrap"
                  label="Item search"
                  className="sm:grid-cols-[5.5rem_minmax(0,1fr)] w-full"
                  labelClassName="text-sm font-semibold sm:text-end"
                >
                  <ReturnItemStockSearchBox
                    token={token}
                    disabled={
                      !sessionAuthenticated || loading || !isEditable
                    }
                    itemLanguage={itemLanguage}
                    preferAvailableQty
                    showBatchDetails
                    searchSource="pharm-purchase-return"
                    onItemSelected={(item) => void handleStockSearchItemSelected(item)}
                  />
                </FormFieldInlineWrap>

                {pthIdLoading ? (
                  <p className="text-muted-foreground text-sm">
                    Loading next document number…
                  </p>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] lg:items-start">
                  <div className="space-y-3">
                    <HeaderPrimaryFields
                      key={recordId ?? "new"}
                      form={form}
                      disabled={!isEditable}
                      hideVendorBillFields
                      phtDateReadOnly
                    />
                    <PharmPurchaseEmployeeShiftFields
                      key={`employee-shift-${recordId ?? "new"}`}
                      form={form}
                      disabled={!isEditable}
                      token={token}
                      openShiftNumber={openShiftNumber}
                    />
                  </div>
                  <PharmPurchaseHeaderTotals
                    form={form}
                    totalSalesValue={totalSalesValue}
                    totalDiscount={totalDiscount}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col">
          <CardContent className="min-h-0 flex-1 pt-6">
            <DetailsGrid
              variant="pharm-purchase-return"
              rows={details}
              token={token}
              catalogItems={catalogItems}
              itemByCode={itemByCode}
              units={units}
              unitsLoading={unitsLoading}
              catalogLoading={catalogLoading}
              catalogLoaded={catalogLoaded}
              disabled={!isEditable || loading || !sessionReady}
              batchFromSearchRequired
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
            />
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
