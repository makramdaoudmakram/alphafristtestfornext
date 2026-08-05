"use client";

import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import type { ExcelImportError } from "@/types/excel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ExcelImportErrorTableProps = {
  errors: ExcelImportError[];
  maxHeight?: string;
};

function errorsToCsv(errors: ExcelImportError[]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = ["Row,Column,Code,Message"];

  for (const error of errors) {
    lines.push(
      [
        String(error.rowNumber),
        escape(error.columnName ?? ""),
        escape(error.errorCode),
        escape(error.message),
      ].join(",")
    );
  }

  return lines.join("\n");
}

function errorsToPlainText(errors: ExcelImportError[]): string {
  return errors
    .map(
      (error) =>
        `Row ${error.rowNumber}${error.columnName ? ` | ${error.columnName}` : ""} | ${error.errorCode}: ${error.message}`
    )
    .join("\n");
}

export function ExcelImportErrorTable({
  errors,
  maxHeight = "240px",
}: ExcelImportErrorTableProps) {
  if (errors.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No errors reported.</p>
    );
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(errorsToPlainText(errors));
      toast.success("Errors copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  function handleExport() {
    const blob = new Blob([errorsToCsv(errors)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "excel-import-errors.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Errors exported");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()}>
          <Copy className="size-4" />
          Copy
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleExport}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <ScrollArea style={{ maxHeight }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Row</TableHead>
              <TableHead>Column</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors.map((error, index) => (
              <TableRow key={`${error.rowNumber}-${error.errorCode}-${index}`}>
                <TableCell>{error.rowNumber || "—"}</TableCell>
                <TableCell>{error.columnName || "—"}</TableCell>
                <TableCell>{error.errorCode}</TableCell>
                <TableCell className="whitespace-normal">{error.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
