"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createSalesKindAssignment,
  deactivateSalesKindAssignment,
  getPharms,
  getSalesKindCompo,
  getSalesKindAssignments,
  updateSalesKindAssignment,
} from "@/lib/api-client";
import type { SalesKindAssignmentItem } from "@/types/sales-kind-assignment";
import type { SalesKindCompoItem } from "@/types/sales-kind";
import type { PharmItem } from "@/types/pharm";
import {
  SalesKindAssignmentFormSheet,
  type SalesKindAssignmentFormValues,
} from "@/components/admin/sales-kind-assignment-form-sheet";
import { useSalesKindAssignmentColumns } from "@/components/admin/sales-kind-assignment-table-columns";
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
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/data-table";

export function SalesKindAssignmentPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<SalesKindAssignmentItem[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmItem[]>([]);
  const [salesKinds, setSalesKinds] = useState<SalesKindCompoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] =
    useState<SalesKindAssignmentItem | null>(null);

  const [pharmId, setPharmId] = useState(0);
  const [salesKindId, setSalesKindId] = useState(0);
  const [active, setActive] = useState(true);
  const [filterPharmId, setFilterPharmId] = useState(0);

  const columns = useSalesKindAssignmentColumns();
  const canCreate = hasPermission(PERMISSIONS.salesKindAssignment.create);
  const canEdit = hasPermission(PERMISSIONS.salesKindAssignment.edit);
  const canDelete = hasPermission(PERMISSIONS.salesKindAssignment.delete);

  const loadLookups = useCallback(async () => {
    if (!token) {
      setPharmacies([]);
      setSalesKinds([]);
      return;
    }
    const [pharmRows, kindRows] = await Promise.all([
      getPharms(token),
      getSalesKindCompo(token),
    ]);
    setPharmacies(pharmRows);
    setSalesKinds(kindRows);
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
      setItems(
        await getSalesKindAssignments(
          token,
          filterPharmId > 0 ? { pharmId: filterPharmId } : undefined
        )
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load sales kind assignments";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token, filterPharmId]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadLookups();
  }, [sessionReady, loadLookups]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadItems();
  }, [sessionReady, loadItems]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (!pharmId || !salesKindId) {
      toast.error("Select both pharmacy and sales kind.");
      return;
    }

    setSaving(true);
    try {
      await createSalesKindAssignment(
        { pharmId, salesKindId, active },
        token
      );
      toast.success("Sales kind assignment created");
      setPharmId(0);
      setSalesKindId(0);
      setActive(true);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create sales kind assignment"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: SalesKindAssignmentItem) {
    setEditingItem(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: SalesKindAssignmentFormValues) {
    if (!token || !editingItem) return;

    if (!values.pharmId || !values.salesKindId) {
      toast.error("Select both pharmacy and sales kind.");
      return;
    }

    setSheetSaving(true);
    try {
      await updateSalesKindAssignment(editingItem.id, values, token);
      toast.success("Sales kind assignment updated");
      setSheetOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update sales kind assignment"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDeactivate(row: SalesKindAssignmentItem) {
    toast(`Deactivate assignment #${row.id}?`, {
      description: `${row.salesKindName || "Sales kind"} for pharmacy ${
        row.pharmName || row.pharmId
      } will be marked inactive.`,
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

  async function confirmDeactivate(row: SalesKindAssignmentItem) {
    if (!token) return;

    try {
      await deactivateSalesKindAssignment(row.id, token);
      toast.success("Sales kind assignment deactivated");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to deactivate sales kind assignment"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.salesKindAssignment.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Sales Kind Assignment</h2>
          <p className="text-muted-foreground text-sm">
            Assign which Sales Kinds each pharmacy may use. Create sales kinds
            on the Sales Kind page first.
          </p>
        </div>

        {canCreate ? (
          <Card>
            <CardHeader>
              <CardTitle>New assignment</CardTitle>
              <CardDescription>
                Links one pharmacy to one sales kind (unique pair).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pharmId">Pharmacy</Label>
                  <select
                    id="pharmId"
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    value={pharmId || ""}
                    onChange={(e) => setPharmId(Number(e.target.value) || 0)}
                    required
                  >
                    <option value="">Select pharmacy</option>
                    {pharmacies.map((p) => (
                      <option key={p.parmId} value={p.parmId}>
                        {p.parmEnName || p.parmArName || p.parmId}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salesKindId">Sales kind</Label>
                  <select
                    id="salesKindId"
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    value={salesKindId || ""}
                    onChange={(e) =>
                      setSalesKindId(Number(e.target.value) || 0)
                    }
                    required
                  >
                    <option value="">Select sales kind</option>
                    {salesKinds.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.salesKindName || `#${k.id}`}
                        {k.isActive ? "" : " (inactive)"}
                      </option>
                    ))}
                  </select>
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
                <Button
                  type="submit"
                  disabled={saving || !pharmId || !salesKindId}
                >
                  {saving ? "Saving..." : "Create"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>
              {loadError
                ? loadError
                : loading
                  ? "Loading..."
                  : `${items.length} assignment(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex max-w-sm flex-col gap-2">
              <Label htmlFor="filterPharmId">Filter by pharmacy</Label>
              <select
                id="filterPharmId"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={filterPharmId || ""}
                onChange={(e) => setFilterPharmId(Number(e.target.value) || 0)}
              >
                <option value="">All pharmacies</option>
                {pharmacies.map((p) => (
                  <option key={p.parmId} value={p.parmId}>
                    {p.parmEnName || p.parmArName || p.parmId}
                  </option>
                ))}
              </select>
            </div>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter assignments..."
              emptyMessage="No sales kind assignments yet."
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? handleDeactivate : undefined}
              deleteLabel="Deactivate"
            />
          </CardContent>
        </Card>

        <SalesKindAssignmentFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingItem(null);
          }}
          item={editingItem}
          saving={sheetSaving}
          pharmacies={pharmacies}
          salesKinds={salesKinds}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
