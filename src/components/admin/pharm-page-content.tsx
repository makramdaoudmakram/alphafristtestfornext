"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createPharm,
  deletePharm,
  getPharms,
  updatePharm,
} from "@/lib/api-client";
import { PharmFormSheet } from "@/components/admin/pharm-form-sheet";
import { PharmFormFields } from "@/components/admin/pharm-form-fields";
import { usePharmColumns } from "@/components/admin/pharm-table-columns";
import { ActionGuard, PageGuard } from "@/components/permissions/page-guard";
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
import { DataTable } from "@/components/data-table";
import type { PharmFormValues, PharmItem } from "@/types/pharm";
import { emptyPharmFormValues } from "@/types/pharm";

export function PharmPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<PharmItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PharmItem | null>(null);
  const [formValues, setFormValues] =
    useState<PharmFormValues>(emptyPharmFormValues);

  const columns = usePharmColumns();

  const loadItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setItems(await getPharms(token));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load pharm records";
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

  function patchForm(partial: Partial<PharmFormValues>) {
    setFormValues((current) => ({ ...current, ...partial }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      await createPharm(formValues, token);
      toast.success("Pharm created");
      setFormValues(emptyPharmFormValues);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create pharm"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: PharmItem) {
    setEditingItem(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: PharmFormValues) {
    if (!token || !editingItem) return;

    setSheetSaving(true);
    try {
      await updatePharm(editingItem.parmId, values, token);
      toast.success("Pharm updated");
      setSheetOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update pharm"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: PharmItem) {
    toast(`Delete pharm #${row.parmId}?`, {
      description: `"${row.parmEnName || row.parmArName || row.parmId}" will be removed.`,
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

  async function confirmDelete(row: PharmItem) {
    if (!token) return;

    try {
      await deletePharm(row.parmId, token);
      toast.success("Pharm deleted");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete pharm"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.pharm.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Pharm</h2>
          <p className="text-muted-foreground text-sm">
            Manage pharmacy branches (Parm) from the Alfa API.
          </p>
        </div>

        <ActionGuard permission={PERMISSIONS.pharm.create}>
          <Card>
            <CardHeader>
              <CardTitle>New pharm</CardTitle>
              <CardDescription>
                All Parm table fields are available when creating a record.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-6">
                <PharmFormFields
                  values={formValues}
                  onChange={patchForm}
                  idPrefix="new-"
                />
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create pharm"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </ActionGuard>

        <Card>
          <CardHeader>
            <CardTitle>All pharm records ({items.length})</CardTitle>
            <CardDescription>
              Scroll horizontally to view all Parm columns.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter pharm..."
              emptyMessage="No pharm records yet."
              onEdit={
                hasPermission(PERMISSIONS.pharm.edit) ? handleEdit : undefined
              }
              onDelete={
                hasPermission(PERMISSIONS.pharm.delete)
                  ? handleDelete
                  : undefined
              }
            />
            {loadError ? (
              <div className="mt-3 space-y-3">
                <p className="text-destructive text-sm">{loadError}</p>
                <Button type="button" variant="outline" onClick={() => void loadItems()}>
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <PharmFormSheet
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
