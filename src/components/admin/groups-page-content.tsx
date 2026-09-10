"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createGroup,
  deleteGroup,
  getGroups,
  updateGroup,
} from "@/lib/api-client";
import type { GroupItem } from "@/types/group";
import {
  GroupFormSheet,
  type GroupFormValues,
} from "@/components/admin/group-form-sheet";
import { useGroupColumns } from "@/components/admin/group-table-columns";
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

function getGroupLabel(group: GroupItem): string {
  return group.gNameEn?.trim() || group.gNameAr?.trim() || `#${group.id}`;
}

export function GroupsPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);

  const [gNameAr, setGNameAr] = useState("");
  const [gNameEn, setGNameEn] = useState("");

  const columns = useGroupColumns();

  const loadGroups = useCallback(async () => {
    if (!token) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setGroups(await getGroups(token));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load groups";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadGroups();
  }, [sessionReady, loadGroups]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      await createGroup(
        {
          gNameAr: gNameAr.trim(),
          gNameEn: gNameEn.trim(),
        },
        token
      );
      toast.success("Group created");
      setGNameAr("");
      setGNameEn("");
      await loadGroups();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create group"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: GroupItem) {
    setEditingGroup(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: GroupFormValues) {
    if (!token || !editingGroup) return;

    setSheetSaving(true);
    try {
      await updateGroup(
        editingGroup.id,
        {
          gNameAr: values.gNameAr.trim(),
          gNameEn: values.gNameEn.trim(),
        },
        token
      );
      toast.success("Group updated");
      setSheetOpen(false);
      setEditingGroup(null);
      await loadGroups();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update group"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: GroupItem) {
    toast(`Delete group "${getGroupLabel(row)}"?`, {
      description:
        "Deletion is blocked if this group is linked to item catalog records.",
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

  async function confirmDelete(row: GroupItem) {
    if (!token) return;

    try {
      await deleteGroup(row.id, token);
      toast.success("Group deleted");
      await loadGroups();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete group"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.group.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Groups</h2>
          <p className="text-muted-foreground text-sm">
            Manage product groups connected to the Alfa API.
          </p>
        </div>

        <ActionGuard permission={PERMISSIONS.group.create}>
          <Card>
            <CardHeader>
              <CardTitle>New group</CardTitle>
              <CardDescription>Example: Shampoo, Vitamins</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gNameAr">Arabic name</Label>
                  <Input
                    id="gNameAr"
                    placeholder="مجموعة رئيسية"
                    value={gNameAr}
                    onChange={(event) => setGNameAr(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gNameEn">English name</Label>
                  <Input
                    id="gNameEn"
                    placeholder="Main group"
                    value={gNameEn}
                    onChange={(event) => setGNameEn(event.target.value)}
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create group"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </ActionGuard>

        <Card>
          <CardHeader>
            <CardTitle>All groups ({groups.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={groups}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter groups..."
              emptyMessage="No groups yet. Create your first one above."
              onEdit={
                hasPermission(PERMISSIONS.group.edit) ? handleEdit : undefined
              }
              onDelete={
                hasPermission(PERMISSIONS.group.delete)
                  ? handleDelete
                  : undefined
              }
            />
            {loadError ? (
              <div className="mt-3 space-y-3">
                <p className="text-destructive text-sm">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadGroups()}
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <GroupFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingGroup(null);
          }}
          group={editingGroup}
          saving={sheetSaving}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
