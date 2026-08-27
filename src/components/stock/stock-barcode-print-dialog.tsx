"use client";

import { useCallback, useRef } from "react";
import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { StockBarcodeLabel } from "@/types/stock";
import { StockBarcodeLabelView } from "@/components/stock/stock-barcode-label";

type StockBarcodePrintDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: StockBarcodeLabel[];
};

export function StockBarcodePrintDialog({
  open,
  onOpenChange,
  labels,
}: StockBarcodePrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    if (!printRef.current || labels.length === 0) return;

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=800,height=600");
    if (!printWindow) return;

    const styles = `
      body { font-family: Arial, sans-serif; margin: 16px; }
      .grid { display: flex; flex-wrap: wrap; gap: 12px; }
      .stock-barcode-label { break-inside: avoid; page-break-inside: avoid; }
    `;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Stock barcodes</title>
          <style>${styles}</style>
        </head>
        <body>
          <div class="grid">${printRef.current.innerHTML}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, [labels.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Print stock barcodes</DialogTitle>
          <DialogDescription>
            Barcode value is the stock BatchNo. Scan it to look up the batch in Stock.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          <div ref={printRef} className="flex flex-wrap gap-4">
            {labels.map((label, index) => (
              <StockBarcodeLabelView key={`${label.stockId}-${index}`} label={label} />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={handlePrint} disabled={labels.length === 0}>
            <Printer className="mr-2 size-4" />
            Print {labels.length} label{labels.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
