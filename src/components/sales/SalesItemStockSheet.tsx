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
  SalesItemStockReportRow,
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

  const rows = result?.reportRows ?? [];
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" })
    );
  }, [rows]);

  const unit1Id = result?.unit1 ?? line?.unit1 ?? null;

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
              No stock records for this item.
            </p>
          ) : null}
          {!loading && !error && sorted.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th className="py-2 pr-2 font-medium">Store</th>
                    <th className="py-2 pr-2 font-medium">Availability</th>
                    <th className="py-2 pr-2 font-medium">Unit</th>
                    <th className="py-2 font-medium">Exp</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row: SalesItemStockReportRow) => {
                    const isCurrent = row.storId === result?.currentStorId;
                    const isPharmacy = row.storeKind === "Pharmacy";
                    const unitText = isPharmacy
                      ? unitLabel(row.unit1 ?? unit1Id, units)
                      : "—";
                    return (
                      <tr
                        key={`${row.storeKind}-${row.storId}`}
                        className={cn(
                          "border-b",
                          isCurrent && "bg-muted/50 font-medium"
                        )}
                      >
                        <td className="py-2 pr-2">
                          <div>{row.displayName}</div>
                          {isCurrent ? (
                            <div className="text-muted-foreground text-xs font-normal">
                              Current
                            </div>
                          ) : null}
                        </td>
                        <td className="py-2 pr-2 tabular-nums">
                          {isPharmacy ? (
                            formatQty(row.availableQtyUnit1 ?? 0)
                          ) : (
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">
                              Available
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-2">{unitText}</td>
                        <td className="py-2">
                          {isPharmacy ? row.earliestExpDate || "—" : "—"}
                        </td>
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
