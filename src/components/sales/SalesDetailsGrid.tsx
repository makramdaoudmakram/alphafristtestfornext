"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Plus, Trash2 } from "lucide-react";
import { SalesItemAutocompleteCell } from "@/components/sales/SalesItemAutocompleteCell";
import { SalesItemStockSheet } from "@/components/sales/SalesItemStockSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import { getUnitConversionInfo } from "@/lib/api-client";
import {
  buildRowUnitComboboxOptions,
  formatUnitOptionLabel,
} from "@/lib/item-unit-options";
import { applyPriceQtyNetToBasePrices } from "@/lib/purchase-unit-conversion";
import {
  checkInvoiceStockAllocation,
  createEmptySalesLine,
  formatInvoiceStockInsufficientMessage,
  invoiceRemainingBaseForStock,
  invoiceRemainingInSelectedUnit,
  lineGross,
  lineNet,
  money,
} from "@/lib/sales-workspace-calc";
import {
  egyptDisplayToIsoDate,
  maxDiscountValue,
  resolveSalesDiscountLimit,
} from "@/lib/sales-discount-limit";
import { salesItemPrimaryLabel } from "@/lib/sales-item-search-ux";
import { cn } from "@/lib/utils";
import type {
  SalesItemSearchHit,
  SalesItemSearchStock,
  SalesSearchLanguage,
  SalesStockScope,
  SalesWorkspaceLine,
} from "@/types/sales-workspace";
import type { UnitItem } from "@/types/unit";

const gridInputClass = cn("h-8 w-full min-w-0 tabular-nums", formControlFocusClass);
const QTY_VALIDATE_DEBOUNCE_MS = 250;

type SalesDetailsGridProps = {
  tabId: string;
  lines: SalesWorkspaceLine[];
  token?: string | null;
  units: UnitItem[];
  unitsLoading?: boolean;
  language: SalesSearchLanguage;
  stockScope: SalesStockScope;
  disabled: boolean;
  /** When false, no item rows can be added (Sales Man not resolved). */
  canAddItems: boolean;
  rowDiscDisabled: boolean;
  /** Egypt server date yyyy-MM-dd (or display string) for expiry discount windows. */
  egyptDateDisplay?: string | null;
  onUpdateLines: (
    tabId: string,
    updater: (prev: SalesWorkspaceLine[]) => SalesWorkspaceLine[]
  ) => void;
  onToast?: (kind: "error" | "message", text: string) => void;
};

function displayName(line: SalesWorkspaceLine, language: SalesSearchLanguage) {
  if (line.itemCatalogId > 0) {
    return salesItemPrimaryLabel(
      {
        itmCode: line.itemCode,
        itmNameAr: line.itmNameAr,
        itmNameEn: line.itmNameEn,
      },
      language
    );
  }
  return line.searchText;
}

function itemUnitFields(line: SalesWorkspaceLine) {
  return {
    itmUnit1: line.unit1,
    itmUnit2: line.unit2,
    itmUnit3: line.unit3,
  };
}

function unitShortName(unitId: number, units: UnitItem[]): string {
  const unit = units.find((u) => u.uCode === unitId);
  const name = unit?.uNameEn?.trim() || unit?.uNameAr?.trim();
  return name || formatUnitOptionLabel(unitId, unit);
}

function applyStockToLine(
  line: SalesWorkspaceLine,
  hit: SalesItemSearchHit,
  stock: SalesItemSearchStock,
  language: SalesSearchLanguage
): SalesWorkspaceLine {
  const unitId = hit.unit1 || hit.unit2 || hit.unit3 || 0;
  const base = money(stock.salesPrice || hit.defPharmPrice || hit.defSellPrice || 0);
  return {
    ...line,
    itemCatalogId: hit.itemCatalogId,
    itemCode: hit.itmCode,
    itmNameAr: hit.itmNameAr,
    itmNameEn: hit.itmNameEn,
    itemName: salesItemPrimaryLabel(hit, language),
    searchText: salesItemPrimaryLabel(hit, language),
    stockId: stock.stockId,
    batchNo: stock.batchNo,
    expDate: stock.expDate,
    storId: stock.storId,
    availableQty: stock.availableQty,
    unit1: hit.unit1,
    unit2: hit.unit2,
    unit3: hit.unit3,
    unit1Unit2: hit.unit1Unit2,
    unit1Unit3: hit.unit1Unit3,
    itmMaxDiscPer: hit.itmMaxDiscPer,
    groupNameEn: hit.groupNameEn,
    groupNameAr: hit.groupNameAr,
    unitId,
    quantity: line.quantity > 0 ? line.quantity : 1,
    baseUnitSellPrice: base,
    unitSellPrice: base,
    priceQtyNet: 1,
    qtyError: null,
    pendingStocks: undefined,
  };
}

function lineDiscountLimit(
  line: Pick<
    SalesWorkspaceLine,
    "itmMaxDiscPer" | "groupNameEn" | "groupNameAr" | "expDate"
  >,
  egyptDateDisplay?: string | null
) {
  return resolveSalesDiscountLimit(
    line.itmMaxDiscPer,
    line.groupNameEn,
    line.groupNameAr,
    line.expDate,
    egyptDisplayToIsoDate(egyptDateDisplay) ?? egyptDateDisplay
  );
}

export function SalesDetailsGrid({
  tabId,
  lines,
  token,
  units,
  unitsLoading = false,
  language,
  stockScope,
  disabled,
  canAddItems,
  rowDiscDisabled,
  egyptDateDisplay,
  onUpdateLines,
  onToast,
}: SalesDetailsGridProps) {
  const qtySeqRef = useRef(new Map<string, number>());
  const unitSeqRef = useRef(new Map<string, number>());
  const tabIdRef = useRef(tabId);
  tabIdRef.current = tabId;
  const [stockSheetLine, setStockSheetLine] =
    useState<SalesWorkspaceLine | null>(null);

  const patchLine = useCallback(
    (key: string, patch: Partial<SalesWorkspaceLine>) => {
      const ownerTabId = tabIdRef.current;
      onUpdateLines(ownerTabId, (prev) =>
        prev.map((l) => (l.key === key ? { ...l, ...patch } : l))
      );
    },
    [onUpdateLines]
  );

  const replaceLines = useCallback(
    (next: SalesWorkspaceLine[]) => {
      onUpdateLines(tabIdRef.current, () => next);
    },
    [onUpdateLines]
  );

  const ensureTrailingDraft = (next: SalesWorkspaceLine[]) => {
    const last = next[next.length - 1];
    if (!last || last.itemCatalogId > 0) {
      return [...next, createEmptySalesLine()];
    }
    return next;
  };

  const validateQtyAgainstStock = useCallback(
    async (line: SalesWorkspaceLine, allLines: SalesWorkspaceLine[]) => {
      if (!line.itemCode.trim() || line.stockId <= 0 || line.unitId <= 0) {
        patchLine(line.key, { qtyError: null });
        return;
      }

      const requestId = (qtySeqRef.current.get(line.key) ?? 0) + 1;
      qtySeqRef.current.set(line.key, requestId);

      const unitName = unitShortName(line.unitId, units);
      const sync = checkInvoiceStockAllocation(allLines, line, unitName);
      if (!sync.ok) {
        patchLine(line.key, { qtyError: sync.message });
      } else {
        patchLine(line.key, { qtyError: null });
      }

      // Optional factor check via UnitConversion API; compare vs invoice remaining.
      if (!token) return;

      try {
        const info = await getUnitConversionInfo(
          token,
          line.itemCode.trim(),
          line.unitId,
          line.quantity
        );
        if (qtySeqRef.current.get(line.key) !== requestId) return;

        if (info.errorMessage || info.quantityNet == null) {
          patchLine(line.key, {
            qtyError:
              info.errorMessage || "Unable to validate quantity for this unit.",
          });
          return;
        }

        const remainingBase = invoiceRemainingBaseForStock(
          allLines,
          line.stockId,
          line.availableQty,
          line.key
        );
        if (info.quantityNet > remainingBase) {
          const remainingSelected = invoiceRemainingInSelectedUnit(
            allLines,
            line,
            line.key
          );
          patchLine(line.key, {
            qtyError: formatInvoiceStockInsufficientMessage(
              line,
              remainingSelected,
              remainingBase,
              info.unitName?.trim() || unitName
            ),
          });
          return;
        }

        if (sync.ok) {
          patchLine(line.key, { qtyError: null });
        }
      } catch {
        if (qtySeqRef.current.get(line.key) !== requestId) return;
      }
    },
    [token, patchLine, units]
  );

  const applyUnitPrice = useCallback(
    async (line: SalesWorkspaceLine, unitId: number) => {
      const code = line.itemCode.trim();
      if (!token || !code || unitId <= 0) {
        patchLine(line.key, { unitId });
        return;
      }

      const requestId = (unitSeqRef.current.get(line.key) ?? 0) + 1;
      unitSeqRef.current.set(line.key, requestId);

      const base = line.baseUnitSellPrice;
      patchLine(line.key, { unitId });

      try {
        const info = await getUnitConversionInfo(token, code, unitId, 1);
        if (unitSeqRef.current.get(line.key) !== requestId) return;

        if (info.errorMessage) {
          onToast?.("error", info.errorMessage);
          return;
        }

        const priced = applyPriceQtyNetToBasePrices(0, base, info.priceQtyNet);
        const nextLine: SalesWorkspaceLine = {
          ...line,
          unitId,
          unitSellPrice: money(priced.itmSell),
          priceQtyNet: priced.priceQtyNet,
        };
        patchLine(line.key, {
          unitId,
          unitSellPrice: money(priced.itmSell),
          priceQtyNet: priced.priceQtyNet,
        });
        void validateQtyAgainstStock(nextLine, [
          ...lines.filter((l) => l.key !== line.key),
          nextLine,
        ]);
      } catch {
        if (unitSeqRef.current.get(line.key) !== requestId) return;
        onToast?.("error", "Unit conversion failed.");
      }
    },
    [token, patchLine, onToast, validateQtyAgainstStock, lines]
  );

  // Debounced qty validation when stock/unit/qty change on sellable lines.
  useEffect(() => {
    const timers: number[] = [];
    for (const line of lines) {
      if (line.stockId <= 0 || line.unitId <= 0 || !line.itemCode.trim()) continue;
      const id = window.setTimeout(() => {
        void validateQtyAgainstStock(line, lines);
      }, QTY_VALIDATE_DEBOUNCE_MS);
      timers.push(id);
    }
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
    // Intentionally key off the fields that affect invoice allocation.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- validate by field fingerprints
  }, [
    token,
    lines
      .map(
        (l) =>
          `${l.key}:${l.stockId}:${l.unitId}:${l.quantity}:${l.availableQty}:${l.itemCode}`
      )
      .join("|"),
    validateQtyAgainstStock,
  ]);

  const handleHitSelected = (rowIndex: number, hit: SalesItemSearchHit) => {
    const line = lines[rowIndex];
    if (!line || disabled) return;
    if (!canAddItems) {
      onToast?.("error", "Resolve Sales Man before adding items.");
      return;
    }

    if (stockScope === "Catalog") {
      onToast?.(
        "error",
        "Catalog search is for price lookup. Switch to Current Pharmacy to add a sellable stock line."
      );
      const name = salesItemPrimaryLabel(hit, language);
      patchLine(line.key, {
        searchText: name,
        itemName: name,
        itmNameAr: hit.itmNameAr,
        itmNameEn: hit.itmNameEn,
        itemCode: hit.itmCode,
        itemCatalogId: 0,
        stockId: 0,
        pendingStocks: undefined,
        qtyError: null,
      });
      return;
    }

    if (hit.stocks.length === 0) {
      onToast?.("error", "No stock rows for this item in the selected scope.");
      return;
    }

    if (stockScope === "AllPharmacies") {
      onToast?.(
        "message",
        "Stock from other pharmacies is shown for info; Save requires current-pharmacy stock."
      );
    }

    const unitId = hit.unit1 || hit.unit2 || hit.unit3 || 0;
    if (!unitId) {
      onToast?.("error", "Item has no units configured.");
      return;
    }

    if (hit.stocks.length === 1) {
      const filled = applyStockToLine(line, hit, hit.stocks[0], language);
      const unitName = unitShortName(filled.unitId, units);
      const alloc = checkInvoiceStockAllocation(lines, filled, unitName);
      if (!alloc.ok) {
        onToast?.("error", alloc.message);
        return;
      }
      const next = lines.map((l, i) => (i === rowIndex ? filled : l));
      replaceLines(ensureTrailingDraft(next));
      return;
    }

    const name = salesItemPrimaryLabel(hit, language);
    const catalogBase = money(hit.defPharmPrice || hit.defSellPrice || 0);
    const pending: SalesWorkspaceLine = {
      ...line,
      itemCatalogId: hit.itemCatalogId,
      itemCode: hit.itmCode,
      itmNameAr: hit.itmNameAr,
      itmNameEn: hit.itmNameEn,
      itemName: name,
      searchText: name,
      stockId: 0,
      batchNo: "",
      expDate: null,
      storId: 0,
      availableQty: 0,
      unit1: hit.unit1,
      unit2: hit.unit2,
      unit3: hit.unit3,
      unit1Unit2: hit.unit1Unit2,
      unit1Unit3: hit.unit1Unit3,
      itmMaxDiscPer: hit.itmMaxDiscPer,
      groupNameEn: hit.groupNameEn,
      groupNameAr: hit.groupNameAr,
      unitId,
      baseUnitSellPrice: catalogBase,
      unitSellPrice: catalogBase,
      priceQtyNet: 1,
      qtyError: null,
      pendingStocks: hit.stocks,
    };
    const next = lines.map((l, i) => (i === rowIndex ? pending : l));
    replaceLines(ensureTrailingDraft(next));
  };

  const pickBatch = (line: SalesWorkspaceLine, stockId: number) => {
    const stock = line.pendingStocks?.find((s) => s.stockId === stockId);
    if (!stock) return;
    const base = money(stock.salesPrice || line.baseUnitSellPrice || 0);
    const withStock: SalesWorkspaceLine = {
      ...line,
      stockId: stock.stockId,
      batchNo: stock.batchNo,
      expDate: stock.expDate,
      storId: stock.storId,
      availableQty: stock.availableQty,
      baseUnitSellPrice: base,
      unitSellPrice: money(base * (line.priceQtyNet || 1)),
      pendingStocks: undefined,
      qtyError: null,
    };

    const unitName = unitShortName(withStock.unitId, units);
    const alloc = checkInvoiceStockAllocation(lines, withStock, unitName);
    if (!alloc.ok) {
      onToast?.("error", alloc.message);
      return;
    }

    const limit = lineDiscountLimit(
      { ...withStock, expDate: stock.expDate },
      egyptDateDisplay
    );
    let discountPercent = line.discountPercent;
    let discountValue = line.discountValue;
    if (line.discountMode === "P" && discountPercent > limit.percent) {
      discountPercent = limit.percent;
    }
    if (line.discountMode === "V") {
      const cap = maxDiscountValue(lineGross(withStock), limit.percent);
      if (discountValue > cap) discountValue = cap;
    }

    patchLine(line.key, {
      stockId: withStock.stockId,
      batchNo: withStock.batchNo,
      expDate: withStock.expDate,
      storId: withStock.storId,
      availableQty: withStock.availableQty,
      baseUnitSellPrice: withStock.baseUnitSellPrice,
      unitSellPrice: withStock.unitSellPrice,
      pendingStocks: undefined,
      qtyError: null,
      discountPercent,
      discountValue,
    });
    if (line.unitId > 0 && line.unitId !== line.unit1) {
      void applyUnitPrice(withStock, line.unitId);
    } else {
      void validateQtyAgainstStock(withStock, [
        ...lines.filter((l) => l.key !== line.key),
        withStock,
      ]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="bg-muted/40 border-b text-left">
              <th className="p-2 w-10">#</th>
              <th className="p-2 min-w-[14rem]">Item</th>
              <th className="p-2">Code</th>
              <th className="p-2">Batch</th>
              <th className="p-2">Exp</th>
              <th className="p-2">Unit</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Sales Price</th>
              <th className="p-2">Discount</th>
              <th className="p-2">Total</th>
              <th className="p-2 w-20" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, rowIndex) => {
              const resolved = line.itemCatalogId > 0;
              const sellable = line.stockId > 0;
              const unitOptions = buildRowUnitComboboxOptions(
                units,
                itemUnitFields(line),
                resolved
              );
              return (
                <tr key={line.key} className="border-b align-top">
                  <td className="p-2 text-muted-foreground">{rowIndex + 1}</td>
                  <td className="p-2">
                    {resolved ? (
                      <div className="px-1 py-1.5 font-medium">
                        {displayName(line, language)}
                      </div>
                    ) : (
                      <SalesItemAutocompleteCell
                        rowIndex={rowIndex}
                        value={line.searchText}
                        token={token}
                        language={language}
                        stockScope={stockScope}
                        disabled={disabled || !canAddItems}
                        inputClassName="w-full min-w-0"
                        onFocusRow={() => undefined}
                        onQueryChange={(text) => {
                          if (!canAddItems) {
                            onToast?.(
                              "error",
                              "Resolve Sales Man before adding items."
                            );
                            return;
                          }
                          patchLine(line.key, { searchText: text });
                        }}
                        onHitSelected={(hit) => handleHitSelected(rowIndex, hit)}
                      />
                    )}
                  </td>
                  <td className="p-2">
                    <span className="text-muted-foreground tabular-nums">
                      {line.itemCode || "—"}
                    </span>
                  </td>
                  <td className="p-2">
                    {line.pendingStocks && line.pendingStocks.length > 0 ? (
                      <select
                        className="border-input bg-background h-8 w-full min-w-[9rem] rounded border px-1 text-xs"
                        disabled={disabled}
                        value={line.stockId || ""}
                        onChange={(e) =>
                          pickBatch(line, Number(e.target.value) || 0)
                        }
                      >
                        <option value="">Select batch…</option>
                        {line.pendingStocks.map((s) => {
                          const probe = {
                            ...line,
                            stockId: s.stockId,
                            batchNo: s.batchNo,
                            availableQty: s.availableQty,
                          };
                          const rem = invoiceRemainingInSelectedUnit(
                            lines,
                            probe,
                            line.key
                          );
                          const unitLabel = unitShortName(line.unitId, units);
                          const remLabel =
                            rem != null
                              ? ` · left ${rem} ${unitLabel}`
                              : ` · Avail ${s.availableQty}`;
                          return (
                            <option key={s.stockId} value={s.stockId}>
                              {s.batchNo || "—"}
                              {remLabel}
                              {s.pharmacyName || s.storName
                                ? ` · ${s.pharmacyName || s.storName}`
                                : ""}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <span>{line.batchNo || "—"}</span>
                    )}
                  </td>
                  <td className="p-2">{line.expDate || "—"}</td>
                  <td className="p-2">
                    <select
                      className="border-input bg-background h-8 max-w-[10rem] rounded border px-1 text-xs"
                      disabled={disabled || !resolved || unitsLoading}
                      value={line.unitId || ""}
                      onChange={(e) => {
                        const nextUnitId = Number(e.target.value) || 0;
                        void applyUnitPrice(line, nextUnitId);
                      }}
                    >
                      {unitOptions.length === 0 ? (
                        <option value="">
                          {unitsLoading ? "Loading…" : "—"}
                        </option>
                      ) : (
                        unitOptions.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))
                      )}
                    </select>
                  </td>
                  <td className="p-2">
                    <Input
                      className={cn(
                        gridInputClass,
                        "w-20",
                        line.qtyError ? "border-destructive" : null
                      )}
                      type="number"
                      min={1}
                      max={
                        sellable
                          ? (invoiceRemainingInSelectedUnit(
                              lines,
                              line,
                              line.key
                            ) ?? undefined)
                          : undefined
                      }
                      disabled={disabled || !sellable}
                      value={line.quantity}
                      onChange={(e) => {
                        const nextQty = Math.max(
                          1,
                          Math.trunc(Number(e.target.value) || 1)
                        );
                        const candidate = { ...line, quantity: nextQty };
                        const unitName = unitShortName(line.unitId, units);
                        const alloc = checkInvoiceStockAllocation(
                          lines,
                          candidate,
                          unitName
                        );
                        if (!alloc.ok) {
                          onToast?.("error", alloc.message);
                          patchLine(line.key, {
                            quantity: nextQty,
                            qtyError: alloc.message,
                          });
                          return;
                        }
                        patchLine(line.key, {
                          quantity: nextQty,
                          qtyError: null,
                        });
                      }}
                    />
                    {sellable ? (
                      <div className="text-muted-foreground text-xs">
                        {(() => {
                          const remaining = invoiceRemainingInSelectedUnit(
                            lines,
                            line,
                            line.key
                          );
                          const unitLabel = unitShortName(line.unitId, units);
                          return remaining != null
                            ? `Avail ${remaining} ${unitLabel} (invoice)`
                            : `Avail ${line.availableQty} (base)`;
                        })()}
                      </div>
                    ) : null}
                    {line.qtyError ? (
                      <div className="text-destructive mt-1 text-xs">
                        {line.qtyError}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-2 tabular-nums">
                    {sellable ? line.unitSellPrice.toFixed(2) : "—"}
                  </td>
                  <td className="p-2">
                    {(() => {
                      const limit = lineDiscountLimit(line, egyptDateDisplay);
                      const valueCap = maxDiscountValue(
                        lineGross(line),
                        limit.percent
                      );
                      return (
                    <div className="flex min-w-[9.5rem] flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={disabled || !sellable || rowDiscDisabled}
                        aria-pressed={line.discountMode !== "V"}
                        className="h-8 min-w-[4.5rem] shrink-0 px-2"
                        onClick={() =>
                          patchLine(line.key, {
                            discountMode:
                              line.discountMode === "V" ? "P" : "V",
                          })
                        }
                      >
                        {line.discountMode === "V" ? "Value" : "%"}
                      </Button>
                      <Input
                        className={cn(gridInputClass, "w-20")}
                        type="number"
                        min={0}
                        max={
                          line.discountMode === "V"
                            ? valueCap
                            : limit.percent
                        }
                        step="0.01"
                        disabled={disabled || !sellable || rowDiscDisabled}
                        placeholder={
                          line.discountMode === "V" ? "Amount" : "%"
                        }
                        value={
                          line.discountMode === "V"
                            ? line.discountValue
                            : line.discountPercent
                        }
                        onChange={(e) => {
                          const raw = Number(e.target.value) || 0;
                          if (line.discountMode === "V") {
                            const n = Math.min(Math.max(0, raw), valueCap);
                            if (raw > valueCap) {
                              onToast?.(
                                "error",
                                `Discount cannot exceed ${limit.percent}% MAX.`
                              );
                            }
                            patchLine(line.key, { discountValue: n });
                          } else {
                            const n = Math.min(Math.max(0, raw), limit.percent);
                            if (raw > limit.percent) {
                              onToast?.(
                                "error",
                                `Discount cannot exceed ${limit.percent}% MAX.`
                              );
                            }
                            patchLine(line.key, {
                              discountPercent: n,
                              discountMode: "P",
                            });
                          }
                        }}
                      />
                    </div>
                    {sellable ? (
                      <div className="text-muted-foreground text-xs tabular-nums">
                        {limit.percent}% MAX
                      </div>
                    ) : null}
                    </div>
                      );
                    })()}
                  </td>
                  <td className="p-2 tabular-nums font-medium">
                    {sellable ? lineNet(line).toFixed(2) : "—"}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center">
                      {!disabled && (resolved || line.searchText.trim()) ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Remove line"
                          aria-label="Remove line"
                          onClick={() => {
                            const next = lines.filter((l) => l.key !== line.key);
                            replaceLines(
                              next.length === 0
                                ? [createEmptySalesLine()]
                                : ensureTrailingDraft(next)
                            );
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {resolved && line.itemCatalogId > 0 ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="View stock across pharmacies"
                          aria-label="View stock across pharmacies"
                          onClick={() => setStockSheetLine(line)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!disabled ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canAddItems}
            onClick={() => {
              if (!canAddItems) {
                onToast?.("error", "Resolve Sales Man before adding items.");
                return;
              }
              replaceLines(ensureTrailingDraft(lines));
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add line
          </Button>
          {!canAddItems ? (
            <span className="text-muted-foreground text-xs">
              Enter Sales Man password and press Enter before adding items.
            </span>
          ) : null}
        </div>
      ) : null}
      <SalesItemStockSheet
        open={stockSheetLine != null && stockSheetLine.itemCatalogId > 0}
        onOpenChange={(next) => {
          if (!next) setStockSheetLine(null);
        }}
        token={token}
        language={language}
        units={units}
        line={stockSheetLine}
      />
    </div>
  );
}
