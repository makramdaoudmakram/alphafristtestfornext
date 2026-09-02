"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormFieldInline,
  FormFieldInlineWrap,
  formControlFocusClass,
} from "@/components/ui/form-field-inline";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PharmReciveHeaderFormValues } from "@/validation/pharm-recive.schema";

type HeaderFormProps = {
  form: UseFormReturn<PharmReciveHeaderFormValues, unknown, PharmReciveHeaderFormValues>;
  disabled: boolean;
};

const headerFieldGrid = "sm:grid-cols-[4.75rem_minmax(0,1fr)]";
const headerLabelClass = "text-neutral-950 shrink-0 text-sm font-semibold sm:text-end";
const headerErrorOffset = "sm:pl-[calc(4.75rem+1rem)]";

function ReadonlyMoney({ id, label, value }: { id: string; label: string; value: number }) {
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

function ReadonlyCount({ id, label, value }: { id: string; label: string; value: number }) {
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

export function HeaderPrimaryFields({ form, disabled }: HeaderFormProps) {
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
      <div className="hidden">
        <input type="hidden" {...register("id", {
          setValueAs: (value) => {
            if (value === "" || value == null) return null;
            const parsed = Number(value);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
          },
        })} />
        <input type="hidden" {...register("movId", {
          setValueAs: (value) => {
            if (value === "" || value == null) return null;
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
          },
        })} />
        <input type="hidden" {...register("movmentRowId", {
          setValueAs: (value) => {
            if (value === "" || value == null) return null;
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
          },
        })} />
        <input type="hidden" {...register("movStor")} />
        <input type="hidden" {...register("movDis")} />
        <input type="hidden" {...register("accountDept")} />
        <input type="hidden" {...register("accountCREDIT")} />
      </div>
      <div className="space-y-1">
        <FormFieldInline
          id="fathId"
          label="Serial"
          type="number"
          inputMode="numeric"
          disabled={disabled}
          placeholder="Select movement…"
          readOnly
          inputClassName="bg-muted/50 font-medium tabular-nums opacity-90"
          aria-invalid={!!errors.fathId}
          {...fieldProps}
          {...register("fathId", {
            setValueAs: (value) => {
              if (value === "" || value == null) return null;
              const parsed = Number(value);
              return Number.isFinite(parsed) ? parsed : null;
            },
          })}
        />
        {errors.fathId ? (
          <p className={cn("text-destructive text-sm", headerErrorOffset)}>
            {errors.fathId.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-1">
        <FormFieldInline
          id="movDate"
          label="Date"
          type="date"
          readOnly
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onKeyDown={(event) => event.preventDefault()}
          inputClassName="bg-muted/50 font-medium tabular-nums opacity-90 pointer-events-none"
          aria-invalid={!!errors.movDate}
          {...fieldProps}
          {...register("movDate")}
        />
        {errors.movDate ? (
          <p className={cn("text-destructive text-sm", headerErrorOffset)}>
            {errors.movDate.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function HeaderTotalsFields({ form }: HeaderFormProps) {
  const { register } = form;

  return (
    <div className="w-full min-w-0 space-y-3">
      <ReadonlyCount
        id="movTotalqunt"
        label="Total Qty"
        value={form.watch("movTotalqunt") ?? 0}
      />
      <ReadonlyMoney
        id="movTotalSalesPrice"
        label="Total Price"
        value={form.watch("movTotalSalesPrice") ?? 0}
      />
      <FormFieldInlineWrap
        id="monNote"
        label="Note"
        className={headerFieldGrid}
        labelClassName={headerLabelClass}
      >
        <Textarea
          id="monNote"
          rows={3}
          disabled={form.formState.disabled}
          className={cn("min-h-[4.5rem]", formControlFocusClass)}
          {...register("monNote")}
        />
      </FormFieldInlineWrap>
    </div>
  );
}
