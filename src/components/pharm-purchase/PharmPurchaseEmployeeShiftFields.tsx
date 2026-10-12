"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  FormFieldInlineWrap,
  formControlFocusClass,
} from "@/components/ui/form-field-inline";
import { Input } from "@/components/ui/input";
import { lookupSalesManByPassword } from "@/lib/api-client";
import { EMPLOY_TYPE_EMPLOY } from "@/lib/employ-info-enums";
import type { PurchaseHeaderFormValues } from "@/validation/purchase.schema";

const fieldGrid = "sm:grid-cols-[6.5rem_minmax(0,1fr)]";
const fieldLabel = "text-neutral-950 shrink-0 text-sm font-semibold sm:text-end";

/** Fixed strings only — never echo the entered code or a raw API error body. */
const EMPLOYEE_NOT_FOUND = "Employee not found.";
const EMPLOYEE_LOOKUP_FAILED = "Employee lookup failed. Try again.";
const EMPLOYEE_CODE_REQUIRED = "Enter the employee code.";
const EMPLOYEE_SESSION_MISSING = "Sign in again to check the employee code.";

type ResolvedEmployee = {
  employId: number;
  name: string;
  code: string;
};

type PharmPurchaseEmployeeShiftFieldsProps = {
  form: UseFormReturn<PurchaseHeaderFormValues, unknown, PurchaseHeaderFormValues>;
  disabled: boolean;
  token: string | undefined;
  /**
   * Sc_Id of the shift open for the active pharmacy, from the same Shift/current call
   * the Sales page uses. The server resolves the shift itself; this is display only.
   */
  openShiftNumber: number | null;
};

export function PharmPurchaseEmployeeShiftFields({
  form,
  disabled,
  token,
  openShiftNumber,
}: PharmPurchaseEmployeeShiftFieldsProps) {
  const employCode = form.watch("employCode");
  const loadedEmployName = form.watch("employName");
  const storedShiftNumber = form.watch("shitNo");

  const [resolved, setResolved] = useState<ResolvedEmployee | null>(null);
  const [draftCode, setDraftCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);

  const locallyResolvedIdRef = useRef<number | null>(null);

  // The form value is the source of truth: reloads, New and saves all reset it.
  useEffect(() => {
    if (employCode == null) {
      locallyResolvedIdRef.current = null;
      setResolved(null);
      setDraftCode("");
      setEmployeeError(null);
      return;
    }
    if (locallyResolvedIdRef.current === employCode) return;
    // Loaded from the server: only the stored EmployInfo.Id is available.
    setResolved(null);
  }, [employCode]);

  const resolveEmployee = useCallback(async () => {
    const entered = draftCode.trim();
    if (!entered) {
      setEmployeeError(EMPLOYEE_CODE_REQUIRED);
      return;
    }
    if (!token) {
      setEmployeeError(EMPLOYEE_SESSION_MISSING);
      return;
    }

    setChecking(true);
    setEmployeeError(null);
    try {
      const employee = await lookupSalesManByPassword(token, entered);
      if (!employee?.id || employee.employType !== EMPLOY_TYPE_EMPLOY) {
        setEmployeeError(EMPLOYEE_NOT_FOUND);
        return;
      }
      locallyResolvedIdRef.current = employee.id;
      setResolved({
        employId: employee.id,
        name: employee.name?.trim() ?? "",
        code: employee.code?.trim() ?? "",
      });
      form.setValue("employCode", employee.id, {
        shouldDirty: true,
        shouldValidate: true,
      });
      toast.success("Employee loaded.");
    } catch {
      setEmployeeError(EMPLOYEE_LOOKUP_FAILED);
    } finally {
      // The code is a PIN: it never stays in the field or in any state.
      setDraftCode("");
      setChecking(false);
    }
  }, [draftCode, form, token]);

  const clearEmployee = useCallback(() => {
    if (disabled) return;
    locallyResolvedIdRef.current = null;
    setResolved(null);
    setDraftCode("");
    setEmployeeError(null);
    form.setValue("employCode", null, { shouldDirty: true, shouldValidate: true });
  }, [disabled, form]);

  const recordId = form.watch("id");

  // Name from a fresh lookup wins, then the name returned with the stored document,
  // then the employee number alone (the employee row may no longer exist).
  const employeeLabel = resolved
    ? `${resolved.name || "—"}${resolved.code ? ` (${resolved.code})` : ""}`
    : loadedEmployName?.trim()
      ? loadedEmployName.trim()
      : employCode != null
        ? `Employ #${employCode}`
        : "";

  // A saved document only shows its stored shift; a new one shows what the server will assign.
  const shownShift = storedShiftNumber ?? (recordId == null ? openShiftNumber : null);

  const shiftHint =
    shownShift != null
      ? "Set by the server from the open shift. Cannot be changed."
      : recordId == null
        ? "No open shift for this pharmacy. Open a shift before saving."
        : "This purchase was saved without a shift.";

  return (
    <div className="grid gap-3 md:grid-cols-2 md:items-start">
      <div className="space-y-1.5">
        <FormFieldInlineWrap
          id="pharm-employ-code"
          label="Employee Code"
          className={fieldGrid}
          labelClassName={fieldLabel}
        >
          {employCode != null ? (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 break-words">{employeeLabel}</span>
                {!disabled ? (
                  <Button type="button" size="sm" variant="outline" onClick={clearEmployee}>
                    Change
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <Input
              id="pharm-employ-code"
              name="pharm-purchase-statement-reference"
              type="password"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="text"
              placeholder="Enter employee code"
              value={draftCode}
              disabled={disabled || checking}
              onChange={(event) => {
                setDraftCode(event.target.value);
                if (employeeError) setEmployeeError(null);
              }}
              onBlur={() => {
                if (draftCode.trim() && !checking) void resolveEmployee();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void resolveEmployee();
                }
              }}
              className={formControlFocusClass}
            />
          )}
        </FormFieldInlineWrap>
        {employeeError ? (
          <p className="text-destructive text-sm">{employeeError}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <FormFieldInlineWrap
          id="pharm-shit-no"
          label="Shift No."
          className={fieldGrid}
          labelClassName={fieldLabel}
        >
          <Input
            id="pharm-shit-no"
            name="pharm-purchase-shift-no"
            inputMode="numeric"
            autoComplete="off"
            value={shownShift != null ? String(shownShift) : ""}
            disabled
            readOnly
            tabIndex={-1}
            placeholder="—"
          />
        </FormFieldInlineWrap>
        <p className="text-muted-foreground text-xs">{shiftHint}</p>
      </div>
    </div>
  );
}
