"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Eraser, FileSpreadsheet, ListChecks, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { getStors } from "@/lib/api-client";
import {
  flattenPharmReciveExcelValidationErrors,
  formatPharmReciveExcelFieldError,
} from "@/lib/pharm-recive-excel-validate";
import { completePharmReciveExcelTask } from "@/lib/pharm-recive-excel-complete-task";
import { downloadPharmReciveExcelErrors } from "@/lib/pharm-recive-excel-template";
import {
  importPharmReciveExcelFile,
  mapPharmReciveExcelRowToDetail,
} from "@/lib/pharm-recive-excel-import";
import {
  buildPharmReciveExcelImportHeaderFromContext,
  clearPharmReciveExcelImportTransferPayload,
  PHARM_RECIVE_EXCEL_IMPORT_RETURN_QUERY,
  readPharmReciveExcelImportContext,
  storePharmReciveExcelImportTransfer,
  type PharmReciveExcelImportContext,
} from "@/lib/pharm-recive-excel-transfer";
import {
  formatStorDisplayName,
  getDefaultMovementStoreId,
} from "@/lib/purchase-stores";
import { cn } from "@/lib/utils";
import { PageGuard } from "@/components/permissions/page-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { MovmentLookupItem } from "@/types/movment";
import type { StorItem } from "@/types/stor";
import {
  PHARM_RECIVE_EXCEL_VALIDATION_SUMMARY,
  type PharmReciveExcelPreviewRowValidated,
  type PharmReciveExcelPreviewValidated,
  type PharmReciveExcelProcessSummaryEntry,
} from "@/types/pharm-recive-excel";

const PREVIEW_PAGE_SIZE = 100;
const ERROR_BANNER_LIMIT = 40;

/** Grid columns — extend this list when adding post-import processing fields. */
export const PHARM_RECIVE_EXCEL_PREVIEW_COLUMNS = [
  { key: "excelRowNumber", title: "Row" },
  { key: "itmId", title: "Code" },
  { key: "itmNameAr", title: "Arabic Name" },
  { key: "itmNameEn", title: "English Name" },
  { key: "qnty", title: "Quantity" },
] as const;

export const PHARM_RECIVE_EXCEL_PROCESSED_COLUMNS = [
  ...PHARM_RECIVE_EXCEL_PREVIEW_COLUMNS,
  { key: "batchNo", title: "Batch" },
  { key: "expDate", title: "ExpDate" },
] as const;

type PreviewColumnKey =
  | (typeof PHARM_RECIVE_EXCEL_PREVIEW_COLUMNS)[number]["key"]
  | (typeof PHARM_RECIVE_EXCEL_PROCESSED_COLUMNS)[number]["key"];

function formatExpDateDisplay(value: string | undefined): string {
  if (!value?.trim()) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  return value.trim();
}

function cellText(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

function rowErrorFields(row: PharmReciveExcelPreviewRowValidated): Set<string> {
  return new Set(row.errors.map((error) => error.field));
}

function selectedRowNumberSet(
  rows: ReadonlyArray<{ excelRowNumber: number }>
): Set<number> {
  const next = new Set<number>();
  for (const row of rows) next.add(row.excelRowNumber);
  return next;
}

function countSelectedRows(
  rows: ReadonlyArray<{ excelRowNumber: number }>,
  selected: ReadonlySet<number>
): number {
  let count = 0;
  for (const row of rows) {
    if (selected.has(row.excelRowNumber)) count += 1;
  }
  return count;
}

function RowErrorTooltip({
  row,
  children,
}: {
  row: PharmReciveExcelPreviewRowValidated;
  children: React.ReactNode;
}) {
  if (row.isValid) return <>{children}</>;
  return (
    <div
      title={row.errors
        .map((error) => formatPharmReciveExcelFieldError(row, error))
        .join("\n")}
    >
      {children}
    </div>
  );
}

function movementDisplayName(movement: MovmentLookupItem | null | undefined): string {
  if (!movement) return "—";
  const name = movement.movChiledName?.trim();
  if (name) return name;
  if (movement.movChiledId != null) return `#${movement.movChiledId}`;
  return `#${movement.id}`;
}

function formatHeaderDate(value: string | undefined): string {
  if (!value?.trim()) return "—";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  return value.trim();
}

function displayErrorItemName(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "—" ? trimmed : "—";
}

export function PharmReciveExcelImportPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PharmReciveExcelPreviewValidated | null>(
    null
  );
  const [itemByCode, setItemByCode] = useState<Map<string, ItemCatalogItem>>(
    () => new Map()
  );
  const [selectedRowNumbers, setSelectedRowNumbers] = useState<Set<number>>(
    () => new Set()
  );
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loadProgress, setLoadProgress] = useState<{
    percent: number;
    label: string;
  } | null>(null);
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [completingTask, setCompletingTask] = useState(false);
  const [taskProgress, setTaskProgress] = useState<{
    percent: number;
    label: string;
  } | null>(null);
  const [processSummary, setProcessSummary] = useState<{
    success: PharmReciveExcelProcessSummaryEntry[];
    errors: PharmReciveExcelProcessSummaryEntry[];
  } | null>(null);
  const [importContext] = useState<PharmReciveExcelImportContext | null>(() =>
    readPharmReciveExcelImportContext()
  );
  const [stores, setStores] = useState<StorItem[]>([]);

  const selectedMovement = importContext?.movement ?? null;
  const movStor =
    importContext?.movStor?.trim() ||
    getDefaultMovementStoreId(selectedMovement);
  const movDate = importContext?.movDate ?? "";
  const fathId = importContext?.fathId ?? null;
  const hasMovementContext = Boolean(selectedMovement && movStor);
  const storeDisplayName = useMemo(() => {
    if (!movStor) return "";
    const store = stores.find((entry) => String(entry.id) === movStor.trim());
    return store ? formatStorDisplayName(store) || movStor : movStor;
  }, [movStor, stores]);

  const previewColumns = preview?.processComplete
    ? PHARM_RECIVE_EXCEL_PROCESSED_COLUMNS
    : PHARM_RECIVE_EXCEL_PREVIEW_COLUMNS;

  const itemByCodeRef = useRef(itemByCode);
  itemByCodeRef.current = itemByCode;
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetExcelImportSession() {
    setFile(null);
    setPreview(null);
    setItemByCode(new Map());
    setSelectedRowNumbers(new Set());
    setLoadProgress(null);
    setTaskProgress(null);
    setProcessSummary(null);
    setShowInvalidOnly(false);
    setPreviewPage(1);
    setLoadingPreview(false);
    setCompletingTask(false);
    setConfirming(false);
    clearPharmReciveExcelImportTransferPayload();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleClearExcel() {
    if (loadingPreview || completingTask || confirming) return;
    resetExcelImportSession();
    toast.message("Excel import cleared. You can select another file.");
  }

  useEffect(() => {
    if (!token) return;
    void getStors(token)
      .then((items) => setStores(items))
      .catch(() => setStores([]));
  }, [token]);

  async function handleLoadExcel() {
    if (!token) {
      toast.error("Sign in to load an Excel file.");
      return;
    }
    if (!file) {
      toast.error("Choose an Excel file first.");
      return;
    }

    setLoadingPreview(true);
    setLoadProgress({ percent: 4, label: "Starting…" });
    try {
      const result = await importPharmReciveExcelFile(file, token, (progress) => {
        setLoadProgress(progress);
      });

      setItemByCode(result.itemByCode);
      setPreview(result.preview);
      setSelectedRowNumbers(
        selectedRowNumberSet(result.preview.rows.filter((row) => row.isValid))
      );
      setPreviewPage(1);
      setShowInvalidOnly(false);
      setProcessSummary(null);

      if (result.validCount === 0) {
        toast.error(PHARM_RECIVE_EXCEL_VALIDATION_SUMMARY);
        if (result.errorMessages.length > 0) {
          toast.error(result.errorMessages.join("\n"));
        }
        return;
      }

      if (result.invalidCount === 0) {
        toast.success(
          result.validCount === 1
            ? "Loaded 1 valid Excel row."
            : `Loaded ${result.validCount} valid Excel rows.`
        );
      } else {
        toast.warning(
          `Loaded ${result.validCount} valid row${result.validCount === 1 ? "" : "s"}; ${result.invalidCount} failed validation.`
        );
        if (result.errorMessages.length > 0) {
          toast.error(result.errorMessages.slice(0, 5).join("\n"));
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The Excel file could not be read."
      );
      setPreview(null);
      setSelectedRowNumbers(new Set());
    } finally {
      setLoadingPreview(false);
      setLoadProgress(null);
    }
  }

  async function handleCompleteTask() {
    if (!token) {
      toast.error("Sign in to complete the task.");
      return;
    }
    if (!preview) {
      toast.error("Load an Excel file first.");
      return;
    }
    if (preview.rows.filter((row) => row.isValid).length === 0) {
      toast.error("No valid Excel rows to process.");
      return;
    }
    if (!hasMovementContext) {
      toast.error("Please select a movement from PharmReceive before importing Excel.");
      return;
    }
    if (!movDate.trim()) {
      toast.error("Date is required.");
      return;
    }
    if (completingTask || loadingPreview) return;

    setCompletingTask(true);
    setTaskProgress({ percent: 4, label: "Starting…" });
    try {
      const result = await completePharmReciveExcelTask(
        preview,
        itemByCodeRef.current,
        movStor,
        token,
        (progress) => setTaskProgress(progress)
      );

      setPreview(result.preview);
      setProcessSummary(result.summary);
      setItemByCode(new Map(itemByCodeRef.current));
      setSelectedRowNumbers(
        selectedRowNumberSet(result.preview.rows.filter((row) => row.isValid))
      );
      setPreviewPage(1);
      setShowInvalidOnly(false);

      if (result.summary.errors.length === 0) {
        toast.success(
          result.summary.success.length === 1
            ? "Processed 1 Excel item."
            : `Processed ${result.summary.success.length} Excel items.`
        );
      } else if (result.summary.success.length === 0) {
        toast.error(
          result.summary.errors.length === 1
            ? "1 item failed. See Items With Errors."
            : `${result.summary.errors.length} items failed. See Items With Errors.`
        );
      } else {
        toast.warning(
          `Processed ${result.summary.success.length} item${result.summary.success.length === 1 ? "" : "s"}; ${result.summary.errors.length} moved to Items With Errors.`
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Complete Task could not finish."
      );
    } finally {
      setCompletingTask(false);
      setTaskProgress(null);
    }
  }

  function handleExportErrorItems() {
    const errors = processSummary?.errors ?? [];
    if (errors.length === 0) return;
    try {
      downloadPharmReciveExcelErrors(errors);
      toast.success(
        errors.length === 1
          ? "Exported 1 error item."
          : `Exported ${errors.length} error items.`
      );
    } catch {
      toast.error("Could not export the error items.");
    }
  }

  function handleDeletePreviewRow(excelRowNumber: number) {
    setPreview((current) => {
      if (!current) return current;
      const rows = current.rows.filter(
        (row) => row.excelRowNumber !== excelRowNumber
      );
      return {
        ...current,
        rows,
        rowCount: rows.length,
        isValid: rows.every((row) => row.isValid),
      };
    });
    setSelectedRowNumbers((current) => {
      if (!current.has(excelRowNumber)) return current;
      const next = new Set(current);
      next.delete(excelRowNumber);
      return next;
    });
  }

  function handleToggleRowSelected(excelRowNumber: number, selected: boolean) {
    setSelectedRowNumbers((current) => {
      const next = new Set(current);
      if (selected) next.add(excelRowNumber);
      else next.delete(excelRowNumber);
      return next;
    });
  }

  function handleConfirm() {
    if (!preview) return;

    if (!hasMovementContext) {
      toast.error("Please select a movement from PharmReceive before importing Excel.");
      return;
    }
    if (!movDate.trim()) {
      toast.error("Date is required.");
      return;
    }
    if (!preview.processComplete) {
      toast.error("Run Complete Task before confirming imported rows.");
      return;
    }

    const selectedRows = preview.rows.filter((row) =>
      selectedRowNumbers.has(row.excelRowNumber)
    );
    if (selectedRows.length === 0) {
      toast.error("Please select at least one row to confirm.");
      return;
    }
    if (!selectedRows.every((row) => row.isValid)) {
      toast.error(PHARM_RECIVE_EXCEL_VALIDATION_SUMMARY);
      return;
    }
    const missingAllocation = selectedRows.some(
      (row) => !row.batchNo?.trim() || !row.expDate?.trim()
    );
    if (missingAllocation) {
      toast.error(
        "Selected rows are missing batch or expiry from stock allocation. Run Complete Task again."
      );
      return;
    }

    setConfirming(true);
    try {
      const details = selectedRows.map((row) =>
        mapPharmReciveExcelRowToDetail(row, itemByCodeRef.current)
      );
      storePharmReciveExcelImportTransfer({
        details,
        header: importContext
          ? buildPharmReciveExcelImportHeaderFromContext(importContext)
          : undefined,
      });
      toast.success(
        details.length === 1
          ? "1 row sent to Pharmacy Receiving."
          : `${details.length} rows sent to Pharmacy Receiving.`
      );
      router.push(
        `/dashboard/transactions/pharm-recive?${PHARM_RECIVE_EXCEL_IMPORT_RETURN_QUERY}=1`
      );
    } finally {
      setConfirming(false);
    }
  }

  function handleCancel() {
    router.push("/dashboard/transactions/pharm-recive");
  }

  const validationErrors = preview
    ? flattenPharmReciveExcelValidationErrors(preview)
    : [];
  const invalidRowCount = preview
    ? preview.rows.filter((row) => !row.isValid).length
    : 0;
  const validRowCount = preview ? preview.rowCount - invalidRowCount : 0;
  const selectedCount = preview
    ? countSelectedRows(preview.rows, selectedRowNumbers)
    : 0;
  const allRowsSelected =
    preview != null && preview.rowCount > 0 && selectedCount === preview.rowCount;
  const someRowsSelected = selectedCount > 0 && !allRowsSelected;
  const selectedRowsValid =
    preview != null &&
    selectedCount > 0 &&
    preview.rows.every(
      (row) => !selectedRowNumbers.has(row.excelRowNumber) || row.isValid
    );
  const canConfirm =
    hasMovementContext &&
    selectedRowsValid &&
    selectedCount > 0 &&
    Boolean(preview?.processComplete) &&
    Boolean(movDate.trim()) &&
    (preview?.rows.length ?? 0) > 0;

  const hasExcelSessionData = Boolean(preview || file || processSummary);

  const visibleRows = preview
    ? showInvalidOnly
      ? preview.rows.filter((row) => !row.isValid)
      : preview.rows
    : [];
  const previewPageCount = Math.max(
    1,
    Math.ceil(visibleRows.length / PREVIEW_PAGE_SIZE)
  );
  const pagedRows = useMemo(() => {
    const start = (previewPage - 1) * PREVIEW_PAGE_SIZE;
    return visibleRows.slice(start, start + PREVIEW_PAGE_SIZE);
  }, [previewPage, visibleRows]);

  useEffect(() => {
    if (previewPage > previewPageCount) setPreviewPage(previewPageCount);
  }, [previewPage, previewPageCount]);

  if (!sessionReady) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-3xl" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!hasMovementContext) {
    return (
      <PageGuard permission={null}>
        <div className="min-w-0 max-w-full space-y-4">
          <h2 className="text-lg font-semibold">Pharmacy Receiving Excel Import</h2>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="text-destructive text-sm">
                Please select a movement from PharmReceive before importing Excel.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/transactions/pharm-recive")}
              >
                Back to Pharmacy Receiving
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageGuard>
    );
  }

  return (
    <PageGuard permission={null}>
      <div className="min-w-0 max-w-full space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Pharmacy Receiving Excel Import</h2>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={confirming || loadingPreview || completingTask}
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-4">
              <Label className="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end">
                Movement
              </Label>
              <p className="text-sm font-medium">{movementDisplayName(selectedMovement)}</p>

              <Label className="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end">
                Serial
              </Label>
              <p className="text-sm font-medium tabular-nums">
                {fathId != null ? fathId : "—"}
              </p>

              <Label className="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end">
                Date
              </Label>
              <p className="text-sm font-medium">{formatHeaderDate(movDate)}</p>

              <Label className="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end">
                Store
              </Label>
              <p className="text-sm font-medium">
                {importContext?.storeLabel?.trim() || storeDisplayName || movStor || "—"}
              </p>
            </div>

            <div className="grid max-w-full grid-cols-1 items-center gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
              <Label
                htmlFor="pharm-recive-import-excel-file"
                className="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
              >
                Load Excel File
              </Label>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    id="pharm-recive-import-excel-file"
                    type="file"
                    accept=".xlsx,.xlsm"
                    className="max-w-sm min-w-[12rem] flex-1"
                    disabled={!token || loadingPreview || completingTask}
                    onChange={(event) => {
                      setFile(event.target.files?.[0] ?? null);
                      setPreview(null);
                      setItemByCode(new Map());
                      setSelectedRowNumbers(new Set());
                      setLoadProgress(null);
                      setTaskProgress(null);
                      setProcessSummary(null);
                      setPreviewPage(1);
                      setShowInvalidOnly(false);
                    }}
                  />
                  <Button
                    type="button"
                    disabled={!token || !file || loadingPreview || completingTask}
                    onClick={() => void handleLoadExcel()}
                  >
                    {loadingPreview ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {loadingPreview ? "Reading…" : "Load Excel"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      !token ||
                      !preview ||
                      loadingPreview ||
                      completingTask ||
                      preview.processComplete ||
                      preview.rows.filter((row) => row.isValid).length === 0 ||
                      !hasMovementContext
                    }
                    onClick={() => void handleCompleteTask()}
                  >
                    {completingTask ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ListChecks className="size-4" />
                    )}
                    {completingTask ? "Processing…" : "Complete Task"}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  disabled={
                    !hasExcelSessionData ||
                    loadingPreview ||
                    completingTask ||
                    confirming
                  }
                  onClick={handleClearExcel}
                >
                  <Eraser className="size-4" />
                  Clear Excel
                </Button>
              </div>
            </div>
            {!movDate.trim() ? (
              <p className="text-destructive text-xs sm:pl-[calc(7rem+1rem)]">
                Date is required. Set it on the Pharmacy Receiving page before importing Excel.
              </p>
            ) : null}
            {loadingPreview || loadProgress ? (
              <div className="space-y-1 sm:pl-[calc(7rem+1rem)]">
                <div
                  className="bg-muted h-2 w-full overflow-hidden rounded-full"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={loadProgress?.percent ?? 0}
                  aria-label="Load Excel progress"
                >
                  <div
                    className="bg-primary h-full rounded-full transition-[width] duration-200"
                    style={{ width: `${loadProgress?.percent ?? 8}%` }}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  {loadProgress?.label ?? "Reading…"}
                  {loadProgress != null ? ` — ${loadProgress.percent}%` : ""}
                </p>
              </div>
            ) : null}
            {completingTask || taskProgress ? (
              <div className="space-y-1 sm:pl-[calc(7rem+1rem)]">
                <div
                  className="bg-muted h-2 w-full overflow-hidden rounded-full"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={taskProgress?.percent ?? 0}
                  aria-label="Complete Task progress"
                >
                  <div
                    className="bg-primary h-full rounded-full transition-[width] duration-200"
                    style={{ width: `${taskProgress?.percent ?? 8}%` }}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  {taskProgress?.label ?? "Processing…"}
                  {taskProgress != null ? ` — ${taskProgress.percent}%` : ""}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardContent className="min-w-0 overflow-hidden pt-6">
            {!preview ? (
              <p className="text-muted-foreground text-sm">
                Choose a PharmRecive template file and click Load Excel. Valid rows
                can be confirmed back to the main Pharmacy Receiving page.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm">
                    {preview.fileName} — {preview.rowCount} row
                    {preview.rowCount === 1 ? "" : "s"}
                    {preview.rowCount === 0
                      ? ""
                      : preview.isValid
                        ? " — all valid"
                        : ` — ${validRowCount} valid, ${invalidRowCount} failed`}
                    {preview.rowCount > 0 ? ` — ${selectedCount} selected` : ""}
                  </p>
                  {invalidRowCount > 0 && !preview.processComplete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={showInvalidOnly ? "default" : "outline"}
                      onClick={() => {
                        setShowInvalidOnly((current) => !current);
                        setPreviewPage(1);
                      }}
                    >
                      {showInvalidOnly ? "Show all rows" : "Show failed rows"}
                    </Button>
                  ) : null}
                </div>

                {!preview.processComplete && !preview.isValid ? (
                  <div className="space-y-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
                    <p className="font-medium">{PHARM_RECIVE_EXCEL_VALIDATION_SUMMARY}</p>
                    <ul className="space-y-2">
                      {preview.rows.flatMap((row) =>
                        row.errors.map((error) => ({ row, error }))
                      )
                        .slice(0, ERROR_BANNER_LIMIT)
                        .map(({ row, error }) => (
                          <li
                            key={`${row.excelRowNumber}-${error.field}-${error.message}`}
                            className="whitespace-pre-wrap"
                          >
                            {formatPharmReciveExcelFieldError(row, error)}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}

                {processSummary ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2 rounded-lg border px-4 py-3">
                      <p className="text-sm font-semibold">Successfully Processed</p>
                      {processSummary.success.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No successful items.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Excel Quantity</TableHead>
                                <TableHead>Result</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {processSummary.success.map((entry) => (
                                <TableRow key={`ok-${entry.code}-${entry.excelQuantity}`}>
                                  <TableCell>{entry.code}</TableCell>
                                  <TableCell>{entry.excelQuantity}</TableCell>
                                  <TableCell>{entry.result}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-900">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">Items With Errors</p>
                        {processSummary.errors.length > 0 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-red-300 bg-white text-red-900 hover:bg-red-100"
                            onClick={handleExportErrorItems}
                          >
                            <FileSpreadsheet className="size-4" />
                            Export
                          </Button>
                        ) : null}
                      </div>
                      {processSummary.errors.length === 0 ? (
                        <p className="text-sm">No error items.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Arabic Name</TableHead>
                                <TableHead>English Name</TableHead>
                                <TableHead>Error</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {processSummary.errors.map((entry, index) => (
                                <TableRow
                                  key={`err-${entry.sourceExcelRowNumber ?? index}-${entry.code}-${entry.result}`}
                                >
                                  <TableCell>{entry.code}</TableCell>
                                  <TableCell>{displayErrorItemName(entry.itmNameAr)}</TableCell>
                                  <TableCell>{displayErrorItemName(entry.itmNameEn)}</TableCell>
                                  <TableCell>{entry.result}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {preview.rows.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {preview.processComplete
                      ? "No successful rows remain. Correct the failed items or load another Excel file."
                      : "All rows were removed. Choose a file and click Load Excel again."}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={allRowsSelected}
                              disabled={preview.rowCount === 0}
                              aria-label="Select all rows"
                              ref={(element) => {
                                if (element) {
                                  element.indeterminate = someRowsSelected;
                                }
                              }}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setSelectedRowNumbers(
                                    selectedRowNumberSet(preview.rows)
                                  );
                                } else {
                                  setSelectedRowNumbers(new Set());
                                }
                              }}
                            />
                          </TableHead>
                          {previewColumns.map((column) => (
                            <TableHead key={column.key}>{column.title}</TableHead>
                          ))}
                          <TableHead className="w-12" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedRows.map((row) => {
                          const errorFields = rowErrorFields(row);
                          return (
                            <TableRow
                              key={row.excelRowNumber}
                              className={cn(!row.isValid && "bg-red-50/80")}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedRowNumbers.has(row.excelRowNumber)}
                                  aria-label={`Select row ${row.excelRowNumber}`}
                                  onChange={(event) =>
                                    handleToggleRowSelected(
                                      row.excelRowNumber,
                                      event.target.checked
                                    )
                                  }
                                />
                              </TableCell>
                              {previewColumns.map((column) => {
                                const key = column.key as PreviewColumnKey;
                                const rawValue = row[key as keyof PharmReciveExcelPreviewRowValidated];
                                const value =
                                  column.key === "expDate"
                                    ? formatExpDateDisplay(
                                        typeof rawValue === "string" ? rawValue : undefined
                                      )
                                    : rawValue;
                                return (
                                  <TableCell
                                    key={column.key}
                                    className={cn(
                                      errorFields.has(column.key) &&
                                        "text-destructive font-medium"
                                    )}
                                  >
                                    <RowErrorTooltip row={row}>
                                      {cellText(value as string | number | null | undefined)}
                                    </RowErrorTooltip>
                                  </TableCell>
                                );
                              })}
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  aria-label={`Delete row ${row.excelRowNumber}`}
                                  onClick={() =>
                                    handleDeletePreviewRow(row.excelRowNumber)
                                  }
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {previewPageCount > 1 ? (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={previewPage <= 1}
                      onClick={() => setPreviewPage((page) => Math.max(1, page - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-muted-foreground text-sm">
                      Page {previewPage} of {previewPageCount}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={previewPage >= previewPageCount}
                      onClick={() =>
                        setPreviewPage((page) =>
                          Math.min(previewPageCount, page + 1)
                        )
                      }
                    >
                      Next
                    </Button>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  {!preview.processComplete ? (
                    <p className="text-destructive text-sm">
                      Run Complete Task before confirming imported rows.
                    </p>
                  ) : preview.processComplete && preview.rows.length === 0 ? (
                    <p className="text-destructive text-sm">
                      No successful rows to confirm. See Items With Errors.
                    </p>
                  ) : !selectedRowsValid ? (
                    <p className="text-destructive text-sm">
                      Confirm is blocked until all selected rows are valid.
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {canConfirm
                        ? `${selectedCount} selected row${
                            selectedCount === 1 ? "" : "s"
                          } ready to send to the main page.`
                        : "Select at least one valid row to confirm."}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={confirming || loadingPreview || completingTask}
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={
                        confirming ||
                        loadingPreview ||
                        completingTask ||
                        preview.rowCount === 0 ||
                        !canConfirm
                      }
                      onClick={handleConfirm}
                    >
                      {confirming ? "Confirming…" : "Confirm"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
