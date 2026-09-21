"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, getSalesItemPharmacyStock } from "@/lib/api-client";
import { formatUnitOptionLabel } from "@/lib/item-unit-options";
import { salesItemPrimaryLabel } from "@/lib/sales-item-search-ux";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { UnitItem } from "@/types/unit";
import type {
  SalesItemPharmacyStockResponse,
  SalesItemSearchStock,
  SalesSearchLanguage,
  SalesWorkspaceLine,
} from "@/types/sales-workspace";

type SalesItemStockSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token?: string | null;
  language: SalesSearchLanguage;
  units: UnitItem[];
  /** Snapshot of the clicked detail row — never the search-box item. */
  line: SalesWorkspaceLine | null;
};

function unitLabel(unitId: number | null | undefined, units: UnitItem[]): string {
  if (unitId == null || unitId <= 0) return "—";
  const unit = units.find((u) => u.uCode === unitId);
  const name = unit?.uNameEn?.trim() || unit?.uNameAr?.trim();
  return name || formatUnitOptionLabel(unitId, unit);
}

function formatQty(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

export function SalesItemStockSheet({
  open,
  onOpenChange,
  token,
  language,
  units,
  line,
}: SalesItemStockSheetProps) {
  const itemCatalogId = line?.itemCatalogId ?? 0;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SalesItemPharmacyStockResponse | null>(
    null
  );

  useEffect(() => {
    if (!open || itemCatalogId <= 0) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!token) {
      setResult(null);
      setError("Sign in is required to view stock.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setResult(null);

    void (async () => {
      try {
        const data = await getSalesItemPharmacyStock(token, itemCatalogId);
        if (controller.signal.aborted) return;
        setResult(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof ApiError ? err.message : "Unable to load stock."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [open, token, itemCatalogId]);

  const titleName = useMemo(() => {
    if (result) {
      return salesItemPrimaryLabel(
        {
          itmCode: result.itmCode,
          itmNameAr: result.itmNameAr,
          itmNameEn: result.itmNameEn,
        },
        language
      );
    }
    if (!line) return "Stock";
    return salesItemPrimaryLabel(
      {
        itmCode: line.itemCode,
        itmNameAr: line.itmNameAr,
        itmNameEn: line.itmNameEn,
      },
      language
    );
  }, [result, line, language]);

  const baseUnitId = result?.unit3 || result?.unit1 || line?.unit3 || line?.unit1 || 0;
  const unitText = unitLabel(baseUnitId, units);

  const rows = result?.stocks ?? [];
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const pa = (a.pharmacyName || a.storName || "").localeCompare(
        b.pharmacyName || b.storName || ""
      );
      if (pa !== 0) return pa;
      return (a.expDate || "").localeCompare(b.expDate || "");
    });
  }, [rows]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-lg"
        aria-describedby={undefined}
      >
        <SheetHeader>
          <SheetTitle>Stock across pharmacies</SheetTitle>
          <SheetDescription>
            {titleName}
            {(result?.itmCode || line?.itemCode) ? (
              <span className="block tabular-nums">
                Code: {result?.itmCode || line?.itemCode}
              </span>
            ) : null}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading stock…</p>
          ) : null}
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : null}
          {!loading && !error && sorted.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No pharmacies with quantity greater than 0.
            </p>
          ) : null}
          {!loading && !error && sorted.length > 0 ? (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="py-2 pr-2 font-medium">Pharmacy</th>
                  <th className="py-2 pr-2 font-medium">Avail Qty</th>
                  <th className="py-2 pr-2 font-medium">Unit</th>
                  <th className="py-2 pr-2 font-medium">Sales Price</th>
                  <th className="py-2 font-medium">Exp</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row: SalesItemSearchStock) => {
                  const isCurrent = row.storId === result?.currentStorId;
                  return (
                    <tr
                      key={row.stockId}
                      className={cn(
                        "border-b",
                        isCurrent && "bg-muted/50 font-medium"
                      )}
                    >
                      <td className="py-2 pr-2">
                        <div>{row.pharmacyName || row.storName || "—"}</div>
                        {row.storName && row.pharmacyName ? (
                          <div className="text-muted-foreground text-xs font-normal">
                            {row.storName}
                          </div>
                        ) : null}
                        {isCurrent ? (
                          <div className="text-muted-foreground text-xs font-normal">
                            Current
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 pr-2 tabular-nums">
                        {formatQty(row.availableQty)}
                      </td>
                      <td className="py-2 pr-2">{unitText}</td>
                      <td className="py-2 pr-2 tabular-nums">
                        {formatPrice(row.salesPrice)}
                      </td>
                      <td className="py-2">{row.expDate || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
