"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  assignUserRoles,
  clearUserRoles,
  getRoles,
  getUserRoles,
  getUsers,
} from "@/lib/api-client";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { RoleSummary, UserSummary } from "@/types/permissions";
import { PageGuard } from "@/components/permissions/page-guard";
import { UserRolesFormSheet } from "@/components/admin/user-roles-form-sheet";
import { useUserColumns } from "@/components/admin/user-table-columns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/data-table";

export function AssignUserRolesPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadingUserRoles, setLoadingUserRoles] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const userColumns = useUserColumns();

  const loadData = useCallback(async () => {
    if (!token) {
      setUsers([]);
      setRoles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const [usersData, rolesData] = await Promise.all([
        getUsers(token),
        getRoles(token),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load users";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadData();
  }, [sessionReady, loadData]);

  async function openEditSheet(user: UserSummary) {
    if (!token) return;

    setEditingUser(user);
    setSheetOpen(true);
    setLoadingUserRoles(true);
    setSelectedRoleIds([]);

    try {
      const data = await getUserRoles(user.userId, token);
      setSelectedRoleIds(data.roleIds);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load user roles"
      );
      setSelectedRoleIds([]);
    } finally {
      setLoadingUserRoles(false);
    }
  }

  async function handleSheetSubmit(roleIds: number[]) {
    if (!token || !editingUser) return;

    setSheetSaving(true);
    try {
      await assignUserRoles(editingUser.userId, roleIds, token);
      toast.success("User roles updated");
      setSheetOpen(false);
      setEditingUser(null);
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to assign roles"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleClearRoles(user: UserSummary) {
    toast(`Remove all roles from "${user.email}"?`, {
      description: "The user account stays — only role assignments are cleared.",
      action: {
        label: "Remove",
        onClick: () => void confirmClearRoles(user),
      },
      cancel: {
        label: "Cancel",
        onClick: () => {
          toast.message("Cancelled");
        },
      },
    });
  }

  async function confirmClearRoles(user: UserSummary) {
    if (!token) return;

    try {
      await clearUserRoles(user.userId, token);
      toast.success("User roles removed");
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove roles"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.permissions.manage}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Assign User Roles</h2>
          <p className="text-muted-foreground text-sm">
            Manage role assignments for users registered in the Alfa API.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All users ({users.length})</CardTitle>
            <CardDescription>
              Click Update to assign roles in a sheet. Delete clears all roles
              for that user.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={userColumns}
              data={users}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter users..."
              emptyMessage="No users found."
              onEdit={openEditSheet}
              onDelete={handleClearRoles}
              editLabel="Update"
              deleteLabel="Clear roles"
            />
            {loadError ? (
              <div className="mt-3 space-y-3">
                <p className="text-destructive text-sm">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadData()}
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <UserRolesFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingUser(null);
          }}
          user={editingUser}
          roles={roles}
          initialRoleIds={selectedRoleIds}
          loadingRoles={loadingUserRoles}
          saving={sheetSaving}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
