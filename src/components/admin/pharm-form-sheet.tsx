"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PharmFormValues, PharmItem } from "@/types/pharm";
import { emptyPharmFormValues } from "@/types/pharm";
import {
  PharmFormFields,
  pharmItemToFormValues,
} from "@/components/admin/pharm-form-fields";
import { VoucherAttachmentsPanel } from "@/components/admin/voucher-attachments-panel";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type PharmFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PharmItem | null;
  saving?: boolean;
  onSubmit: (values: PharmFormValues) => Promise<void>;
};

export function PharmFormSheet({
  open,
  onOpenChange,
  item,
  saving = false,
  onSubmit,
}: PharmFormSheetProps) {
  const [values, setValues] = useState<PharmFormValues>(emptyPharmFormValues);
  const initializedForIdRef = useRef<number | null>(null);
  const itemId = item?.parmId ?? null;

  // Initialize once when the sheet opens (or when switching to another row).
  // Do NOT reset when `item` gets a new object reference during edit.
  useEffect(() => {
    if (!open) {
      initializedForIdRef.current = null;
      setValues(emptyPharmFormValues);
      return;
    }

    if (!item || itemId == null) return;
    if (initializedForIdRef.current === itemId) return;

    setValues(pharmItemToFormValues(item));
    initializedForIdRef.current = itemId;
  }, [open, itemId, item]);

  const handleChange = useCallback((patch: Partial<PharmFormValues>) => {
    setValues((current) => ({ ...current, ...patch }));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Update pharm</SheetTitle>
          <SheetDescription>
            Edit all Parm fields for #{item?.parmId ?? "—"}.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <PharmFormFields
            values={values}
            onChange={handleChange}
            idPrefix="edit-"
            editingItem={item}
          />
          <VoucherAttachmentsPanel
            variant="card"
            voucherType="Parm"
            voucherId={itemId}
            multiple
            saveFirstMessage="Save the pharm record first to attach documents."
          />
          <SheetFooter className="gap-2 sm:justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
