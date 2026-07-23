"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  clearUserPermissions,
  getUserPermissions,
  getUsers,
  updateUserPermissions,
} from "@/lib/api-client";
import { PERMISSIONS } from "@/lib/route-permissions";
import type {
  UserPermissionAssignment,
  UserPermissionItem,
  UserPermissionOverride,
  UserSummary,
} from "@/types/permissions";
import { PageGuard } from "@/components/permissions/page-guard";
import { UserPermissionsFormSheet } from "@/components/admin/user-permissions-form-sheet";
import { useUserPermissionColumns } from "@/components/admin/user-permissions-table-columns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/data-table";

function overridesToAssignments(
  permissions: UserPermissionItem[],
  overrides: Record<number, UserPermissionOverride>
): UserPermissionAssignment[] {
  return permissions.map((item) => {
    const state = overrides[item.permissionId] ?? "inherit";
    return {
      permissionId: item.permissionId,
      isAllowed: state === "inherit" ? null : state === "grant",
    };
  });
}

export function UserPermissionsPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissionItem[]>(
    []
  );

  const userColumns = useUserPermissionColumns();

  const loadData = useCallback(async () => {
    if (!token) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const usersData = await getUsers(token);
      setUsers(usersData);
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
    setLoadingPermissions(true);
    setUserPermissions([]);

    try {
      const data = await getUserPermissions(user.userId, token);
      setUserPermissions(data.permissions);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load user permissions"
      );
      setUserPermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  }

  async function handleSheetSubmit(
    overrides: Record<number, UserPermissionOverride>
  ) {
    if (!token || !editingUser) return;

    setSheetSaving(true);
    try {
      const assignments = overridesToAssignments(userPermissions, overrides);
      await updateUserPermissions(editingUser.userId, assignments, token);
      toast.success("User permissions updated");
      setSheetOpen(false);
      setEditingUser(null);
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update user permissions"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleClearOverrides(user: UserSummary) {
    toast(`Clear all permission overrides for "${user.email}"?`, {
      description:
        "The user will inherit permissions from roles only. Role assignments are not changed.",
      action: {
        label: "Clear",
        onClick: () => void confirmClearOverrides(user),
      },
      cancel: {
        label: "Cancel",
        onClick: () => {
          toast.message("Cancelled");
        },
      },
    });
  }

  async function confirmClearOverrides(user: UserSummary) {
    if (!token) return;

    try {
      await clearUserPermissions(user.userId, token);
      toast.success("User permission overrides cleared");
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to clear user permissions"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.permissions.manage}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">User Permissions</h2>
          <p className="text-muted-foreground text-sm">
            Grant or deny individual permissions per user. Overrides apply on
            top of role assignments.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All users ({users.length})</CardTitle>
            <CardDescription>
              Click Update to set allow/deny overrides in a sheet. Delete
              clears all overrides for that user.
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
              onDelete={handleClearOverrides}
              editLabel="Update"
              deleteLabel="Clear overrides"
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

        <UserPermissionsFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingUser(null);
          }}
          user={editingUser}
          permissions={userPermissions}
          loadingPermissions={loadingPermissions}
          saving={sheetSaving}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
