"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Resolver } from "react-hook-form";
import {
  applyPharmReciveDetailPatch,
  computeHeaderTotals,
  mapDetailsWithLineTotals,
} from "@/lib/pharm-recive-calculations";
import {
  applyMovementToPharmReciveHeader,
  computeDeletedDetailIds,
  createEmptyDetailRow,
  documentToFormValues,
  emptyPharmReciveHeader,
  filterDetailsWithItemCode,
  headerToFormValues,
  mergeSavedDetailsWithPrior,
  PHARM_RECIVE_INITIAL_ROW_ID,
} from "@/lib/pharm-recive.mapper";
import { ensureCatalogItemsForDetails } from "@/lib/item-unit-options";
import {
  createPharmReciveService,
  PharmReciveRepositoryError,
} from "@/services/pharm-recive.service";
import {
  validatePharmReciveDetailQuantity,
} from "@/lib/pharm-recive-item-stock-search";
import type { PharmReciveDetail, PharmReciveDetailPatch, PharmReciveHeader, PharmReciveSearchFilters } from "@/types/pharm-recive";
import type { MovmentLookupItem } from "@/types/movment";
import type { ItemCatalogItem } from "@/types/item-catalog";
import {
  pharmReciveHeaderSchema,
  type PharmReciveHeaderFormValues,
} from "@/validation/pharm-recive.schema";

export type PharmReciveFormMode = "view" | "new" | "edit";

function isPublishedApp(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Local calendar date from this machine (not UTC). */
function machineTodayInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isIsoDate(value: string | undefined): boolean {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()));
}

export function usePharmRecive(token: string | undefined) {
  const [mode, setMode] = useState<PharmReciveFormMode>("new");
  const [details, setDetails] = useState<PharmReciveDetail[]>([
    createEmptyDetailRow(PHARM_RECIVE_INITIAL_ROW_ID),
  ]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [navIds, setNavIds] = useState<number[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const loadedRecordIdRef = useRef<number | null>(null);
  const initialDetailIdsRef = useRef<number[]>([]);
  const deletedDetailIdsRef = useRef<number[]>([]);
  const serverDateRef = useRef("");
  const serverDateRequestRef = useRef(0);

  const form = useForm<PharmReciveHeaderFormValues, unknown, PharmReciveHeaderFormValues>({
    resolver: zodResolver(pharmReciveHeaderSchema) as Resolver<PharmReciveHeaderFormValues>,
    defaultValues: headerToFormValues({
      ...emptyPharmReciveHeader(),
      movDate: machineTodayInput(),
    }),
    mode: "onChange",
  });

  const detailsWithTotals = useMemo(
    () => mapDetailsWithLineTotals(details),
    [details]
  );

  const computedTotals = useMemo(
    () => computeHeaderTotals(detailsWithTotals),
    [detailsWithTotals]
  );

  useEffect(() => {
    form.setValue("movTotalqunt", computedTotals.movTotalqunt, { shouldDirty: false });
    form.setValue("movTotalSalesPrice", computedTotals.movTotalSalesPrice, { shouldDirty: false });
    form.setValue("movTotalPurchPrice", computedTotals.movTotalPurchPrice, { shouldDirty: false });
    form.setValue("movTotalCostPrice", computedTotals.movTotalCostPrice, { shouldDirty: false });
  }, [computedTotals, form]);

  const service = useMemo(
    () => (token ? createPharmReciveService(token) : null),
    [token]
  );

  const applyNewDocumentDate = useCallback(async () => {
    const applyIfNew = (date: string) => {
      const headerId = form.getValues("id");
      if (headerId != null && headerId > 0) return;
      form.setValue("movDate", date, { shouldDirty: false });
    };

    if (!isPublishedApp()) {
      const localDate = machineTodayInput();
      serverDateRef.current = localDate;
      applyIfNew(localDate);
      return;
    }

    const fallback = serverDateRef.current || machineTodayInput();
    applyIfNew(fallback);

    if (!service) return;
    const requestId = ++serverDateRequestRef.current;
    try {
      const date = await service.getServerDate();
      if (requestId !== serverDateRequestRef.current) return;
      const normalized = date.trim();
      if (!isIsoDate(normalized)) return;
      serverDateRef.current = normalized;
      applyIfNew(normalized);
    } catch {
      if (requestId !== serverDateRequestRef.current) return;
      applyIfNew(fallback);
    }
  }, [form, service]);

  useEffect(() => {
    void applyNewDocumentDate();
  }, [applyNewDocumentDate]);

  const isEditable = mode === "new" || mode === "edit";
  const currentId = form.watch("id");

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
    (header: PharmReciveHeader, nextDetails: PharmReciveDetail[]) => {
      form.reset(documentToFormValues(header, nextDetails));
      setDetails(nextDetails.length ? nextDetails : [createEmptyDetailRow(PHARM_RECIVE_INITIAL_ROW_ID)]);
      setSelectedRowIndex(0);
      loadedRecordIdRef.current =
        header.id != null && header.id > 0 ? header.id : null;
      initialDetailIdsRef.current = nextDetails
        .map((line) => line.id)
        .filter((id): id is number => id != null && id > 0);
      deletedDetailIdsRef.current = [];
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
        let enriched = doc.details;
        if (itemByCode && itemByCode.size > 0) {
          enriched = mergeSavedDetailsWithPrior(doc.details, doc.details, itemByCode);
        } else if (catalogItems && catalogItems.length > 0) {
          const map = new Map(catalogItems.map((i) => [i.itmCode?.toLowerCase() ?? "", i]));
          enriched = mergeSavedDetailsWithPrior(doc.details, doc.details, map);
        }
        applyDocument(doc.header, enriched);
        setMode("view");
        await refreshNavIds();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load document");
      } finally {
        setLoading(false);
      }
    },
    [applyDocument, refreshNavIds, service]
  );

  const handleNew = useCallback(() => {
    const newDate = isPublishedApp()
      ? serverDateRef.current || machineTodayInput()
      : machineTodayInput();
    form.reset(
      headerToFormValues({
        ...emptyPharmReciveHeader(),
        movDate: newDate,
      })
    );
    setDetails([createEmptyDetailRow(PHARM_RECIVE_INITIAL_ROW_ID)]);
    setSelectedRowIndex(0);
    setMode("new");
    loadedRecordIdRef.current = null;
    initialDetailIdsRef.current = [];
    deletedDetailIdsRef.current = [];
    void applyNewDocumentDate();
  }, [applyNewDocumentDate, form]);

  const handleEdit = useCallback(() => {
    if (!currentId) {
      toast.message("Save the document first, or load an existing record.");
      return;
    }
    setMode("edit");
  }, [currentId]);

  const handleSave = useCallback(
    async (
      itemByCode?: Map<string, ItemCatalogItem>,
      selectedMovement?: MovmentLookupItem | null,
      catalogItems?: ItemCatalogItem[]
    ) => {
      if (!service) return;

      const header = applyMovementToPharmReciveHeader(
        {
          ...form.getValues(),
          id: form.getValues("id") ?? currentId ?? null,
        },
        selectedMovement ?? null
      );

      const detailsForSave = filterDetailsWithItemCode(detailsWithTotals);
      const recordId =
        (header.id != null && header.id > 0 ? header.id : null) ??
        (currentId != null && currentId > 0 ? currentId : null) ??
        (loadedRecordIdRef.current != null && loadedRecordIdRef.current > 0
          ? loadedRecordIdRef.current
          : null);

      const isUpdate = recordId != null;

      if (detailsForSave.length === 0) {
        toast.error("At least one detail line with an item code is required");
        return;
      }

      if (!header.movId && !header.movmentRowId) {
        toast.error("Movement is required");
        return;
      }

      if (!header.fathId && !isUpdate) {
        toast.error("Serial must be generated. Select a movement first.");
        return;
      }

      const effectiveDeletedDetailIds = isUpdate
        ? computeDeletedDetailIds(
            initialDetailIdsRef.current,
            detailsForSave,
            deletedDetailIdsRef.current
          )
        : [];

      let catalogMap = itemByCode ?? new Map<string, ItemCatalogItem>();
      if (token && detailsForSave.length > 0) {
        catalogMap = await ensureCatalogItemsForDetails(
          detailsForSave.map((row) => ({
            ...row,
            itmSell: row.itmSellPrice,
            bonus: 0,
            itmTaxPrice: 0,
            itmTaxTotal: 0,
            itmExtraDis: 0,
            itmDisMon: 0,
            itmDisPer: 0,
            itmCost: row.itemCostPrice,
            itmNet: 0,
            stdItmStock: row.itmStock,
            stoId: "",
            taxPercent: null,
          })),
          catalogMap,
          catalogItems,
          token
        );
      }

      const validation = service.validateDocument(header, detailsForSave, catalogMap, catalogItems);
      if (!validation.success) {
        const issue = validation.error.issues[0];
        toast.error(issue?.message ?? "Validation failed");
        return;
      }

      setSaving(true);
      try {
        const saved = await service.save({
          header: validation.data.header,
          recordId,
          details: validation.data.details,
          deletedDetailIds: isUpdate ? effectiveDeletedDetailIds : undefined,
        });
        const mergedDetails = mergeSavedDetailsWithPrior(
          saved.details,
          detailsForSave,
          catalogMap
        );
        applyDocument(saved.header, mergedDetails);
        setMode("view");
        await refreshNavIds();
        const label =
          saved.header.fathId != null
            ? `#${saved.header.fathId}`
            : saved.header.id != null
              ? `ID ${saved.header.id}`
              : "";
        toast.success(label ? `Pharmacy receive saved ${label}` : "Pharmacy receive saved");
      } catch (error) {
        toast.error(error instanceof PharmReciveRepositoryError ? error.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [applyDocument, currentId, detailsWithTotals, form, refreshNavIds, service, token]
  );

  const handleDelete = useCallback(async () => {
    if (!service || !currentId) {
      toast.error("Nothing to delete");
      return;
    }
    setSaving(true);
    try {
      await service.delete(currentId);
      toast.success("Document deleted");
      handleNew();
      await refreshNavIds();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }, [currentId, handleNew, refreshNavIds, service]);

  const handleRefresh = useCallback(
    async (itemByCode?: Map<string, ItemCatalogItem>, catalogItems?: ItemCatalogItem[]) => {
      const id = currentId ?? loadedRecordIdRef.current;
      if (id != null && id > 0) {
        await loadRecord(id, itemByCode, catalogItems);
      } else {
        await refreshNavIds();
      }
    },
    [currentId, loadRecord, refreshNavIds]
  );

  const navigate = useCallback(
    async (
      direction: "first" | "prev" | "next" | "last",
      itemByCode?: Map<string, ItemCatalogItem>,
      catalogItems?: ItemCatalogItem[]
    ) => {
      if (!service || navIds.length === 0) return;
      const id = currentId ?? loadedRecordIdRef.current;
      const index = id != null ? navIds.indexOf(id) : -1;
      let nextIndex = index;
      if (direction === "first") nextIndex = 0;
      else if (direction === "last") nextIndex = navIds.length - 1;
      else if (direction === "prev") nextIndex = Math.max(0, index - 1);
      else if (direction === "next") nextIndex = Math.min(navIds.length - 1, index + 1);
      const nextId = navIds[nextIndex];
      if (nextId != null && nextId > 0) {
        await loadRecord(nextId, itemByCode, catalogItems);
      }
    },
    [currentId, loadRecord, navIds, service]
  );

  const navState = useMemo(() => {
    const id = currentId ?? loadedRecordIdRef.current;
    const index = id != null ? navIds.indexOf(id) : -1;
    return {
      atFirst: index <= 0,
      atLast: index < 0 || index >= navIds.length - 1,
      hasRecords: navIds.length > 0,
    };
  }, [currentId, navIds]);

  const runSearch = useCallback(
    async (filters: PharmReciveSearchFilters) => {
      if (!service) return [];
      return service.search(filters);
    },
    [service]
  );

  const addDetailRow = useCallback(() => {
    setDetails((rows) => [...rows, createEmptyDetailRow()]);
    setSelectedRowIndex(details.length);
  }, [details.length]);

  const importExcelDetails = useCallback((imported: PharmReciveDetail[]) => {
    setDetails((current) => {
      const existing = current.filter((row) => row.itmId.trim());
      const merged = [...existing, ...imported];
      return merged.length
        ? merged
        : [createEmptyDetailRow(PHARM_RECIVE_INITIAL_ROW_ID)];
    });
    setSelectedRowIndex(0);
  }, []);

  const removeDetailRow = useCallback((index: number) => {
    setDetails((rows) => {
      const row = rows[index];
      if (row?.id != null && row.id > 0) {
        deletedDetailIdsRef.current = [...deletedDetailIdsRef.current, row.id];
      }
      const next = rows.filter((_, i) => i !== index);
      return next.length ? next : [createEmptyDetailRow(PHARM_RECIVE_INITIAL_ROW_ID)];
    });
    setSelectedRowIndex((i) => Math.max(0, i - (index <= i ? 1 : 0)));
  }, []);

  const updateDetailRow = useCallback((index: number, patch: PharmReciveDetailPatch) => {
    setDetails((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;

        const nextPatch =
          patch.itmId != null && patch.batchNo === undefined
            ? { ...patch, batchNo: "", expDate: "", maxSearchQty: undefined, itmStock: 0 }
            : patch;

        if (nextPatch.qnty != null) {
          const validation = validatePharmReciveDetailQuantity(Number(nextPatch.qnty));
          if (!validation.ok) {
            toast.error(validation.message);
            return row;
          }
        }

        return applyPharmReciveDetailPatch(row, nextPatch);
      })
    );
  }, []);

  useEffect(() => {
    if (!service) return;
    void refreshNavIds();
  }, [refreshNavIds, service]);

  return {
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
    computedTotals,
  };
}
