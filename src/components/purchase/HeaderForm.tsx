"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormFieldInline,
  FormFieldInlineWrap,
  formControlFocusClass,
} from "@/components/ui/form-field-inline";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PurchaseHeaderFormValues } from "@/validation/purchase.schema";

type HeaderFormProps = {
  form: UseFormReturn<PurchaseHeaderFormValues, unknown, PurchaseHeaderFormValues>;
  disabled: boolean;
};

/** Half of default inline label column (9.5rem → ~4.75rem) */
const headerFieldGrid = "sm:grid-cols-[4.75rem_minmax(0,1fr)]";
const headerLabelClass = "text-neutral-950 shrink-0 text-sm font-semibold sm:text-end";
const headerErrorOffset = "sm:pl-[calc(4.75rem+1rem)]";

function ReadonlyMoney({
  id,
  label,
  value,
}: {
  id: string;
  label: string;
  value: number;
}) {
  return (
    <FormFieldInline
      id={id}
      label={label}
      readOnly
      value={value.toFixed(2)}
      className={headerFieldGrid}
      labelClassName={headerLabelClass}
      inputClassName="bg-muted/50 font-medium tabular-nums opacity-90"
    />
  );
}

/** PthId, VenBillNo, VenBillDate, PhtDate — top of page */
export function HeaderPrimaryFields({ form, disabled }: HeaderFormProps) {
  const {
    register,
    formState: { errors },
  } = form;

  const readonlyInput = cn(
    "bg-muted/50 font-medium tabular-nums",
    formControlFocusClass
  );

  const fieldProps = {
    className: headerFieldGrid,
    labelClassName: headerLabelClass,
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <FormFieldInline
        id="pthId"
        label="PthId"
        readOnly
        disabled
        value={form.watch("pthId") ?? ""}
        placeholder="Auto"
        {...fieldProps}
        inputClassName={readonlyInput}
      />
      <div className="space-y-1">
        <FormFieldInline
          id="venBillNo"
          label="VenBillNo"
          disabled={disabled}
          aria-invalid={!!errors.venBillNo}
          {...fieldProps}
          {...register("venBillNo")}
        />
        {errors.venBillNo ? (
          <p className={cn("text-destructive text-sm", headerErrorOffset)}>
            {errors.venBillNo.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-1">
        <FormFieldInline
          id="venBillDate"
          label="VenBillDate"
          type="date"
          disabled={disabled}
          aria-invalid={!!errors.venBillDate}
          {...fieldProps}
          {...register("venBillDate")}
        />
        {errors.venBillDate ? (
          <p className={cn("text-destructive text-sm", headerErrorOffset)}>
            {errors.venBillDate.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-1">
        <FormFieldInline
          id="phtDate"
          label="PhtDate"
          type="date"
          disabled={disabled}
          aria-invalid={!!errors.phtDate}
          {...fieldProps}
          {...register("phtDate")}
        />
        {errors.phtDate ? (
          <p className={cn("text-destructive text-sm", headerErrorOffset)}>
            {errors.phtDate.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Totals, discounts, notice — bottom of page */
export function HeaderTotalsFields({ form, disabled }: HeaderFormProps) {
  const { register } = form;

  const fieldProps = {
    className: headerFieldGrid,
    labelClassName: headerLabelClass,
  };

  return (
    <div className="flex justify-end">
      <div className="w-full max-w-[50%] min-w-[14rem] space-y-3">
        <ReadonlyMoney
          id="noOfItems"
          label="NoOfItems"
          value={form.watch("noOfItems") ?? 0}
        />
        <ReadonlyMoney
          id="totalQuantity"
          label="TotalQuantity"
          value={form.watch("totalQuantity") ?? 0}
        />
        <ReadonlyMoney
          id="totalBill"
          label="TotalBill"
          value={form.watch("totalBill") ?? 0}
        />
        <FormFieldInline
          id="purchExtraDisCount"
          label="PurchExtraDisCount"
          type="number"
          step="0.01"
          disabled={disabled}
          {...fieldProps}
          {...register("purchExtraDisCount")}
        />
        <FormFieldInline
          id="totalDisPer"
          label="TotalDisPer"
          type="number"
          step="0.01"
          disabled={disabled}
          {...fieldProps}
          {...register("totalDisPer")}
        />
        <ReadonlyMoney
          id="totalDesMon"
          label="TotalDesMon"
          value={form.watch("totalDesMon") ?? 0}
        />
        <ReadonlyMoney
          id="totalTax"
          label="TotalTax"
          value={form.watch("totalTax") ?? 0}
        />
        <FormFieldInline
          id="pOtherExpenses"
          label="POtherExpenses"
          type="number"
          step="0.01"
          disabled={disabled}
          {...fieldProps}
          {...register("pOtherExpenses")}
        />
        <ReadonlyMoney
          id="pthNetBill"
          label="PthNetBill"
          value={form.watch("pthNetBill") ?? 0}
        />
        <FormFieldInlineWrap
          id="pthNotice"
          label="PthNotice"
          className={headerFieldGrid}
          labelClassName={headerLabelClass}
        >
          <Textarea
            id="pthNotice"
            rows={3}
            disabled={disabled}
            className={cn("min-h-[4.5rem]", formControlFocusClass)}
            {...register("pthNotice")}
          />
        </FormFieldInlineWrap>
      </div>
    </div>
  );
}
