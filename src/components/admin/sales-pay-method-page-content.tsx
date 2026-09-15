"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createSalesPayMethod,
  deactivateSalesPayMethod,
  getSalesPayMethods,
  updateSalesPayMethod,
} from "@/lib/api-client";
import { getChartLeaves } from "@/lib/manual-journal-api";
import type { SalesPayMethodItem } from "@/types/sales-pay-method";
import type { ComboboxOption } from "@/components/ui/searchable-combobox";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import {
  SalesPayMethodFormSheet,
  type SalesPayMethodFormValues,
} from "@/components/admin/sales-pay-method-form-sheet";
import { useSalesPayMethodColumns } from "@/components/admin/sales-pay-method-table-columns";
import { PageGuard } from "@/components/permissions/page-guard";
import { usePermissions } from "@/components/permissions/permission-provider";
import { PERMISSIONS } from "@/lib/route-permissions";
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
import { DataTable } from "@/components/data-table";

function toAccountOptions(
  accounts: { accCode: string; name: string }[]
): ComboboxOption[] {
  return accounts
    .filter((account) => account.accCode?.trim())
    .map((account) => {
      const code = account.accCode.trim();
      const name = account.name.trim() || code;
      return {
        value: code,
        label: name === code ? code : `${code} - ${name}`,
      };
    })
    .sort((a, b) =>
      a.value.localeCompare(b.value, undefined, { numeric: true })
    );
}

function withClear(options: ComboboxOption[]): ComboboxOption[] {
  return [{ value: "", label: "— None —" }, ...options];
}

export function SalesPayMethodPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<SalesPayMethodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesPayMethodItem | null>(
    null
  );
  const [accountOptions, setAccountOptions] = useState<ComboboxOption[]>([]);

  const [paymentName, setPaymentName] = useState("");
  const [affectsCash, setAffectsCash] = useState(true);
  const [accountCode, setAccountCode] = useState("");
  const [active, setActive] = useState(true);

  const columns = useSalesPayMethodColumns(accountOptions);
  const canCreate = hasPermission(PERMISSIONS.salesPayMethod.create);
  const canEdit = hasPermission(PERMISSIONS.salesPayMethod.edit);
  const canDelete = hasPermission(PERMISSIONS.salesPayMethod.delete);

  const createAccountOptions = useMemo(
    () => withClear(accountOptions),
    [accountOptions]
  );

  const loadLookups = useCallback(async () => {
    if (!token) {
      setAccountOptions([]);
      return;
    }

    setLookupsLoading(true);
    try {
      const accounts = await getChartLeaves(token);
      setAccountOptions(toAccountOptions(accounts));
    } catch {
      setAccountOptions([]);
      toast.error("Failed to load Accounts Chart.");
    } finally {
      setLookupsLoading(false);
    }
  }, [token]);

  const loadItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setItems(await getSalesPayMethods(token));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load payment methods";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadLookups();
    void loadItems();
  }, [sessionReady, loadLookups, loadItems]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (accountCode.trim()) {
      const exists = accountOptions.some(
        (option) => option.value === accountCode.trim()
      );
      if (!exists) {
        toast.error("Select an account from Accounts Chart.");
        return;
      }
    }

    setSaving(true);
    try {
      await createSalesPayMethod(
        {
          paymentName: paymentName.trim(),
          affectsCash,
          accountCode: accountCode.trim(),
          active,
        },
        token
      );
      toast.success("Payment method created");
      setPaymentName("");
      setAffectsCash(true);
      setAccountCode("");
      setActive(true);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create payment method"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: SalesPayMethodItem) {
    setEditingItem(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: SalesPayMethodFormValues) {
    if (!token || !editingItem) return;

    if (values.accountCode.trim()) {
      const code = values.accountCode.trim();
      const inList = accountOptions.some((option) => option.value === code);
      const isCurrentSaved = editingItem.accountCode?.trim() === code;
      if (!inList && !isCurrentSaved) {
        toast.error("Select an account from Accounts Chart.");
        return;
      }
    }

    setSheetSaving(true);
    try {
      await updateSalesPayMethod(
        editingItem.id,
        {
          paymentName: values.paymentName.trim(),
          affectsCash: values.affectsCash,
          accountCode: values.accountCode.trim(),
          active: values.active,
        },
        token
      );
      toast.success("Payment method updated");
      setSheetOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update payment method"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDeactivate(row: SalesPayMethodItem) {
    toast(`Deactivate payment method #${row.id}?`, {
      description: `"${row.paymentName}" will be marked inactive (not deleted).`,
      action: {
        label: "Deactivate",
        onClick: () => void confirmDeactivate(row),
      },
      cancel: {
        label: "Cancel",
        onClick: () => toast.message("Deactivate cancelled"),
      },
    });
  }

  async function confirmDeactivate(row: SalesPayMethodItem) {
    if (!token) return;

    try {
      await deactivateSalesPayMethod(row.id, token);
      toast.success("Payment method deactivated");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to deactivate payment method"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.salesPayMethod.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Sales Payment Method</h2>
          <p className="text-muted-foreground text-sm">
            Configure payment methods used when finalizing sales.
          </p>
        </div>

        {canCreate ? (
          <Card>
            <CardHeader>
              <CardTitle>New payment method</CardTitle>
              <CardDescription>
                Example: Cash, Visa, Transfer. Names must be unique. Account
                comes from Accounts Chart.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentName">Payment name</Label>
                  <Input
                    id="paymentName"
                    value={paymentName}
                    onChange={(e) => setPaymentName(e.target.value)}
                    maxLength={50}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account code (optional)</Label>
                  <SearchableCombobox
                    value={accountCode}
                    onValueChange={setAccountCode}
                    options={createAccountOptions}
                    placeholder={
                      lookupsLoading
                        ? "Loading accounts..."
                        : "Select account"
                    }
                    searchPlaceholder="Search account code or name..."
                    emptyMessage="No accounts found."
                    disabled={lookupsLoading || saving}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="affectsCash"
                    type="checkbox"
                    className="size-4"
                    checked={affectsCash}
                    onChange={(e) => setAffectsCash(e.target.checked)}
                  />
                  <Label htmlFor="affectsCash">Affects cash</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="active"
                    type="checkbox"
                    className="size-4"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
                <Button type="submit" disabled={saving || lookupsLoading}>
                  {saving ? "Saving..." : "Create"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Payment methods</CardTitle>
            <CardDescription>
              {loadError
                ? loadError
                : loading
                  ? "Loading..."
                  : `${items.length} method(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter payment methods..."
              emptyMessage="No payment methods yet. Create your first one above."
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? handleDeactivate : undefined}
              deleteLabel="Deactivate"
            />
          </CardContent>
        </Card>

        <SalesPayMethodFormSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          item={editingItem}
          saving={sheetSaving}
          accountOptions={accountOptions}
          lookupsLoading={lookupsLoading}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
