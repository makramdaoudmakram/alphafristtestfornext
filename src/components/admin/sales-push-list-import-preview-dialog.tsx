"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SalesPushListImportPreview } from "@/types/sales-push-list";

export function SalesPushListImportPreviewDialog({
  open,
  onOpenChange,
  preview,
  saving,
  onSaveValidRows,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: SalesPushListImportPreview | null;
  saving: boolean;
  onSaveValidRows: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Import Preview</DialogTitle>
          <DialogDescription>
            Review Excel rows before saving. Valid rows are saved together in one
            bulk request.
          </DialogDescription>
        </DialogHeader>

        {preview ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <CountCard label="Total Rows" value={preview.totalRows} />
              <CountCard label="Valid Rows" value={preview.validRows} variant="success" />
              <CountCard
                label="Invalid Rows"
                value={preview.invalidRows}
                variant="destructive"
              />
            </div>
            <p className="text-muted-foreground text-sm">{preview.fileName}</p>
            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>BatchNo</TableHead>
                    <TableHead>Arabic Name</TableHead>
                    <TableHead>English Name</TableHead>
                    <TableHead>Discount %</TableHead>
                    <TableHead>Discount Value</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row) => (
                    <TableRow key={row.excelRowNumber}>
                      <TableCell>{row.excelRowNumber}</TableCell>
                      <TableCell>
                        <Badge
                          variant={row.valid ? "default" : "secondary"}
                          className={!row.valid ? "text-destructive" : undefined}
                        >
                          {row.valid ? "Valid" : "Invalid"}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.itemCode || "—"}</TableCell>
                      <TableCell>{row.batchNo || "—"}</TableCell>
                      <TableCell>{row.arabicName || "—"}</TableCell>
                      <TableCell>{row.englishName || "—"}</TableCell>
                      <TableCell>{row.percentRaw || "—"}</TableCell>
                      <TableCell>{row.comectionRaw || "—"}</TableCell>
                      <TableCell>{row.startdateRaw || "—"}</TableCell>
                      <TableCell>{row.endDateRaw || "—"}</TableCell>
                      <TableCell className="text-destructive text-sm">
                        {row.valid ? "—" : row.errors.join("; ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSaveValidRows}
            disabled={!preview || preview.validRows === 0 || saving}
          >
            {saving ? "Saving..." : "Save Valid Rows"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
          variant === "success" && "text-emerald-600",
          variant === "destructive" && "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  );
}
