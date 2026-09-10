"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  computeDeletedDetailIds,
  createEmptyDetailRow,
  documentToFormValues,
  emptyPharmTransferHeader,
  filterDetailsWithItemCode,
} from "@/services/pharm-transfer.service";
import {
  createPharmTransferService,
  PharmTransferRepositoryError,
} from "@/services/pharm-transfer.service";
import type {
  PharmTransferDetail,
  PharmTransferDetailPatch,
  PharmTransferHeader,
  PharmTransferSearchFilters,
} from "@/types/pharm-transfer";
import { PHARM_TRANSFER_TRA_FLAG_PENDING } from "@/types/pharm-transfer";

export type PharmTransferFormMode = "view" | "new" | "edit";

export function usePharmTransfer(token: string | undefined) {
  const [mode, setMode] = useState<PharmTransferFormMode>("new");
  const [header, setHeader] = useState<PharmTransferHeader>(emptyPharmTransferHeader());
  const [details, setDetails] = useState<PharmTransferDetail[]>([createEmptyDetailRow()]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navIds, setNavIds] = useState<number[]>([]);
  const loadedRecordIdRef = useRef<number | null>(null);
  const initialDetailIdsRef = useRef<number[]>([]);
  const deletedDetailIdsRef = useRef<number[]>([]);

  const service = useMemo(
    () => (token ? createPharmTransferService(token) : null),
    [token]
  );

  const currentId = header.id ?? loadedRecordIdRef.current;
  const isPending =
    header.traFlag == null || header.traFlag === PHARM_TRANSFER_TRA_FLAG_PENDING;
  const isEditable = (mode === "new" || mode === "edit") && isPending;

  const applyDocument = useCallback(
    (document: ReturnType<typeof documentToFormValues>) => {
      setHeader(document.header);
      setDetails(document.details.length ? document.details : [createEmptyDetailRow()]);
      setSelectedRowIndex(0);
      loadedRecordIdRef.current =
        document.header.id != null && document.header.id > 0
          ? document.header.id
          : null;
      initialDetailIdsRef.current = document.details
        .map((line) => line.id)
        .filter((id): id is number => id != null && id > 0);
      deletedDetailIdsRef.current = [];
      if (document.header.traFlag != null && document.header.traFlag !== PHARM_TRANSFER_TRA_FLAG_PENDING) {
        setMode("view");
      }
    },
    []
  );

  const refreshNavIds = useCallback(async () => {
    if (!service) return;
    try {
      const rows = await service.search({});
      setNavIds(rows.map((row) => row.id).sort((a, b) => a - b));
    } catch {
      setNavIds([]);
    }
  }, [service]);

  const handleNew = useCallback(() => {
    setMode("new");
    setHeader(emptyPharmTransferHeader());
    setDetails([createEmptyDetailRow()]);
    setSelectedRowIndex(0);
    loadedRecordIdRef.current = null;
    initialDetailIdsRef.current = [];
    deletedDetailIdsRef.current = [];
  }, []);

  const loadRecord = useCallback(
    async (id: number) => {
      if (!service) return;
      setLoading(true);
      try {
        const document = await service.loadById(id);
        applyDocument(documentToFormValues(document));
        setMode("view");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load pharmacy transfer."
        );
      } finally {
        setLoading(false);
      }
    },
    [applyDocument, service]
  );

  const handleEdit = useCallback(() => {
    if (!isPending) {
      toast.error("Only pending transfers can be edited.");
      return;
    }
    setMode("edit");
  }, [isPending]);

  const handleSave = useCallback(async () => {
    if (!service) return;
    setSaving(true);
    try {
      const deletedDetailIds = [
        ...deletedDetailIdsRef.current,
        ...computeDeletedDetailIds(initialDetailIdsRef.current, details),
      ].filter((id, index, arr) => arr.indexOf(id) === index);

      const saved = await service.save({
        header,
        details,
        recordId: loadedRecordIdRef.current,
        deletedDetailIds,
      });

      applyDocument(documentToFormValues(saved));
      setMode("view");
      await refreshNavIds();
      toast.success(
        loadedRecordIdRef.current && mode === "edit"
          ? "Pharmacy transfer updated."
          : "Pharmacy transfer saved."
      );
    } catch (error) {
      const message =
        error instanceof PharmTransferRepositoryError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not save pharmacy transfer.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [applyDocument, details, header, mode, refreshNavIds, service]);

  const handleDelete = useCallback(async () => {
    if (!service) return;
    const id = loadedRecordIdRef.current ?? header.id;
    if (!id || id <= 0) return;

    setSaving(true);
    try {
      await service.remove(id);
      toast.success("Pharmacy transfer deleted.");
      handleNew();
      await refreshNavIds();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete pharmacy transfer."
      );
    } finally {
      setSaving(false);
    }
  }, [handleNew, header.id, refreshNavIds, service]);

  const handleRefresh = useCallback(async () => {
    const id = loadedRecordIdRef.current ?? header.id;
    if (id != null && id > 0) {
      await loadRecord(id);
    } else {
      handleNew();
    }
    await refreshNavIds();
  }, [handleNew, header.id, loadRecord, refreshNavIds]);

  const navigate = useCallback(
    async (direction: "first" | "prev" | "next" | "last") => {
      if (navIds.length === 0) return;
      const current = loadedRecordIdRef.current ?? header.id ?? navIds[0];
      const index = navIds.findIndex((id) => id === current);
      let nextIndex = index >= 0 ? index : 0;
      if (direction === "first") nextIndex = 0;
      if (direction === "last") nextIndex = navIds.length - 1;
      if (direction === "prev") nextIndex = Math.max(0, nextIndex - 1);
      if (direction === "next") nextIndex = Math.min(navIds.length - 1, nextIndex + 1);
      await loadRecord(navIds[nextIndex]!);
    },
    [header.id, loadRecord, navIds]
  );

  const runSearch = useCallback(
    async (filters: PharmTransferSearchFilters) => {
      if (!service) return [];
      return service.search(filters);
    },
    [service]
  );

  const updateHeader = useCallback((patch: Partial<PharmTransferHeader>) => {
    setHeader((prev) => ({ ...prev, ...patch }));
  }, []);

  const addDetailRow = useCallback(() => {
    setDetails((rows) => [...rows, createEmptyDetailRow()]);
    setSelectedRowIndex((rows) => rows + 1);
  }, []);

  const removeDetailRow = useCallback((index: number) => {
    setDetails((rows) => {
      const target = rows[index];
      if (target?.id && target.id > 0) {
        deletedDetailIdsRef.current = [...deletedDetailIdsRef.current, target.id];
      }
      const next = rows.filter((_, rowIndex) => rowIndex !== index);
      return next.length ? next : [createEmptyDetailRow()];
    });
    setSelectedRowIndex((current) => Math.max(0, current > index ? current - 1 : current));
  }, []);

  const updateDetailRow = useCallback((index: number, patch: PharmTransferDetailPatch) => {
    setDetails((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
    );
  }, []);

  const navState = useMemo(() => {
    const current = loadedRecordIdRef.current ?? header.id;
    const index = current != null ? navIds.findIndex((id) => id === current) : -1;
    return {
      atFirst: index <= 0,
      atLast: index < 0 || index >= navIds.length - 1,
      hasRecords: navIds.length > 0,
    };
  }, [header.id, navIds]);

  return {
    header,
    updateHeader,
    details,
    setDetails,
    mode,
    selectedRowIndex,
    setSelectedRowIndex,
    loading,
    saving,
    isEditable,
    isPending,
    searchOpen,
    setSearchOpen,
    navState,
    handleNew,
    handleEdit,
    handleSave,
    handleDelete,
    handleRefresh,
    navigate,
    loadRecord,
    runSearch,
    addDetailRow,
    removeDetailRow,
    updateDetailRow,
    refreshNavIds,
    filterDetailsWithItemCode,
  };
}
