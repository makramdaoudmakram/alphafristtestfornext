"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createItemFormat,
  deleteItemFormat,
  getGroups,
  getItemFormats,
  updateItemFormat,
} from "@/lib/api-client";
import type { ItemFormatItem } from "@/types/item-format";
import type { GroupItem } from "@/types/group";
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
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import type { ComboboxOption } from "@/components/ui/searchable-combobox";
import { DataTable } from "@/components/data-table";

function getGroupLabel(group: GroupItem): string {
  return group.gNameEn?.trim() || group.gNameAr?.trim() || `#${group.id}`;
}

function parseGroupId(groupId: string): number | null {
  const parsed = Number.parseInt(groupId, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function ItemFormatsPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<ItemFormatItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemFormatItem | null>(null);

  const [groupId, setGroupId] = useState("");
  const [itfNameAr, setItfNameAr] = useState("");
  const [itfNameEn, setItfNameEn] = useState("");

  const columns = useItemFormatColumns();

  const groupOptions = useMemo<ComboboxOption[]>(
    () =>
      groups.map((group) => ({
        value: String(group.id),
        label: getGroupLabel(group),
      })),
    [groups]
  );

  const loadItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const [nextItems, nextGroups] = await Promise.all([
        getItemFormats(token),
        getGroups(token),
      ]);
      setItems(nextItems);
      setGroups(nextGroups);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load dosage forms";
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

    const parsedGroupId = parseGroupId(groupId);
    if (!parsedGroupId) {
      toast.error("Group is required.");
      return;
    }

    setSaving(true);
    try {
      await createItemFormat(
        {
          groupId: parsedGroupId,
          itfNameAr: itfNameAr.trim(),
          itfNameEn: itfNameEn.trim(),
        },
        token
      );
      toast.success("Dosage form created");
      setGroupId("");
      setItfNameAr("");
      setItfNameEn("");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create dosage form"
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

    const parsedGroupId = parseGroupId(values.groupId);
    if (!parsedGroupId) {
      toast.error("Group is required.");
      return;
    }

    setSheetSaving(true);
    try {
      await updateItemFormat(
        editingItem.itfCode,
        {
          groupId: parsedGroupId,
          itfNameAr: values.itfNameAr.trim(),
          itfNameEn: values.itfNameEn.trim(),
        },
        token
      );
      toast.success("Dosage form updated");
      setSheetOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update dosage form"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: ItemFormatItem) {
    toast(`Delete dosage form #${row.itfCode}?`, {
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
      toast.success("Dosage form deleted");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete dosage form"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.itemFormat.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Dosage Form</h2>
          <p className="text-muted-foreground text-sm">
            Manage dosage forms from the Alfa ItemFormat API.
          </p>
        </div>

        <ActionGuard permission={PERMISSIONS.itemFormat.create}>
          <Card>
            <CardHeader>
              <CardTitle>New dosage form</CardTitle>
              <CardDescription>Example: Tablet, Capsule, Syrup</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
                <div className="space-y-2">
                  <Label htmlFor="groupId">Group</Label>
                  <SearchableCombobox
                    value={groupId}
                    onValueChange={setGroupId}
                    options={groupOptions}
                    placeholder="Select group"
                  />
                </div>
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
                  {saving ? "Creating..." : "Create dosage form"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </ActionGuard>

        <Card>
          <CardHeader>
            <CardTitle>All dosage forms ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter dosage forms..."
              emptyMessage="No dosage forms yet. Create your first one above."
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
          groupOptions={groupOptions}
          saving={sheetSaving}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
