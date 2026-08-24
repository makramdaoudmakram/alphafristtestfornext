"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError, getStors, previewPurTransDExcel } from "@/lib/api-client";
import { enrichPurTransDExcelPreview } from "@/lib/purtransd-excel-enrich";
import {
  flattenPurTransDExcelValidationErrors,
  formatPurTransDExcelFieldError,
  formatPurTransDExcelRowErrorBlock,
  validatePurTransDExcelPreview,
  validatePurTransDExcelPreviewRow,
} from "@/lib/purtransd-excel-validate";
import {
  formatPurchaseExcelImportFailureMessage,
  importPurTransDExcelPurchase,
  previewToImportBase,
} from "@/lib/purtransd-excel-import";
import {
  formatStorDisplayName,
  getDefaultMovementStoreId,
} from "@/lib/purchase-stores";
import { cn } from "@/lib/utils";
import { createUnitService } from "@/services/unit.service";
import { MovementLookup } from "@/components/movement/MovementLookup";
import {
  isExcelImportEditableField,
  PurchaseExcelImportEditableCell,
  type ExcelImportEditableField,
} from "@/components/purchase/PurchaseExcelImportEditableCell";
import { PageGuard } from "@/components/permissions/page-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormFieldInline,
  FormFieldInlineWrap,
} from "@/components/ui/form-field-inline";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MovmentLookupItem } from "@/types/movment";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { StorItem } from "@/types/stor";
import type { UnitItem } from "@/types/unit";
import {
  PURTRANS_D_EXCEL_VALIDATION_SUMMARY,
  type PurTransDExcelPreviewRowValidated,
  type PurTransDExcelPreviewValidated,
} from "@/types/purchase";

const PURCHASE_MOV_PARENT_ID = 1;
const PREVIEW_PAGE_SIZE = 100;
const ERROR_BANNER_LIMIT = 40;

const PREVIEW_COLUMNS = [
  { key: "excelRowNumber", title: "Row" },
  { key: "itmId", title: "Item Code" },
  { key: "itmNameAr", title: "Arabic Name" },
  { key: "itmNameEn", title: "English Name" },
  { key: "qnty", title: "Quantity" },
  { key: "bonus", title: "Bonus" },
  { key: "unitId", title: "Unit" },
  { key: "itmPurPrice", title: "Purchase Price" },
  { key: "itmSell", title: "Sales Price" },
  { key: "itmTaxPrice", title: "Tax Price" },
  { key: "itmExtraDis", title: "Extra Discount" },
  { key: "itmDisPer", title: "Discount %" },
  { key: "itmDisMon", title: "Discount Amount" },
  { key: "expDate", title: "Exp Date" },
  { key: "stoId", title: "Store" },
] as const;

function cellText(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

function rowErrorFields(row: PurTransDExcelPreviewRowValidated): Set<string> {
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

function mergeValidatedPreviewRows(
  current: PurTransDExcelPreviewValidated,
  updatedRows: PurTransDExcelPreviewRowValidated[]
): PurTransDExcelPreviewValidated {
  const byNumber = new Map(
    updatedRows.map((row) => [row.excelRowNumber, row])
  );
  const rows = current.rows.map(
    (row) => byNumber.get(row.excelRowNumber) ?? row
  );
  return {
    ...current,
    rows,
    rowCount: rows.length,
    isValid: rows.length > 0 && rows.every((row) => row.isValid),
  };
}

function PreviewRowErrors({
  row,
}: {
  row: PurTransDExcelPreviewRowValidated;
}) {
  if (row.isValid) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="space-y-2 whitespace-pre-wrap text-xs leading-5">
      {row.errors.map((error) => (
        <p key={`${error.field}-${error.message}`}>
          {formatPurTransDExcelRowErrorBlock(row, error)}
        </p>
      ))}
    </div>
  );
}

export function PurchaseExcelImportPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [movement, setMovement] = useState<MovmentLookupItem | null>(null);
  const [invoiceId, setInvoiceId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PurTransDExcelPreviewValidated | null>(
    null
  );
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadProgress, setLoadProgress] = useState<{
    percent: number;
    label: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [itemByCode, setItemByCode] = useState<Map<string, ItemCatalogItem>>(
    () => new Map()
  );
  const [previewPage, setPreviewPage] = useState(1);
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);
  const [selectedRowNumbers, setSelectedRowNumbers] = useState<Set<number>>(
    () => new Set()
  );
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [stores, setStores] = useState<StorItem[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const previewRef = useRef<PurTransDExcelPreviewValidated | null>(null);
  const itemByCodeRef = useRef(itemByCode);
  previewRef.current = preview;
  itemByCodeRef.current = itemByCode;

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
      const parsed = await previewPurTransDExcel(token, file, {
        onUploadProgress: (percent) => {
          setLoadProgress({
            percent: Math.round(percent * 0.4),
            label: "Uploading file…",
          });
        },
        onReading: () => {
          setLoadProgress({ percent: 42, label: "Reading Excel…" });
        },
      });
      setLoadProgress({ percent: 45, label: "Loading item data…" });

      const { preview: enriched, itemByCode } = await enrichPurTransDExcelPreview(
        parsed,
        token,
        {
          onProgress: (done, total, phase) => {
            const fraction = total <= 0 ? 1 : done / total;
            if (phase === "catalog") {
              setLoadProgress({
                percent: Math.round(45 + fraction * 20),
                label:
                  total <= 0
                    ? "Loading item data…"
                    : `Loading items… ${done} of ${total}`,
              });
              return;
            }
            setLoadProgress({
              percent: Math.round(65 + fraction * 23),
              label:
                total <= 0
                  ? "Loading item data…"
                  : `Loading item data… ${done} of ${total}`,
            });
          },
        }
      );
      setLoadProgress({ percent: 90, label: "Validating rows…" });
      const validated = await validatePurTransDExcelPreview(enriched, token, {
        itemByCode,
        movementStoId: getDefaultMovementStoreId(movement),
      });
      setLoadProgress({ percent: 100, label: "Done" });
      setItemByCode(itemByCode);
      setPreview(validated);
      setSelectedRowNumbers(selectedRowNumberSet(validated.rows));
      setPreviewPage(1);
      setShowInvalidOnly(false);

      if (validated.isValid) {
        toast.success(
          validated.rowCount === 1
            ? "Loaded 1 valid Excel row."
            : `Loaded ${validated.rowCount} valid Excel rows.`
        );
      } else {
        const errorCount = flattenPurTransDExcelValidationErrors(validated).length;
        toast.warning(
          errorCount === 1
            ? "Loaded 1 Excel row with a validation error."
            : `Loaded ${validated.rowCount} Excel rows with ${errorCount} validation errors.`
        );
      }
    } catch (error) {
      setPreview(null);
      setItemByCode(new Map());
      setSelectedRowNumbers(new Set());
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "The Excel file could not be read."
      );
    } finally {
      setLoadingPreview(false);
      setLoadProgress(null);
    }
  }

  function handleDeletePreviewRow(excelRowNumber: number) {
    setPreview((current) => {
      if (!current) return current;
      const rows = current.rows.filter(
        (row) => row.excelRowNumber !== excelRowNumber
      );
      if (rows.length === current.rows.length) return current;
      return {
        ...current,
        rows,
        rowCount: rows.length,
        isValid: rows.length > 0 && rows.every((row) => row.isValid),
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
      const isSelected = current.has(excelRowNumber);
      if (selected === isSelected) return current;
      const next = new Set(current);
      if (selected) next.add(excelRowNumber);
      else next.delete(excelRowNumber);
      return next;
    });
  }

  function handleSelectAll(selected: boolean) {
    if (!preview) return;
    setSelectedRowNumbers(
      selected ? selectedRowNumberSet(preview.rows) : new Set()
    );
  }

  function handleChangePreviewField(
    excelRowNumber: number,
    field: ExcelImportEditableField,
    value: string
  ) {
    const catalog = itemByCodeRef.current;
    const movementStoId = getDefaultMovementStoreId(movement);
    setPreview((current) => {
      if (!current) return current;
      let changed = false;
      const rows = current.rows.map((row) => {
        if (row.excelRowNumber !== excelRowNumber) return row;
        if (row[field] === value) return row;
        changed = true;
        return validatePurTransDExcelPreviewRow(
          { ...row, [field]: value },
          catalog,
          movementStoId
        );
      });
      if (!changed) return current;
      return {
        ...current,
        rows,
        isValid: rows.length > 0 && rows.every((row) => row.isValid),
      };
    });
  }

  async function handleImportSave() {
    if (!token) {
      toast.error("Sign in to import.");
      return;
    }
    if (!preview || !movement) {
      return;
    }
    if (!invoiceId.trim()) {
      toast.error("Invoice ID is required.");
      return;
    }
    if (!invoiceDate.trim()) {
      toast.error("Invoice date is required.");
      return;
    }

    const selectedRows = preview.rows.filter((row) =>
      selectedRowNumbers.has(row.excelRowNumber)
    );
    if (selectedRows.length === 0) {
      toast.error("Please select at least one row to import.");
      return;
    }

    const selectedPreview: PurTransDExcelPreviewValidated = {
      ...preview,
      rows: selectedRows,
      rowCount: selectedRows.length,
      isValid: selectedRows.every((row) => row.isValid),
    };
    if (!selectedPreview.isValid) {
      toast.error(PURTRANS_D_EXCEL_VALIDATION_SUMMARY);
      return;
    }

    setImporting(true);
    try {
      const revalidated = await validatePurTransDExcelPreview(
        previewToImportBase(selectedPreview),
        token,
        {
          itemByCode: itemByCodeRef.current,
          movementStoId: getDefaultMovementStoreId(movement),
        }
      );
      setPreview((current) =>
        current ? mergeValidatedPreviewRows(current, revalidated.rows) : current
      );
      if (!revalidated.isValid) {
        toast.error(PURTRANS_D_EXCEL_VALIDATION_SUMMARY);
        return;
      }

      const saved = await importPurTransDExcelPurchase(token, {
        movement,
        invoiceId,
        invoiceDate,
        preview: revalidated,
        itemByCode: itemByCodeRef.current,
      });

      const label =
        saved.header.pthId != null
          ? `#${saved.header.pthId}`
          : saved.header.id != null
            ? `ID ${saved.header.id}`
            : "";

      toast.success(
        label
          ? `Purchase ${label} imported from Excel.`
          : "Purchase imported from Excel."
      );
      router.push(
        saved.header.id != null && saved.header.id > 0
          ? `/dashboard/transactions/purchase?id=${saved.header.id}`
          : "/dashboard/transactions/purchase"
      );
    } catch (error) {
      toast.error(formatPurchaseExcelImportFailureMessage(error));
    } finally {
      setImporting(false);
    }
  }

  const validationErrors = preview
    ? flattenPurTransDExcelValidationErrors(preview)
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
  const canImport =
    selectedRowsValid &&
    movement != null &&
    movement.movChiledId != null &&
    invoiceId.trim().length > 0 &&
    invoiceDate.trim().length > 0;
  const visibleRows = preview
    ? showInvalidOnly
      ? preview.rows.filter((row) => !row.isValid)
      : preview.rows
    : [];
  const previewPageCount = Math.max(
    1,
    Math.ceil(visibleRows.length / PREVIEW_PAGE_SIZE)
  );
  const currentPreviewPage = Math.min(previewPage, previewPageCount);
  const pagedRows = visibleRows.slice(
    (currentPreviewPage - 1) * PREVIEW_PAGE_SIZE,
    currentPreviewPage * PREVIEW_PAGE_SIZE
  );
  const storeOptions = useMemo(
    () =>
      stores
        .map((store) => ({
          value: String(store.id),
          label: formatStorDisplayName(store),
        }))
        .filter((option) => option.label.length > 0),
    [stores]
  );

  useEffect(() => {
    if (!token) {
      setUnits([]);
      setStores([]);
      return;
    }

    let cancelled = false;
    setUnitsLoading(true);
    setStoresLoading(true);

    void createUnitService(token)
      .listUnits()
      .then(({ units: loaded }) => {
        if (!cancelled) setUnits(loaded);
      })
      .catch((error) => {
        if (!cancelled) {
          setUnits([]);
          toast.error(
            error instanceof Error ? error.message : "Could not load units."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setUnitsLoading(false);
      });

    void getStors(token)
      .then((loaded) => {
        if (!cancelled) setStores(loaded);
      })
      .catch((error) => {
        if (!cancelled) {
          setStores([]);
          toast.error(
            error instanceof Error ? error.message : "Could not load stores."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setStoresLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const current = previewRef.current;
    if (!token || !current || loadingPreview || importing) return;

    let cancelled = false;
    void validatePurTransDExcelPreview(previewToImportBase(current), token, {
      itemByCode: itemByCodeRef.current,
      movementStoId: getDefaultMovementStoreId(movement),
    }).then((validated) => {
      if (!cancelled) setPreview(validated);
    });

    return () => {
      cancelled = true;
    };
  }, [movement, token, loadingPreview, importing]);

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

  return (
    <PageGuard permission={null}>
      <div className="min-w-0 max-w-full space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Import Purchase Excel</h2>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/transactions/purchase">Back to Purchase</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <FormFieldInlineWrap
              id="import-movement"
              label="Movement"
              className="sm:grid-cols-[7rem_minmax(0,1fr)] w-full max-w-2xl"
              labelClassName="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
            >
              <MovementLookup
                parentId={PURCHASE_MOV_PARENT_ID}
                token={token}
                value={movement}
                onChange={setMovement}
                disabled={!token}
              />
            </FormFieldInlineWrap>

            <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
              <FormFieldInline
                id="import-invoice-id"
                label="Invoice ID"
                value={invoiceId}
                onChange={(event) => setInvoiceId(event.target.value)}
                className="sm:grid-cols-[7rem_minmax(0,1fr)]"
                labelClassName="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
              />
              <FormFieldInline
                id="import-invoice-date"
                label="Invoice Date"
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                className="sm:grid-cols-[7rem_minmax(0,1fr)]"
                labelClassName="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
              />
            </div>

            <div className="grid max-w-2xl grid-cols-1 items-center gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
              <Label
                htmlFor="import-excel-file"
                className="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
              >
                Load Excel File
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="import-excel-file"
                  type="file"
                  accept=".xlsx,.xlsm"
                  disabled={!token || loadingPreview}
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setPreview(null);
                    setItemByCode(new Map());
                    setSelectedRowNumbers(new Set());
                    setLoadProgress(null);
                    setPreviewPage(1);
                  }}
                />
                <Button
                  type="button"
                  disabled={!token || !file || loadingPreview}
                  onClick={() => void handleLoadExcel()}
                >
                  {loadingPreview ? "Reading…" : "Read Excel"}
                </Button>
              </div>
            </div>
            {file ? (
              <p className="text-muted-foreground text-xs sm:pl-[calc(7rem+1rem)]">
                Selected: {file.name}
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
                  aria-label="Read Excel progress"
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
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardContent className="min-w-0 overflow-hidden pt-6">
            {!preview ? (
              <p className="text-muted-foreground text-sm">
                Choose a PurTransD template file and click Read Excel. Select a
                Movement first if rows do not include a Store column.
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
                    {preview.rowCount > 0
                      ? ` — ${selectedCount} selected`
                      : ""}
                  </p>
                  {invalidRowCount > 0 ? (
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

                {!preview.isValid ? (
                  <div className="space-y-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
                    <p className="font-medium">{PURTRANS_D_EXCEL_VALIDATION_SUMMARY}</p>
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
                            {formatPurTransDExcelFieldError(row, error)}
                          </li>
                        ))}
                    </ul>
                    {validationErrors.length > ERROR_BANNER_LIMIT ? (
                      <p>
                        Showing {ERROR_BANNER_LIMIT} of {validationErrors.length}{" "}
                        errors. Use Show failed rows to review the rest.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {preview.rows.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    All rows were removed. Choose a file and click Read Excel
                    again to reload the sheet.
                  </p>
                ) : (
                  <>
                    <TooltipProvider>
                      <Table containerClassName="max-h-[min(70vh,40rem)] overflow-auto rounded-md border">
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="bg-background sticky top-0 left-0 z-30 w-28">
                              <label className="flex items-center gap-2 font-medium">
                                <Checkbox
                                  checked={allRowsSelected}
                                  disabled={importing || loadingPreview}
                                  aria-label="Select all"
                                  ref={(element) => {
                                    if (element) {
                                      element.indeterminate = someRowsSelected;
                                    }
                                  }}
                                  onChange={(event) =>
                                    handleSelectAll(event.target.checked)
                                  }
                                />
                                <span>Select All</span>
                              </label>
                            </TableHead>
                            {PREVIEW_COLUMNS.map((column) => (
                              <TableHead
                                key={column.key}
                                className="bg-background sticky top-0 z-20"
                              >
                                {column.title}
                              </TableHead>
                            ))}
                            <TableHead className="bg-background sticky top-0 z-20">
                              Errors
                            </TableHead>
                            <TableHead className="bg-background sticky top-0 right-0 z-30 w-12 text-right shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.18)]">
                              <span className="sr-only">Delete</span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagedRows.map((row) => {
                            const errorFields = rowErrorFields(row);
                            const isSelected = selectedRowNumbers.has(
                              row.excelRowNumber
                            );

                            return (
                              <TableRow
                                key={row.excelRowNumber}
                                className={cn(
                                  !row.isValid &&
                                    "border-red-300 bg-red-50 hover:bg-red-50 data-[state=selected]:bg-red-50"
                                )}
                              >
                                <TableCell
                                  className={cn(
                                    "sticky left-0 z-10",
                                    row.isValid ? "bg-background" : "bg-red-50"
                                  )}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    disabled={importing || loadingPreview}
                                    aria-label={`Select row ${row.excelRowNumber}`}
                                    onChange={(event) =>
                                      handleToggleRowSelected(
                                        row.excelRowNumber,
                                        event.target.checked
                                      )
                                    }
                                  />
                                </TableCell>
                                {PREVIEW_COLUMNS.map((column) => (
                                  <TableCell
                                    key={column.key}
                                    className={cn(
                                      errorFields.has(column.key) &&
                                        "text-destructive font-semibold",
                                      isExcelImportEditableField(column.key) &&
                                        "min-w-[6.5rem] align-top"
                                    )}
                                  >
                                    {isExcelImportEditableField(column.key) ? (
                                      <PurchaseExcelImportEditableCell
                                        row={row}
                                        field={column.key}
                                        disabled={importing || loadingPreview}
                                        itemByCode={itemByCode}
                                        units={units}
                                        unitsLoading={unitsLoading}
                                        storeOptions={storeOptions}
                                        storesLoading={storesLoading}
                                        invalid={errorFields.has(column.key)}
                                        onChange={(field, value) =>
                                          handleChangePreviewField(
                                            row.excelRowNumber,
                                            field,
                                            value
                                          )
                                        }
                                      />
                                    ) : (
                                      cellText(row[column.key])
                                    )}
                                  </TableCell>
                                ))}
                                <TableCell className="min-w-[14rem] align-top whitespace-normal">
                                  <PreviewRowErrors row={row} />
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "sticky right-0 z-10 text-right shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.18)]",
                                    row.isValid ? "bg-background" : "bg-red-50"
                                  )}
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        disabled={importing || loadingPreview}
                                        aria-label={`Delete row ${row.excelRowNumber}`}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleDeletePreviewRow(
                                            row.excelRowNumber
                                          );
                                        }}
                                      >
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete</TooltipContent>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TooltipProvider>
                    {visibleRows.length > PREVIEW_PAGE_SIZE ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-muted-foreground text-xs">
                          Showing{" "}
                          {(currentPreviewPage - 1) * PREVIEW_PAGE_SIZE + 1}–
                          {Math.min(
                            currentPreviewPage * PREVIEW_PAGE_SIZE,
                            visibleRows.length
                          )}{" "}
                          of {visibleRows.length}
                          {showInvalidOnly ? " failed" : ""} rows
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={currentPreviewPage <= 1}
                            onClick={() =>
                              setPreviewPage((page) => Math.max(1, page - 1))
                            }
                          >
                            Previous
                          </Button>
                          <span className="text-xs">
                            Page {currentPreviewPage} of {previewPageCount}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={currentPreviewPage >= previewPageCount}
                            onClick={() =>
                              setPreviewPage((page) =>
                                Math.min(previewPageCount, page + 1)
                              )
                            }
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  {preview.rowCount === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No rows left to import.
                    </p>
                  ) : selectedCount === 0 ? (
                    <p className="text-destructive text-sm">
                      Please select at least one row to import.
                    </p>
                  ) : !selectedRowsValid ? (
                    <p className="text-destructive text-sm">
                      Import / Save is blocked until all selected rows are valid.
                      Uncheck or delete invalid rows to continue.
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {canImport
                        ? `${selectedCount} selected row${
                            selectedCount === 1 ? "" : "s"
                          } ready to import.`
                        : "Complete Movement, Invoice ID, and Invoice Date to enable import."}
                    </p>
                  )}
                  <Button
                    type="button"
                    disabled={
                      importing ||
                      loadingPreview ||
                      preview.rowCount === 0 ||
                      movement == null ||
                      movement.movChiledId == null ||
                      !invoiceId.trim() ||
                      !invoiceDate.trim() ||
                      (selectedCount > 0 && !selectedRowsValid)
                    }
                    onClick={() => void handleImportSave()}
                  >
                    {importing ? "Importing…" : "Import / Save"}
                  </Button>
                </div>

                {!preview.isValid && validationErrors.length > 0 ? (
                  <div className="text-muted-foreground text-xs">
                    {validationErrors.length} error
                    {validationErrors.length === 1 ? "" : "s"} across{" "}
                    {preview.rows.filter((row) => !row.isValid).length} row
                    {preview.rows.filter((row) => !row.isValid).length === 1
                      ? ""
                      : "s"}
                    .
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
