"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createPermission,
  deletePermission,
  getPermissionsList,
  updatePermission,
} from "@/lib/api-client";
import { PERMISSION_TYPES, PERMISSIONS } from "@/lib/route-permissions";
import type { PermissionListItem } from "@/types/permissions";
import { PageGuard } from "@/components/permissions/page-guard";
import {
  PermissionFormSheet,
  type PermissionFormValues,
} from "@/components/admin/permission-form-sheet";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { usePermissionColumns } from "@/components/admin/permission-table-columns";

export function CreatePermissionsPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [permissions, setPermissions] = useState<PermissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPermission, setEditingPermission] =
    useState<PermissionListItem | null>(null);

  const [permissionCode, setPermissionCode] = useState("");
  const [permissionName, setPermissionName] = useState("");
  const [permissionDescription, setPermissionDescription] = useState("");
  const [permissionType, setPermissionType] = useState<string>("Page");
  const [moduleCode, setModuleCode] = useState("");

  const permissionColumns = usePermissionColumns();

  const loadPermissions = useCallback(async () => {
    if (!token) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const data = await getPermissionsList(token);
      setPermissions(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load permissions";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadPermissions();
  }, [sessionReady, loadPermissions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      await createPermission(
        {
          permissionCode: permissionCode.trim(),
          permissionName: permissionName.trim(),
          permissionDescription: permissionDescription.trim() || undefined,
          permissionType,
          moduleCode: moduleCode.trim(),
        },
        token
      );
      toast.success("Permission created");
      setPermissionCode("");
      setPermissionName("");
      setPermissionDescription("");
      setModuleCode("");
      await loadPermissions();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create permission"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEditPermission(row: PermissionListItem) {
    setEditingPermission(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: PermissionFormValues) {
    if (!token || !editingPermission) return;

    setSheetSaving(true);
    try {
      await updatePermission(
        editingPermission.permissionId,
        {
          permissionCode: values.permissionCode.trim(),
          permissionName: values.permissionName.trim(),
          permissionDescription: values.permissionDescription.trim() || undefined,
          permissionType: values.permissionType,
          moduleCode: values.moduleCode.trim(),
        },
        token
      );
      toast.success("Permission updated");
      setSheetOpen(false);
      setEditingPermission(null);
      await loadPermissions();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update permission"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDeletePermission(row: PermissionListItem) {
    toast(`Delete "${row.permissionName}"?`, {
      description: "This will remove the permission from the database.",
      action: {
        label: "Delete",
        onClick: () => void confirmDeletePermission(row),
      },
      cancel: {
        label: "Cancel",
        onClick: () => {
          toast.message("Delete cancelled");
        },
      },
    });
  }

  async function confirmDeletePermission(row: PermissionListItem) {
    if (!token) return;

    try {
      await deletePermission(row.permissionId, token);
      toast.success("Permission deleted");
      await loadPermissions();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete permission"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.permissions.manage}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Create Permissions</h2>
          <p className="text-muted-foreground text-sm">
            Generate new permission codes for pages, controls, and actions.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New permission</CardTitle>
            <CardDescription>
              Example: Customer.View, Customer.Create, Permissions.Manage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="permissionCode">Permission code</Label>
                <Input
                  id="permissionCode"
                  placeholder="Customer.View"
                  value={permissionCode}
                  onChange={(e) => setPermissionCode(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permissionName">Permission name</Label>
                <Input
                  id="permissionName"
                  placeholder="View Customers"
                  value={permissionName}
                  onChange={(e) => setPermissionName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moduleCode">Module code</Label>
                <Input
                  id="moduleCode"
                  placeholder="Customer"
                  value={moduleCode}
                  onChange={(e) => setModuleCode(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permissionType">Type</Label>
                <Select value={permissionType} onValueChange={setPermissionType}>
                  <SelectTrigger id="permissionType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMISSION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="permissionDescription">Description (optional)</Label>
                <Input
                  id="permissionDescription"
                  value={permissionDescription}
                  onChange={(e) => setPermissionDescription(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create permission"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All permissions ({permissions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={permissionColumns}
              data={permissions}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter permissions..."
              emptyMessage="No permissions yet. Create your first one above."
              onEdit={handleEditPermission}
              onDelete={handleDeletePermission}
            />
            {loadError ? (
              <div className="mt-3 space-y-3">
                <p className="text-destructive text-sm">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadPermissions()}
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <PermissionFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingPermission(null);
          }}
          permission={editingPermission}
          saving={sheetSaving}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
