"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ApiError, previewPurTransDExcel } from "@/lib/api-client";
import { enrichPurTransDExcelPreview } from "@/lib/purtransd-excel-enrich";
import {
  flattenPurTransDExcelValidationErrors,
  formatPurTransDExcelFieldError,
  formatPurTransDExcelRowErrorBlock,
  validatePurTransDExcelPreview,
} from "@/lib/purtransd-excel-validate";
import {
  formatPurchaseExcelImportFailureMessage,
  importPurTransDExcelPurchase,
  previewToImportBase,
} from "@/lib/purtransd-excel-import";
import { getDefaultMovementStoreId } from "@/lib/purchase-stores";
import { cn } from "@/lib/utils";
import { MovementLookup } from "@/components/movement/MovementLookup";
import { PurchaseExcelImportWorkflowChecklist } from "@/components/purchase/PurchaseExcelImportWorkflowChecklist";
import { PageGuard } from "@/components/permissions/page-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FormFieldInline,
  FormFieldInlineWrap,
} from "@/components/ui/form-field-inline";
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
import type { MovmentLookupItem } from "@/types/movment";
import {
  PURTRANS_D_EXCEL_VALIDATION_SUMMARY,
  type PurTransDExcelPreviewRowValidated,
  type PurTransDExcelPreviewValidated,
} from "@/types/purchase";

const PURCHASE_MOV_PARENT_ID = 1;

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
  const [importing, setImporting] = useState(false);
  const previewRef = useRef<PurTransDExcelPreviewValidated | null>(null);
  previewRef.current = preview;

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
    try {
      const parsed = await previewPurTransDExcel(token, file);
      const { preview: enriched, itemByCode } = await enrichPurTransDExcelPreview(
        parsed,
        token
      );
      const validated = await validatePurTransDExcelPreview(enriched, token, {
        itemByCode,
        movementStoId: getDefaultMovementStoreId(movement),
      });
      setPreview(validated);

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
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "The Excel file could not be read."
      );
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleImportSave() {
    if (!token) {
      toast.error("Sign in to import.");
      return;
    }
    if (!preview?.isValid || !movement) {
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

    setImporting(true);
    try {
      const revalidated = await validatePurTransDExcelPreview(
        previewToImportBase(preview),
        token,
        { movementStoId: getDefaultMovementStoreId(movement) }
      );
      setPreview(revalidated);
      if (!revalidated.isValid) {
        toast.error(PURTRANS_D_EXCEL_VALIDATION_SUMMARY);
        return;
      }

      const saved = await importPurTransDExcelPurchase(token, {
        movement,
        invoiceId,
        invoiceDate,
        preview: revalidated,
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
  const canImport =
    preview?.isValid === true &&
    movement != null &&
    movement.movChiledId != null &&
    invoiceId.trim().length > 0 &&
    invoiceDate.trim().length > 0;

  useEffect(() => {
    const current = previewRef.current;
    if (!token || !current || loadingPreview || importing) return;

    let cancelled = false;
    void validatePurTransDExcelPreview(previewToImportBase(current), token, {
      movementStoId: getDefaultMovementStoreId(movement),
    }).then((validated) => {
      if (!cancelled) setPreview(validated);
    });

    return () => {
      cancelled = true;
    };
  }, [movement, token, loadingPreview, importing]);

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
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Import Purchase Excel</h2>
            <p className="text-muted-foreground text-sm">
              Import creates one purchase in a single server transaction: header,
              detail lines, and stock updates use the same PurTransH save path as
              the Purchase page.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/transactions/purchase">Back to Purchase</Link>
          </Button>
        </div>

        <PurchaseExcelImportWorkflowChecklist />

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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {!preview ? (
              <p className="text-muted-foreground text-sm">
                Choose a PurTransD template file and click Read Excel. Select a
                Movement first if rows do not include a Store column.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm">
                  {preview.fileName} — {preview.rowCount} row
                  {preview.rowCount === 1 ? "" : "s"}
                  {preview.isValid ? " — all valid" : " — validation errors found"}
                </p>

                {!preview.isValid ? (
                  <div className="space-y-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
                    <p className="font-medium">{PURTRANS_D_EXCEL_VALIDATION_SUMMARY}</p>
                    <ul className="space-y-2">
                      {preview.rows.flatMap((row) =>
                        row.errors.map((error) => (
                          <li
                            key={`${row.excelRowNumber}-${error.field}-${error.message}`}
                            className="whitespace-pre-wrap"
                          >
                            {formatPurTransDExcelFieldError(row, error)}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ) : null}

                <Table>
                  <TableHeader>
                    <TableRow>
                      {PREVIEW_COLUMNS.map((column) => (
                        <TableHead key={column.key}>{column.title}</TableHead>
                      ))}
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row) => {
                      const errorFields = rowErrorFields(row);

                      return (
                        <TableRow
                          key={row.excelRowNumber}
                          className={cn(
                            !row.isValid &&
                              "border-red-300 bg-red-50 hover:bg-red-50 data-[state=selected]:bg-red-50"
                          )}
                        >
                          {PREVIEW_COLUMNS.map((column) => (
                            <TableCell
                              key={column.key}
                              className={cn(
                                errorFields.has(column.key) &&
                                  "text-destructive font-semibold"
                              )}
                            >
                              {cellText(row[column.key])}
                            </TableCell>
                          ))}
                          <TableCell className="min-w-[14rem] align-top whitespace-normal">
                            <PreviewRowErrors row={row} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  {!preview.isValid ? (
                    <p className="text-destructive text-sm">
                      Import / Save is blocked until all rows are valid.
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {canImport
                        ? "All rows passed validation. Ready to import."
                        : "Complete Movement, Invoice ID, and Invoice Date to enable import."}
                    </p>
                  )}
                  <Button
                    type="button"
                    disabled={!canImport || importing || loadingPreview}
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
