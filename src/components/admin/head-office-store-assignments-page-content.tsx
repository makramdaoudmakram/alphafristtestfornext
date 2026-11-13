"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { getUsersPickerSummaries } from "@/lib/api-client";
import {
  addHeadOfficeStore,
  getApiErrorMessage,
  getHeadOfficeEligibleStores,
  getHeadOfficeUserAssignment,
  removeHeadOfficeStoreAssignment,
  setHeadOfficeJobTitle,
  updateHeadOfficeStoreAssignment,
} from "@/lib/head-office-store-assignment-api";
import type { HeadOfficeUserAssignment } from "@/types/head-office-store-assignment";
import type { UserSummary } from "@/types/permissions";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function storeLabel(storId: number, en?: string | null, ar?: string | null) {
  const name = en?.trim() || ar?.trim();
  return name ? `${name} (#${storId})` : `Store #${storId}`;
}

export function HeadOfficeStoreAssignmentsPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? null;

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [eligibleStores, setEligibleStores] = useState<
    Awaited<ReturnType<typeof getHeadOfficeEligibleStores>>
  >([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assignment, setAssignment] = useState<HeadOfficeUserAssignment | null>(null);
  const [addStoreId, setAddStoreId] = useState("");
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userOptions: ComboboxOption[] = useMemo(
    () =>
      users.map((u) => ({
        value: u.userId,
        label: u.email?.trim() || u.userId,
      })),
    [users]
  );

  const loadCatalog = useCallback(async () => {
    if (!token) return;
    setCatalogLoading(true);
    try {
      const [userList, stores] = await Promise.all([
        getUsersPickerSummaries(token),
        getHeadOfficeEligibleStores(token),
      ]);
      setUsers(userList);
      setEligibleStores(stores);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCatalogLoading(false);
    }
  }, [token]);

  const loadAssignment = useCallback(async () => {
    if (!token || !selectedUserId) {
      setAssignment(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getHeadOfficeUserAssignment(selectedUserId, token);
      setAssignment(data);
    } catch (err) {
      setAssignment(null);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, selectedUserId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    void loadAssignment();
  }, [loadAssignment]);

  const assignApprovedTitle = async () => {
    if (!token || !selectedUserId || !assignment?.approvedJobTitle.jobTitleId) return;
    try {
      await setHeadOfficeJobTitle(
        selectedUserId,
        assignment.approvedJobTitle.jobTitleId,
        token
      );
      toast.success("Head Office job title assigned.");
      await loadAssignment();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const onAddStore = async () => {
    if (!token || !selectedUserId || !addStoreId) return;
    try {
      await addHeadOfficeStore(selectedUserId, Number(addStoreId), token);
      toast.success("Store assigned.");
      setAddStoreId("");
      await loadAssignment();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <PageGuard permission={PERMISSIONS.users.edit}>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Head Office Store Assignments</h2>
          <p className="text-muted-foreground text-sm">
            Assign the approved Head Office Store Manager job title and eligible warehouse stores.
            Requires <code className="text-xs">Users.Edit</code>. Pharmacy assignments must be empty.
          </p>
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Select user</CardTitle>
            <CardDescription>Search existing Identity accounts (no new accounts created here).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SearchableCombobox
              options={userOptions}
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              placeholder={catalogLoading ? "Loading users…" : "Search user by email"}
              disabled={catalogLoading || !token}
            />
          </CardContent>
        </Card>

        {assignment ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  Email: <strong>{assignment.email ?? "—"}</strong>
                </p>
                <p>
                  Head Office principal:{" "}
                  <Badge variant={assignment.isHeadOfficePrincipal ? "default" : "secondary"}>
                    {assignment.isHeadOfficePrincipal ? "Yes" : "No"}
                  </Badge>
                </p>
                <p>
                  Configuration:{" "}
                  <Badge variant={assignment.headOfficeConfigurationValid ? "default" : "secondary"}>
                    {assignment.configurationStatus}
                  </Badge>
                </p>
                {assignment.headOfficeDenyReason ? (
                  <p className="text-destructive">{assignment.headOfficeDenyReason}</p>
                ) : null}
                <p>
                  Pharmacy scope rows: {assignment.pharmacyScopeRowCount} · Pharmacy job rows:{" "}
                  {assignment.pharmacyJobRowCount}
                </p>
                {assignment.jobAssignment ? (
                  <p>
                    Active job: {assignment.jobAssignment.jobTitleName} (
                    {assignment.jobAssignment.jobTitleCode}) · Assignment #
                    {assignment.jobAssignment.assignmentId}
                  </p>
                ) : (
                  <p className="text-muted-foreground">No active Head Office job assignment.</p>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="button"
                    variant="update"
                    disabled={
                      !assignment.approvedJobTitle.jobTitleId ||
                      assignment.jobAssignment?.jobTitleCode ===
                        assignment.approvedJobTitle.jobTitleCode
                    }
                    onClick={() => void assignApprovedTitle()}
                  >
                    Assign {assignment.approvedJobTitle.jobTitleCode}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void loadAssignment()} disabled={loading}>
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Store assignments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-2">
                  <Select value={addStoreId} onValueChange={setAddStoreId}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Eligible store" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleStores.map((s) => (
                        <SelectItem key={s.storId} value={String(s.storId)}>
                          {storeLabel(s.storId, s.storEnName, s.storArName)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={() => void onAddStore()} disabled={!addStoreId || !selectedUserId}>
                    Add store
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignment.storeAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-muted-foreground">
                          No store assignments.
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignment.storeAssignments.map((row) => (
                        <TableRow key={row.assignmentId}>
                          <TableCell>
                            {storeLabel(row.storId, row.storEnName, row.storArName)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={row.isActive ? "default" : "secondary"}>
                              {row.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void (async () => {
                                  if (!token) return;
                                  try {
                                    await updateHeadOfficeStoreAssignment(
                                      selectedUserId,
                                      row.assignmentId,
                                      !row.isActive,
                                      token
                                    );
                                    await loadAssignment();
                                  } catch (err) {
                                    toast.error(getApiErrorMessage(err));
                                  }
                                })()
                              }
                            >
                              {row.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                void (async () => {
                                  if (!token) return;
                                  try {
                                    await removeHeadOfficeStoreAssignment(
                                      selectedUserId,
                                      row.assignmentId,
                                      token
                                    );
                                    await loadAssignment();
                                  } catch (err) {
                                    toast.error(getApiErrorMessage(err));
                                  }
                                })()
                              }
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </PageGuard>
  );
}
