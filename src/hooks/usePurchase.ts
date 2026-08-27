"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Resolver } from "react-hook-form";
import {
  applyPurchaseDetailPatch,
  computeHeaderTotals,
  mapDetailsWithLineTotals,
} from "@/lib/purchase-calculations";
import {
  applyMovementStoToDetails,
  applyMovementToHeader,
  createEmptyDetailRow,
  computeDeletedDetailIds,
  documentToFormValues,
  emptyPurchaseHeader,
  filterDetailsWithItemCode,
  headerToFormValues,
  mergeSavedDetailsWithPrior,
} from "@/lib/purchase.mapper";
import { enrichDetailFromCatalog } from "@/lib/item-catalog-search";
import { ensureCatalogItemsForDetails, ensureCatalogItemsForItmCodes } from "@/lib/item-unit-options";
import type { ItemCatalogItem } from "@/types/item-catalog";
import {
  createPurchaseService,
  PurchaseRepositoryError,
} from "@/services/purchase.service";
import { ApiError } from "@/lib/api-client";
import type { StockBarcodeLabel } from "@/types/stock";
import type { PurchaseDetail, PurchaseDetailPatch, PurchaseHeader, PurchaseSearchFilters, PurchaseStockBatch } from "@/types/purchase";
import type { MovmentLookupItem } from "@/types/movment";
import {
  purchaseHeaderSchema,
  type PurchaseHeaderFormValues,
} from "@/validation/purchase.schema";

export type PurchaseFormMode = "view" | "new" | "edit";

/**
 * Single place that decides Post button visibility from the current purchase record.
 * Call this whenever page/record state changes instead of setting Visible = true after save.
 *
 * Hidden: new page / no purchase record, or MovStat = 5 (already posted).
 * Visible: saved/updated unposted purchase. Stays visible if posting fails.
 */
export function updatePostButtonVisibility(options: {
  recordId: number | null | undefined;
  movStat: number | null | undefined;
}): boolean {
  const hasPurchRecord = options.recordId != null && options.recordId > 0;
  if (!hasPurchRecord) return false;
  if (options.movStat === 5) return false;
  return true;
}

/** Transfer: hidden on new page; visible when saved/posted (MovStat 0–5). API uses 0 for saved, 5 for posted. */
export function updateTransferButtonVisibility(options: {
  recordId: number | null | undefined;
  movStat: number | null | undefined;
}): boolean {
  const hasPurchRecord = options.recordId != null && options.recordId > 0;
  if (!hasPurchRecord) return false;
  const stat = options.movStat;
  if (stat == null) return false;
  return stat >= 0 && stat <= 5;
}

export function usePurchase(token: string | undefined) {
  const [mode, setMode] = useState<PurchaseFormMode>("new");
  const [details, setDetails] = useState<PurchaseDetail[]>([createEmptyDetailRow()]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [navIds, setNavIds] = useState<number[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [stockBarcodePrintOpen, setStockBarcodePrintOpen] = useState(false);
  const [stockBarcodeLabels, setStockBarcodeLabels] = useState<StockBarcodeLabel[]>([]);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  /** Synchronous mirrors — React state can lag one frame behind Save. */
  const loadedRecordIdRef = useRef<number | null>(null);
  const initialDetailIdsRef = useRef<number[]>([]);
  const deletedDetailIdsRef = useRef<number[]>([]);

  const form = useForm<PurchaseHeaderFormValues, unknown, PurchaseHeaderFormValues>({
    resolver: zodResolver(purchaseHeaderSchema) as Resolver<PurchaseHeaderFormValues>,
    defaultValues: headerToFormValues(emptyPurchaseHeader()),
    mode: "onChange",
  });

  const purchExtraDisCount = useWatch({
    control: form.control,
    name: "purchExtraDisCount",
  });
  const totalDisPer = useWatch({ control: form.control, name: "totalDisPer" });
  const pOtherExpenses = useWatch({ control: form.control, name: "pOtherExpenses" });

  const detailsWithTotals = useMemo(
    () => mapDetailsWithLineTotals(details),
    [details]
  );

  const computedTotals = useMemo(
    () =>
      computeHeaderTotals(
        {
          purchExtraDisCount: Number(purchExtraDisCount ?? 0),
          totalDisPer: Number(totalDisPer ?? 0),
          pOtherExpenses: Number(pOtherExpenses ?? 0),
        },
        detailsWithTotals
      ),
    [detailsWithTotals, purchExtraDisCount, totalDisPer, pOtherExpenses]
  );

  useEffect(() => {
    form.setValue("noOfItems", computedTotals.noOfItems, { shouldDirty: false });
    form.setValue("totalQuantity", computedTotals.totalQuantity, { shouldDirty: false });
    form.setValue("totalBill", computedTotals.totalBill, { shouldDirty: false });
    form.setValue("totalDesMon", computedTotals.totalDesMon, { shouldDirty: false });
    form.setValue("totalTax", computedTotals.totalTax, { shouldDirty: false });
    form.setValue("pthNetBill", computedTotals.pthNetBill, { shouldDirty: false });
  }, [computedTotals, form]);

  const service = useMemo(
    () => (token ? createPurchaseService(token) : null),
    [token]
  );

  const openInsertedStockBarcodePrint = useCallback(
    async (
      recordId: number | null | undefined,
      batches: PurchaseStockBatch[] | undefined
    ) => {
      if (!service || recordId == null || recordId <= 0) return;

      const inserted = (batches ?? []).filter((batch) => batch.inserted);
      if (inserted.length === 0) return;

      try {
        const labels = await service.getStockBarcodeLabels(recordId);
        const insertedBatchNos = new Set(inserted.map((batch) => batch.batchNo.trim()));
        const toPrint = labels.filter((label) =>
          insertedBatchNos.has(label.batchNo.trim())
        );
        if (toPrint.length === 0) return;

        setStockBarcodeLabels(toPrint);
        setStockBarcodePrintOpen(true);
      } catch {
        // User can retry from the toolbar Print Barcode button.
      }
    },
    [service]
  );

  const isEditable =
    (mode === "new" || mode === "edit") && form.watch("movStat") !== 5;
  const currentId = form.watch("id");
  const movStat = form.watch("movStat");
  const isPostButtonVisible = updatePostButtonVisibility({
    recordId: currentId,
    movStat,
  });

  const isTransferButtonVisible = useMemo(() => {
    const recordId = currentId ?? loadedRecordIdRef.current;
    return updateTransferButtonVisibility({ recordId, movStat });
  }, [currentId, movStat]);

  const isBarcodeButtonVisible = useMemo(() => {
    const recordId = currentId ?? loadedRecordIdRef.current;
    return recordId != null && recordId > 0;
  }, [currentId]);

  const refreshNavIds = useCallback(async () => {
    if (!service) return;
    try {
      const ids = await service.loadNavigationIds();
      setNavIds(ids);
    } catch {
      setNavIds([]);
    }
  }, [service]);

  const applyDocument = useCallback(
    (header: PurchaseHeader, nextDetails: PurchaseDetail[]) => {
      form.reset(documentToFormValues(header, nextDetails));
      setDetails(nextDetails.length ? nextDetails : [createEmptyDetailRow()]);
      setSelectedRowIndex(0);
      loadedRecordIdRef.current =
        header.id != null && header.id > 0 ? header.id : null;
      initialDetailIdsRef.current = nextDetails
        .map((line) => line.id)
        .filter((id): id is number => id != null && id > 0);
      deletedDetailIdsRef.current = [];
      if (header.movStat === 5) {
        setMode("view");
      }
    },
    [form]
  );

  const loadRecord = useCallback(
    async (
      id: number,
      itemByCode?: Map<string, ItemCatalogItem>,
      catalogItems?: ItemCatalogItem[]
    ) => {
      if (!service) return;
      setLoading(true);
      try {
        const doc = await service.loadById(id);

        let catalogMap = itemByCode ?? new Map<string, ItemCatalogItem>();
        if (token) {
          catalogMap = await ensureCatalogItemsForItmCodes(
            doc.details,
            catalogMap,
            catalogItems,
            token
          );
        }

        const details = doc.details.map((line) =>
          enrichDetailFromCatalog(line, catalogMap)
        );
        applyDocument(doc.header, details);
        setMode("view");
        toast.success(`Loaded purchase #${doc.header.pthId ?? id}`);
        return catalogMap;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load purchase"
        );
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [applyDocument, service, token]
  );

  useEffect(() => {
    if (token) void refreshNavIds();
  }, [token, refreshNavIds]);

  const handleNew = useCallback(() => {
    const empty = emptyPurchaseHeader();
    form.reset(headerToFormValues(empty));
    setDetails([createEmptyDetailRow()]);
    setSelectedRowIndex(0);
    loadedRecordIdRef.current = null;
    initialDetailIdsRef.current = [];
    deletedDetailIdsRef.current = [];
    setMode("new");
  }, [form]);

  const handleEdit = useCallback(() => {
    if (form.getValues("movStat") === 5) {
      toast.message("This invoice is posted and cannot be edited.");
      return;
    }
    if (!currentId) {
      toast.message("Save the document first, or load an existing purchase.");
      return;
    }
    setMode("edit");
  }, [currentId, form]);

  const handleSave = useCallback(
    async (
      itemByCode?: Map<string, ItemCatalogItem>,
      selectedMovement?: MovmentLookupItem | null,
      catalogItems?: ItemCatalogItem[]
    ) => {
      if (!service) return;

      if (form.getValues("movStat") === 5) {
        toast.message("This invoice is posted and cannot be saved.");
        return;
      }

      // Re-apply movement mapping at save time so values cannot be lost
      // between selection and submit (zodResolver / unregistered fields).
      const header = applyMovementToHeader(
        {
          ...form.getValues(),
          id: form.getValues("id") ?? currentId ?? null,
        },
        selectedMovement ?? null
      );

      const detailsForSave = applyMovementStoToDetails(
        filterDetailsWithItemCode(detailsWithTotals),
        selectedMovement ?? null
      );
      const removedCount = detailsWithTotals.length - detailsForSave.length;

      const recordId =
        (header.id != null && header.id > 0 ? header.id : null) ??
        (currentId != null && currentId > 0 ? currentId : null) ??
        (loadedRecordIdRef.current != null && loadedRecordIdRef.current > 0
          ? loadedRecordIdRef.current
          : null);

      const isUpdate = recordId != null;
      const allowEmptyDetails = isUpdate && detailsForSave.length === 0;

      const effectiveDeletedDetailIds = isUpdate
        ? computeDeletedDetailIds(
            initialDetailIdsRef.current,
            detailsForSave,
            deletedDetailIdsRef.current
          )
        : [];

      if (detailsForSave.length === 0 && !allowEmptyDetails) {
        toast.error("At least one detail line with an item code is required");
        return;
      }

      if (allowEmptyDetails && recordId == null) {
        toast.error(
          "Could not determine the invoice to update. Reload the purchase and try again."
        );
        return;
      }

      if (removedCount > 0 && !allowEmptyDetails) {
        setDetails(mapDetailsWithLineTotals(detailsForSave));
        setSelectedRowIndex((i) => Math.min(i, Math.max(0, detailsForSave.length - 1)));
      }

      let catalogMap = itemByCode ?? new Map<string, ItemCatalogItem>();
      if (token && detailsForSave.length > 0) {
        catalogMap = await ensureCatalogItemsForDetails(
          detailsForSave,
          catalogMap,
          catalogItems,
          token
        );
      }

      const validation = service.validateDocument(
        header,
        detailsForSave,
        catalogMap,
        catalogItems,
        { allowEmptyDetails, isUpdate }
      );
      if (!validation.success) {
        const issue = validation.error.issues[0];
        toast.error(issue?.message ?? "Validation failed");
        return;
      }

      setSaving(true);
      try {
        const saved = await service.save({
          header: {
            ...validation.data.header,
            id: recordId ?? validation.data.header.id,
          },
          recordId,
          details: validation.data.details,
          deletedDetailIds: isUpdate ? effectiveDeletedDetailIds : undefined,
        });
        const mergedDetails =
          validation.data.details.length > 0
            ? mergeSavedDetailsWithPrior(
                saved.details,
                detailsForSave,
                catalogMap
              )
            : saved.details;
        applyDocument(saved.header, mergedDetails);
        setMode("view");
        await refreshNavIds();
        const label =
          saved.header.pthId != null
            ? `#${saved.header.pthId}`
            : saved.header.id != null
              ? `ID ${saved.header.id}`
              : "";
        toast.success(label ? `Purchase saved ${label}` : "Purchase saved");
        await openInsertedStockBarcodePrint(saved.header.id, saved.stockBatches);
        if (removedCount > 0) {
          toast.message(`Removed ${removedCount} empty line(s) without item code`);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [applyDocument, currentId, detailsWithTotals, form, openInsertedStockBarcodePrint, refreshNavIds, service, token]
  );

  const handlePrintBarcode = useCallback(async () => {
    if (!service) return;

    const recordId =
      (form.getValues("id") != null && form.getValues("id")! > 0
        ? form.getValues("id")
        : null) ??
      (currentId != null && currentId > 0 ? currentId : null) ??
      (loadedRecordIdRef.current != null && loadedRecordIdRef.current > 0
        ? loadedRecordIdRef.current
        : null);

    if (recordId == null) {
      toast.error("Save the document first.");
      return;
    }

    setBarcodeLoading(true);
    try {
      const labels = await service.getStockBarcodeLabels(recordId);
      const valid = labels.filter(
        (label) => label.batchNo.trim().length > 0 && label.barcodeValue.trim().length > 0
      );

      if (valid.length === 0) {
        toast.error("Barcode data not found for this purchase.");
        return;
      }

      setStockBarcodeLabels(valid);
      setStockBarcodePrintOpen(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        toast.error("Barcode API not available. Restart the Alfa API and try again.");
      } else {
        toast.error("Barcode data not found for this purchase.");
      }
    } finally {
      setBarcodeLoading(false);
    }
  }, [currentId, form, service]);

  const handleDelete = useCallback(async () => {
    if (form.getValues("movStat") === 5) {
      toast.message("This invoice is posted and cannot be deleted.");
      return;
    }
    if (!service || !currentId) {
      toast.error("Nothing to delete");
      return;
    }
    setSaving(true);
    try {
      await service.remove(currentId);
      toast.success("Purchase deleted");
      handleNew();
      await refreshNavIds();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }, [currentId, form, handleNew, refreshNavIds, service]);

  const handleTransfer = useCallback(() => {
    toast.message("Under construction");
  }, []);

  const handlePost = useCallback(
    async (
      itemByCode?: Map<string, ItemCatalogItem>,
      catalogItems?: ItemCatalogItem[]
    ) => {
      if (!service) return;

      const recordId =
        (form.getValues("id") != null && form.getValues("id")! > 0
          ? form.getValues("id")
          : null) ??
        (currentId != null && currentId > 0 ? currentId : null) ??
        (loadedRecordIdRef.current != null && loadedRecordIdRef.current > 0
          ? loadedRecordIdRef.current
          : null);

      if (recordId == null) {
        toast.error("Save the document first, or load an existing purchase.");
        return;
      }

      if (form.getValues("movStat") === 5) {
        toast.message("Invoice is already posted.");
        return;
      }

      setPosting(true);
      try {
        const saved = await service.post(recordId);

        let catalogMap = itemByCode ?? new Map<string, ItemCatalogItem>();
        if (token) {
          catalogMap = await ensureCatalogItemsForItmCodes(
            saved.details,
            catalogMap,
            catalogItems,
            token
          );
        }

        const details = saved.details.map((line) =>
          enrichDetailFromCatalog(line, catalogMap)
        );
        applyDocument(saved.header, details);
        setMode("view");
        toast.success("Invoice posted successfully.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Post failed");
      } finally {
        setPosting(false);
      }
    },
    [applyDocument, currentId, form, service, token]
  );

  const handleRefresh = useCallback(
    async (
      itemByCode?: Map<string, ItemCatalogItem>,
      catalogItems?: ItemCatalogItem[]
    ) => {
      if (currentId) {
        await loadRecord(currentId, itemByCode, catalogItems);
      } else {
        await refreshNavIds();
      }
    },
    [currentId, loadRecord, refreshNavIds]
  );

  const navigate = useCallback(
    async (
      target: "first" | "prev" | "next" | "last",
      itemByCode?: Map<string, ItemCatalogItem>,
      catalogItems?: ItemCatalogItem[]
    ) => {
      if (!navIds.length) {
        toast.message("No purchase records available to navigate.");
        return;
      }
      const idx = currentId ? navIds.indexOf(currentId) : -1;
      let nextIndex = 0;
      if (target === "first") nextIndex = 0;
      else if (target === "last") nextIndex = navIds.length - 1;
      else if (target === "prev") nextIndex = idx <= 0 ? 0 : idx - 1;
      else nextIndex = idx < 0 ? 0 : Math.min(idx + 1, navIds.length - 1);

      await loadRecord(navIds[nextIndex]!, itemByCode, catalogItems);
    },
    [currentId, loadRecord, navIds]
  );

  const runSearch = useCallback(
    async (filters: PurchaseSearchFilters) => {
      if (!service) return [];
      try {
        return await service.search(filters);
      } catch (error) {
        if (
          error instanceof PurchaseRepositoryError &&
          error.status === 404
        ) {
          return [];
        }
        throw error;
      }
    },
    [service]
  );

  const addDetailRow = useCallback((defaultStoId = "") => {
    setDetails((rows) => [...rows, createEmptyDetailRow(defaultStoId)]);
    setSelectedRowIndex(details.length);
  }, [details.length]);

  const removeDetailRow = useCallback((index: number) => {
    setDetails((rows) => {
      const removed = rows[index];
      if (!removed) return rows;

      if (removed.id != null && removed.id > 0) {
        const nextDeleted = deletedDetailIdsRef.current.includes(removed.id)
          ? deletedDetailIdsRef.current
          : [...deletedDetailIdsRef.current, removed.id];
        deletedDetailIdsRef.current = nextDeleted;
      }

      const next = rows.filter((_, i) => i !== index);
      const stoId = next[0]?.stoId?.trim() || removed.stoId?.trim() || "";
      const result = next.length === 0 ? [createEmptyDetailRow(stoId)] : next;

      setSelectedRowIndex((current) =>
        Math.min(current, Math.max(0, result.length - 1))
      );
      return result;
    });
  }, []);

  const updateDetailRow = useCallback(
    (index: number, patch: PurchaseDetailPatch) => {
      setDetails((rows) =>
        rows.map((row, i) =>
          i === index ? applyPurchaseDetailPatch(row, patch) : row
        )
      );
    },
    []
  );

  const navState = useMemo(() => {
    if (!navIds.length || !currentId) {
      return { atFirst: true, atLast: true, hasRecords: navIds.length > 0 };
    }
    const idx = navIds.indexOf(currentId);
    return {
      atFirst: idx <= 0,
      atLast: idx >= navIds.length - 1,
      hasRecords: true,
    };
  }, [currentId, navIds]);

  return {
    form,
    mode,
    setMode,
    details: detailsWithTotals,
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
  };
}

export type UsePurchaseReturn = ReturnType<typeof usePurchase>;
