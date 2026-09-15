"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createSalesServiceAssignment,
  deactivateSalesServiceAssignment,
  getPharms,
  getSalesServiceCompo,
  getSalesServiceAssignments,
  updateSalesServiceAssignment,
} from "@/lib/api-client";
import type { SalesServiceAssignmentItem } from "@/types/sales-service-assignment";
import type { SalesServiceCompoItem } from "@/types/sales-service";
import type { PharmItem } from "@/types/pharm";
import {
  SalesServiceAssignmentFormSheet,
  type SalesServiceAssignmentFormValues,
} from "@/components/admin/sales-service-assignment-form-sheet";
import { useSalesServiceAssignmentColumns } from "@/components/admin/sales-service-assignment-table-columns";
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

export function SalesServiceAssignmentPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<SalesServiceAssignmentItem[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmItem[]>([]);
  const [services, setServices] = useState<SalesServiceCompoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] =
    useState<SalesServiceAssignmentItem | null>(null);

  const [pharmId, setPharmId] = useState(0);
  const [salesServiceId, setSalesServiceId] = useState(0);
  const [active, setActive] = useState(true);
  const [filterPharmId, setFilterPharmId] = useState(0);

  const columns = useSalesServiceAssignmentColumns();
  const canCreate = hasPermission(PERMISSIONS.salesServiceAssignment.create);
  const canEdit = hasPermission(PERMISSIONS.salesServiceAssignment.edit);
  const canDelete = hasPermission(PERMISSIONS.salesServiceAssignment.delete);

  const loadLookups = useCallback(async () => {
    if (!token) {
      setPharmacies([]);
      setServices([]);
      return;
    }
    const [pharmRows, serviceRows] = await Promise.all([
      getPharms(token),
      getSalesServiceCompo(token),
    ]);
    setPharmacies(pharmRows);
    setServices(serviceRows);
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
        await getSalesServiceAssignments(
          token,
          filterPharmId > 0 ? { pharmId: filterPharmId } : undefined
        )
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load service assignments";
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

    setSaving(true);
    try {
      await createSalesServiceAssignment(
        { pharmId, salesServiceId, active },
        token
      );
      toast.success("Service assignment created");
      setPharmId(0);
      setSalesServiceId(0);
      setActive(true);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create service assignment"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: SalesServiceAssignmentItem) {
    setEditingItem(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: SalesServiceAssignmentFormValues) {
    if (!token || !editingItem) return;

    setSheetSaving(true);
    try {
      await updateSalesServiceAssignment(editingItem.id, values, token);
      toast.success("Service assignment updated");
      setSheetOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update service assignment"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDeactivate(row: SalesServiceAssignmentItem) {
    toast(`Deactivate assignment #${row.id}?`, {
      description: `${row.serviceName || "Service"} for pharmacy ${
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

  async function confirmDeactivate(row: SalesServiceAssignmentItem) {
    if (!token) return;

    try {
      await deactivateSalesServiceAssignment(row.id, token);
      toast.success("Service assignment deactivated");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to deactivate service assignment"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.salesServiceAssignment.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Sales Service Assignment</h2>
          <p className="text-muted-foreground text-sm">
            Assign which Sales Services each pharmacy may use in Sales Payment /
            Delivery. Create services on the Sales Service page first.
          </p>
        </div>

        {canCreate ? (
          <Card>
            <CardHeader>
              <CardTitle>New assignment</CardTitle>
              <CardDescription>
                Links one pharmacy to one sales service (unique pair).
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
                  <Label htmlFor="salesServiceId">Sales service</Label>
                  <select
                    id="salesServiceId"
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    value={salesServiceId || ""}
                    onChange={(e) =>
                      setSalesServiceId(Number(e.target.value) || 0)
                    }
                    required
                  >
                    <option value="">Select service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.serviceName || `#${s.id}`} · {s.serviceType} ·{" "}
                        {s.cost.toFixed(2)}
                        {s.active ? "" : " (inactive)"}
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
                  disabled={saving || !pharmId || !salesServiceId}
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
              emptyMessage="No service assignments yet."
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? handleDeactivate : undefined}
              deleteLabel="Deactivate"
            />
          </CardContent>
        </Card>

        <SalesServiceAssignmentFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingItem(null);
          }}
          item={editingItem}
          saving={sheetSaving}
          pharmacies={pharmacies}
          services={services}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
