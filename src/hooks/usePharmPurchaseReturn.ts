"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Resolver } from "react-hook-form";
import {
  applyReturnDetailPatch,
  computeHeaderTotals,
  mapReturnDetailsWithLineTotals,
} from "@/lib/return-calculations";
import {
  applyMovementStoToDetails,
  applyMovementToHeader,
  createEmptyDetailRow,
  emptyReturnHeader,
  filterDetailsWithItemCode,
  headerToFormValues,
  mergeSavedDetailsWithPrior,
  returnDocumentToFormValues,
} from "@/lib/return.mapper";
import { enrichDetailFromCatalog } from "@/lib/item-catalog-search";
import { resolveCatalogMapForPharmPurchaseReturnSave } from "@/lib/pharm-purchase-return-catalog";
import { ensureCatalogItemsForItmCodes } from "@/lib/item-unit-options";
import {
  checkReturnDetailStockAllocation,
  clearReturnDetailStockFields,
} from "@/lib/return-detail-sales-stock";
import type { ItemCatalogItem } from "@/types/item-catalog";
import { createPharmPurchaseReturnService } from "@/services/pharm-purchase-return.service";
import type { ReturnDetail, ReturnDetailPatch, ReturnHeader } from "@/types/return";
import type { MovmentLookupItem } from "@/types/movment";
import {
  returnHeaderSchema,
  type ReturnHeaderFormValues,
} from "@/validation/return.schema";

export type PharmPurchaseReturnFormMode = "view" | "new";

export function usePharmPurchaseReturn(token: string | undefined) {
  const [mode, setMode] = useState<PharmPurchaseReturnFormMode>("new");
  const [details, setDetails] = useState<ReturnDetail[]>([createEmptyDetailRow()]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const loadedRecordIdRef = useRef<number | null>(null);
  const initialDetailIdsRef = useRef<number[]>([]);

  const form = useForm<ReturnHeaderFormValues, unknown, ReturnHeaderFormValues>({
    resolver: zodResolver(returnHeaderSchema) as Resolver<ReturnHeaderFormValues>,
    defaultValues: headerToFormValues(emptyReturnHeader()),
    mode: "onChange",
  });

  const purchExtraDisCount = useWatch({
    control: form.control,
    name: "purchExtraDisCount",
  });
  const totalDisPer = useWatch({ control: form.control, name: "totalDisPer" });
  const pOtherExpenses = useWatch({ control: form.control, name: "pOtherExpenses" });

  const detailsWithTotals = useMemo(
    () => mapReturnDetailsWithLineTotals(details),
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
    [detailsWithTotals, purchExtraDisCount, pOtherExpenses, totalDisPer]
  );

  useEffect(() => {
    form.setValue("noOfItems", computedTotals.noOfItems, { shouldDirty: false });
    form.setValue("totalQuantity", computedTotals.totalQuantity, {
      shouldDirty: false,
    });
    form.setValue("totalBill", computedTotals.totalBill, { shouldDirty: false });
    form.setValue("totalDesMon", computedTotals.totalDesMon, { shouldDirty: false });
    form.setValue("totalTax", computedTotals.totalTax, { shouldDirty: false });
    form.setValue("pthNetBill", computedTotals.pthNetBill, { shouldDirty: false });
  }, [computedTotals, form]);

  const service = useMemo(
    () => (token ? createPharmPurchaseReturnService(token) : null),
    [token]
  );

  const applyDocument = useCallback(
    (header: ReturnHeader, nextDetails: ReturnDetail[]) => {
      loadedRecordIdRef.current = header.id ?? null;
      initialDetailIdsRef.current = nextDetails
        .map((line) => line.id)
        .filter((id): id is number => id != null && id > 0);
      form.reset(returnDocumentToFormValues(header, nextDetails));
      setDetails(nextDetails.length ? nextDetails : [createEmptyDetailRow()]);
      setSelectedRowIndex(0);
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

        const enriched = doc.details.map((line) =>
          enrichDetailFromCatalog(line, catalogMap)
        );
        applyDocument(doc.header, enriched);
        setMode("view");
        toast.success(`Loaded pharmacy purchase return #${doc.header.pthId ?? id}`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load pharmacy purchase return"
        );
      } finally {
        setLoading(false);
      }
    },
    [applyDocument, service, token]
  );

  const handleNew = useCallback(() => {
    const empty = emptyReturnHeader();
    form.reset(headerToFormValues(empty));
    setDetails([createEmptyDetailRow()]);
    setSelectedRowIndex(0);
    loadedRecordIdRef.current = null;
    initialDetailIdsRef.current = [];
    setMode("new");
  }, [form]);

  const handleSave = useCallback(
    async (
      itemByCode?: Map<string, ItemCatalogItem>,
      selectedMovement?: MovmentLookupItem | null,
      catalogItems?: ItemCatalogItem[]
    ) => {
      if (!service) return;

      const recordId =
        (form.getValues("id") != null && form.getValues("id")! > 0
          ? form.getValues("id")
          : null) ??
        (loadedRecordIdRef.current != null && loadedRecordIdRef.current > 0
          ? loadedRecordIdRef.current
          : null);

      if (recordId != null) {
        toast.message("This return is already saved. Start a new document to create another.");
        return;
      }

      if (form.getValues("employCode") == null) {
        toast.error("Enter and verify the employee code before saving.");
        return;
      }

      const header = applyMovementToHeader(
        { ...form.getValues(), id: null },
        selectedMovement ?? null
      );

      const detailsForSave = applyMovementStoToDetails(
        filterDetailsWithItemCode(detailsWithTotals),
        selectedMovement ?? null
      );
      const removedCount = detailsWithTotals.length - detailsForSave.length;

      if (detailsForSave.length === 0) {
        toast.error("At least one detail line with an item code is required");
        return;
      }

      if (removedCount > 0) {
        setDetails(mapReturnDetailsWithLineTotals(detailsForSave));
        setSelectedRowIndex((i) =>
          Math.min(i, Math.max(0, detailsForSave.length - 1))
        );
      }

      let catalogMap = itemByCode ?? new Map<string, ItemCatalogItem>();
      if (token) {
        const resolved = await resolveCatalogMapForPharmPurchaseReturnSave(
          detailsForSave,
          catalogMap,
          catalogItems,
          token
        );
        if (resolved.error) {
          toast.error(resolved.error);
          return;
        }
        catalogMap = resolved.map;
      }

      const validation = service.validateDocument(
        header,
        detailsForSave,
        catalogMap,
        catalogItems
      );
      if (!validation.success) {
        const issue = validation.error.issues[0];
        toast.error(issue?.message ?? "Validation failed");
        return;
      }

      setSaving(true);
      try {
        const saved = await service.create({
          header: validation.data.header,
          details: validation.data.details,
          itemByCode: catalogMap,
          catalogItems,
        });
        const mergedDetails = mergeSavedDetailsWithPrior(
          saved.details,
          detailsForSave,
          catalogMap
        );
        applyDocument(saved.header, mergedDetails);
        setMode("view");
        const label =
          saved.header.pthId != null
            ? `#${saved.header.pthId}`
            : saved.header.id != null
              ? `ID ${saved.header.id}`
              : "";
        toast.success(
          label
            ? `Pharmacy purchase return saved ${label}`
            : "Pharmacy purchase return saved"
        );
        if (removedCount > 0) {
          toast.message(`Removed ${removedCount} empty line(s) without item code`);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [applyDocument, detailsWithTotals, form, service, token]
  );

  const handleRefresh = useCallback(
    async (
      itemByCode?: Map<string, ItemCatalogItem>,
      catalogItems?: ItemCatalogItem[]
    ) => {
      const id =
        form.getValues("id") ??
        (loadedRecordIdRef.current != null && loadedRecordIdRef.current > 0
          ? loadedRecordIdRef.current
          : null);
      if (id) {
        await loadRecord(id, itemByCode, catalogItems);
      }
    },
    [form, loadRecord]
  );

  const addDetailRow = useCallback((defaultStoId = "") => {
    setDetails((rows) => [...rows, createEmptyDetailRow(defaultStoId)]);
    setSelectedRowIndex(details.length);
  }, [details.length]);

  const removeDetailRow = useCallback((index: number) => {
    setDetails((rows) => {
      const removed = rows[index];
      if (!removed) return rows;
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
    (index: number, patch: ReturnDetailPatch) => {
      setDetails((rows) =>
        rows.map((row, lineIndex) => {
          if (lineIndex !== index) return row;

          let nextPatch: ReturnDetailPatch =
            patch.itmId != null && patch.batchNo === undefined
              ? {
                  ...patch,
                  batchNo: "",
                  ...clearReturnDetailStockFields(),
                }
              : patch;

          if (nextPatch.batchNo !== undefined && !nextPatch.batchNo.trim()) {
            nextPatch = {
              ...nextPatch,
              ...clearReturnDetailStockFields(),
            };
          }

          if (nextPatch.qnty != null) {
            const merged = applyReturnDetailPatch(row, nextPatch);
            const nextRows = rows.map((line, i) =>
              lineIndex === i ? merged : line
            );
            const check = checkReturnDetailStockAllocation(merged, nextRows, "");
            if (!check.ok) {
              toast.error(check.message);
              return row;
            }
          }

          return applyReturnDetailPatch(row, nextPatch);
        })
      );
    },
    []
  );

  const isEditable = mode === "new";

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
    handleNew,
    handleSave,
    handleRefresh,
    loadRecord,
    addDetailRow,
    removeDetailRow,
    updateDetailRow,
  };
}

export type UsePharmPurchaseReturnReturn = ReturnType<typeof usePharmPurchaseReturn>;
