"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  applyMovementToInventoryHeader,
  createEmptyInventoryDetailRow,
  emptyInventoryHeader,
  toInventoryUpsertPayload,
} from "@/lib/inventory-adjustment.mapper";
import {
  applyIncreaseDecreasePatch,
  recomputeInventoryDetailFromAdjustment,
} from "@/lib/inventory-adjustment-detail";
import { ensureCatalogItemsForItmCodes } from "@/lib/item-unit-options";
import {
  createInventoryAdjustmentService,
  InventoryAdjustmentService,
} from "@/services/inventory-adjustment.service";
import type {
  InventoryAdjustmentDetail,
  InventoryAdjustmentHeader,
} from "@/types/inventory-adjustment";
import { isInventoryAdjustmentPosted } from "@/types/inventory-adjustment";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { MovmentLookupItem } from "@/types/movment";
import {
  decreaseExceedsAvailableMessage,
  inventoryAdjustmentHeaderSchema,
  isDecreaseGreaterThanCurrentQty,
  validateInventoryDetails,
  type InventoryAdjustmentHeaderFormValues,
} from "@/validation/inventory-adjustment.schema";

export type InventoryAdjustmentFormMode = "view" | "new" | "edit";

function documentToFormValues(header: InventoryAdjustmentHeader): InventoryAdjustmentHeaderFormValues {
  return {
    id: header.id,
    fhId: header.fhId,
    movId: header.movId,
    movmentRowId: header.movmentRowId,
    invDat: header.invDat,
    invStore: header.invStore,
    invNotice: header.invNotice,
    movStat: header.movStat,
    invAccount1: header.invAccount1,
    invAccount2: header.invAccount2,
  };
}

export function useInventoryAdjustment(token: string | undefined) {
  const [mode, setMode] = useState<InventoryAdjustmentFormMode>("new");
  const [details, setDetails] = useState<InventoryAdjustmentDetail[]>([]);
  const [latestDetailGroupId, setLatestDetailGroupId] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recordId, setRecordId] = useState<number | null>(null);
  const savedDetailIdsRef = useRef<number[]>([]);
  const nextDetailGroupIdRef = useRef(1);

  const form = useForm<InventoryAdjustmentHeaderFormValues>({
    resolver: zodResolver(inventoryAdjustmentHeaderSchema),
    defaultValues: documentToFormValues(emptyInventoryHeader()),
  });

  const service = useMemo(
    () => (token ? createInventoryAdjustmentService(token) : null),
    [token]
  );

  const resetForm = useCallback(() => {
    form.reset(documentToFormValues(emptyInventoryHeader()));
    setDetails([]);
    setRecordId(null);
    setLatestDetailGroupId(0);
    nextDetailGroupIdRef.current = 1;
    savedDetailIdsRef.current = [];
    setMode("new");
  }, [form]);

  const loadRecord = useCallback(
    async (
      id: number,
      itemByCode?: Map<string, ItemCatalogItem>,
      catalogItems?: ItemCatalogItem[]
    ) => {
      if (!service) return;
      setLoading(true);
      try {
        const doc = await service.getById(id);

        let catalogMap = itemByCode ?? new Map<string, ItemCatalogItem>();
        if (token) {
          catalogMap = await ensureCatalogItemsForItmCodes(
            doc.details.map((row) => ({ itmId: row.itmCode })),
            catalogMap,
            catalogItems,
            token
          );
        }

        form.reset(documentToFormValues(doc.header));
        setDetails(doc.details.map((row) => ({ ...row, detailGroupId: 0 })));
        setLatestDetailGroupId(0);
        setRecordId(doc.header.id);
        savedDetailIdsRef.current = doc.details
          .map((row) => row.id)
          .filter((value): value is number => value != null && value > 0);
        setMode("view");
        return catalogMap;
      } catch (error) {
        toast.error("Could not load inventory document.", {
          description: error instanceof Error ? error.message : undefined,
        });
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [form, service, token]
  );

  const applyMovement = useCallback(
    (movement: MovmentLookupItem | null) => {
      const current = form.getValues();
      const nextHeader = applyMovementToInventoryHeader(
        {
          ...emptyInventoryHeader(),
          ...current,
          id: current.id ?? null,
          fhId: current.fhId ?? null,
          invDat: current.invDat ?? emptyInventoryHeader().invDat,
          invStore: current.invStore ?? "",
          invNotice: current.invNotice ?? "",
          movStat: current.movStat ?? null,
          invAccount1: current.invAccount1 ?? "",
          invAccount2: current.invAccount2 ?? "",
        },
        movement
      );
      form.setValue("movId", nextHeader.movId, { shouldValidate: true });
      form.setValue("movmentRowId", nextHeader.movmentRowId);
      form.setValue("invAccount1", nextHeader.invAccount1);
      form.setValue("invAccount2", nextHeader.invAccount2);
    },
    [form]
  );

  const prependDetailRows = useCallback((rows: InventoryAdjustmentDetail[]) => {
    if (rows.length === 0) return;
    const groupId = nextDetailGroupIdRef.current;
    nextDetailGroupIdRef.current += 1;
    setLatestDetailGroupId(groupId);
    setDetails((prev) => [
      ...rows.map((row) => ({ ...row, detailGroupId: groupId })),
      ...prev,
    ]);
  }, []);

  const updateDetailRow = useCallback(
    (clientRowId: string, patch: Partial<InventoryAdjustmentDetail>) => {
      let rejectedDecrease = false;
      let rejectedAvailableQty = 0;
      setDetails((prev) => {
        const row = prev.find((item) => item.clientRowId === clientRowId);
        if (!row) return prev;

        const qtyPatch = applyIncreaseDecreasePatch(row, patch);
        const merged = { ...row, ...patch, ...qtyPatch };
        const availableQty = Number.isFinite(merged.itmAvailableQty)
          ? merged.itmAvailableQty
          : merged.itmStockQty;
        if (
          isDecreaseGreaterThanCurrentQty(merged.itemShortQty, availableQty)
        ) {
          rejectedDecrease = true;
          rejectedAvailableQty = availableQty;
          return prev;
        }

        return prev.map((item) => {
          if (item.clientRowId !== clientRowId) return item;
          if (
            "itmIncresQty" in patch ||
            "itemShortQty" in patch ||
            "itmStockQty" in patch ||
            "itmAvailableQty" in patch ||
            "itmPPrice" in patch ||
            "itmSalPrice" in patch ||
            "unitId" in patch
          ) {
            return {
              ...merged,
              ...recomputeInventoryDetailFromAdjustment(merged),
            };
          }
          return merged;
        });
      });
      if (rejectedDecrease) {
        toast.error(decreaseExceedsAvailableMessage(rejectedAvailableQty), {
          id: "inventory-adjustment-decrease-qty",
        });
      }
    },
    []
  );

  const removeDetailRow = useCallback((clientRowId: string) => {
    setDetails((prev) => prev.filter((row) => row.clientRowId !== clientRowId));
  }, []);

  const handleNew = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const handleEdit = useCallback(() => {
    if (isInventoryAdjustmentPosted(form.getValues("movStat"))) {
      toast.message("Posted inventory documents cannot be edited.");
      return;
    }
    setMode("edit");
  }, [form]);

  const handleDelete = useCallback(async () => {
    if (isInventoryAdjustmentPosted(form.getValues("movStat"))) {
      toast.message("Posted inventory documents cannot be deleted.");
      return;
    }
    const id = form.getValues("id") ?? recordId;
    if (!service || !id || id <= 0) {
      toast.error("Nothing to delete.");
      return;
    }
    setSaving(true);
    try {
      await service.remove(id);
      toast.success("Inventory document deleted.");
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  }, [form, recordId, resetForm, service]);

  const handleSave = useCallback(
    async (itemByCode?: Map<string, ItemCatalogItem>): Promise<boolean> => {
    if (!service) {
      toast.error("Sign in to save inventory documents.");
      return false;
    }

    if (isInventoryAdjustmentPosted(form.getValues("movStat"))) {
      toast.message("Posted inventory documents cannot be saved.");
      return false;
    }

    const valid = await form.trigger();
    if (!valid) {
      toast.error("Fix header validation errors before saving.");
      return false;
    }

    const headerValues = form.getValues();
    const detailError = validateInventoryDetails(details);
    if (detailError) {
      toast.error(detailError);
      return false;
    }

    const header: InventoryAdjustmentHeader = {
      id: headerValues.id ?? null,
      fhId: headerValues.fhId ?? null,
      movId: headerValues.movId ?? null,
      movmentRowId: headerValues.movmentRowId ?? null,
      invDat: headerValues.invDat ?? emptyInventoryHeader().invDat,
      invStore: headerValues.invStore ?? "",
      invNotice: headerValues.invNotice ?? "",
      movStat: headerValues.movStat ?? null,
      invAccount1: headerValues.invAccount1 ?? "",
      invAccount2: headerValues.invAccount2 ?? "",
    };

    const deletedDetailIds = savedDetailIdsRef.current.filter(
      (id) => !details.some((row) => row.id === id)
    );

    setSaving(true);
    try {
      const result = await service.save(
        header,
        details,
        deletedDetailIds,
        itemByCode
      );
      if (!result.success || !result.document) {
        toast.error(result.message ?? "Inventory save failed.");
        return false;
      }

      form.reset(documentToFormValues(result.document.header));
      setDetails(result.document.details.map((row) => ({ ...row, detailGroupId: 0 })));
      setLatestDetailGroupId(0);
      setRecordId(result.document.header.id);
      savedDetailIdsRef.current = result.document.details
        .map((row) => row.id)
        .filter((value): value is number => value != null && value > 0);
      setMode("view");

      toast.success("Inventory document saved.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inventory save failed.");
      return false;
    } finally {
      setSaving(false);
    }
  },
    [details, form, service]
  );

  useEffect(() => {
    if (!token) resetForm();
  }, [token, resetForm]);

  const isEditable = mode === "new" || mode === "edit";

  return {
    form,
    mode,
    isEditable,
    details,
    latestDetailGroupId,
    setDetails,
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
    createEmptyDetailRow: createEmptyInventoryDetailRow,
    toUpsertPayload: toInventoryUpsertPayload,
  };
}

export { InventoryAdjustmentService };
