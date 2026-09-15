"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  fetchAllItemCatalogItems,
  getItemCatalogPage,
  getNextMovValue,
  getStors,
} from "@/lib/api-client";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { UnitItem } from "@/types/unit";
import { mergeCatalogItemWithCache } from "@/lib/item-unit-options";
import { createUnitService } from "@/services/unit.service";
import { DetailsGrid } from "@/components/purchase/DetailsGrid";
import { HeaderPrimaryFields } from "@/components/purchase/HeaderForm";
import { SearchDialog } from "@/components/purchase/SearchDialog";
import { Toolbar } from "@/components/purchase/Toolbar";
import { ItemLanguageToggle } from "@/components/pharm-recive/ItemLanguageToggle";
import { PharmPurchaseHeaderTotals } from "@/components/pharm-purchase/PharmPurchaseHeaderTotals";
import { PageGuard } from "@/components/permissions/page-guard";
import { usePharmacyScope } from "@/components/pharmacy/pharmacy-scope-provider";
import { FormFieldInlineWrap } from "@/components/ui/form-field-inline";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePharmPurchase } from "@/hooks/usePharmPurchase";
import { applyMovementToHeader } from "@/lib/purchase.mapper";
import {
  applyDefaultStoreToNewDetailRows,
  getDefaultMovementStoreId,
} from "@/lib/purchase-stores";
import {
  computeTotalSalesValue,
  computeTotalDiscount,
} from "@/lib/pharm-purchase-calculations";
import { createPharmPurchaseService } from "@/services/pharm-purchase.service";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { PharmPurchaseContext, PharmPurchaseItemLanguage } from "@/types/pharm-purchase";
import type { MovmentLookupItem } from "@/types/movment";
import type { StorItem } from "@/types/stor";

export function PharmPurchasePageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";
  const { activePharmacy, activePharmacyId } = usePharmacyScope();

  const {
    form,
    mode,
    setDetails,
    details,
    selectedRowIndex,
    setSelectedRowIndex,
    loading: pharmLoading,
    saving,
    posting,
    isEditable: pharmEditable,
    searchOpen,
    setSearchOpen,
    navState,
    handleNew,
    handleEdit,
    handleSave: savePharmPurchase,
    handleDelete,
    handleRefresh,
    navigate,
    loadRecord,
    runSearch,
    addDetailRow,
    removeDetailRow,
    updateDetailRow,
  } = usePharmPurchase(token);
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
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  const selectedMovement = useMemo<MovmentLookupItem | null>(() => {
    if (!context?.scopeValid || context.movmentRowId <= 0) return null;
    return {
      id: context.movmentRowId,
      movChiledId: context.movId,
      movChiledName: context.movChiledName,
      movParientId: null,
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
      const service = createPharmPurchaseService(token);
      const next = await service.getContext();
      setContext(next);

      if (!next.scopeValid) {
        toast.error(next.scopeMessage ?? "Pharmacy scope is invalid.");
      }
    } catch (error) {
      setContext(null);
      toast.error(
        error instanceof Error ? error.message : "Failed to load pharmacy context."
      );
    } finally {
      setContextLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadContext();
  }, [loadContext, activePharmacyId]);

  const loadItemCatalog = useCallback(async () => {
    if (!token) return;
    setCatalogLoading(true);
    setCatalogLoaded(false);
    try {
      const firstPage = await getItemCatalogPage(token, {
        page: 1,
        pageSize: 100,
        sortBy: "itmCode",
        sortDesc: false,
      });
      setCatalogItems(firstPage.items);
      setCatalogLoaded(true);
      void fetchAllItemCatalogItems(token).then(setCatalogItems);
    } finally {
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

  const handleCatalogItemApplied = useCallback((item: ItemCatalogItem) => {
    const code = item.itmCode?.trim();
    if (!code) return;
    setItemByCode((prev) => {
      const map = new Map(prev);
      map.set(code.toLowerCase(), item);
      return map;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!context?.scopeValid) {
      toast.error(context?.scopeMessage ?? "Pharmacy scope is invalid.");
      return;
    }
    void savePharmPurchase(itemByCode, selectedMovement, catalogItems).then(() =>
      setAuditRefreshKey((v) => v + 1)
    );
  }, [catalogItems, context, itemByCode, savePharmPurchase, selectedMovement]);

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
  const isPosted = form.watch("movStat") === 5;

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

  const isEditable = pharmEditable && context?.scopeValid === true;
  const loading = pharmLoading || contextLoading;

  function confirmDelete() {
    if (isPosted) {
      toast.message("Posted pharmacy purchase invoices cannot be deleted.");
      return;
    }
    if (!hasRecord) {
      toast.message("Nothing to delete.");
      return;
    }
    toast("Delete this pharmacy purchase?", {
      action: {
        label: "Delete",
        onClick: () => void handleDelete(),
      },
    });
  }

  return (
    <PageGuard
      permission={PERMISSIONS.sales.view}
      redirectTo="/unauthorized?from=sales&permission=Sales.View"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 print:gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">Pharmacy Purchase</h1>
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
          mode={mode}
          saving={saving}
          posting={posting}
          loading={loading}
          hasRecord={hasRecord}
          isPosted={isPosted}
          isPostButtonVisible={false}
          isTransferButtonVisible={false}
          isBarcodeButtonVisible={false}
          barcodeLoading={false}
          nav={navState}
          onNew={handleNew}
          onSave={handleSave}
          onTransfer={() => undefined}
          onPost={() => undefined}
          onPrintBarcode={() => undefined}
          onEdit={handleEdit}
          onDelete={confirmDelete}
          onPrint={() => window.print()}
          onRefresh={() => {
            void loadContext();
            void loadItemCatalog();
            void handleRefresh(itemByCode, catalogItems);
          }}
          onFirst={() => void navigate("first", itemByCode, catalogItems)}
          onPrev={() => void navigate("prev", itemByCode, catalogItems)}
          onNext={() => void navigate("next", itemByCode, catalogItems)}
          onLast={() => void navigate("last", itemByCode, catalogItems)}
          onSearch={() => setSearchOpen(true)}
          onCreateExcelTemplate={() => undefined}
          excelImportHref="#"
          showExcelActions={false}
        />

        <Card>
          <CardContent className="pt-3">
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <FormFieldInlineWrap
                    id="pharm-name"
                    label="Pharmacy"
                    className="sm:grid-cols-[5.5rem_minmax(0,1fr)]"
                    labelClassName="text-sm font-semibold sm:text-end"
                  >
                    <Input readOnly disabled value={context?.pharmacyName ?? ""} className="bg-muted/50" />
                  </FormFieldInlineWrap>
                  <FormFieldInlineWrap
                    id="pharm-cost-center"
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
                    id="pharm-movement"
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
                    id="pharm-store"
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

                {pthIdLoading ? (
                  <p className="text-muted-foreground text-sm">Loading next document number…</p>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] lg:items-start">
                  <HeaderPrimaryFields
                    key={recordId ?? "new"}
                    form={form}
                    disabled={!isEditable}
                    hideVendorBillFields
                    phtDateReadOnly
                  />
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
              variant="pharm-purchase"
              rows={details}
              token={token}
              catalogItems={catalogItems}
              itemByCode={itemByCode}
              units={units}
              unitsLoading={unitsLoading}
              catalogLoading={catalogLoading}
              catalogLoaded={catalogLoaded}
              disabled={!isEditable || loading || !sessionReady}
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

        <SearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onSearch={runSearch}
          movementParentId={context?.movId ?? 1}
          token={token}
          catalogItems={catalogItems}
          onSelect={async (row) => {
            await loadRecord(row.id, itemByCode, catalogItems);
          }}
        />
      </div>
    </PageGuard>
  );
}
