"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createItemFormat,
  deleteItemFormat,
  getItemFormats,
  updateItemFormat,
} from "@/lib/api-client";
import type { ItemFormatItem } from "@/types/item-format";
import {
  ItemFormatFormSheet,
  type ItemFormatFormValues,
} from "@/components/admin/item-format-form-sheet";
import { useItemFormatColumns } from "@/components/admin/item-format-table-columns";
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

export function ItemFormatsPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<ItemFormatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemFormatItem | null>(null);

  const [itfNameAr, setItfNameAr] = useState("");
  const [itfNameEn, setItfNameEn] = useState("");

  const columns = useItemFormatColumns();

  const loadItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setItems(await getItemFormats(token));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load item formats";
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
      await createItemFormat(
        { itfNameAr: itfNameAr.trim(), itfNameEn: itfNameEn.trim() },
        token
      );
      toast.success("Item format created");
      setItfNameAr("");
      setItfNameEn("");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create item format"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: ItemFormatItem) {
    setEditingItem(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: ItemFormatFormValues) {
    if (!token || !editingItem) return;

    setSheetSaving(true);
    try {
      await updateItemFormat(
        editingItem.itfCode,
        {
          itfNameAr: values.itfNameAr.trim(),
          itfNameEn: values.itfNameEn.trim(),
        },
        token
      );
      toast.success("Item format updated");
      setSheetOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update item format"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: ItemFormatItem) {
    toast(`Delete item format #${row.itfCode}?`, {
      description: `"${row.itfNameEn || row.itfNameAr}" will be removed permanently.`,
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

  async function confirmDelete(row: ItemFormatItem) {
    if (!token) return;

    try {
      await deleteItemFormat(row.itfCode, token);
      toast.success("Item format deleted");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete item format"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.itemFormat.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Item Formats</h2>
          <p className="text-muted-foreground text-sm">
            Manage item formats from the Alfa ItemFormat API.
          </p>
        </div>

        <ActionGuard permission={PERMISSIONS.itemFormat.create}>
          <Card>
            <CardHeader>
              <CardTitle>New item format</CardTitle>
              <CardDescription>Example: Tablet, Capsule, Syrup</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itfNameAr">Arabic name</Label>
                  <Input
                    id="itfNameAr"
                    placeholder="قرص"
                    value={itfNameAr}
                    onChange={(e) => setItfNameAr(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="itfNameEn">English name</Label>
                  <Input
                    id="itfNameEn"
                    placeholder="Tablet"
                    value={itfNameEn}
                    onChange={(e) => setItfNameEn(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create item format"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </ActionGuard>

        <Card>
          <CardHeader>
            <CardTitle>All item formats ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter item formats..."
              emptyMessage="No item formats yet. Create your first one above."
              onEdit={
                hasPermission(PERMISSIONS.itemFormat.edit) ? handleEdit : undefined
              }
              onDelete={
                hasPermission(PERMISSIONS.itemFormat.delete)
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

        <ItemFormatFormSheet
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
