"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createSalesPaymentAssiment,
  deleteSalesPaymentAssiment,
  getPharms,
  getSalesPayMethodCompo,
  getSalesPaymentAssimments,
  updateSalesPaymentAssiment,
} from "@/lib/api-client";
import type { SalesPaymentAssimentItem } from "@/types/sales-payment-assiment";
import type { SalesPayMethodCompoItem } from "@/types/sales-pay-method";
import type { PharmItem } from "@/types/pharm";
import {
  SalesPaymentAssimentFormSheet,
  type SalesPaymentAssimentFormValues,
} from "@/components/admin/sales-payment-assiment-form-sheet";
import { useSalesPaymentAssimentColumns } from "@/components/admin/sales-payment-assiment-table-columns";
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

export function SalesPaymentAssimentPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<SalesPaymentAssimentItem[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmItem[]>([]);
  const [methods, setMethods] = useState<SalesPayMethodCompoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] =
    useState<SalesPaymentAssimentItem | null>(null);

  const [pharmId, setPharmId] = useState("");
  const [spmId, setSpmId] = useState(0);
  const [filterPharmId, setFilterPharmId] = useState("");

  const columns = useSalesPaymentAssimentColumns();
  const canCreate = hasPermission(PERMISSIONS.salesPaymentAssiment.create);
  const canEdit = hasPermission(PERMISSIONS.salesPaymentAssiment.edit);
  const canDelete = hasPermission(PERMISSIONS.salesPaymentAssiment.delete);

  const loadLookups = useCallback(async () => {
    if (!token) {
      setPharmacies([]);
      setMethods([]);
      return;
    }
    const [pharmRows, methodRows] = await Promise.all([
      getPharms(token),
      getSalesPayMethodCompo(token),
    ]);
    setPharmacies(pharmRows);
    setMethods(methodRows);
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
        await getSalesPaymentAssimments(
          token,
          filterPharmId ? { pharmId: filterPharmId } : undefined
        )
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load payment assignments";
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
      await createSalesPaymentAssiment(
        { pharmId, spmId },
        token
      );
      toast.success("Payment assignment created");
      setPharmId("");
      setSpmId(0);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create payment assignment"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: SalesPaymentAssimentItem) {
    setEditingItem(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: SalesPaymentAssimentFormValues) {
    if (!token || !editingItem) return;

    setSheetSaving(true);
    try {
      await updateSalesPaymentAssiment(editingItem.id, values, token);
      toast.success("Payment assignment updated");
      setSheetOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update payment assignment"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: SalesPaymentAssimentItem) {
    toast(`Delete assignment #${row.id}?`, {
      description: `${row.paymentName || "Method"} for pharmacy ${
        row.pharmName || row.pharmId
      } will be removed.`,
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

  async function confirmDelete(row: SalesPaymentAssimentItem) {
    if (!token) return;

    try {
      await deleteSalesPaymentAssiment(row.id, token);
      toast.success("Payment assignment deleted");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete payment assignment"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.salesPaymentAssiment.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Sales Payment Assignment</h2>
          <p className="text-muted-foreground text-sm">
            Assign which payment methods each pharmacy may use at checkout.
          </p>
        </div>

        {canCreate ? (
          <Card>
            <CardHeader>
              <CardTitle>New assignment</CardTitle>
              <CardDescription>
                Links one pharmacy to one payment method (unique pair).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pharmId">Pharmacy</Label>
                  <select
                    id="pharmId"
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    value={pharmId}
                    onChange={(e) => setPharmId(e.target.value)}
                    required
                  >
                    <option value="">Select pharmacy</option>
                    {pharmacies.map((p) => (
                      <option key={p.parmId} value={String(p.parmId)}>
                        {p.parmEnName || p.parmArName || p.parmId}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spmId">Payment method</Label>
                  <select
                    id="spmId"
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    value={spmId || ""}
                    onChange={(e) => setSpmId(Number(e.target.value))}
                    required
                  >
                    <option value="">Select method</option>
                    {methods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.paymentName || `#${m.id}`}
                        {m.active ? "" : " (inactive)"}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" disabled={saving || !pharmId || !spmId}>
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
                value={filterPharmId}
                onChange={(e) => setFilterPharmId(e.target.value)}
              >
                <option value="">All pharmacies</option>
                {pharmacies.map((p) => (
                  <option key={p.parmId} value={String(p.parmId)}>
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
              emptyMessage="No payment assignments yet."
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? handleDelete : undefined}
            />
          </CardContent>
        </Card>

        <SalesPaymentAssimentFormSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          item={editingItem}
          saving={sheetSaving}
          pharmacies={pharmacies}
          methods={methods}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
