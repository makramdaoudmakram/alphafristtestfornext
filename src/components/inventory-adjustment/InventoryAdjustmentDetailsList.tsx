"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { buildRowUnitComboboxOptions } from "@/lib/item-unit-options";
import { formatExpDateMmYyyy } from "@/lib/purchase-exp-date";
import { cn } from "@/lib/utils";
import type { InventoryAdjustmentDetail } from "@/types/inventory-adjustment";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { UnitItem } from "@/types/unit";
import type { PharmReciveItemLanguage } from "@/types/pharm-recive";

function stockItemName(
  row: InventoryAdjustmentDetail,
  language: PharmReciveItemLanguage
): string {
  if (language === "ar") {
    return row.itmNameAr.trim() || row.itmNameEn.trim() || row.itmCode || "—";
  }
  return row.itmNameEn.trim() || row.itmNameAr.trim() || row.itmCode || "—";
}

function differenceClass(diff: number): string {
  if (diff > 0) return "text-emerald-600 font-semibold";
  if (diff < 0) return "text-red-600 font-semibold";
  return "text-foreground font-medium";
}

function formatDiff(diff: number): string {
  if (diff > 0) return `+${diff}`;
  return String(diff);
}

const DETAIL_GRID_CLASS =
  "md:grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] md:items-start md:gap-2";

type InventoryAdjustmentDetailsListProps = {
  details: InventoryAdjustmentDetail[];
  language: PharmReciveItemLanguage;
  units: UnitItem[];
  itemByCode: Map<string, ItemCatalogItem>;
  disabled?: boolean;
  onUpdateRow: (clientRowId: string, patch: Partial<InventoryAdjustmentDetail>) => void;
  onRemoveRow: (clientRowId: string) => void;
  onUnitChange: (clientRowId: string, unitId: number) => void;
};

export function InventoryAdjustmentDetailsList({
  details,
  language,
  units,
  itemByCode,
  disabled = false,
  onUpdateRow,
  onRemoveRow,
  onUnitChange,
}: InventoryAdjustmentDetailsListProps) {
  if (details.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        Select an item to add inventory count rows.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "hidden gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
          DETAIL_GRID_CLASS
        )}
      >
        <span>Batch No</span>
        <span>Exp Date</span>
        <span>Item Code</span>
        <span>Item Name</span>
        <span>Current Qty</span>
        <span>Unit</span>
        <span />
      </div>

      {details.map((row) => {
        const catalogItem =
          itemByCode.get(row.itmCode.trim().toLowerCase()) ?? null;
        const unitOptions: ComboboxOption[] = buildRowUnitComboboxOptions(
          units,
          catalogItem,
          Boolean(row.itmCode.trim())
        );
        const expDisplay = row.expDate ? formatExpDateMmYyyy(row.expDate) : "—";

        return (
          <div key={row.clientRowId} className={cn("rounded-lg border p-3", DETAIL_GRID_CLASS)}>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs md:hidden">Batch No</p>
              <p className="text-sm">{row.batchNo || "—"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-xs md:hidden">Exp Date</p>
              <p className="text-sm tabular-nums">{expDisplay}</p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-xs md:hidden">Item Code</p>
              <p className="font-mono text-sm">{row.itmCode || "—"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-xs md:hidden">Item Name</p>
              <p className="text-sm">{stockItemName(row, language)}</p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-xs md:hidden">Current Qty</p>
              <p className="tabular-nums text-sm font-medium">
                {Number.isFinite(row.itmStockQty) ? row.itmStockQty : 0}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-xs md:hidden">Unit</p>
              <SearchableCombobox
                value={row.unitId != null ? String(row.unitId) : ""}
                options={unitOptions}
                disabled={disabled || !row.itmCode.trim()}
                placeholder="Unit"
                onValueChange={(next) => {
                  const unitId = Number(next);
                  if (!Number.isFinite(unitId) || unitId <= 0) return;
                  onUnitChange(row.clientRowId, unitId);
                }}
                className="h-8"
              />
            </div>

            <div className="flex justify-end pt-1 md:pt-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label="Remove row"
                onClick={() => onRemoveRow(row.clientRowId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="col-span-full mt-2 flex flex-wrap items-end gap-4 border-t pt-3">
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-medium">
                  Counted Qty
                </label>
                <Input
                  type="number"
                  step="any"
                  min={0}
                  disabled={disabled}
                  value={Number.isFinite(row.itmQ) ? row.itmQ : 0}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    onUpdateRow(row.clientRowId, {
                      itmQ: Number.isFinite(next) ? next : 0,
                    });
                  }}
                  className="h-9 w-32 tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">Difference</p>
                <p className={cn("tabular-nums text-lg", differenceClass(row.differenceQty))}>
                  {formatDiff(row.differenceQty)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
