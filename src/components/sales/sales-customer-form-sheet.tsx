"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  CustomerFormFields,
  customerToFormValues,
  emptyCustomerForm,
  formValuesToRequest,
  type CustomerFormValues,
} from "@/components/admin/customer-form-fields";
import { getNextCustomerCode } from "@/lib/customer-api";
import type { CustomerItem } from "@/types/customer";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type SalesCustomerFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CustomerItem | null;
  token: string | null;
  saving?: boolean;
  onSubmit: (values: ReturnType<typeof formValuesToRequest>) => Promise<void>;
};

export function SalesCustomerFormSheet({
  open,
  onOpenChange,
  item,
  token,
  saving = false,
  onSubmit,
}: SalesCustomerFormSheetProps) {
  const [values, setValues] = useState<CustomerFormValues>(emptyCustomerForm);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [previewCustCode, setPreviewCustCode] = useState<number | null>(null);
  const isEdit = item != null && item.custCode > 0;

  useEffect(() => {
    if (!open) return;

    if (isEdit && item) {
      setValues(customerToFormValues(item));
      return;
    }

    setValues(emptyCustomerForm);
    setPreviewCustCode(null);
    if (!token) return;

    let cancelled = false;
    setLoadingMeta(true);
    void getNextCustomerCode(token)
      .then((next) => {
        if (cancelled) return;
        setPreviewCustCode(next.nextCustCode);
      })
      .finally(() => {
        if (!cancelled) setLoadingMeta(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, item, token]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!values.custNameAr.trim() && !values.custNameEn.trim()) {
      return;
    }
    await onSubmit(formValuesToRequest(values));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit customer" : "Add customer"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the customer record in the Customer table."
              : "Create a customer record. Customer Code is assigned automatically when saved."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 px-4 pb-4">
          {loadingMeta ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading next customer code…
            </div>
          ) : null}

          <CustomerFormFields
            values={values}
            onChange={setValues}
            accountRequired={false}
            previewCustCode={previewCustCode}
            editCustCode={isEdit ? item?.custCode : null}
          />

          <SheetFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                saving ||
                loadingMeta ||
                (!values.custNameAr.trim() && !values.custNameEn.trim())
              }
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create customer"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
