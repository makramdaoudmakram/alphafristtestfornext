"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createSalesKind,
  deactivateSalesKind,
  getSalesKinds,
  updateSalesKind,
} from "@/lib/api-client";
import type { SalesKindItem } from "@/types/sales-kind";
import {
  SalesKindFormSheet,
  type SalesKindFormValues,
} from "@/components/admin/sales-kind-form-sheet";
import { useSalesKindColumns } from "@/components/admin/sales-kind-table-columns";
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
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/data-table";

export function SalesKindPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<SalesKindItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesKindItem | null>(null);

  const [salesKindName, setSalesKindName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [deleveryMandatory, setDeleveryMandatory] = useState(false);

  const columns = useSalesKindColumns();

  const loadItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setItems(await getSalesKinds(token));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load sales kinds";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      await createSalesKind(
        {
          salesKindName: salesKindName.trim(),
          isActive,
          deleveryMandatory,
        },
        token
      );
      toast.success("Sales kind created");
      setSalesKindName("");
      setIsActive(true);
      setDeleveryMandatory(false);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create sales kind"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: SalesKindItem) {
    setEditingItem(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: SalesKindFormValues) {
    if (!token || !editingItem) return;

    setSheetSaving(true);
    try {
      await updateSalesKind(
        editingItem.id,
        {
          salesKindName: values.salesKindName.trim(),
          isActive: values.isActive,
          deleveryMandatory: values.deleveryMandatory,
        },
        token
      );
      toast.success("Sales kind updated");
      setSheetOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update sales kind"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDeactivate(row: SalesKindItem) {
    toast(`Deactivate sales kind #${row.id}?`, {
      description: `"${row.salesKindName}" will be marked inactive (not deleted).`,
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

  async function confirmDeactivate(row: SalesKindItem) {
    if (!token) return;

    try {
      await deactivateSalesKind(row.id, token);
      toast.success("Sales kind deactivated");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to deactivate sales kind"
      );
    }
  }

  return (
    <PageGuard permission={null}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Sales Kind</h2>
          <p className="text-muted-foreground text-sm">
            Master sales kinds used to group payment methods.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New sales kind</CardTitle>
            <CardDescription>
              Sales kind names must be unique. Payment methods require a sales
              kind.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
              <div className="space-y-2">
                <Label htmlFor="salesKindName">Sales kind name</Label>
                <Input
                  id="salesKindName"
                  value={salesKindName}
                  onChange={(e) => setSalesKindName(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="deleveryMandatory"
                  type="checkbox"
                  className="size-4"
                  checked={deleveryMandatory}
                  onChange={(e) => setDeleveryMandatory(e.target.checked)}
                />
                <Label htmlFor="deleveryMandatory">Delivery mandatory</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isActive"
                  type="checkbox"
                  className="size-4"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales kinds</CardTitle>
            <CardDescription>
              {loadError
                ? loadError
                : "Search, edit, or deactivate existing sales kinds."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter sales kinds..."
              emptyMessage="No sales kinds yet. Create your first one above."
              onEdit={handleEdit}
              onDelete={handleDeactivate}
              deleteLabel="Deactivate"
            />
          </CardContent>
        </Card>

        <SalesKindFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingItem(null);
          }}
          item={editingItem}
          saving={sheetSaving}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
