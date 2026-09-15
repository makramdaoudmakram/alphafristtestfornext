"use client";

import { useEffect, useState } from "react";
import type { SalesServiceAssignmentItem } from "@/types/sales-service-assignment";
import type { SalesServiceCompoItem } from "@/types/sales-service";
import type { PharmItem } from "@/types/pharm";
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

export type SalesServiceAssignmentFormValues = {
  pharmId: number;
  salesServiceId: number;
  active: boolean;
};

export function SalesServiceAssignmentFormSheet({
  open,
  onOpenChange,
  item,
  saving,
  pharmacies,
  services,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SalesServiceAssignmentItem | null;
  saving?: boolean;
  pharmacies: PharmItem[];
  services: SalesServiceCompoItem[];
  onSubmit: (values: SalesServiceAssignmentFormValues) => Promise<void>;
}) {
  const [pharmId, setPharmId] = useState(0);
  const [salesServiceId, setSalesServiceId] = useState(0);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open && item) {
      setPharmId(item.pharmId);
      setSalesServiceId(item.salesServiceId);
      setActive(item.active);
    }
  }, [open, item]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ pharmId, salesServiceId, active });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Update service assignment</SheetTitle>
          <SheetDescription>
            Assignment #{item?.id ?? "—"}. Each pharmacy may have a service only
            once.
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <div className="space-y-2">
              <Label htmlFor="sheet-pharmId">Pharmacy</Label>
              <select
                id="sheet-pharmId"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={pharmId || ""}
                onChange={(e) => setPharmId(Number(e.target.value) || 0)}
                required
              >
                <option value="">Select pharmacy</option>
                {pharmacies.map((p) => (
                  <option key={p.parmId} value={p.parmId}>
                    {p.parmEnName || p.parmArName || p.parmId}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-salesServiceId">Sales service</Label>
              <select
                id="sheet-salesServiceId"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={salesServiceId || ""}
                onChange={(e) => setSalesServiceId(Number(e.target.value) || 0)}
                required
              >
                <option value="">Select service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.serviceName || `#${s.id}`} · {s.serviceType} ·{" "}
                    {s.cost.toFixed(2)}
                    {s.active ? "" : " (inactive)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="sheet-active"
                type="checkbox"
                className="size-4"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <Label htmlFor="sheet-active">Active</Label>
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
              <Button type="submit" variant="update" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
