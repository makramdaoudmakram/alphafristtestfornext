"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createMovParient,
  deleteMovParient,
  getMovParients,
  updateMovParient,
} from "@/lib/api-client";
import type { MovParientItem } from "@/types/mov-parient";
import {
  MovParientFormSheet,
  type MovParientFormValues,
} from "@/components/admin/mov-parient-form-sheet";
import { useMovParientColumns } from "@/components/admin/mov-parient-table-columns";
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

export function MovParientPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<MovParientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MovParientItem | null>(null);

  const [movParientAname, setMovParientAname] = useState("");
  const [movParientEname, setMovParientEname] = useState("");

  const columns = useMovParientColumns();
  const canCreate =
    PERMISSIONS.movParient.create === null ||
    hasPermission(PERMISSIONS.movParient.create);
  const canEdit =
    PERMISSIONS.movParient.edit === null ||
    hasPermission(PERMISSIONS.movParient.edit);
  const canDelete =
    PERMISSIONS.movParient.delete === null ||
    hasPermission(PERMISSIONS.movParient.delete);

  const loadItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setItems(await getMovParients(token));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load item transactions";
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
      await createMovParient(
        {
          movParientAname: movParientAname.trim(),
          movParientEname: movParientEname.trim(),
        },
        token
      );
      toast.success("Item transaction created");
      setMovParientAname("");
      setMovParientEname("");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create item transaction"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: MovParientItem) {
    setEditingItem(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: MovParientFormValues) {
    if (!token || !editingItem) return;

    setSheetSaving(true);
    try {
      await updateMovParient(
        editingItem.movParientId,
        {
          movParientAname: values.movParientAname.trim(),
          movParientEname: values.movParientEname.trim(),
        },
        token
      );
      toast.success("Item transaction updated");
      setSheetOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update item transaction"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: MovParientItem) {
    toast(`Delete item transaction #${row.movParientId}?`, {
      description: `"${row.movParientEname || row.movParientAname}" will be removed permanently.`,
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

  async function confirmDelete(row: MovParientItem) {
    if (!token) return;

    try {
      await deleteMovParient(row.movParientId, token);
      toast.success("Item transaction deleted");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete item transaction"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.movParient.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Move Parient</h2>
          <p className="text-muted-foreground text-sm">
            Manage movement types (MovParient) from the Alfa API.
          </p>
        </div>

        {canCreate ? (
          <Card>
            <CardHeader>
              <CardTitle>New move parient</CardTitle>
              <CardDescription>
                Example: In, Out, Transfer, Adjustment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
                <div className="space-y-2">
                  <Label htmlFor="movParientAname">Arabic name</Label>
                  <Input
                    id="movParientAname"
                    placeholder="وارد"
                    value={movParientAname}
                    onChange={(e) => setMovParientAname(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="movParientEname">English name</Label>
                  <Input
                    id="movParientEname"
                    placeholder="In"
                    value={movParientEname}
                    onChange={(e) => setMovParientEname(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create move parient"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>All move parient ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter move parient..."
              emptyMessage="No move parient yet. Create your first one above."
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? handleDelete : undefined}
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

        <MovParientFormSheet
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
