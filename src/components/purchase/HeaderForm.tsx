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
  totalDesMon?: number;
  hideVendorBillFields?: boolean;
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

function ReadonlyCount({
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
      value={String(value)}
      className={headerFieldGrid}
      labelClassName={headerLabelClass}
      inputClassName="bg-muted/50 font-medium tabular-nums opacity-90"
    />
  );
}

/** PthId, VenBillNo, VenBillDate, PhtDate — top of page */
export function HeaderPrimaryFields({
  form,
  disabled,
  hideVendorBillFields = false,
}: HeaderFormProps) {
  const {
    register,
    formState: { errors },
  } = form;

  const fieldProps = {
    className: headerFieldGrid,
    labelClassName: headerLabelClass,
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* Keep movement-mapped header fields registered so zodResolver does not wipe them */}
      <div className="hidden">
        <input type="hidden" {...register("id", {
        setValueAs: (value) => {
          if (value === "" || value == null) return null;
          const parsed = Number(value);
          return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        },
      })} />
      <input
        type="hidden"
        {...register("movId", {
          setValueAs: (value) => {
            if (value === "" || value == null) return null;
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
          },
        })}
      />
      <input
        type="hidden"
        {...register("movmentRowId", {
          setValueAs: (value) => {
            if (value === "" || value == null) return null;
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
          },
        })}
      />
      <input type="hidden" {...register("venId")} />
      <input type="hidden" {...register("movAccount")} />
      <input type="hidden" {...register("movAccountsec")} />
      <input type="hidden" {...register("movAccounttherd")} />
      <input type="hidden" {...register("movAccountfourth")} />
      <input
        type="hidden"
        {...register("totalDesMon", {
          setValueAs: (value) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : 0;
          },
        })}
      />
      </div>
      <div className="space-y-1">
        <FormFieldInline
          id="pthId"
          label="PthId"
          type="number"
          inputMode="numeric"
          disabled={disabled}
          placeholder="Select movement…"
          readOnly
          inputClassName="bg-muted/50 font-medium tabular-nums opacity-90"
          aria-invalid={!!errors.pthId}
          {...fieldProps}
          {...register("pthId", {
            setValueAs: (value) => {
              if (value === "" || value == null) return null;
              const parsed = Number(value);
              return Number.isFinite(parsed) ? parsed : null;
            },
          })}
        />
        {errors.pthId ? (
          <p className={cn("text-destructive text-sm", headerErrorOffset)}>
            {errors.pthId.message}
          </p>
        ) : null}
      </div>
      {hideVendorBillFields ? (
        <div className="hidden">
          <input type="hidden" {...register("venBillNo")} />
          <input type="hidden" {...register("venBillDate")} />
        </div>
      ) : (
        <>
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
        </>
      )}
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
export function HeaderTotalsFields({ form, disabled, totalDesMon }: HeaderFormProps) {
  const { register, setValue } = form;

  const purchExtraDisCountField = register("purchExtraDisCount");
  const pOtherExpensesField = register("pOtherExpenses");

  const fieldProps = {
    className: headerFieldGrid,
    labelClassName: headerLabelClass,
  };

  const totalDesMonValue = totalDesMon ?? form.watch("totalDesMon") ?? 0;

  return (
    <div className="w-full min-w-0 space-y-3">
        <ReadonlyCount
          id="noOfItems"
          label="No. of Items"
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
          label="Extra Disc"
          type="number"
          step="0.01"
          disabled={disabled}
          {...fieldProps}
          name={purchExtraDisCountField.name}
          ref={purchExtraDisCountField.ref}
          onBlur={purchExtraDisCountField.onBlur}
          onChange={(event) => {
            void purchExtraDisCountField.onChange(event);
            setValue("pOtherExpenses", 0, { shouldDirty: true });
          }}
        />
        <div className="hidden">
          <FormFieldInline
            id="totalDisPer"
            label="TotalDisPer"
            type="number"
            step="0.01"
            disabled={disabled}
            {...fieldProps}
            {...register("totalDisPer")}
          />
        </div>
        <div className="hidden">
          <ReadonlyMoney
            id="totalDesMon"
            label="TotalDesMon"
            value={totalDesMonValue}
          />
        </div>
        <ReadonlyMoney
          id="totalTax"
          label="TotalTax"
          value={form.watch("totalTax") ?? 0}
        />
        <FormFieldInline
          id="pOtherExpenses"
          label="Perc Disc"
          type="number"
          step="0.01"
          min={0}
          max={100}
          disabled={disabled}
          {...fieldProps}
          name={pOtherExpensesField.name}
          ref={pOtherExpensesField.ref}
          onBlur={pOtherExpensesField.onBlur}
          onChange={(event) => {
            void pOtherExpensesField.onChange(event);
            setValue("purchExtraDisCount", 0, { shouldDirty: true });
          }}
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
  );
}
