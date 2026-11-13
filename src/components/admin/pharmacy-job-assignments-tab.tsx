"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { getPharms, getUsersPickerSummaries } from "@/lib/api-client";
import {
  createPharmacyJobAssignment,
  deactivatePharmacyJobAssignment,
  getApiErrorMessage,
  getPharmacyJobAssignmentsByPharmacy,
  getPharmacyJobAssignmentsByUser,
  getPharmacyJobTitles,
  reactivatePharmacyJobAssignment,
} from "@/lib/pharmacy-job-auth-api";
import type { PharmacyJobAssignmentItem } from "@/types/pharmacy-job-auth";
import type { PharmItem } from "@/types/pharm";
import type { UserSummary } from "@/types/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

function getPharmacyLabel(pharm: PharmItem) {
  const name = pharm.parmEnName?.trim() || pharm.parmArName?.trim();
  return name ? `${name} (#${pharm.parmId})` : `Pharmacy #${pharm.parmId}`;
}

function getUserLabel(user: UserSummary) {
  return user.email?.trim() || user.userId;
}

type ListMode = "user" | "pharmacy";

type AssignmentEditorState = {
  assignmentId: number;
  userId: string;
  userLabel: string;
  parmId: number;
  pharmacyLabel: string;
  jobTitleId: number;
  isActive: boolean;
};

export function PharmacyJobAssignmentsTab() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? null;

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmItem[]>([]);
  const [jobTitleOptions, setJobTitleOptions] = useState<
    { jobTitleId: number; label: string; isActive: boolean }[]
  >([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [listMode, setListMode] = useState<ListMode>("user");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterParmId, setFilterParmId] = useState("");

  const [assignUserId, setAssignUserId] = useState("");
  const [assignParmId, setAssignParmId] = useState("");
  const [assignJobTitleId, setAssignJobTitleId] = useState("");

  const [assignments, setAssignments] = useState<PharmacyJobAssignmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editor, setEditor] = useState<AssignmentEditorState | null>(null);
  const [editJobTitleId, setEditJobTitleId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const userOptions = useMemo<ComboboxOption[]>(
    () =>
      users.map((user) => ({
        value: user.userId,
        label: getUserLabel(user),
      })),
    [users]
  );

  const pharmacyOptions = useMemo<ComboboxOption[]>(
    () =>
      pharmacies.map((pharm) => ({
        value: String(pharm.parmId),
        label: getPharmacyLabel(pharm),
      })),
    [pharmacies]
  );

  const activeJobTitleSelectOptions = useMemo(
    () => jobTitleOptions.filter((title) => title.isActive),
    [jobTitleOptions]
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);

    void (async () => {
      try {
        const [userRows, pharmRows, titleRows] = await Promise.all([
          getUsersPickerSummaries(token),
          getPharms(token),
          getPharmacyJobTitles(token),
        ]);
        if (cancelled) return;
        setUsers(userRows);
        setPharmacies(pharmRows);
        setJobTitleOptions(
          titleRows.map((title) => ({
            jobTitleId: title.jobTitleId,
            label: `${title.name} (${title.jobTitleCode})`,
            isActive: title.isActive,
          }))
        );
      } catch (err) {
        if (!cancelled) {
          setCatalogError(getApiErrorMessage(err));
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const loadAssignments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      if (listMode === "user") {
        if (!filterUserId.trim()) {
          setAssignments([]);
          return;
        }
        setAssignments(await getPharmacyJobAssignmentsByUser(filterUserId.trim(), token));
        return;
      }
      if (!filterParmId.trim()) {
        setAssignments([]);
        return;
      }
      setAssignments(
        await getPharmacyJobAssignmentsByPharmacy(Number(filterParmId), token)
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, listMode, filterUserId, filterParmId]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  async function handleCreateAssignment() {
    if (!token) return;
    if (!assignUserId.trim() || !assignParmId.trim() || !assignJobTitleId.trim()) {
      setError("Employee, pharmacy, and job title are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const createdUserId = assignUserId.trim();
      const createdParmId = assignParmId.trim();
      await createPharmacyJobAssignment(
        {
          userId: createdUserId,
          parmId: Number(createdParmId),
          jobTitleId: Number(assignJobTitleId),
        },
        token
      );
      toast.success("Assignment created.");
      setAssignUserId("");
      setAssignParmId("");
      setAssignJobTitleId("");
      if (listMode === "user") setFilterUserId(createdUserId);
      if (listMode === "pharmacy") setFilterParmId(createdParmId);
      await loadAssignments();
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(assignmentId: number) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await deactivatePharmacyJobAssignment(assignmentId, token);
      toast.success("Assignment deactivated.");
      await loadAssignments();
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivate(assignmentId: number) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await reactivatePharmacyJobAssignment(assignmentId, token);
      toast.success("Assignment reactivated.");
      await loadAssignments();
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function openEdit(row: PharmacyJobAssignmentItem) {
    setEditor({
      assignmentId: row.assignmentId,
      userId: row.userId,
      userLabel: row.userEmail ?? row.userId,
      parmId: row.parmId,
      pharmacyLabel: row.pharmacyName ?? `Parm #${row.parmId}`,
      jobTitleId: row.jobTitleId,
      isActive: row.isActive,
    });
    setEditJobTitleId(String(row.jobTitleId));
    setEditIsActive(row.isActive);
    setEditFormError(null);
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!token || !editor) return;
    if (!editJobTitleId.trim()) {
      setEditFormError("Job title is required.");
      return;
    }

    const nextJobTitleId = Number(editJobTitleId);
    const jobTitleChanged = nextJobTitleId !== editor.jobTitleId;
    const statusChanged = editIsActive !== editor.isActive;

    if (!jobTitleChanged && !statusChanged) {
      setEditOpen(false);
      return;
    }

    setEditSaving(true);
    setEditFormError(null);
    try {
      if (jobTitleChanged) {
        if (editor.isActive) {
          await deactivatePharmacyJobAssignment(editor.assignmentId, token);
        }
        const created = await createPharmacyJobAssignment(
          {
            userId: editor.userId,
            parmId: editor.parmId,
            jobTitleId: nextJobTitleId,
          },
          token
        );
        if (!editIsActive) {
          await deactivatePharmacyJobAssignment(created.assignmentId, token);
        }
      } else if (editIsActive) {
        await reactivatePharmacyJobAssignment(editor.assignmentId, token);
      } else {
        await deactivatePharmacyJobAssignment(editor.assignmentId, token);
      }

      toast.success("Assignment updated.");
      setEditOpen(false);
      await loadAssignments();
    } catch (err) {
      const message = getApiErrorMessage(err);
      setEditFormError(message);
      toast.error(message);
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {catalogError ? (
        <p className="text-destructive text-sm">{catalogError}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>New assignment</CardTitle>
          <CardDescription>
            Links an employee to a pharmacy with a job title for operational permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Employee</p>
              <SearchableCombobox
                options={userOptions}
                value={assignUserId}
                onValueChange={setAssignUserId}
                placeholder={catalogLoading ? "Loading…" : "Select user"}
                disabled={catalogLoading || loading}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Pharmacy</p>
              <SearchableCombobox
                options={pharmacyOptions}
                value={assignParmId}
                onValueChange={setAssignParmId}
                placeholder={catalogLoading ? "Loading…" : "Select pharmacy"}
                disabled={catalogLoading || loading}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Job title</p>
              <Select
                value={assignJobTitleId}
                onValueChange={setAssignJobTitleId}
                disabled={catalogLoading || loading || activeJobTitleSelectOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select job title" />
                </SelectTrigger>
                <SelectContent>
                  {activeJobTitleSelectOptions.map((title) => (
                    <SelectItem key={title.jobTitleId} value={String(title.jobTitleId)}>
                      {title.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => void handleCreateAssignment()}
            disabled={loading || catalogLoading}
          >
            Create assignment
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>
            List by employee or pharmacy using the existing assignment APIs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">List by</p>
              <Select
                value={listMode}
                onValueChange={(value) => setListMode(value as ListMode)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Employee</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {listMode === "user" ? (
              <div className="min-w-[16rem] flex-1 space-y-2">
                <p className="text-sm font-medium">Employee</p>
                <SearchableCombobox
                  options={userOptions}
                  value={filterUserId}
                  onValueChange={setFilterUserId}
                  placeholder="Select user to list assignments"
                  disabled={catalogLoading}
                />
              </div>
            ) : (
              <div className="min-w-[16rem] flex-1 space-y-2">
                <p className="text-sm font-medium">Pharmacy</p>
                <SearchableCombobox
                  options={pharmacyOptions}
                  value={filterParmId}
                  onValueChange={setFilterParmId}
                  placeholder="Select pharmacy to list assignments"
                  disabled={catalogLoading}
                />
              </div>
            )}
            <Button type="button" variant="outline" onClick={() => void loadAssignments()} disabled={loading}>
              Refresh
            </Button>
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : assignments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {listMode === "user" && !filterUserId
                ? "Select an employee to view assignments."
                : listMode === "pharmacy" && !filterParmId
                  ? "Select a pharmacy to view assignments."
                  : "No assignments found."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Pharmacy</TableHead>
                  <TableHead>Job title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((row) => (
                  <TableRow key={row.assignmentId}>
                    <TableCell>
                      <div>{row.userEmail ?? row.userId}</div>
                      <div className="text-muted-foreground text-xs">{row.userId}</div>
                    </TableCell>
                    <TableCell>
                      <div>{row.pharmacyName ?? `Parm #${row.parmId}`}</div>
                      <div className="text-muted-foreground text-xs">#{row.parmId}</div>
                    </TableCell>
                    <TableCell>
                      <div>{row.jobTitleName}</div>
                      <div className="text-muted-foreground text-xs">{row.jobTitleCode}</div>
                    </TableCell>
                    <TableCell>
                      {row.isActive ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(row)}
                        >
                          Edit
                        </Button>
                        {row.isActive ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleDeactivate(row.assignmentId)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleReactivate(row.assignmentId)}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit assignment</SheetTitle>
          </SheetHeader>
          {editor ? (
            <div className="flex flex-col gap-4 px-4 pb-4">
              <div className="space-y-1">
                <Label>Employee</Label>
                <p className="text-sm">{editor.userLabel}</p>
                <p className="text-muted-foreground text-xs">{editor.userId}</p>
              </div>
              <div className="space-y-1">
                <Label>Pharmacy</Label>
                <p className="text-sm">{editor.pharmacyLabel}</p>
                <p className="text-muted-foreground text-xs">#{editor.parmId}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-job-title">Job title</Label>
                <Select
                  value={editJobTitleId}
                  onValueChange={setEditJobTitleId}
                  disabled={editSaving || activeJobTitleSelectOptions.length === 0}
                >
                  <SelectTrigger id="edit-job-title">
                    <SelectValue placeholder="Select job title" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeJobTitleSelectOptions.map((title) => (
                      <SelectItem key={title.jobTitleId} value={String(title.jobTitleId)}>
                        {title.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={editIsActive}
                  disabled={editSaving}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                />
                Active
              </label>
              <p className="text-muted-foreground text-xs">
                There is no assignment update API. Changing job title creates a new row (and
                deactivates the previous active row). Status uses deactivate/reactivate.
              </p>
              {editFormError ? (
                <p className="text-destructive text-sm">{editFormError}</p>
              ) : null}
              <SheetFooter className="px-0">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={editSaving} onClick={() => void handleSaveEdit()}>
                  {editSaving ? "Saving…" : "Save"}
                </Button>
              </SheetFooter>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
