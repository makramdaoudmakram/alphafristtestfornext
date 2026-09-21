"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageGuard } from "@/components/permissions/page-guard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import { ApiError } from "@/lib/api-client";
import {
  getPharmExpenseContext,
  savePharmExpensesBulk,
} from "@/lib/pharm-expense-api";
import { PERMISSIONS } from "@/lib/route-permissions";
import { cn } from "@/lib/utils";
import type { PharmExpenseContext } from "@/types/pharm-expense";

type ExpenseRow = {
  key: string;
  expensesDisc: string;
  expensesVal: string;
};

const DESCRIPTION_MAX = 70;
const gridInputClass = cn("h-8 w-full min-w-0", formControlFocusClass);

function newRow(): ExpenseRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    expensesDisc: "",
    expensesVal: "",
  };
}

function isBlankRow(row: ExpenseRow) {
  return !row.expensesDisc.trim() && !row.expensesVal.trim();
}

function parseExpenseValue(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Expense Value is required." };
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { ok: false, error: "Expense Value is not a valid number." };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, error: "Expense Value is not a valid number." };
  }
  if (value <= 0) {
    return { ok: false, error: "Expense Value must be greater than zero." };
  }
  return { ok: true, value };
}

export function PharmExpensesPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken ?? null;
  const sessionReady = status !== "loading";

  const [contextLoading, setContextLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [context, setContext] = useState<PharmExpenseContext | null>(null);
  const [rows, setRows] = useState<ExpenseRow[]>([newRow()]);
  const lastDescRef = useRef<HTMLInputElement | null>(null);
  const focusNextDesc = useRef(false);

  const loadContext = useCallback(async () => {
    if (!token) {
      setContext(null);
      setContextLoading(false);
      return;
    }

    setContextLoading(true);
    try {
      setContext(await getPharmExpenseContext(token));
    } catch (error) {
      setContext(null);
      toast.error(
        error instanceof Error ? error.message : "Failed to load pharmacy/shift context."
      );
    } finally {
      setContextLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadContext();
  }, [sessionReady, loadContext]);

  useEffect(() => {
    if (!focusNextDesc.current) return;
    focusNextDesc.current = false;
    lastDescRef.current?.focus();
  }, [rows]);

  const contextReady = !contextLoading && !!context?.canSave;
  const contextError = context?.error ?? null;

  const parsedRows = useMemo(() => {
    return rows.map((row, index) => {
      if (isBlankRow(row)) {
        return { row, blank: true as const };
      }
      const disc = row.expensesDisc.trim();
      if (!disc) {
        return { row, blank: false as const, error: `Row ${index + 1}: Expense Description is required.` };
      }
      if (disc.length > DESCRIPTION_MAX) {
        return {
          row,
          blank: false as const,
          error: `Row ${index + 1}: Expense Description cannot exceed ${DESCRIPTION_MAX} characters.`,
        };
      }
      const parsed = parseExpenseValue(row.expensesVal);
      if (!parsed.ok) {
        return { row, blank: false as const, error: `Row ${index + 1}: ${parsed.error}` };
      }
      return {
        row,
        blank: false as const,
        value: parsed.value,
        disc,
      };
    });
  }, [rows]);

  const filled = parsedRows.filter((r) => !r.blank);
  const firstError = filled.find((r) => "error" in r && r.error)?.error ?? null;
  const validItems = filled.flatMap((r) =>
    "value" in r && r.value != null && r.disc
      ? [{ expensesDisc: r.disc, expensesVal: r.value }]
      : []
  );

  const total = validItems.reduce((sum, item) => sum + item.expensesVal, 0);

  function patchRow(key: string, patch: Partial<ExpenseRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    focusNextDesc.current = true;
    setRows((prev) => [...prev, newRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => {
      const next = prev.filter((row) => row.key !== key);
      return next.length > 0 ? next : [newRow()];
    });
  }

  async function handleSaveAll() {
    if (!token || saving || !contextReady) return;

    const nonBlank = parsedRows.filter((r) => !r.blank);
    if (nonBlank.length === 0) {
      toast.error("Enter at least one expense row.");
      return;
    }
    if (firstError) {
      toast.error(firstError);
      return;
    }

    setSaving(true);
    try {
      const result = await savePharmExpensesBulk(token, validItems);
      toast.success(`Saved ${result.savedCount} expense row(s).`);
      setRows([newRow()]);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to save expenses."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.sales.view}>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Pharm Expenses</h2>
          <p className="text-sm text-muted-foreground">
            Enter expense rows locally, then save all together for the current pharmacy open shift.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current context</CardTitle>
            <CardDescription>Resolved from the current pharmacy and open sales shift. Not editable.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
            {contextLoading ? (
              <p className="text-muted-foreground col-span-full flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading pharmacy and shift...
              </p>
            ) : (
              <>
                <p>
                  <span className="text-muted-foreground">Pharmacy: </span>
                  {context?.pharmacyName || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Sales Movement: </span>
                  {context?.movName ||
                    (context?.movId ? `#${context.movId}` : "—")}
                </p>
                <p>
                  <span className="text-muted-foreground">Open Shift: </span>
                  {context?.hasOpenShift && context.shiftId
                    ? String(context.shiftId)
                    : "—"}
                </p>
              </>
            )}
            {contextError ? (
              <p className="text-destructive col-span-full">{contextError}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="w-10 p-2">#</th>
                    <th className="p-2">Expense Description</th>
                    <th className="w-40 p-2 text-right">Expense Value</th>
                    <th className="w-20 p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.key} className="border-b">
                      <td className="p-2 tabular-nums text-muted-foreground">{index + 1}</td>
                      <td className="p-2">
                        <Input
                          ref={index === rows.length - 1 ? lastDescRef : undefined}
                          className={gridInputClass}
                          maxLength={DESCRIPTION_MAX}
                          value={row.expensesDisc}
                          disabled={saving}
                          placeholder="Expense description"
                          onChange={(e) =>
                            patchRow(row.key, { expensesDisc: e.target.value })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className={cn(gridInputClass, "text-right tabular-nums")}
                          inputMode="decimal"
                          value={row.expensesVal}
                          disabled={saving}
                          placeholder="0.00"
                          onChange={(e) =>
                            patchRow(row.key, { expensesVal: e.target.value })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={saving}
                          onClick={() => removeRow(row.key)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={addRow} disabled={saving}>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
              <p className="text-sm font-medium tabular-nums">
                Total Expenses: {total.toFixed(2)}
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => void handleSaveAll()}
                disabled={saving || !contextReady}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save All"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
