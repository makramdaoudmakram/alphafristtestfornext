"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { getPermissionsList } from "@/lib/api-client";
import {
  activateResponsibilityProfile,
  createResponsibilityProfile,
  deactivateResponsibilityProfile,
  deleteResponsibilityProfile,
  getApiErrorMessage,
  getResponsibilityProfileById,
  getResponsibilityProfiles,
  replaceResponsibilityProfilePermissions,
  updateResponsibilityProfile,
} from "@/lib/responsibility-profile-api";
import type { ResponsibilityProfileListItem } from "@/types/responsibility-profile";
import type { PermissionListItem } from "@/types/permissions";
import { ResponsibilityProfilePermissionPicker } from "@/components/admin/responsibility-profile-permission-picker";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";

type EditorState = {
  mode: "create" | "edit";
  profileId: number | null;
  profileCode: string;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
};

const emptyEditor: EditorState = {
  mode: "create",
  profileId: null,
  profileCode: "",
  name: "",
  category: "",
  description: "",
  isActive: true,
};

export function ResponsibilityProfilesPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? null;

  const [profiles, setProfiles] = useState<ResponsibilityProfileListItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionListItem[]>([]);
  const [permissionIds, setPermissionIds] = useState<number[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<
    { assignmentId: number; userId: string; userEmail: string | null }[]
  >([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [formError, setFormError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const isActive =
        activeFilter === "all"
          ? undefined
          : activeFilter === "active";
      const category =
        categoryFilter === "all" ? undefined : categoryFilter;
      const rows = await getResponsibilityProfiles(token, {
        search: search.trim() || undefined,
        category,
        isActive,
        pageSize: 500,
      });
      setProfiles(rows);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [token, search, categoryFilter, activeFilter]);

  const loadPermissionsCatalog = useCallback(async () => {
    if (!token) return;
    try {
      setAllPermissions(await getPermissionsList(token));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }, [token]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    void loadPermissionsCatalog();
  }, [loadPermissionsCatalog]);

  const categories = useMemo(() => {
    const set = new Set(profiles.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [profiles]);

  function openCreate() {
    setEditor(emptyEditor);
    setPermissionIds([]);
    setAssignedUsers([]);
    setFormError(null);
    setSheetOpen(true);
  }

  async function openEdit(profileId: number) {
    if (!token) return;
    setFormError(null);
    setSaving(true);
    try {
      const detail = await getResponsibilityProfileById(profileId, token);
      setEditor({
        mode: "edit",
        profileId: detail.profileId,
        profileCode: detail.profileCode,
        name: detail.name,
        category: detail.category,
        description: detail.description ?? "",
        isActive: detail.isActive,
      });
      setPermissionIds(detail.permissions.map((p) => p.permissionId));
      setAssignedUsers(
        detail.assignedUsers.map((u) => ({
          assignmentId: u.assignmentId,
          userId: u.userId,
          userEmail: u.userEmail,
        }))
      );
      setSheetOpen(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;

    setFormError(null);
    const name = editor.name.trim();
    const category = editor.category.trim();
    const code = editor.profileCode.trim();

    if (!name) {
      setFormError("Profile name is required.");
      return;
    }
    if (!category) {
      setFormError("Category is required.");
      return;
    }
    if (editor.mode === "create" && !code) {
      setFormError("Profile code is required.");
      return;
    }

    setSaving(true);
    try {
      if (editor.mode === "create") {
        await createResponsibilityProfile(
          {
            profileCode: code,
            name,
            category,
            description: editor.description.trim() || null,
            permissionIds,
          },
          token
        );
        toast.success("Responsibility profile created.");
      } else if (editor.profileId != null) {
        await updateResponsibilityProfile(
          editor.profileId,
          {
            name,
            category,
            description: editor.description.trim() || null,
          },
          token
        );
        await replaceResponsibilityProfilePermissions(
          editor.profileId,
          permissionIds,
          token
        );
        toast.success("Responsibility profile updated.");
      }
      setSheetOpen(false);
      await loadProfiles();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(profile: ResponsibilityProfileListItem) {
    if (!token) return;
    try {
      if (profile.isActive) {
        await deactivateResponsibilityProfile(profile.profileId, token);
        toast.success("Profile deactivated.");
      } else {
        await activateResponsibilityProfile(profile.profileId, token);
        toast.success("Profile activated.");
      }
      await loadProfiles();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  async function handleDelete(profile: ResponsibilityProfileListItem) {
    if (!token) return;
    if (profile.activeAssignedUserCount > 0) {
      toast.error("Remove user assignments before deleting this profile.");
      return;
    }
    try {
      await deleteResponsibilityProfile(profile.profileId, token);
      toast.success("Profile deleted.");
      await loadProfiles();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  function togglePermission(permissionId: number, checked: boolean) {
    setPermissionIds((current) => {
      if (checked) {
        if (current.includes(permissionId)) return current;
        return [...current, permissionId];
      }
      return current.filter((id) => id !== permissionId);
    });
  }

  return (
    <PageGuard permission={PERMISSIONS.responsibilityProfiles.manage}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Responsibility Profiles</h2>
            <p className="text-muted-foreground text-sm">
              Reusable additional duties — explicit permissions from the catalog,
              global per user (not pharmacy-specific).
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            New profile
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Profiles</CardTitle>
            <CardDescription>Search, filter, and manage responsibility profiles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[12rem] flex-1">
                <Label htmlFor="rp-search" className="sr-only">
                  Search
                </Label>
                <Input
                  id="rp-search"
                  placeholder="Search name or code…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="inactive">Inactive only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      No profiles match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  profiles.map((profile) => (
                    <TableRow key={profile.profileId}>
                      <TableCell className="font-mono text-xs">
                        {profile.profileCode}
                      </TableCell>
                      <TableCell>{profile.name}</TableCell>
                      <TableCell>{profile.category}</TableCell>
                      <TableCell>{profile.permissionCount}</TableCell>
                      <TableCell>{profile.activeAssignedUserCount}</TableCell>
                      <TableCell>
                        <Badge variant={profile.isActive ? "default" : "secondary"}>
                          {profile.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void openEdit(profile.profileId)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleToggleActive(profile)}
                        >
                          {profile.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDelete(profile)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>
                {editor.mode === "create"
                  ? "Create responsibility profile"
                  : "Edit responsibility profile"}
              </SheetTitle>
            </SheetHeader>

            <form
              className="flex flex-1 flex-col gap-4 py-4"
              onSubmit={(e) => void handleSaveDetails(e)}
            >
              {formError ? (
                <p className="text-destructive text-sm">{formError}</p>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="rp-code">Profile code</Label>
                <Input
                  id="rp-code"
                  value={editor.profileCode}
                  disabled={editor.mode === "edit" || saving}
                  onChange={(e) =>
                    setEditor((s) => ({ ...s, profileCode: e.target.value }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="rp-name">Profile name</Label>
                <Input
                  id="rp-name"
                  value={editor.name}
                  disabled={saving}
                  onChange={(e) =>
                    setEditor((s) => ({ ...s, name: e.target.value }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="rp-category">Category</Label>
                <Input
                  id="rp-category"
                  value={editor.category}
                  disabled={saving}
                  onChange={(e) =>
                    setEditor((s) => ({ ...s, category: e.target.value }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="rp-desc">Description</Label>
                <Textarea
                  id="rp-desc"
                  value={editor.description}
                  disabled={saving}
                  rows={2}
                  onChange={(e) =>
                    setEditor((s) => ({ ...s, description: e.target.value }))
                  }
                />
              </div>

              {editor.mode === "edit" ? (
                <div className="rounded-md border p-3 text-sm">
                  <p className="mb-2 font-medium">Assigned users</p>
                  {assignedUsers.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No active assignments.</p>
                  ) : (
                    <ul className="space-y-1 text-xs">
                      {assignedUsers.map((u) => (
                        <li key={u.assignmentId}>
                          {u.userEmail ?? u.userId}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              <ResponsibilityProfilePermissionPicker
                allPermissions={allPermissions}
                selectedIds={permissionIds}
                onToggle={togglePermission}
                disabled={saving}
              />

              <SheetFooter className="mt-auto gap-2 sm:justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : editor.mode === "create" ? "Create" : "Save"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </PageGuard>
  );
}
