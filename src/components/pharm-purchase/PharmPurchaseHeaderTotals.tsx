"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormFieldInline,
  formControlFocusClass,
} from "@/components/ui/form-field-inline";
import { cn } from "@/lib/utils";
import type { PurchaseHeaderFormValues } from "@/validation/purchase.schema";

const headerFieldGrid = "sm:grid-cols-[4.75rem_minmax(0,1fr)]";
const headerLabelClass = "text-neutral-950 shrink-0 text-sm font-semibold sm:text-end";

type PharmPurchaseHeaderTotalsProps = {
  form: UseFormReturn<PurchaseHeaderFormValues, unknown, PurchaseHeaderFormValues>;
  totalSalesValue: number;
  totalDiscount: number;
};

export function PharmPurchaseHeaderTotals({
  form,
  totalSalesValue,
  totalDiscount,
}: PharmPurchaseHeaderTotalsProps) {
  const totalQuantity = form.watch("totalQuantity") ?? 0;
  const netTotal = form.watch("pthNetBill") ?? 0;

  return (
    <div className="grid gap-3">
      <FormFieldInline
        id="pharm-total-qty"
        label="Total Qty"
        readOnly
        value={String(totalQuantity)}
        className={headerFieldGrid}
        labelClassName={headerLabelClass}
        inputClassName="bg-muted/50 font-medium tabular-nums opacity-90"
      />
      <FormFieldInline
        id="pharm-total-sales"
        label="Sales Value"
        readOnly
        value={totalSalesValue.toFixed(2)}
        className={headerFieldGrid}
        labelClassName={headerLabelClass}
        inputClassName="bg-muted/50 font-medium tabular-nums opacity-90"
      />
      <FormFieldInline
        id="pharm-total-discount"
        label="Discount"
        readOnly
        value={totalDiscount.toFixed(2)}
        className={headerFieldGrid}
        labelClassName={headerLabelClass}
        inputClassName="bg-muted/50 font-medium tabular-nums opacity-90"
      />
      <FormFieldInline
        id="pharm-net-total"
        label="Net Total"
        readOnly
        value={netTotal.toFixed(2)}
        className={headerFieldGrid}
        labelClassName={headerLabelClass}
        inputClassName="bg-muted/50 font-semibold tabular-nums opacity-90"
      />
      <FormFieldInline
        id="pthNotice"
        label="Notice"
        disabled={false}
        className={headerFieldGrid}
        labelClassName={headerLabelClass}
        inputClassName={cn(formControlFocusClass)}
        {...form.register("pthNotice")}
      />
    </div>
  );
}
