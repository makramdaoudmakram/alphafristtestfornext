"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createCostCenter,
  deleteCostCenter,
  getCostCenters,
  updateCostCenter,
} from "@/lib/api-client";
import {
  CostCenterFormSheet,
  type CostCenterFormValues,
} from "@/components/admin/cost-center-form-sheet";
import { useCostCenterColumns } from "@/components/admin/cost-center-table-columns";
import { CostCenterCombobox } from "@/components/admin/cost-center-combobox";
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
import type { CostCenterItem } from "@/types/cost-center";

export function CostCenterPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<CostCenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CostCenterItem | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [previewCode, setPreviewCode] = useState("");

  const columns = useCostCenterColumns();

  const loadItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setItems(await getCostCenters(token));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load cost centers";
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

    if (!code.trim() || !name.trim()) {
      toast.error("Code and Name are required.");
      return;
    }

    setSaving(true);
    try {
      await createCostCenter(
        { code: code.trim(), name: name.trim() },
        token
      );
      toast.success("Cost center created");
      setCode("");
      setName("");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create cost center"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: CostCenterItem) {
    setEditing(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: CostCenterFormValues) {
    if (!token || !editing) return;

    setSheetSaving(true);
    try {
      await updateCostCenter(
        editing.id,
        { code: values.code.trim(), name: values.name.trim() },
        token
      );
      toast.success("Cost center updated");
      setSheetOpen(false);
      setEditing(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update cost center"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: CostCenterItem) {
    toast(`Delete cost center "${row.code}"?`, {
      description: "Blocked if the code is used on vouchers or GeneralLedger.",
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

  async function confirmDelete(row: CostCenterItem) {
    if (!token) return;
    try {
      await deleteCostCenter(row.id, token);
      toast.success("Cost center deleted");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete cost center"
      );
    }
  }

  return (
    <PageGuard permission={null}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Cost Centers</h2>
          <p className="text-muted-foreground text-sm">
            Manages the CostCenter table (Code / Name). Used as the old Web Forms{" "}
            <span className="font-mono text-xs">drpCostCenter</span> source —
            voucher and ledger lines store the <strong>Code</strong>.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>New cost center</CardTitle>
              <CardDescription>Code must be unique.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cc-code">Code</Label>
                  <Input
                    id="cc-code"
                    className="font-mono"
                    placeholder="01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cc-name">Name</Label>
                  <Input
                    id="cc-name"
                    placeholder="Main branch"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dropdown preview</CardTitle>
              <CardDescription>
                Reusable <span className="font-mono text-xs">CostCenterCombobox</span>{" "}
                — value is the Code string.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <CostCenterCombobox
                value={previewCode}
                onValueChange={setPreviewCode}
              />
              <p className="text-muted-foreground text-xs">
                Selected code:{" "}
                <span className="font-mono">{previewCode || "(none)"}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cost centers ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter cost centers..."
              emptyMessage="No cost centers yet."
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

        <CostCenterFormSheet
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
