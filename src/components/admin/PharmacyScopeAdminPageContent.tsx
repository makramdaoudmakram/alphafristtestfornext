"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { PageGuard } from "@/components/permissions/page-guard";
import {
  assignUserPharmacy,
  getUserPharmacyAssignments,
  removeUserPharmacyAssignment,
} from "@/lib/pharmacy-scope-api";
import { getPharms, getUsers } from "@/lib/api-client";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { UserPharmacyAssignment } from "@/types/pharmacy-scope";
import type { PharmItem } from "@/types/pharm";
import type { UserSummary } from "@/types/permissions";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function getPharmacyLabel(pharm: PharmItem) {
  const name = pharm.parmEnName?.trim() || pharm.parmArName?.trim();
  return name ? `${name} (#${pharm.parmId})` : `Pharm #${pharm.parmId}`;
}

function getUserLabel(user: UserSummary) {
  return user.email?.trim() || user.userId;
}

export function PharmacyScopeAdminPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [userId, setUserId] = useState("");
  const [parmId, setParmId] = useState("");
  const [assignments, setAssignments] = useState<UserPharmacyAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const userOptions = useMemo<ComboboxOption[]>(
    () =>
      users.map((user) => ({
        value: user.userId,
        label: getUserLabel(user),
      })),
    [users]
  );

  const assignedParmIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.parmId)),
    [assignments]
  );

  const pharmacyOptions = useMemo<ComboboxOption[]>(
    () =>
      pharmacies
        .filter((pharm) => !assignedParmIds.has(String(pharm.parmId)))
        .map((pharm) => ({
          value: String(pharm.parmId),
          label: getPharmacyLabel(pharm),
        })),
    [pharmacies, assignedParmIds]
  );

  const selectedUser = users.find((user) => user.userId === userId) ?? null;

  const loadCatalog = useCallback(async () => {
    if (!token) {
      setUsers([]);
      setPharmacies([]);
      setCatalogLoading(false);
      return;
    }

    setCatalogLoading(true);
    setCatalogError(null);

    try {
      const [usersData, pharmaciesData] = await Promise.all([
        getUsers(token),
        getPharms(token),
      ]);
      setUsers(usersData);
      setPharmacies(pharmaciesData);
    } catch (err) {
      setUsers([]);
      setPharmacies([]);
      setCatalogError(
        err instanceof Error ? err.message : "Failed to load users or pharmacies."
      );
    } finally {
      setCatalogLoading(false);
    }
  }, [token]);

  const loadAssignments = useCallback(async () => {
    if (!token || !userId.trim()) {
      setAssignments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getUserPharmacyAssignments(userId.trim(), token);
      setAssignments(data);
    } catch (err) {
      setAssignments([]);
      setError(err instanceof Error ? err.message : "Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadCatalog();
  }, [sessionReady, loadCatalog]);

  useEffect(() => {
    setParmId("");
    if (!userId.trim()) {
      setAssignments([]);
      return;
    }
    void loadAssignments();
  }, [userId, loadAssignments]);

  const handleAssign = async () => {
    if (!token || !userId.trim() || !parmId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await assignUserPharmacy(
        userId.trim(),
        parmId.trim(),
        assignments.length === 0,
        token
      );
      setParmId("");
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign pharmacy.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userPharmacyId: number) => {
    if (!token || !userId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await removeUserPharmacyAssignment(userId.trim(), userPharmacyId, token);
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove assignment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageGuard
      permission={[
        PERMISSIONS.pharmacyScope.manage,
        PERMISSIONS.permissions.manage,
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Pharmacy Scope Management</CardTitle>
          <CardDescription>
            Select a user and pharmacy by name. The backend stores the user ID
            and ParmId automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {catalogError ? (
            <p className="text-destructive text-sm">{catalogError}</p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <SearchableCombobox
                value={userId}
                onValueChange={setUserId}
                options={userOptions}
                placeholder="Select user"
                searchPlaceholder="Search by email..."
                emptyMessage={
                  catalogLoading ? "Loading users..." : "No users found."
                }
                disabled={catalogLoading || loading}
                className="max-w-md"
                orphanLabel={selectedUser ? getUserLabel(selectedUser) : null}
              />
              {selectedUser ? (
                <p className="text-muted-foreground text-xs">
                  User ID: {selectedUser.userId}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pharmacy</label>
              <SearchableCombobox
                value={parmId}
                onValueChange={setParmId}
                options={pharmacyOptions}
                placeholder={
                  userId.trim() ? "Select pharmacy" : "Select a user first"
                }
                searchPlaceholder="Search pharmacy name..."
                emptyMessage={
                  catalogLoading
                    ? "Loading pharmacies..."
                    : userId.trim() && pharmacyOptions.length === 0
                      ? "All pharmacies are already assigned."
                      : "No pharmacies found."
                }
                disabled={catalogLoading || loading || !userId.trim()}
                className="max-w-md"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={loading || !userId.trim() || !parmId.trim()}
              onClick={() => void handleAssign()}
            >
              Assign pharmacy
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading || !userId.trim()}
              onClick={() => void loadAssignments()}
            >
              Refresh assignments
            </Button>
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <div className="space-y-2">
            {assignments.map((assignment) => (
              <div
                key={assignment.userPharmacyId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">{assignment.name}</p>
                  <p className="text-muted-foreground text-xs">
                    ParmId: {assignment.parmId}
                    {assignment.isDefault ? " · Default" : ""}
                    {assignment.isActive ? "" : " · Inactive"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => void handleRemove(assignment.userPharmacyId)}
                >
                  Remove
                </Button>
              </div>
            ))}
            {!loading && userId.trim() && assignments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No pharmacy assignments for this user yet.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </PageGuard>
  );
}
