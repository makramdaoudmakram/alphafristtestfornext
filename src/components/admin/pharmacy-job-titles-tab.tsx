"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createPharmacyJobTitle,
  deactivatePharmacyJobTitle,
  getApiErrorMessage,
  getPharmacyJobTitleById,
  getPharmacyJobTitles,
  updatePharmacyJobTitle,
} from "@/lib/pharmacy-job-auth-api";
import type {
  PharmacyJobTitleListItem,
  UpdatePharmacyJobTitleRequest,
} from "@/types/pharmacy-job-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type JobTitleEditorState = {
  mode: "create" | "edit";
  jobTitleId: number | null;
  jobTitleCode: string;
  name: string;
  description: string;
  isActive: boolean;
};

const emptyEditor: JobTitleEditorState = {
  mode: "create",
  jobTitleId: null,
  jobTitleCode: "",
  name: "",
  description: "",
  isActive: true,
};

export function PharmacyJobTitlesTab() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? null;

  const [titles, setTitles] = useState<PharmacyJobTitleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editor, setEditor] = useState<JobTitleEditorState>(emptyEditor);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const titleRows = await getPharmacyJobTitles(token);
      setTitles(titleRows);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  function openCreate() {
    setEditor(emptyEditor);
    setFormError(null);
    setSheetOpen(true);
  }

  async function openEdit(jobTitleId: number) {
    if (!token) return;
    setFormError(null);
    setSaving(true);
    try {
      const detail = await getPharmacyJobTitleById(jobTitleId, token);
      setEditor({
        mode: "edit",
        jobTitleId: detail.jobTitleId,
        jobTitleCode: detail.jobTitleCode,
        name: detail.name,
        description: detail.description ?? "",
        isActive: detail.isActive,
      });
      setSheetOpen(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;

    setFormError(null);
    const name = editor.name.trim();
    const code = editor.jobTitleCode.trim();
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    if (editor.mode === "create" && !code) {
      setFormError("Job title code is required.");
      return;
    }

    setSaving(true);
    try {
      if (editor.mode === "create") {
        await createPharmacyJobTitle(
          {
            jobTitleCode: code,
            name,
            description: editor.description.trim() || null,
            permissionIds: [],
          },
          token
        );
        toast.success("Job title created.");
      } else if (editor.jobTitleId != null) {
        const detail = await getPharmacyJobTitleById(editor.jobTitleId, token);
        const payload: UpdatePharmacyJobTitleRequest = {
          name,
          description: editor.description.trim() || null,
          isActive: editor.isActive,
          permissionIds: detail.permissions.map((p) => p.permissionId),
        };
        await updatePharmacyJobTitle(editor.jobTitleId, payload, token);
        toast.success("Job title updated.");
      }
      setSheetOpen(false);
      await loadCatalog();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(jobTitleId: number) {
    if (!token) return;
    if (!window.confirm("Deactivate this job title? It cannot be assigned while inactive.")) {
      return;
    }
    setSaving(true);
    try {
      await deactivatePharmacyJobTitle(jobTitleId, token);
      toast.success("Job title deactivated.");
      await loadCatalog();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleReactivate(jobTitleId: number) {
    if (!token) return;
    setSaving(true);
    try {
      const detail = await getPharmacyJobTitleById(jobTitleId, token);
      await updatePharmacyJobTitle(
        jobTitleId,
        {
          name: detail.name,
          description: detail.description,
          isActive: true,
          permissionIds: detail.permissions.map((p) => p.permissionId),
        },
        token
      );
      toast.success("Job title reactivated.");
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
          Create and maintain pharmacy job title codes, names, and active status. Assign
          permissions on the Job Title Permissions tab.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void loadCatalog()} disabled={loading}>
            Refresh
          </Button>
          <Button type="button" onClick={openCreate} disabled={!token || loading}>
            New job title
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job titles</CardTitle>
          <CardDescription>
            Inactive titles remain in the catalog but cannot be assigned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : titles.length === 0 ? (
            <p className="text-muted-foreground text-sm">No job titles yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {titles.map((title) => (
                  <TableRow key={title.jobTitleId}>
                    <TableCell className="font-mono text-xs">{title.jobTitleCode}</TableCell>
                    <TableCell>{title.name}</TableCell>
                    <TableCell>{title.permissionCount}</TableCell>
                    <TableCell>
                      {title.isActive ? (
                        <Badge variant="default">Active</Badge>
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
                          onClick={() => void openEdit(title.jobTitleId)}
                        >
                          Edit
                        </Button>
                        {title.isActive ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleDeactivate(title.jobTitleId)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleReactivate(title.jobTitleId)}
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {editor.mode === "create" ? "Create job title" : "Edit job title"}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-4 px-4 pb-4">
            {editor.mode === "create" ? (
              <div className="space-y-2">
                <Label htmlFor="job-title-code">Code</Label>
                <Input
                  id="job-title-code"
                  value={editor.jobTitleCode}
                  onChange={(e) =>
                    setEditor((c) => ({ ...c, jobTitleCode: e.target.value }))
                  }
                  required
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label>Code</Label>
                <p className="font-mono text-sm">{editor.jobTitleCode}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="job-title-name">Name</Label>
              <Input
                id="job-title-name"
                value={editor.name}
                onChange={(e) => setEditor((c) => ({ ...c, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-title-description">Description</Label>
              <Input
                id="job-title-description"
                value={editor.description}
                onChange={(e) =>
                  setEditor((c) => ({ ...c, description: e.target.value }))
                }
              />
            </div>
            {editor.mode === "edit" ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={editor.isActive}
                  onChange={(e) =>
                    setEditor((c) => ({ ...c, isActive: e.target.checked }))
                  }
                />
                Active
              </label>
            ) : null}

            {formError ? (
              <p className="text-destructive text-sm">{formError}</p>
            ) : null}

            <SheetFooter className="px-0">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
