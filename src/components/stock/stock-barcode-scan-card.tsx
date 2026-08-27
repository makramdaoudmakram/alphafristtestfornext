"use client";

import { useCallback, useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import { lookupStockByBarcodeScan } from "@/lib/api-client";
import type { StockBarcodeLookupResult } from "@/types/stock";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type StockBarcodeScanCardProps = {
  token: string | undefined;
  onBatchFound?: (result: StockBarcodeLookupResult) => void;
};

export function StockBarcodeScanCard({ token, onBatchFound }: StockBarcodeScanCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanValue, setScanValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<StockBarcodeLookupResult | null>(null);

  const runLookup = useCallback(async () => {
    if (!token) {
      toast.error("Sign in required.");
      return;
    }

    const value = scanValue.trim();
    if (!value) {
      toast.error("Scan or enter a barcode value.");
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const result = await lookupStockByBarcodeScan(token, value);
      setLastResult(result);
      onBatchFound?.(result);
      toast.success(`Batch ${result.normalizedBatchNo} found.`);
      setScanValue("");
      inputRef.current?.focus();
    } catch (error) {
      setLastResult(null);
      toast.error(error instanceof Error ? error.message : "Barcode lookup failed.");
      inputRef.current?.select();
    } finally {
      setLoading(false);
    }
  }, [token, scanValue, onBatchFound]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanBarcode className="size-5" />
          Barcode scan
        </CardTitle>
        <CardDescription>
          Scan or type a barcode — lookup uses Stock.BatchNo as the barcode payload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="stock-barcode-scan">Scanner input</Label>
            <Input
              id="stock-barcode-scan"
              ref={inputRef}
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void runLookup();
                }
              }}
              placeholder="Scan barcode..."
              autoComplete="off"
              disabled={loading}
            />
          </div>
          <Button type="button" onClick={() => void runLookup()} disabled={loading}>
            Lookup
          </Button>
        </div>

        {lastResult ? (
          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">Batch {lastResult.normalizedBatchNo}</Badge>
              <Badge variant="secondary">{lastResult.batch.itemCode}</Badge>
            </div>
            <p>
              {lastResult.batch.itemNameEn || lastResult.batch.itemNameAr || "—"}
            </p>
            <p className="text-muted-foreground mt-1">
              Store {lastResult.batch.storeId}
              {lastResult.batch.expDate ? ` · Exp ${lastResult.batch.expDate}` : ""}
              {" · "}
              Qty {lastResult.batch.qty.toLocaleString()}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
