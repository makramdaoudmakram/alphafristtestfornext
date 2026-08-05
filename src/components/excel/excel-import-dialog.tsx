"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { commitExcelImport, previewExcelImport, waitForExcelImportJob } from "@/lib/api-client";
import { ExcelImportErrorTable } from "@/components/excel/excel-import-error-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  EXCEL_IMPORT_MODE_LABELS,
  EXCEL_IMPORT_MODES,
  EXCEL_IMPORT_ASYNC_ROW_THRESHOLD,
  type ExcelImportJobStatus,
  type ExcelImportMode,
  type ExcelImportResult,
} from "@/types/excel";
import { cn } from "@/lib/utils";

type DialogStep = "upload" | "preview" | "committing" | "result";

type ExcelImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  entityLabel?: string;
  token?: string | null;
  onCommitted?: () => void | Promise<void>;
};

const ACCEPTED_EXTENSIONS = [".xlsx", ".xlsm"];

function isExcelFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function PreviewCounts({ preview }: { preview: ExcelImportResult["preview"] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <CountCard label="Total rows" value={preview.totalRows} />
      <CountCard label="Inserts" value={preview.insertCount} />
      <CountCard label="Updates" value={preview.updateCount} />
      <CountCard label="Deletes" value={preview.deleteCount} />
      <CountCard label="Valid" value={preview.validRowCount} variant="success" />
      <CountCard label="Errors" value={preview.errorCount} variant="destructive" />
    </div>
  );
}

function CountCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: "success" | "destructive";
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={cn(
          "text-lg font-semibold",
          variant === "success" && value > 0 && "text-green-600",
          variant === "destructive" && value > 0 && "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ImportProgressBar({
  status,
}: {
  status: ExcelImportJobStatus | null;
}) {
  const percent = status?.progressPercent ?? 0;
  const processed = status?.processedRows ?? 0;
  const total = status?.totalRows ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {status?.message || "Starting import…"}
        </span>
        <span className="font-medium">{percent}%</span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      {total > 0 ? (
        <p className="text-muted-foreground text-xs">
          Processed {processed} of {total} rows
        </p>
      ) : null}
    </div>
  );
}

export function ExcelImportDialog({
  open,
  onOpenChange,
  entityName,
  entityLabel,
  token,
  onCommitted,
}: ExcelImportDialogProps) {
  const [step, setStep] = useState<DialogStep>("upload");
  const [mode, setMode] = useState<ExcelImportMode>("Insert");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewResult, setPreviewResult] = useState<ExcelImportResult | null>(
    null
  );
  const [commitResult, setCommitResult] = useState<ExcelImportResult | null>(
    null
  );
  const [jobStatus, setJobStatus] = useState<ExcelImportJobStatus | null>(null);

  const displayName = entityLabel ?? entityName;

  const resetState = useCallback(() => {
    setStep("upload");
    setMode("Insert");
    setFile(null);
    setDragActive(false);
    setBusy(false);
    setPreviewResult(null);
    setCommitResult(null);
    setJobStatus(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  function handleClose(nextOpen: boolean) {
    if (!nextOpen && step === "committing" && busy) {
      return;
    }

    onOpenChange(nextOpen);
  }

  function assignFile(nextFile: File | null) {
    if (!nextFile) {
      setFile(null);
      return;
    }

    if (!isExcelFile(nextFile)) {
      toast.error("Only .xlsx or .xlsm files are supported.");
      return;
    }

    setFile(nextFile);
    setPreviewResult(null);
    setCommitResult(null);
    setStep("upload");
  }

  async function handlePreview() {
    if (!token || !file) return;

    setBusy(true);
    try {
      const result = await previewExcelImport(entityName, file, mode, token);
      setPreviewResult(result);
      setStep("preview");

      if (!result.success) {
        const firstError = result.errors[0]?.message;
        toast.error(
          firstError
            ? `Preview: ${firstError}`
            : "Preview found validation errors"
        );
      } else {
        toast.success("Preview ready — review and confirm import");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to preview import"
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    if (!token || !previewResult?.importSessionId) return;

    setBusy(true);
    setJobStatus(null);
    try {
      const commitResponse = await commitExcelImport(
        entityName,
        previewResult.importSessionId,
        token
      );

      if (commitResponse.isAsync) {
        setStep("committing");
        const result = await waitForExcelImportJob(
          entityName,
          commitResponse.importJobId,
          token,
          setJobStatus
        );
        setCommitResult(result);
        setStep("result");

        if (result.success) {
          toast.success("Import committed successfully");
          await onCommitted?.();
        } else {
          toast.error("Import failed — no changes were saved");
        }
        return;
      }

      setCommitResult(commitResponse.result);
      setStep("result");

      if (commitResponse.result.success) {
        toast.success("Import committed successfully");
        await onCommitted?.();
      } else {
        toast.error("Import failed — no changes were saved");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to commit import"
      );
      setStep("preview");
    } finally {
      setBusy(false);
      setJobStatus(null);
    }
  }

  const canPreview = Boolean(file && token && !busy);
  const canCommit = Boolean(
    previewResult?.success && previewResult.importSessionId && !busy
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5" />
            Import Excel — {displayName}
          </DialogTitle>
          <DialogDescription>
            Upload a file, review the preview, then commit when ready. No database
            changes occur until you confirm.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Import mode</CardTitle>
                <CardDescription>
                  Must match the template used to create the Excel file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {EXCEL_IMPORT_MODES.map((option) => (
                  <label
                    key={option}
                    className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-md border p-3"
                  >
                    <input
                      type="radio"
                      name="excel-import-upload-mode"
                      value={option}
                      checked={mode === option}
                      onChange={() => setMode(option)}
                      className="mt-1"
                      disabled={busy}
                    />
                    <span>
                      <span className="block text-sm font-medium">{option}</span>
                      <span className="text-muted-foreground block text-xs">
                        {EXCEL_IMPORT_MODE_LABELS[option]}
                      </span>
                    </span>
                  </label>
                ))}
              </CardContent>
            </Card>

            <div
              className={cn(
                "flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center transition-colors",
                dragActive && "border-primary bg-primary/5",
                file && "border-green-600/40 bg-green-500/5"
              )}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                const dropped = event.dataTransfer.files?.[0];
                assignFile(dropped ?? null);
              }}
            >
              <Upload className="text-muted-foreground size-8" />
              <div>
                <p className="text-sm font-medium">
                  Drag & drop your Excel file here
                </p>
                <p className="text-muted-foreground text-xs">
                  or choose a .xlsx / .xlsm file
                </p>
              </div>
              {file ? (
                <Badge variant="secondary">{file.name}</Badge>
              ) : null}
              <div>
                <Label htmlFor="excel-import-file" className="sr-only">
                  Excel file
                </Label>
                <input
                  id="excel-import-file"
                  type="file"
                  accept=".xlsx,.xlsm"
                  className="text-sm"
                  disabled={busy}
                  onChange={(event) =>
                    assignFile(event.target.files?.[0] ?? null)
                  }
                />
              </div>
            </div>
          </div>
        ) : null}

        {step === "preview" && previewResult ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{mode}</Badge>
              {file ? <Badge variant="secondary">{file.name}</Badge> : null}
            </div>

            <PreviewCounts preview={previewResult.preview} />

            {previewResult.errors.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-destructive text-base">
                    Validation errors
                  </CardTitle>
                  <CardDescription>
                    Fix the Excel file and upload again. Commit is disabled until
                    preview succeeds.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ExcelImportErrorTable errors={previewResult.errors} />
                </CardContent>
              </Card>
            ) : (
              <p className="text-muted-foreground text-sm">
                All rows passed validation. Click Commit Import to apply changes in
                a single transaction.
                {previewResult.preview.validRowCount >=
                EXCEL_IMPORT_ASYNC_ROW_THRESHOLD
                  ? " Large imports show a live progress bar during commit."
                  : null}
              </p>
            )}
          </div>
        ) : null}

        {step === "committing" ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Committing import</CardTitle>
              <CardDescription>
                Saving rows in one transaction. Please keep this dialog open.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportProgressBar status={jobStatus} />
            </CardContent>
          </Card>
        ) : null}

        {step === "result" && commitResult ? (
          <div className="space-y-4">
            {commitResult.success ? (
              <>
                <Card className="border-green-600/30 bg-green-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-green-700">
                      Import completed
                    </CardTitle>
                    <CardDescription>
                      Changes were saved in one transaction.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Inserted</p>
                      <p className="font-semibold">{commitResult.inserted}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Updated</p>
                      <p className="font-semibold">{commitResult.updated}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Deleted</p>
                      <p className="font-semibold">{commitResult.deleted}</p>
                    </div>
                  </CardContent>
                </Card>
                <PreviewCounts preview={commitResult.preview} />
              </>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-destructive text-base">
                    Import failed
                  </CardTitle>
                  <CardDescription>
                    The transaction was rolled back. No rows were changed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ExcelImportErrorTable errors={commitResult.errors} />
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {step === "preview" ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setStep("upload");
                  setPreviewResult(null);
                }}
              >
                Back
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => handleClose(false)}
            >
              {step === "result" || step === "committing" ? "Close" : "Cancel"}
            </Button>

            {step === "upload" ? (
              <Button
                type="button"
                disabled={!canPreview}
                onClick={() => void handlePreview()}
              >
                {busy ? "Validating…" : "Preview import"}
              </Button>
            ) : null}

            {step === "preview" ? (
              <Button
                type="button"
                disabled={!canCommit}
                onClick={() => void handleCommit()}
              >
                {busy ? "Starting…" : "Commit import"}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
