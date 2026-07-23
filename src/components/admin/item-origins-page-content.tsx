"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createItemOrigin,
  deleteItemOrigin,
  getItemOrigins,
  updateItemOrigin,
} from "@/lib/api-client";
import type { ItemOriginItem } from "@/types/item-origin";
import {
  ItemOriginFormSheet,
  type ItemOriginFormValues,
} from "@/components/admin/item-origin-form-sheet";
import { useItemOriginColumns } from "@/components/admin/item-origin-table-columns";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/data-table";

export function ItemOriginsPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<ItemOriginItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemOriginItem | null>(null);

  const [ioTextAr, setIoTextAr] = useState("");

  const columns = useItemOriginColumns();

  const loadItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setItems(await getItemOrigins(token));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load item origins";
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
      await createItemOrigin({ ioTextAr: ioTextAr.trim() }, token);
      toast.success("Item origin created");
      setIoTextAr("");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create item origin"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: ItemOriginItem) {
    setEditingItem(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: ItemOriginFormValues) {
    if (!token || !editingItem) return;

    setSheetSaving(true);
    try {
      await updateItemOrigin(
        editingItem.ioId,
        { ioTextAr: values.ioTextAr.trim() },
        token
      );
      toast.success("Item origin updated");
      setSheetOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update item origin"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: ItemOriginItem) {
    toast(`Delete item origin #${row.ioId}?`, {
      description: `"${row.ioTextAr}" will be removed permanently.`,
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

  async function confirmDelete(row: ItemOriginItem) {
    if (!token) return;

    try {
      await deleteItemOrigin(row.ioId, token);
      toast.success("Item origin deleted");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete item origin"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.itemOrigin.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Item Origins</h2>
          <p className="text-muted-foreground text-sm">
            Manage item origins from the Alfa ItemOrigin API.
          </p>
        </div>

        <ActionGuard permission={PERMISSIONS.itemOrigin.create}>
          <Card>
            <CardHeader>
              <CardTitle>New item origin</CardTitle>
              <CardDescription>Example: Local, Imported</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ioTextAr">Arabic text</Label>
                  <Input
                    id="ioTextAr"
                    placeholder="محلي"
                    value={ioTextAr}
                    onChange={(e) => setIoTextAr(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create item origin"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </ActionGuard>

        <Card>
          <CardHeader>
            <CardTitle>All item origins ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter item origins..."
              emptyMessage="No item origins yet. Create your first one above."
              onEdit={
                hasPermission(PERMISSIONS.itemOrigin.edit) ? handleEdit : undefined
              }
              onDelete={
                hasPermission(PERMISSIONS.itemOrigin.delete)
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

        <ItemOriginFormSheet
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
