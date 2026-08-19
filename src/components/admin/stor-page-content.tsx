"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createStor,
  deleteStor,
  getStors,
  updateStor,
} from "@/lib/api-client";
import { CostCenterIdCombobox } from "@/components/admin/cost-center-id-combobox";
import {
  StorFormSheet,
  type StorFormValues,
} from "@/components/admin/stor-form-sheet";
import { StorAccountCombobox } from "@/components/admin/stor-account-combobox";
import { useStorColumns } from "@/components/admin/stor-table-columns";
import { PageGuard } from "@/components/permissions/page-guard";
import { DataTable } from "@/components/data-table";
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
import type { StorItem } from "@/types/stor";
import { STOR_ACCOUNT_PARENT_CODE } from "@/types/stor";

function validateStorForm(values: StorFormValues): string | null {
  if (!values.costCenterId || values.costCenterId <= 0) {
    return "Cost Center is required.";
  }
  if (!values.accountNo.trim()) {
    return "Account No is required.";
  }
  return null;
}

export function StorPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<StorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<StorItem | null>(null);

  const [storArName, setStorArName] = useState("");
  const [storEnName, setStorEnName] = useState("");
  const [costCenterId, setCostCenterId] = useState<number | null>(null);
  const [accountNo, setAccountNo] = useState("");

  const columns = useStorColumns();

  const loadItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setItems(await getStors(token));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load stores";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadItems();
  }, [sessionReady, loadItems]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;

    const values: StorFormValues = {
      storArName: storArName.trim() || null,
      storEnName: storEnName.trim() || null,
      costCenterId: costCenterId ?? 0,
      accountNo: accountNo.trim(),
    };

    const validationError = validateStorForm(values);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      await createStor(values, token);
      toast.success("Store created");
      setStorArName("");
      setStorEnName("");
      setCostCenterId(null);
      setAccountNo("");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create store"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: StorItem) {
    setEditing(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: StorFormValues) {
    if (!token || !editing) return;

    const validationError = validateStorForm(values);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSheetSaving(true);
    try {
      await updateStor(editing.id, values, token);
      toast.success("Store updated");
      setSheetOpen(false);
      setEditing(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update store"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: StorItem) {
    const label =
      row.storEnName?.trim() ||
      row.storArName?.trim() ||
      `Store #${row.id}`;

    toast(`Delete "${label}"?`, {
      action: {
        label: "Delete",
        onClick: () => void confirmDelete(row),
      },
      cancel: {
        label: "Cancel",
        onClick: () => toast.message("Delete cancelled"),
      },
    });
  }

  async function confirmDelete(row: StorItem) {
    if (!token) return;
    try {
      await deleteStor(row.id, token);
      toast.success("Store deleted");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete store"
      );
    }
  }

  return (
    <PageGuard permission={null}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Stores</h2>
          <p className="text-muted-foreground text-sm">
            Manage warehouse/store records. Cost center saves{" "}
            <span className="font-mono text-xs">CostCenterId</span>; account no
            loads from AccountsChart where{" "}
            <span className="font-mono text-xs">
              PARENTCode = {STOR_ACCOUNT_PARENT_CODE}
            </span>{" "}
            and saves <span className="font-mono text-xs">ACCCode</span>.
          </p>
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>New store</CardTitle>
            <CardDescription>
              Cost center and account no are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="stor-ar">Arabic name</Label>
                <Input
                  id="stor-ar"
                  value={storArName}
                  onChange={(e) => setStorArName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stor-en">English name</Label>
                <Input
                  id="stor-en"
                  value={storEnName}
                  onChange={(e) => setStorEnName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Cost center *</Label>
                <CostCenterIdCombobox
                  value={costCenterId}
                  onValueChange={setCostCenterId}
                />
              </div>
              <div className="space-y-2">
                <Label>Account no *</Label>
                <StorAccountCombobox
                  value={accountNo}
                  onValueChange={setAccountNo}
                />
              </div>
              <div className="lg:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create store"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stores ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter stores..."
              emptyMessage="No stores yet."
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            {loadError ? (
              <div className="mt-3 space-y-3">
                <p className="text-destructive text-sm">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadItems()}
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <StorFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditing(null);
          }}
          item={editing}
          saving={sheetSaving}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
