"use client";

import { useEffect, useMemo, useState } from "react";
import type { SalesPaymentAssimentItem } from "@/types/sales-payment-assiment";
import type { SalesPayMethodCompoItem } from "@/types/sales-pay-method";
import type { PharmItem } from "@/types/pharm";
import type { ComboboxOption } from "@/components/ui/searchable-combobox";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type SalesPaymentAssimentFormValues = {
  pharmId: string;
  spmId: number;
};

export function SalesPaymentAssimentFormSheet({
  open,
  onOpenChange,
  item,
  saving,
  pharmacies,
  pharmacyOptions,
  methods,
  lookupsLoading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SalesPaymentAssimentItem | null;
  saving?: boolean;
  pharmacies: PharmItem[];
  pharmacyOptions: ComboboxOption[];
  methods: SalesPayMethodCompoItem[];
  lookupsLoading?: boolean;
  onSubmit: (values: SalesPaymentAssimentFormValues) => Promise<void>;
}) {
  const [pharmId, setPharmId] = useState("");
  const [spmId, setSpmId] = useState(0);

  useEffect(() => {
    if (open && item) {
      setPharmId(item.pharmId ?? "");
      setSpmId(item.spmId);
    }
  }, [open, item]);

  const sheetPharmacyOptions = useMemo(() => {
    const trimmed = pharmId.trim();
    if (!trimmed || pharmacyOptions.some((o) => o.value === trimmed)) {
      return pharmacyOptions;
    }
    const match = pharmacies.find((p) => String(p.parmId) === trimmed);
    const name = (
      match?.parmEnName ||
      match?.parmArName ||
      item?.pharmName ||
      ""
    ).trim();
    return [
      ...pharmacyOptions,
      {
        value: trimmed,
        label: name ? `${name} (${trimmed})` : `Pharmacy #${trimmed}`,
      },
    ];
  }, [pharmacyOptions, pharmacies, pharmId, item?.pharmName]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ pharmId, spmId });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Update payment assignment</SheetTitle>
          <SheetDescription>
            Assignment #{item?.id ?? "—"}. Each pharmacy may have a method only
            once.
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label>Pharmacy</Label>
              <SearchableCombobox
                value={pharmId}
                onValueChange={setPharmId}
                options={sheetPharmacyOptions}
                placeholder={
                  lookupsLoading ? "Loading pharmacies..." : "Select pharmacy"
                }
                searchPlaceholder="Search pharmacy..."
                emptyMessage="No pharmacies found."
                disabled={lookupsLoading || saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-spmId">Payment method</Label>
              <select
                id="sheet-spmId"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={spmId || ""}
                onChange={(e) => setSpmId(Number(e.target.value))}
                required
              >
                <option value="">Select method</option>
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.paymentName || `#${m.id}`}
                    {m.active ? "" : " (inactive)"}
                  </option>
                ))}
              </select>
            </div>

            <SheetFooter className="px-0 pb-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="update"
                disabled={saving || !pharmId.trim() || !spmId}
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
