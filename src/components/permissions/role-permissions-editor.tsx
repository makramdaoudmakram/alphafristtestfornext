"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  getRolePermissions,
  getRoles,
  updateRolePermissions,
} from "@/lib/api-client";
import type { PermissionItem, RoleSummary } from "@/types/permissions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

function groupByModule(permissions: PermissionItem[]) {
  return permissions.reduce<Record<string, PermissionItem[]>>((acc, item) => {
    if (!acc[item.moduleCode]) acc[item.moduleCode] = [];
    acc[item.moduleCode].push(item);
    return acc;
  }, {});
}

export function RolePermissionsEditor() {
  const { data: session } = useSession();
  const { refresh } = usePermissions();
  const token = session?.accessToken;

  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    const accessToken = token;

    async function loadRoles() {
      try {
        const data = await getRoles(accessToken);
        setRoles(data);
        if (data.length > 0) {
          setSelectedRoleId(String(data[0].roleId));
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load roles"
        );
      } finally {
        setLoading(false);
      }
    }

    void loadRoles();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedRoleId) return;
    const accessToken = token;

    async function loadPermissions() {
      try {
        const data = await getRolePermissions(Number(selectedRoleId), accessToken);
        setPermissions(data.permissions);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load permissions"
        );
      }
    }

    void loadPermissions();
  }, [token, selectedRoleId]);

  const togglePermission = useCallback((permissionId: number) => {
    setPermissions((current) =>
      current.map((item) =>
        item.permissionId === permissionId
          ? { ...item, isAssigned: !item.isAssigned }
          : item
      )
    );
  }, []);

  async function handleSave() {
    if (!token || !selectedRoleId) return;

    setSaving(true);
    try {
      const permissionIds = permissions
        .filter((item) => item.isAssigned)
        .map((item) => item.permissionId);

      await updateRolePermissions(
        Number(selectedRoleId),
        permissionIds,
        token
      );
      await refresh();
      toast.success("Permissions updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save permissions"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading roles...</p>;
  }

  const grouped = groupByModule(permissions);
  const selectedRole = roles.find((r) => String(r.roleId) === selectedRoleId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Permissions</CardTitle>
        <CardDescription>
          Assign permissions to roles. Changes apply immediately for new requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.roleId} value={String(role.roleId)}>
                    {role.roleName} ({role.roleCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedRole && (
            <Badge variant="secondary">{selectedRole.roleCode}</Badge>
          )}
          <Button variant="update" onClick={handleSave} disabled={saving || !selectedRoleId}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>

        <div className="space-y-6">
          {Object.entries(grouped).map(([moduleCode, items]) => (
            <div key={moduleCode} className="space-y-3">
              <h3 className="text-sm font-semibold">{moduleCode}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((item) => (
                  <label
                    key={item.permissionId}
                    className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                  >
                    <input
                      type="checkbox"
                      checked={item.isAssigned}
                      onChange={() => togglePermission(item.permissionId)}
                      className="mt-1 size-4 rounded border"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{item.permissionName}</p>
                      <p className="text-muted-foreground text-xs">
                        {item.permissionCode}
                      </p>
                      <Badge variant="outline" className="text-[10px]">
                        {item.permissionType}
                      </Badge>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
