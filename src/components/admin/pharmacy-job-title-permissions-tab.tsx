"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { getPermissionsList } from "@/lib/api-client";
import {
  getApiErrorMessage,
  getPharmacyJobTitleById,
  getPharmacyJobTitles,
  updatePharmacyJobTitle,
} from "@/lib/pharmacy-job-auth-api";
import type { PharmacyJobTitleListItem } from "@/types/pharmacy-job-auth";
import type { PermissionListItem } from "@/types/permissions";
import { PharmacyJobPermissionPicker } from "@/components/admin/pharmacy-job-permission-picker";
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

export function PharmacyJobTitlePermissionsTab() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? null;

  const [titles, setTitles] = useState<PharmacyJobTitleListItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionListItem[]>([]);
  const [selectedJobTitleId, setSelectedJobTitleId] = useState("");
  const [permissionIds, setPermissionIds] = useState<number[]>([]);
  const [assignedRows, setAssignedRows] = useState<
    { permissionId: number; permissionCode: string; permissionName: string; moduleCode: string }[]
  >([]);
  const [titleMeta, setTitleMeta] = useState<{
    name: string;
    description: string | null;
    isActive: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCatalog = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [titleRows, permissionRows] = await Promise.all([
        getPharmacyJobTitles(token),
        getPermissionsList(token),
      ]);
      setTitles(titleRows);
      setAllPermissions(permissionRows);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!token || !selectedJobTitleId) {
      setPermissionIds([]);
      setAssignedRows([]);
      setTitleMeta(null);
      return;
    }

    const jobTitleId = Number(selectedJobTitleId);
    if (!Number.isFinite(jobTitleId)) return;

    let cancelled = false;
    setDetailLoading(true);
    void (async () => {
      try {
        const detail = await getPharmacyJobTitleById(jobTitleId, token);
        if (cancelled) return;
        setTitleMeta({
          name: detail.name,
          description: detail.description,
          isActive: detail.isActive,
        });
        setPermissionIds(detail.permissions.map((p) => p.permissionId));
        setAssignedRows(
          detail.permissions.map((p) => ({
            permissionId: p.permissionId,
            permissionCode: p.permissionCode,
            permissionName: p.permissionName,
            moduleCode: p.moduleCode,
          }))
        );
      } catch (error) {
        if (!cancelled) toast.error(getApiErrorMessage(error));
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, selectedJobTitleId]);

  function togglePermission(permissionId: number, checked: boolean) {
    setPermissionIds((current) =>
      checked
        ? [...new Set([...current, permissionId])]
        : current.filter((id) => id !== permissionId)
    );
  }

  async function handleSavePermissions() {
    if (!token || !selectedJobTitleId || !titleMeta) return;
    const jobTitleId = Number(selectedJobTitleId);
    setSaving(true);
    try {
      const updated = await updatePharmacyJobTitle(
        jobTitleId,
        {
          name: titleMeta.name,
          description: titleMeta.description,
          isActive: titleMeta.isActive,
          permissionIds,
        },
        token
      );
      setAssignedRows(
        updated.permissions.map((p) => ({
          permissionId: p.permissionId,
          permissionCode: p.permissionCode,
          permissionName: p.permissionName,
          moduleCode: p.moduleCode,
        }))
      );
      toast.success("Job title permissions saved.");
      await loadCatalog();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Operational staff receive capabilities from the active pharmacy&apos;s job assignment
          (job title permissions here), plus responsibility profiles and per-user Allow/Deny
          overrides—not from global role grants. Save updates{" "}
          <code className="text-xs">PharmacyJobTitlePermissions</code> in the database; users should
          refresh or sign in again to see changes in{" "}
          <code className="text-xs">GET api/Permissions/me</code>.
        </p>
        <Button type="button" variant="outline" onClick={() => void loadCatalog()} disabled={loading}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job title permissions</CardTitle>
          <CardDescription>
            Permissions saved here apply to every user with an active job assignment that uses this
            title at their pharmacy (e.g. Inventory = Stock.View). Global roles and direct user
            overrides are configured elsewhere.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <p className="text-sm font-medium">Job title</p>
            <Select
              value={selectedJobTitleId}
              onValueChange={setSelectedJobTitleId}
              disabled={loading || titles.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading…" : "Select job title"} />
              </SelectTrigger>
              <SelectContent>
                {titles.map((title) => (
                  <SelectItem key={title.jobTitleId} value={String(title.jobTitleId)}>
                    {title.name} ({title.jobTitleCode})
                    {!title.isActive ? " — inactive" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedJobTitleId ? (
            <p className="text-muted-foreground text-sm">Select a job title to manage permissions.</p>
          ) : detailLoading ? (
            <p className="text-muted-foreground text-sm">Loading permissions…</p>
          ) : titleMeta ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{titleMeta.name}</span>
                {titleMeta.isActive ? (
                  <Badge>Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>

              <PharmacyJobPermissionPicker
                allPermissions={allPermissions}
                selectedIds={permissionIds}
                onToggle={togglePermission}
                disabled={saving}
              />

              <Button type="button" onClick={() => void handleSavePermissions()} disabled={saving}>
                {saving ? "Saving…" : "Save permissions"}
              </Button>

              <div className="space-y-2">
                <p className="text-sm font-medium">Current assignment ({assignedRows.length})</p>
                {assignedRows.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No permissions assigned.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedRows
                        .slice()
                        .sort(
                          (a, b) =>
                            a.moduleCode.localeCompare(b.moduleCode) ||
                            a.permissionCode.localeCompare(b.permissionCode)
                        )
                        .map((row) => (
                          <TableRow key={row.permissionId}>
                            <TableCell>{row.moduleCode}</TableCell>
                            <TableCell className="font-mono text-xs">{row.permissionCode}</TableCell>
                            <TableCell>{row.permissionName}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
