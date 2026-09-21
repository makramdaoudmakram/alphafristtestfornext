"use client";

import { useEffect, useState } from "react";
import type { SalesKindAssignmentItem } from "@/types/sales-kind-assignment";
import type { SalesKindCompoItem } from "@/types/sales-kind";
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

export type SalesKindAssignmentFormValues = {
  pharmId: number;
  salesKindId: number;
  active: boolean;
};

export function SalesKindAssignmentFormSheet({
  open,
  onOpenChange,
  item,
  saving,
  pharmacies,
  salesKinds,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SalesKindAssignmentItem | null;
  saving?: boolean;
  pharmacies: PharmItem[];
  salesKinds: SalesKindCompoItem[];
  onSubmit: (values: SalesKindAssignmentFormValues) => Promise<void>;
}) {
  const [pharmId, setPharmId] = useState(0);
  const [salesKindId, setSalesKindId] = useState(0);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open && item) {
      setPharmId(item.pharmId);
      setSalesKindId(item.salesKindId);
      setActive(item.active);
    }
  }, [open, item]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ pharmId, salesKindId, active });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Update sales kind assignment</SheetTitle>
          <SheetDescription>
            Assignment #{item?.id ?? "—"}. Each pharmacy may have a sales kind
            only once.
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
              <Label htmlFor="sheet-salesKindId">Sales kind</Label>
              <select
                id="sheet-salesKindId"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={salesKindId || ""}
                onChange={(e) => setSalesKindId(Number(e.target.value) || 0)}
                required
              >
                <option value="">Select sales kind</option>
                {salesKinds.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.salesKindName || `#${k.id}`}
                    {k.isActive ? "" : " (inactive)"}
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
