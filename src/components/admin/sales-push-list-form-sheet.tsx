"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { SalesItemAutocompleteCell } from "@/components/sales/SalesItemAutocompleteCell";
import { ItemLanguageToggle } from "@/components/pharm-recive/ItemLanguageToggle";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  formatSalesPushListBatchLabel,
  getSalesPushListBatches,
} from "@/lib/sales-push-list-api";
import {
  displaySearchText,
  duplicateKey,
  emptyFormValues,
  validateFormValues,
} from "@/lib/sales-push-list-validation";
import type {
  SalesPushListBatchOption,
  SalesPushListFormValues,
  SalesPushListItem,
  SalesPushListSheetRow,
} from "@/types/sales-push-list";
import type { SalesItemSearchHit, SalesSearchLanguage } from "@/types/sales-workspace";
import type { PharmReciveItemLanguage } from "@/types/pharm-recive";

function languageToToggle(value: SalesSearchLanguage): PharmReciveItemLanguage {
  return value === "Arabic" ? "ar" : "en";
}

function toggleToLanguage(value: PharmReciveItemLanguage): SalesSearchLanguage {
  return value === "ar" ? "Arabic" : "English";
}

function itemToForm(item: SalesPushListItem): SalesPushListFormValues {
  return {
    itemCode: item.itemCode,
    arabicName: item.arabicName,
    englishName: item.englishName,
    searchText: displaySearchText(item),
    batchNo: item.batchNo,
    percent: item.percent,
    comection: item.comection,
    startdate: item.startdate,
    endDate: item.endDate,
    active: item.active,
  };
}

export function SalesPushListFormSheet({
  open,
  onOpenChange,
  mode,
  editItem,
  saving,
  onSaveNew,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "new" | "edit";
  editItem: SalesPushListItem | null;
  saving: boolean;
  onSaveNew: (rows: SalesPushListFormValues[]) => Promise<void>;
  onUpdate: (values: SalesPushListFormValues) => Promise<void>;
}) {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const seq = useRef(1);
  const [language, setLanguage] = useState<SalesSearchLanguage>("English");
  const [rows, setRows] = useState<SalesPushListSheetRow[]>([]);

  useEffect(() => {
    if (!open) return;
    seq.current = 1;
    if (mode === "edit" && editItem) {
      setRows([
        {
          clientId: `spl-${seq.current++}`,
          ...itemToForm(editItem),
          errors: [],
        },
      ]);
      return;
    }
    setRows([
      {
        clientId: `spl-${seq.current++}`,
        ...emptyFormValues(),
        errors: [],
      },
    ]);
  }, [open, mode, editItem]);

  function updateRow(clientId: string, patch: Partial<SalesPushListFormValues>) {
    setRows((current) =>
      current.map((row) =>
        row.clientId === clientId ? { ...row, ...patch, errors: [] } : row
      )
    );
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        clientId: `spl-${seq.current++}`,
        ...emptyFormValues(),
        errors: [],
      },
    ]);
  }

  function removeRow(clientId: string) {
    setRows((current) =>
      current.length <= 1
        ? current
        : current.filter((row) => row.clientId !== clientId)
    );
  }

  function selectItem(clientId: string, hit: SalesItemSearchHit) {
    updateRow(clientId, {
      itemCode: hit.itmCode.trim(),
      arabicName: hit.itmNameAr.trim(),
      englishName: hit.itmNameEn.trim(),
      batchNo: "",
      searchText: displaySearchText({
        itemCode: hit.itmCode,
        arabicName: hit.itmNameAr,
        englishName: hit.itmNameEn,
      }),
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next = rows.map((row) => ({
      ...row,
      errors: validateFormValues(row),
    }));

    const keys = new Map<string, string[]>();
    next.forEach((row) => {
      if (!row.itemCode.trim() || !row.startdate || !row.endDate) return;
      const key = duplicateKey(row);
      const list = keys.get(key) ?? [];
      list.push(row.clientId);
      keys.set(key, list);
    });
    for (const ids of keys.values()) {
      if (ids.length < 2) continue;
      for (const id of ids) {
        const row = next.find((item) => item.clientId === id);
        if (row && !row.errors.includes("Duplicate record")) {
          row.errors.push("Duplicate record");
        }
      }
    }

    setRows(next);
    if (next.some((row) => row.errors.length > 0)) return;

    if (mode === "edit") {
      await onUpdate(next[0]);
      return;
    }
    await onSaveNew(next);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {mode === "edit"
              ? `Edit Sales Push List #${editItem?.id ?? ""}`
              : "New Sales Push List"}
          </SheetTitle>
          <SheetDescription>
            {mode === "edit"
              ? "Update this saved row. Names come from the item catalog."
              : "Add one or many rows. Nothing is saved until you click Save Rows."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4 pb-4">
          <ItemLanguageToggle
            compact
            value={languageToToggle(language)}
            onChange={(value) => setLanguage(toggleToLanguage(value))}
            disabled={saving}
          />

          {rows.map((row, index) => (
            <div key={row.clientId} className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Row {index + 1}</p>
                {mode === "new" && rows.length > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeRow(row.clientId)}
                    disabled={saving}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Item</Label>
                <SalesItemAutocompleteCell
                  rowIndex={index}
                  value={row.searchText}
                  token={token}
                  language={language}
                  stockScope="Catalog"
                  disabled={saving}
                  onFocusRow={() => undefined}
                  onQueryChange={(text) =>
                    updateRow(row.clientId, {
                      searchText: text,
                      itemCode: "",
                      arabicName: "",
                      englishName: "",
                      batchNo: "",
                    })
                  }
                  onHitSelected={(hit) => selectItem(row.clientId, hit)}
                />
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <p>
                  <span className="text-muted-foreground">Code: </span>
                  {row.itemCode || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Arabic Name: </span>
                  {row.arabicName || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">English Name: </span>
                  {row.englishName || "—"}
                </p>
              </div>

              <div className="space-y-2">
                <Label>BatchNo</Label>
                <SalesPushListBatchCombobox
                  itemCode={row.itemCode}
                  batchNo={row.batchNo}
                  disabled={saving || !row.itemCode}
                  token={token}
                  onChange={(batchNo) => updateRow(row.clientId, { batchNo })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`percent-${row.clientId}`}>Discount %</Label>
                  <Input
                    id={`percent-${row.clientId}`}
                    type="number"
                    step="any"
                    value={Number.isFinite(row.percent) ? row.percent : ""}
                    onChange={(e) =>
                      updateRow(row.clientId, {
                        percent:
                          e.target.value === "" ? Number.NaN : Number(e.target.value),
                      })
                    }
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`comection-${row.clientId}`}>Discount Value</Label>
                  <Input
                    id={`comection-${row.clientId}`}
                    type="number"
                    step="any"
                    value={Number.isFinite(row.comection) ? row.comection : ""}
                    onChange={(e) =>
                      updateRow(row.clientId, {
                        comection:
                          e.target.value === "" ? Number.NaN : Number(e.target.value),
                      })
                    }
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`start-${row.clientId}`}>Start Date</Label>
                  <Input
                    id={`start-${row.clientId}`}
                    type="date"
                    value={row.startdate}
                    onChange={(e) =>
                      updateRow(row.clientId, { startdate: e.target.value })
                    }
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`end-${row.clientId}`}>End Date</Label>
                  <Input
                    id={`end-${row.clientId}`}
                    type="date"
                    value={row.endDate}
                    onChange={(e) =>
                      updateRow(row.clientId, { endDate: e.target.value })
                    }
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id={`active-${row.clientId}`}
                  type="checkbox"
                  className="size-4"
                  checked={row.active}
                  onChange={(e) =>
                    updateRow(row.clientId, { active: e.target.checked })
                  }
                  disabled={saving}
                />
                <Label htmlFor={`active-${row.clientId}`}>Active</Label>
              </div>

              {row.errors.length > 0 ? (
                <div className="text-destructive text-sm">
                  {row.errors.map((error) => (
                    <p key={error}>
                      Row {index + 1}: {error}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {mode === "new" ? (
            <Button type="button" variant="outline" onClick={addRow} disabled={saving}>
              Add Row
            </Button>
          ) : null}

          <SheetFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : mode === "edit"
                  ? "Update"
                  : "Save Rows"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function SalesPushListBatchCombobox({
  itemCode,
  batchNo,
  disabled,
  token,
  onChange,
}: {
  itemCode: string;
  batchNo: string;
  disabled: boolean;
  token?: string | null;
  onChange: (batchNo: string) => void;
}) {
  const [options, setOptions] = useState<SalesPushListBatchOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !itemCode.trim()) {
      setOptions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void getSalesPushListBatches(token, itemCode.trim())
      .then((rows) => {
        if (!cancelled) setOptions(rows);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, itemCode]);

  const comboboxOptions = options.map((option) => ({
    value: option.batchNo,
    label: formatSalesPushListBatchLabel(option),
  }));

  return (
    <SearchableCombobox
      value={batchNo}
      onValueChange={onChange}
      options={comboboxOptions}
      disabled={disabled || loading}
      placeholder={
        !itemCode
          ? "Select an item first"
          : loading
            ? "Loading batches..."
            : "Select BatchNo"
      }
      searchPlaceholder="Search BatchNo..."
      emptyMessage="No available batches"
      orphanLabel={batchNo ? batchNo : null}
    />
  );
}
