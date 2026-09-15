"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  getPharms,
  getSalesmovmentByParent,
  getStors,
  upsertSalesmovment,
} from "@/lib/api-client";
import { getChartLeaves } from "@/lib/manual-journal-api";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { ComboboxOption } from "@/components/ui/searchable-combobox";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SALES_MOVEMENT_ACCOUNT_FIELDS,
  SALES_MOVEMENT_PARENT_OPTIONS,
  type SalesMovementParent,
  type SalesmovmentUpsertRequest,
} from "@/types/sales-movment";

function emptyForm(parent: SalesMovementParent): SalesmovmentUpsertRequest {
  return {
    movId: null,
    movName: null,
    movParint: parent,
    pharmId: null,
    store1: null,
    store2: null,
    cashDebit: null,
    creditCardDebit: null,
    creditCardMachinNo: null,
    discountEmployeesDebit: null,
    discountMedicalDebit: null,
    medicinesSalesCredit: null,
    accesSalesCredit: null,
    salesTaxCredit: null,
    salesCostDebit: null,
    accessCostDebit: null,
    pharmStorCredit: null,
    extraordinaryPurchasesDebit: null,
    extraordinaryPurchasesCredit: null,
    expensesDebit: null,
    expensesCredit: null,
    transferDebit: null,
    transferCredit: null,
    postMedicalDebit: null,
    postEmployeesDebit: null,
    excessDeficitdept: null,
    excessDeficitcredit: null,
    cashdiscount: null,
    otheraRevinue: null,
  };
}

function mergeOption(
  options: ComboboxOption[],
  value: string
): ComboboxOption[] {
  const trimmed = value.trim();
  if (!trimmed || options.some((option) => option.value === trimmed)) {
    return options;
  }
  return [...options, { value: trimmed, label: trimmed }];
}

function withClear(options: ComboboxOption[]): ComboboxOption[] {
  return [{ value: "", label: "— None —" }, ...options];
}

function toNullableInt(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function SalesMovementSettingPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [parent, setParent] = useState<SalesMovementParent>(1);
  const [form, setForm] = useState<SalesmovmentUpsertRequest>(() => emptyForm(1));
  const [recordId, setRecordId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [storOptions, setStorOptions] = useState<ComboboxOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<ComboboxOption[]>([]);
  const [pharmOptions, setPharmOptions] = useState<ComboboxOption[]>([]);

  const parentOptions = useMemo(
    () =>
      SALES_MOVEMENT_PARENT_OPTIONS.map((o) => ({
        value: String(o.value),
        label: o.label,
      })),
    []
  );

  const loadLookups = useCallback(async () => {
    if (!token) {
      setStorOptions([]);
      setAccountOptions([]);
      setPharmOptions([]);
      return;
    }

    setLookupsLoading(true);
    try {
      const [stores, accounts, pharms] = await Promise.all([
        getStors(token),
        getChartLeaves(token),
        getPharms(token),
      ]);
      setStorOptions(
        stores
          .map((store) => ({
            value: String(store.id),
            label: store.storArName?.trim() || `Store ${store.id}`,
          }))
          .sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { numeric: true })
          )
      );
      setAccountOptions(
        accounts
          .filter((account) => account.accCode?.trim())
          .map((account) => ({
            value: account.accCode.trim(),
            label: account.name.trim() || account.accCode.trim(),
          }))
          .sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { numeric: true })
          )
      );
      setPharmOptions(
        pharms
          .map((pharm) => ({
            value: String(pharm.parmId),
            label:
              [pharm.parmArName, pharm.parmEnName].filter(Boolean).join(" / ") ||
              `Pharmacy ${pharm.parmId}`,
          }))
          .sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { numeric: true })
          )
      );
    } catch {
      setStorOptions([]);
      setAccountOptions([]);
      setPharmOptions([]);
      toast.error("Failed to load lookup lists.");
    } finally {
      setLookupsLoading(false);
    }
  }, [token]);

  const loadConfig = useCallback(
    async (movParint: SalesMovementParent) => {
      if (!token) {
        setForm(emptyForm(movParint));
        setRecordId(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const row = await getSalesmovmentByParent(movParint, token);
        setRecordId(row.id > 0 ? row.id : null);
        setForm({
          movId: row.movId,
          movName: row.movName,
          movParint,
          pharmId: row.pharmId,
          store1: row.store1,
          store2: row.store2,
          cashDebit: row.cashDebit,
          creditCardDebit: row.creditCardDebit,
          creditCardMachinNo: row.creditCardMachinNo,
          discountEmployeesDebit: row.discountEmployeesDebit,
          discountMedicalDebit: row.discountMedicalDebit,
          medicinesSalesCredit: row.medicinesSalesCredit,
          accesSalesCredit: row.accesSalesCredit,
          salesTaxCredit: row.salesTaxCredit,
          salesCostDebit: row.salesCostDebit,
          accessCostDebit: row.accessCostDebit,
          pharmStorCredit: row.pharmStorCredit,
          extraordinaryPurchasesDebit: row.extraordinaryPurchasesDebit,
          extraordinaryPurchasesCredit: row.extraordinaryPurchasesCredit,
          expensesDebit: row.expensesDebit,
          expensesCredit: row.expensesCredit,
          transferDebit: row.transferDebit,
          transferCredit: row.transferCredit,
          postMedicalDebit: row.postMedicalDebit,
          postEmployeesDebit: row.postEmployeesDebit,
          excessDeficitdept: row.excessDeficitdept,
          excessDeficitcredit: row.excessDeficitcredit,
          cashdiscount: row.cashdiscount,
          otheraRevinue: row.otheraRevinue,
        });
      } catch (error) {
        setForm(emptyForm(movParint));
        setRecordId(null);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load sales movement settings."
        );
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (status === "loading") return;
    void loadLookups();
  }, [status, loadLookups]);

  useEffect(() => {
    if (status === "loading") return;
    void loadConfig(parent);
  }, [status, parent, loadConfig]);

  function patch(partial: Partial<SalesmovmentUpsertRequest>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      toast.error("Sign in required.");
      return;
    }

    setSaving(true);
    try {
      const saved = await upsertSalesmovment({ ...form, movParint: parent }, token);
      setRecordId(saved.id > 0 ? saved.id : null);
      toast.success(
        parent === 1
          ? "Sales configuration saved."
          : "Return Sales configuration saved."
      );
      await loadConfig(parent);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save sales movement settings."
      );
    } finally {
      setSaving(false);
    }
  }

  const store1Options = useMemo(
    () => mergeOption(storOptions, form.store1 != null ? String(form.store1) : ""),
    [storOptions, form.store1]
  );
  const store2Options = useMemo(
    () => mergeOption(storOptions, form.store2 != null ? String(form.store2) : ""),
    [storOptions, form.store2]
  );
  const pharmMerged = useMemo(
    () => mergeOption(pharmOptions, form.pharmId != null ? String(form.pharmId) : ""),
    [pharmOptions, form.pharmId]
  );

  const busy = !sessionReady || loading || lookupsLoading;

  return (
    <PageGuard permission={PERMISSIONS.salesMovment.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Sales Movement Setting</h2>
          <p className="text-muted-foreground text-sm">
            Configure accounts, stores, and pharmacy for Sales and Return Sales.
            Account lists use Accounts Chart names; stores use Arabic store names.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Movement type</CardTitle>
            <CardDescription>
              Switch between Sales and Return Sales to load that configuration.
              {recordId != null ? ` Current record #${recordId}.` : " No saved row yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-w-sm space-y-2">
            <Label>Type</Label>
            <SearchableCombobox
              value={String(parent)}
              onValueChange={(value) => {
                const next = Number(value) === 2 ? 2 : 1;
                setParent(next);
              }}
              options={parentOptions}
              placeholder="Select type..."
              searchPlaceholder="Search type..."
              disabled={busy || saving}
            />
          </CardContent>
        </Card>

        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pharmacy & stores</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Pharmacy</Label>
                <SearchableCombobox
                  value={form.pharmId != null ? String(form.pharmId) : ""}
                  onValueChange={(value) => patch({ pharmId: toNullableInt(value) })}
                  options={withClear(pharmMerged)}
                  placeholder="Select pharmacy..."
                  searchPlaceholder="Search pharmacy..."
                  disabled={busy || saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Store 1</Label>
                <SearchableCombobox
                  value={form.store1 != null ? String(form.store1) : ""}
                  onValueChange={(value) => patch({ store1: toNullableInt(value) })}
                  options={withClear(store1Options)}
                  placeholder="Select store..."
                  searchPlaceholder="Search store..."
                  disabled={busy || saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Store 2</Label>
                <SearchableCombobox
                  value={form.store2 != null ? String(form.store2) : ""}
                  onValueChange={(value) => patch({ store2: toNullableInt(value) })}
                  options={withClear(store2Options)}
                  placeholder="Select store..."
                  searchPlaceholder="Search store..."
                  disabled={busy || saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditCardMachinNo">Credit card machine no.</Label>
                <Input
                  id="creditCardMachinNo"
                  value={form.creditCardMachinNo ?? ""}
                  onChange={(e) =>
                    patch({ creditCardMachinNo: e.target.value.trim() || null })
                  }
                  maxLength={15}
                  disabled={busy || saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="movName">Movement name</Label>
                <Input
                  id="movName"
                  value={form.movName ?? ""}
                  onChange={(e) => patch({ movName: e.target.value.trim() || null })}
                  maxLength={50}
                  disabled={busy || saving}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>
                Each list shows the account name from Accounts Chart (not the internal id).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {SALES_MOVEMENT_ACCOUNT_FIELDS.map(({ key, label }) => {
                const current = (form[key] as string | null) ?? "";
                const options = mergeOption(accountOptions, current);
                return (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <SearchableCombobox
                      value={current}
                      onValueChange={(value) =>
                        patch({ [key]: value.trim() || null } as Partial<SalesmovmentUpsertRequest>)
                      }
                      options={withClear(options)}
                      placeholder="Select account..."
                      searchPlaceholder="Search account..."
                      disabled={busy || saving}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Button type="submit" disabled={busy || saving}>
            {saving ? "Saving..." : "Save configuration"}
          </Button>
        </form>
      </div>
    </PageGuard>
  );
}
