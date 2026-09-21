"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ApiError,
  getItemCatalog,
  getMovmentById,
  getNextMovValue,
  getStors,
} from "@/lib/api-client";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { UnitItem } from "@/types/unit";
import {
  findCatalogItemByCode,
  getItemUnitIds,
  indexCatalogItem,
  mergeCatalogItemWithCache,
  resolveCatalogItemByCode,
} from "@/lib/item-unit-options";
import { applyPharmReciveDetailPatch } from "@/lib/pharm-recive-calculations";
import { createEmptyDetailRow } from "@/lib/pharm-recive.mapper";
import { downloadPharmReciveExcelTemplate } from "@/lib/pharm-recive-excel-template";
import {
  buildPharmReciveExcelImportHeaderFromContext,
  clearPharmReciveExcelImportContext,
  consumePharmReciveExcelImportTransfer,
  PHARM_RECIVE_EXCEL_IMPORT_RETURN_QUERY,
  readPharmReciveExcelImportContext,
  storePharmReciveExcelImportContext,
  type PharmReciveExcelImportHeader,
} from "@/lib/pharm-recive-excel-transfer";
import {
  findEmptyPharmReciveDetailRowIndex,
  patchPharmReciveDetailFromItemSearch,
} from "@/lib/pharm-recive-item-stock-search";
import {
  allocatePharmReciveReceivingQuantity,
  buildPharmReciveDetailsFromAllocation,
  findCatalogItemForPharmReciveRow,
  replacePharmReciveDetailRowsAtIndex,
} from "@/lib/pharm-recive-stock-allocation";
import {
  PHARM_RECIVE_MOV_PARENT_ID,
  resolveMovementForPharmReciveHeader,
} from "@/lib/pharm-recive-movement";
import {
  formatStorDisplayName,
  getDefaultMovementStoreId,
} from "@/lib/purchase-stores";
import { createUnitService } from "@/services/unit.service";
import { DetailsGrid } from "@/components/pharm-recive/DetailsGrid";
import { DocumentAuditDetails } from "@/components/audit/DocumentAuditDetails";
import {
  HeaderPrimaryFields,
  HeaderTotalsFields,
} from "@/components/pharm-recive/HeaderForm";
import { ItemLanguageToggle } from "@/components/pharm-recive/ItemLanguageToggle";
import { SearchDialog } from "@/components/pharm-recive/SearchDialog";
import { Toolbar } from "@/components/pharm-recive/Toolbar";
import { MovementLookup } from "@/components/movement/MovementLookup";
import { ReturnItemStockSearchBox } from "@/components/return/ReturnItemStockSearchBox";
import { PageGuard } from "@/components/permissions/page-guard";
import { FormFieldInlineWrap } from "@/components/ui/form-field-inline";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePharmRecive } from "@/hooks/usePharmRecive";
import type { MovmentLookupItem } from "@/types/movment";
import type { StorItem } from "@/types/stor";
import type { ReturnItemStockSearchItem } from "@/types/stock";
import type { PharmReciveDetail, PharmReciveDetailPatch, PharmReciveItemLanguage } from "@/types/pharm-recive";

export function PharmRecivePageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";
  const sessionAuthenticated = status === "authenticated" && !!token;

  const pharmState = usePharmRecive(token);
  const router = useRouter();
  const searchParams = useSearchParams();
  const loadedFromUrlRef = useRef<number | null>(null);
  const [catalogItems, setCatalogItems] = useState<ItemCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [stores, setStores] = useState<StorItem[]>([]);
  const [itemByCode, setItemByCode] = useState<Map<string, ItemCatalogItem>>(
    () => new Map()
  );
  const [selectedMovement, setSelectedMovement] =
    useState<MovmentLookupItem | null>(null);
  const [itemLanguage, setItemLanguage] = useState<PharmReciveItemLanguage>("en");
  const [fathIdLoading, setFathIdLoading] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const nextValueAbortRef = useRef<AbortController | null>(null);
  const nextValueRequestRef = useRef(0);
  const contextRestoredRef = useRef(false);
  const excelReturnHandledRef = useRef(false);
  const detailsRef = useRef<PharmReciveDetail[]>([]);
  const allocatingRef = useRef(false);
  const itemByCodeRef = useRef(itemByCode);
  itemByCodeRef.current = itemByCode;

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
    } catch {
      setUnits([]);
    } finally {
      setUnitsLoading(false);
    }
  }, [token]);

  const loadStores = useCallback(async () => {
    if (!token) {
      setStores([]);
      return;
    }
    try {
      setStores(await getStors(token));
    } catch {
      setStores([]);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!sessionAuthenticated) return;
    void loadItemCatalog();
    void loadUnits();
    void loadStores();
  }, [sessionReady, sessionAuthenticated, loadItemCatalog, loadUnits, loadStores]);

  const handleCatalogItemApplied = useCallback(
    (item: ItemCatalogItem) => {
      const next = new Map(itemByCodeRef.current);
      indexCatalogItem(next, item, catalogItems);
      itemByCodeRef.current = next;
      setItemByCode(next);

      const merged = mergeCatalogItemWithCache(item, next, catalogItems);
      if (getItemUnitIds(merged).length === 0 && merged.id > 0 && token) {
        void getItemCatalog(merged.id, token)
          .then((full) => {
            const updated = new Map(itemByCodeRef.current);
            indexCatalogItem(updated, full, catalogItems);
            itemByCodeRef.current = updated;
            setItemByCode(updated);
          })
          .catch(() => undefined);
      }
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
    isEditable,
    searchOpen,
    setSearchOpen,
    handleNew,
    handleEdit,
    handleSave,
    handleDelete,
    handleRefresh,
    navigate,
    navState,
    loadRecord,
    runSearch,
    addDetailRow,
    importExcelDetails,
    removeDetailRow,
    updateDetailRow,
  } = pharmState;

  detailsRef.current = details;

  const allocateDetailRowsAtIndex = useCallback(
    async (
      index: number,
      templateRow: PharmReciveDetail,
      requestedQty: number,
      knownItem?: ItemCatalogItem | null
    ) => {
      if (!token || !isEditable || allocatingRef.current) return false;

      const storeId = getDefaultMovementStoreId(selectedMovement);
      if (!storeId) {
        toast.message("Select a movement first.");
        return false;
      }

      allocatingRef.current = true;
      try {
        const itemCode = templateRow.itmId.trim();
        let item =
          knownItem ??
          findCatalogItemForPharmReciveRow(
            templateRow,
            itemByCodeRef.current,
            catalogItems
          );

        if (!item && itemCode) {
          try {
            item = await resolveCatalogItemByCode(
              token,
              itemCode,
              itemByCodeRef.current,
              catalogItems
            );
          } catch {
            item = null;
          }
        }

        if (!item) {
          toast.error(
            itemCode
              ? `Item "${itemCode}" was not found in catalog.`
              : "Item catalog record is required."
          );
          return false;
        }

        handleCatalogItemApplied(item);

        if (getItemUnitIds(item).length === 0 && item.id > 0) {
          try {
            item = await getItemCatalog(item.id, token);
            handleCatalogItemApplied(item);
          } catch {
            // Conversion will report a unit error if the catalog row is still incomplete.
          }
        }

        const result = await allocatePharmReciveReceivingQuantity({
          token,
          storeId,
          item,
          itemCode,
          requestedQty,
          unitId: templateRow.unitId,
          existingDetails: detailsRef.current,
          excludeClientRowId: templateRow.clientRowId,
        });

        if (!result.ok) {
          toast.error(result.message);
          return false;
        }

        const allocated = buildPharmReciveDetailsFromAllocation(
          applyPharmReciveDetailPatch(templateRow, { qnty: requestedQty }),
          result.lines,
          result.unitId
        );

        setDetails((rows) =>
          replacePharmReciveDetailRowsAtIndex(rows, index, allocated)
        );
        setSelectedRowIndex(index);
        return true;
      } finally {
        allocatingRef.current = false;
      }
    },
    [
      catalogItems,
      handleCatalogItemApplied,
      isEditable,
      selectedMovement,
      setDetails,
      setSelectedRowIndex,
      token,
    ]
  );

  const handleDetailRowChange = useCallback(
    (index: number, patch: PharmReciveDetailPatch) => {
      const row = detailsRef.current[index];
      if (!row) return;

      const itemCode = (patch.itmId ?? row.itmId).trim();
      const triggersAllocation =
        Boolean(itemCode) &&
        (patch.qnty != null ||
          patch.unitId != null ||
          Boolean(patch.itmId?.trim()));

      if (triggersAllocation) {
        const requestedQty = patch.qnty ?? row.qnty;
        const templateRow = applyPharmReciveDetailPatch(row, patch);
        updateDetailRow(index, patch);
        void allocateDetailRowsAtIndex(index, templateRow, requestedQty);
        return;
      }

      updateDetailRow(index, patch);
    },
    [allocateDetailRowsAtIndex, updateDetailRow]
  );

  const storeDisplayName = useMemo(() => {
    const storeId = getDefaultMovementStoreId(selectedMovement);
    if (!storeId) return "—";
    const store = stores.find((s) => String(s.id) === storeId.trim());
    return store ? formatStorDisplayName(store) || storeId : storeId;
  }, [selectedMovement, stores]);

  const handleStockSearchItemSelected = useCallback(
    async (searchResult: ReturnItemStockSearchItem) => {
      if (!isEditable) {
        toast.message("Document is not editable.");
        return;
      }
      if (!token) return;

      const storeId = getDefaultMovementStoreId(selectedMovement);
      if (!storeId) {
        toast.message("Select a movement first.");
        return;
      }

      let catalogItem = findCatalogItemByCode(
        searchResult.itemCode,
        itemByCodeRef.current,
        catalogItems
      );

      if (!catalogItem && searchResult.itemCatalogId > 0) {
        try {
          catalogItem = await getItemCatalog(searchResult.itemCatalogId, token);
        } catch {
          toast.error("Could not load item catalog record.");
          return;
        }
      }

      if (!catalogItem) {
        toast.error(`Item "${searchResult.itemCode}" was not found in catalog.`);
        return;
      }

      handleCatalogItemApplied(catalogItem);

      const patch = patchPharmReciveDetailFromItemSearch(catalogItem, searchResult);

      const emptyIndex = findEmptyPharmReciveDetailRowIndex(details);
      const targetIndex = emptyIndex >= 0 ? emptyIndex : details.length;

      const baseRow =
        emptyIndex >= 0 && emptyIndex < details.length
          ? details[emptyIndex]!
          : createEmptyDetailRow();
      const templateRow = applyPharmReciveDetailPatch(baseRow, patch);

      setSelectedRowIndex(targetIndex);
      setDetails((rows) => {
        if (emptyIndex >= 0 && emptyIndex < rows.length) {
          return rows.map((row, index) =>
            index === emptyIndex ? templateRow : row
          );
        }
        return [...rows, templateRow];
      });

      void allocateDetailRowsAtIndex(
        targetIndex,
        templateRow,
        patch.qnty ?? 1,
        catalogItem
      );
    },
    [
      allocateDetailRowsAtIndex,
      catalogItems,
      details,
      handleCatalogItemApplied,
      isEditable,
      selectedMovement,
      setDetails,
      setSelectedRowIndex,
      token,
    ]
  );

  const hasRecord = !!form.watch("id");
  const recordId = form.watch("id");
  const headerMovId = form.watch("movId");
  const headerFathId = form.watch("fathId");
  const headerMovDate = form.watch("movDate");
  const headerMonNote = form.watch("monNote");

  const syncMovementFromLoadedHeader = useCallback(async () => {
    if (!token || recordId == null) return;
    try {
      const movement = await resolveMovementForPharmReciveHeader(
        token,
        PHARM_RECIVE_MOV_PARENT_ID,
        form.getValues()
      );
      if (movement) setSelectedMovement(movement);
    } catch {
      if (headerMovId != null) {
        setSelectedMovement({
          id: form.getValues("movmentRowId") ?? 0,
          movChiledId: headerMovId,
          movChiledName: `Movement #${headerMovId}`,
          movParientId: PHARM_RECIVE_MOV_PARENT_ID,
          movStor: form.getValues("movStor") || null,
          movStor2: form.getValues("movDis") || null,
          movSingleStore: false,
          movAccountEntry1: form.getValues("accountCREDIT") || null,
          movAccountEntry2: form.getValues("accountDept") || null,
          movAccountEntry3: null,
          movAccountEntry4: null,
        });
      }
    }
  }, [form, headerMovId, recordId, token]);

  useEffect(() => {
    if (!token || recordId == null) return;
    void syncMovementFromLoadedHeader();
  }, [recordId, headerMovId, syncMovementFromLoadedHeader, token]);

  useEffect(() => {
    if (hasRecord || !selectedMovement) return;
    const values = form.getValues();
    storePharmReciveExcelImportContext({
      movement: selectedMovement,
      fathId: values.fathId,
      movDate: values.movDate,
      movStor: values.movStor,
      movDis: values.movDis,
      accountDept: values.accountDept,
      accountCREDIT: values.accountCREDIT,
      monNote: values.monNote ?? "",
      storeLabel: storeDisplayName !== "—" ? storeDisplayName : undefined,
    });
  }, [
    selectedMovement,
    hasRecord,
    storeDisplayName,
    headerFathId,
    headerMovDate,
    headerMonNote,
    form,
  ]);

  useEffect(() => {
    if (mode === "view" && hasRecord) {
      clearPharmReciveExcelImportContext();
    }
  }, [mode, hasRecord]);

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
    clearPharmReciveExcelImportContext();
    contextRestoredRef.current = false;
    excelReturnHandledRef.current = false;
  }, [handleNew]);

  const applyMovementFields = useCallback(
    (mapped: MovmentLookupItem) => {
      setSelectedMovement(mapped);
      form.setValue("movmentRowId", mapped.id, { shouldDirty: true });
      form.setValue("movId", mapped.movChiledId, { shouldDirty: true });
      form.setValue("movStor", mapped.movStor?.trim() ?? "", { shouldDirty: true });
      form.setValue("movDis", mapped.movStor2?.trim() ?? "", { shouldDirty: true });
      form.setValue("accountDept", mapped.movAccountEntry2?.trim() ?? "", {
        shouldDirty: true,
      });
      form.setValue("accountCREDIT", mapped.movAccountEntry1?.trim() ?? "", {
        shouldDirty: true,
      });
    },
    [form]
  );

  const restorePharmReciveExcelHeader = useCallback(
    (header: PharmReciveExcelImportHeader) => {
      if (header.movement) {
        applyMovementFields(header.movement);
      } else {
        form.setValue("movStor", header.movStor ?? "", { shouldDirty: true });
        form.setValue("movDis", header.movDis ?? "", { shouldDirty: true });
        form.setValue("accountDept", header.accountDept ?? "", { shouldDirty: true });
        form.setValue("accountCREDIT", header.accountCREDIT ?? "", { shouldDirty: true });
      }
      if (header.movDate?.trim()) {
        form.setValue("movDate", header.movDate.trim(), { shouldDirty: true });
      }
      if (header.fathId != null) {
        form.setValue("fathId", header.fathId, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      if (header.monNote != null) {
        form.setValue("monNote", header.monNote, { shouldDirty: true });
      }
    },
    [applyMovementFields, form]
  );

  const storeCurrentPharmReciveExcelContext = useCallback(() => {
    const values = form.getValues();
    storePharmReciveExcelImportContext({
      movement: selectedMovement,
      fathId: values.fathId,
      movDate: values.movDate,
      movStor: values.movStor,
      movDis: values.movDis,
      accountDept: values.accountDept,
      accountCREDIT: values.accountCREDIT,
      monNote: values.monNote ?? "",
      storeLabel: storeDisplayName !== "—" ? storeDisplayName : undefined,
    });
  }, [form, selectedMovement, storeDisplayName]);

  const handleImportExcel = useCallback(() => {
    if (!selectedMovement) {
      toast.error("Please select a movement before importing Excel.");
      return;
    }
    if (fathIdLoading) {
      toast.message("Wait for the serial number to finish loading.");
      return;
    }
    const values = form.getValues();
    if (!values.fathId && !hasRecord) {
      toast.error("Serial must be generated. Select a movement first.");
      return;
    }
    if (!values.movDate?.trim()) {
      toast.error("Date is required.");
      return;
    }
    if (!getDefaultMovementStoreId(selectedMovement)) {
      toast.error("Store could not be determined from the selected movement.");
      return;
    }
    storeCurrentPharmReciveExcelContext();
    router.push("/dashboard/transactions/pharm-recive/import");
  }, [
    selectedMovement,
    fathIdLoading,
    form,
    hasRecord,
    storeCurrentPharmReciveExcelContext,
    router,
  ]);

  useEffect(() => {
    if (!sessionAuthenticated || hasRecord) return;
    if (searchParams.get(PHARM_RECIVE_EXCEL_IMPORT_RETURN_QUERY) === "1") return;
    if (contextRestoredRef.current || selectedMovement) return;
    if (headerMovId != null || headerFathId != null) return;

    const context = readPharmReciveExcelImportContext();
    if (!context?.movement) return;

    contextRestoredRef.current = true;
    restorePharmReciveExcelHeader(buildPharmReciveExcelImportHeaderFromContext(context));
  }, [
    sessionAuthenticated,
    hasRecord,
    searchParams,
    selectedMovement,
    headerMovId,
    headerFathId,
    restorePharmReciveExcelHeader,
  ]);

  useEffect(() => {
    if (searchParams.get(PHARM_RECIVE_EXCEL_IMPORT_RETURN_QUERY) !== "1") return;
    if (excelReturnHandledRef.current) return;
    excelReturnHandledRef.current = true;

    const transfer = consumePharmReciveExcelImportTransfer();
    if (transfer?.header) {
      restorePharmReciveExcelHeader(transfer.header);
    }
    if (transfer?.details.length) {
      importExcelDetails(transfer.details);
      toast.success(
        transfer.details.length === 1
          ? "Loaded 1 Excel row into the detail grid."
          : `Loaded ${transfer.details.length} Excel rows into the detail grid.`
      );
    }
    router.replace("/dashboard/transactions/pharm-recive");
  }, [searchParams, importExcelDetails, router, restorePharmReciveExcelHeader]);

  const handleMovementChange = useCallback(
    async (item: MovmentLookupItem | null) => {
      if (!item) {
        setSelectedMovement(null);
        form.setValue("movmentRowId", null, { shouldDirty: true });
        form.setValue("movId", null, { shouldDirty: true });
        form.setValue("fathId", null, { shouldDirty: true });
        form.setValue("movStor", "", { shouldDirty: true });
        form.setValue("movDis", "", { shouldDirty: true });
        form.setValue("accountDept", "", { shouldDirty: true });
        form.setValue("accountCREDIT", "", { shouldDirty: true });
        return;
      }

      applyMovementFields(item);

      if (!token) {
        toast.error("Sign in is required to load the next serial.");
        return;
      }

      if (hasRecord) return;

      nextValueAbortRef.current?.abort();
      const controller = new AbortController();
      nextValueAbortRef.current = controller;
      const requestId = ++nextValueRequestRef.current;

      setFathIdLoading(true);
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

        const movChiledId = mapped.movChiledId;
        if (movChiledId == null) {
          toast.error("Selected movement has no MovChiledId.");
          return;
        }

        const result = await getNextMovValue(movChiledId, token, {
          signal: controller.signal,
        });
        if (requestId !== nextValueRequestRef.current) return;

        if (!result.success) {
          toast.error(result.message?.trim() || "Could not get the next serial.");
          return;
        }

        form.setValue("fathId", result.value, {
          shouldDirty: true,
          shouldValidate: true,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Could not load movement / next serial."
        );
      } finally {
        if (requestId === nextValueRequestRef.current) {
          setFathIdLoading(false);
        }
      }
    },
    [applyMovementFields, form, hasRecord, token]
  );

  function confirmDelete() {
    toast("Delete this pharmacy receive document?", {
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

  function handleCreateExcelTemplate() {
    try {
      setTemplateDownloading(true);
      downloadPharmReciveExcelTemplate();
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

  if (!sessionReady) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-3xl" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <PageGuard permission={null}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Pharmacy Receiving</h2>
          <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium uppercase tracking-wide">
            Mode: {mode}
          </span>
        </div>

        <Toolbar
          mode={mode}
          saving={saving}
          loading={loading}
          hasRecord={hasRecord}
          nav={navState}
          onNew={onNew}
          onSave={() => {
            void handleSave(itemByCode, selectedMovement, catalogItems).then(() => {
              setAuditRefreshKey((value) => value + 1);
            });
          }}
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
          onCreateExcelTemplate={handleCreateExcelTemplate}
          excelTemplateDisabled={templateDownloading}
          excelTemplateLoading={templateDownloading}
          excelImportDisabled={
            !selectedMovement || fathIdLoading || (!hasRecord && !headerFathId)
          }
          onImportExcel={handleImportExcel}
        />

        <Card>
          <CardContent className="space-y-3 pt-3">
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <>
                <FormFieldInlineWrap
                  id="pharm-recive-store"
                  label="Store"
                  className="sm:grid-cols-[4.75rem_minmax(0,1fr)] w-full"
                  labelClassName="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
                >
                  <p className="text-sm font-medium">{storeDisplayName}</p>
                </FormFieldInlineWrap>

                <FormFieldInlineWrap
                  id="pharm-recive-movement"
                  label="Movement"
                  className="sm:grid-cols-[4.75rem_minmax(0,1fr)] w-full"
                  labelClassName="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
                >
                  <MovementLookup
                    id="pharm-recive-movement"
                    parentId={PHARM_RECIVE_MOV_PARENT_ID}
                    token={token}
                    value={selectedMovement}
                    disabled={hasRecord || !isEditable || fathIdLoading}
                    onChange={(item) => void handleMovementChange(item)}
                  />
                </FormFieldInlineWrap>

                {fathIdLoading ? (
                  <p className="text-muted-foreground text-sm sm:pl-[calc(4.75rem+1rem)]">
                    Loading next serial…
                  </p>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] lg:items-start">
                  <HeaderPrimaryFields form={form} disabled={!isEditable} />
                  <HeaderTotalsFields form={form} disabled={!isEditable} />
                </div>

                <FormFieldInlineWrap
                  id="pharm-recive-item-search"
                  label="Search Item"
                  className="sm:grid-cols-[4.75rem_minmax(0,1fr)] w-full"
                  labelClassName="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
                >
                  <div className="space-y-2">
                    <ReturnItemStockSearchBox
                      token={token}
                      storeId={getDefaultMovementStoreId(selectedMovement)}
                      itemLanguage={itemLanguage}
                      disabled={!sessionAuthenticated || loading || !isEditable}
                      onItemSelected={(item) => void handleStockSearchItemSelected(item)}
                    />
                    <ItemLanguageToggle
                      value={itemLanguage}
                      onChange={setItemLanguage}
                      disabled={loading}
                    />
                  </div>
                </FormFieldInlineWrap>

                <DetailsGrid
                  rows={details}
                  itemLanguage={itemLanguage}
                  catalogItems={catalogItems}
                  itemByCode={itemByCode}
                  units={units}
                  unitsLoading={unitsLoading}
                  token={token}
                  catalogLoading={catalogLoading}
                  catalogLoaded={catalogLoaded}
                  disabled={!isEditable}
                  selectedRowIndex={selectedRowIndex}
                  onSelectRow={setSelectedRowIndex}
                  onChangeRow={handleDetailRowChange}
                  onCatalogItemApplied={handleCatalogItemApplied}
                  onAddRow={addDetailRow}
                  onRemoveRow={removeDetailRow}
                />
              </>
            )}
          </CardContent>
        </Card>

        <DocumentAuditDetails
          token={token}
          entityType="PharmReceive"
          entityId={recordId}
          documentNumber={headerFathId}
          refreshKey={auditRefreshKey}
        />

        <SearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onSearch={runSearch}
          movementParentId={PHARM_RECIVE_MOV_PARENT_ID}
          token={token}
          onSelect={(result) => void loadRecord(result.id, itemByCode, catalogItems)}
        />
      </div>
    </PageGuard>
  );
}
