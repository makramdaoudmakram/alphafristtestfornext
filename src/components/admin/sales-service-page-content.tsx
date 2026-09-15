"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createSalesService,
  deactivateSalesService,
  getSalesServices,
  updateSalesService,
} from "@/lib/api-client";
import type { SalesServiceItem } from "@/types/sales-service";
import {
  SalesServiceFormSheet,
  type SalesServiceFormValues,
} from "@/components/admin/sales-service-form-sheet";
import { useSalesServiceColumns } from "@/components/admin/sales-service-table-columns";
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

function parseCost(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function SalesServicePageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<SalesServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesServiceItem | null>(null);

  const [serviceName, setServiceName] = useState("");
  const [serviceType, setServiceType] = useState("Delivery");
  const [cost, setCost] = useState("0");
  const [active, setActive] = useState(true);

  const columns = useSalesServiceColumns();
  const canCreate = hasPermission(PERMISSIONS.salesService.create);
  const canEdit = hasPermission(PERMISSIONS.salesService.edit);
  const canDelete = hasPermission(PERMISSIONS.salesService.delete);

  const loadItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setItems(await getSalesServices(token));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load sales services";
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

    const costValue = parseCost(cost);
    if (costValue == null) {
      toast.error("Service cost must be a number greater than or equal to zero.");
      return;
    }

    setSaving(true);
    try {
      await createSalesService(
        {
          serviceName: serviceName.trim(),
          serviceType: serviceType.trim() || "Delivery",
          cost: costValue,
          active,
        },
        token
      );
      toast.success("Sales service created");
      setServiceName("");
      setServiceType("Delivery");
      setCost("0");
      setActive(true);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create sales service"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: SalesServiceItem) {
    setEditingItem(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: SalesServiceFormValues) {
    if (!token || !editingItem) return;

    const costValue = parseCost(values.cost);
    if (costValue == null) {
      toast.error("Service cost must be a number greater than or equal to zero.");
      return;
    }

    setSheetSaving(true);
    try {
      await updateSalesService(
        editingItem.id,
        {
          serviceName: values.serviceName.trim(),
          serviceType: values.serviceType.trim() || "Delivery",
          cost: costValue,
          active: values.active,
        },
        token
      );
      toast.success("Sales service updated");
      setSheetOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update sales service"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDeactivate(row: SalesServiceItem) {
    toast(`Deactivate sales service #${row.id}?`, {
      description: `"${row.serviceName}" will be marked inactive (not deleted).`,
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

  async function confirmDeactivate(row: SalesServiceItem) {
    if (!token) return;

    try {
      await deactivateSalesService(row.id, token);
      toast.success("Sales service deactivated");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to deactivate sales service"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.salesService.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Sales Service</h2>
          <p className="text-muted-foreground text-sm">
            Master services (e.g. delivery charges) for later Sales Payment /
            Delivery. Services are global; pharmacy assignment is separate.
          </p>
        </div>

        {canCreate ? (
          <Card>
            <CardHeader>
              <CardTitle>New sales service</CardTitle>
              <CardDescription>
                Service names must be unique. Cost is the default value for
                future payable calculations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceName">Service name</Label>
                  <Input
                    id="serviceName"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    maxLength={70}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceType">Service type</Label>
                  <Input
                    id="serviceType"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    maxLength={30}
                    placeholder="Delivery"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost</Label>
                  <Input
                    id="cost"
                    type="number"
                    min={0}
                    step="0.0001"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    required
                  />
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
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Create"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Sales services</CardTitle>
            <CardDescription>
              {loadError
                ? loadError
                : "Search, edit, or deactivate existing services."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter sales services..."
              emptyMessage="No sales services yet. Create your first one above."
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? handleDeactivate : undefined}
              deleteLabel="Deactivate"
            />
          </CardContent>
        </Card>

        <SalesServiceFormSheet
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
