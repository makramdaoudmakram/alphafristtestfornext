"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createRole,
  deleteRole,
  getRoles,
  updateRole,
} from "@/lib/api-client";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { RoleSummary } from "@/types/permissions";
import { PageGuard } from "@/components/permissions/page-guard";
import {
  RoleFormSheet,
  type RoleFormValues,
} from "@/components/admin/role-form-sheet";
import { useRoleColumns } from "@/components/admin/role-table-columns";
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

export function CreateRolesPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleSummary | null>(null);

  const [roleCode, setRoleCode] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");

  const roleColumns = useRoleColumns();

  const loadRoles = useCallback(async () => {
    if (!token) {
      setRoles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const data = await getRoles(token);
      setRoles(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load roles";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadRoles();
  }, [sessionReady, loadRoles]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      await createRole(
        {
          roleCode: roleCode.trim(),
          roleName: roleName.trim(),
          roleDescription: roleDescription.trim() || undefined,
        },
        token
      );
      toast.success("Role created");
      setRoleCode("");
      setRoleName("");
      setRoleDescription("");
      await loadRoles();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create role"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEditRole(row: RoleSummary) {
    setEditingRole(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: RoleFormValues) {
    if (!token || !editingRole) return;

    setSheetSaving(true);
    try {
      await updateRole(
        editingRole.roleId,
        {
          roleCode: values.roleCode.trim(),
          roleName: values.roleName.trim(),
          roleDescription: values.roleDescription.trim() || undefined,
        },
        token
      );
      toast.success("Role updated");
      setSheetOpen(false);
      setEditingRole(null);
      await loadRoles();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDeleteRole(row: RoleSummary) {
    toast(`Delete "${row.roleName}"?`, {
      description: "This will remove the role and its user/permission links.",
      action: {
        label: "Delete",
        onClick: () => void confirmDeleteRole(row),
      },
      cancel: {
        label: "Cancel",
        onClick: () => {
          toast.message("Delete cancelled");
        },
      },
    });
  }

  async function confirmDeleteRole(row: RoleSummary) {
    if (!token) return;

    try {
      await deleteRole(row.roleId, token);
      toast.success("Role deleted");
      await loadRoles();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete role"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.permissions.manage}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Create Roles</h2>
          <p className="text-muted-foreground text-sm">
            Add new roles, then assign permissions on the Role Permissions page.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New role</CardTitle>
            <CardDescription>Example: Admin, Viewer, Manager</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
              <div className="space-y-2">
                <Label htmlFor="roleCode">Role code</Label>
                <Input
                  id="roleCode"
                  placeholder="Manager"
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleName">Role name</Label>
                <Input
                  id="roleName"
                  placeholder="Manager"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleDescription">Description (optional)</Label>
                <Input
                  id="roleDescription"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create role"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All roles ({roles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={roleColumns}
              data={roles}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter roles..."
              emptyMessage="No roles yet. Create your first one above."
              onEdit={handleEditRole}
              onDelete={handleDeleteRole}
            />
            {loadError ? (
              <div className="mt-3 space-y-3">
                <p className="text-destructive text-sm">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadRoles()}
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <RoleFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingRole(null);
          }}
          role={editingRole}
          saving={sheetSaving}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
