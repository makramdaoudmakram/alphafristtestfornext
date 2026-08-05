"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import {
  downloadExcelTemplate,
  getExcelEntityMetadata,
} from "@/lib/api-client";
import {
  ExcelColumnTransferList,
  buildDefaultSelectedColumns,
  buildDefaultTemplateName,
} from "@/components/excel/excel-column-transfer-list";
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
  type ExcelEntityMetadata,
  type ExcelImportMode,
} from "@/types/excel";

type WizardStep = 1 | 2 | 3 | 4;

type ExcelTemplateWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  entityLabel?: string;
  token?: string | null;
};

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExcelTemplateWizard({
  open,
  onOpenChange,
  entityName,
  entityLabel,
  token,
}: ExcelTemplateWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [mode, setMode] = useState<ExcelImportMode>("Insert");
  const [metadata, setMetadata] = useState<ExcelEntityMetadata | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const displayName = entityLabel ?? metadata?.displayName ?? entityName;

  useEffect(() => {
    if (!open) {
      setStep(1);
      setMode("Insert");
      setMetadata(null);
      setSelectedColumns([]);
      setTemplateName("");
      return;
    }

    if (!token) return;

    setLoadingMetadata(true);
    void getExcelEntityMetadata(entityName, token)
      .then((data) => {
        setMetadata(data);
        setSelectedColumns(buildDefaultSelectedColumns(data, "Insert"));
        setTemplateName(buildDefaultTemplateName(data, "Insert"));
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load Excel metadata"
        );
        onOpenChange(false);
      })
      .finally(() => setLoadingMetadata(false));
  }, [open, token, entityName, onOpenChange]);

  useEffect(() => {
    if (!metadata) return;
    setSelectedColumns(buildDefaultSelectedColumns(metadata, mode));
    setTemplateName(buildDefaultTemplateName(metadata, mode));
  }, [mode, metadata]);

  const canContinueFromColumns = useMemo(() => {
    if (!metadata) return false;
    if (mode === "Delete") return true;
    return selectedColumns.length > 0;
  }, [metadata, mode, selectedColumns]);

  async function handleDownload() {
    if (!token || !metadata) return;

    setDownloading(true);
    try {
      const file = await downloadExcelTemplate(
        entityName,
        { mode, selectedColumns },
        token
      );
      saveBlob(file.blob, file.fileName);
      toast.success("Excel template downloaded");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to download template"
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={step === 3 ? "max-w-5xl" : "max-w-2xl"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5" />
            Download Excel Template
          </DialogTitle>
          <DialogDescription>
            Step {step} of 4 — configure the import template before download.
          </DialogDescription>
        </DialogHeader>

        {loadingMetadata ? (
          <p className="text-muted-foreground text-sm">Loading entity metadata…</p>
        ) : (
          <div className="space-y-4">
            {step === 1 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Entity</CardTitle>
                  <CardDescription>
                    Template generation is enabled for this entity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-muted-foreground text-xs">{entityName}</p>
                </CardContent>
              </Card>
            ) : null}

            {step === 2 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Import mode</CardTitle>
                  <CardDescription>
                    Choose how rows in the uploaded file will be processed later.
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
                        name="excel-import-mode"
                        value={option}
                        checked={mode === option}
                        onChange={() => setMode(option)}
                        className="mt-1"
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
            ) : null}

            {step === 3 && metadata ? (
              <ExcelColumnTransferList
                metadata={metadata}
                mode={mode}
                selectedColumns={selectedColumns}
                onChange={setSelectedColumns}
                templateName={templateName}
                onTemplateNameChange={setTemplateName}
              />
            ) : null}

            {step === 4 && metadata ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Review</CardTitle>
                  <CardDescription>
                    Confirm settings and download the `.xlsx` template.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Template name</Label>
                    <p>{templateName || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Entity</Label>
                    <p>{displayName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Mode</Label>
                    <p>{mode}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">
                      Columns ({selectedColumns.length})
                    </Label>
                    <p className="break-words">{selectedColumns.join(", ") || "—"}</p>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={step === 1 || downloading || loadingMetadata}
              onClick={() => setStep((current) => (current - 1) as WizardStep)}
            >
              Back
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={downloading || loadingMetadata}
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {step < 4 ? (
              <Button
                type="button"
                disabled={
                  loadingMetadata ||
                  !metadata ||
                  (step === 3 && !canContinueFromColumns)
                }
                onClick={() => setStep((current) => (current + 1) as WizardStep)}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                disabled={downloading || loadingMetadata || !metadata}
                onClick={() => void handleDownload()}
              >
                <Download className="size-4" />
                {downloading ? "Exporting…" : "Export"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
