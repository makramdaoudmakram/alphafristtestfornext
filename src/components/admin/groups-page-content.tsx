"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Network, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  createGroup,
  deleteGroup,
  getGroups,
  updateGroup,
} from "@/lib/api-client";
import {
  buildGroupTree,
  countTreeDepth,
  enrichGroupsForTable,
  filterGroupsBySelection,
  getGroupLabel,
} from "@/lib/group-tree";
import type { GroupItem } from "@/types/group";
import {
  GroupFormSheet,
  type GroupFormValues,
} from "@/components/admin/group-form-sheet";
import { GroupTreePanel } from "@/components/admin/group-tree-panel";
import { useGroupColumns } from "@/components/admin/group-table-columns";
import { ActionGuard, PageGuard } from "@/components/permissions/page-guard";
import { usePermissions } from "@/components/permissions/permission-provider";
import { DataTable } from "@/components/data-table";
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
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { PERMISSIONS } from "@/lib/route-permissions";

function parseParentId(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function GroupsPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null);
  const [includeDescendants, setIncludeDescendants] = useState(true);

  const [gNameAr, setGNameAr] = useState("");
  const [gNameEn, setGNameEn] = useState("");
  const [gParent, setGParent] = useState("");

  const columns = useGroupColumns();

  const tree = useMemo(() => buildGroupTree(groups), [groups]);
  const tableRows = useMemo(() => enrichGroupsForTable(groups), [groups]);
  const filteredRows = useMemo(
    () =>
      filterGroupsBySelection(
        tableRows,
        selectedTreeId,
        includeDescendants,
        groups
      ),
    [tableRows, selectedTreeId, includeDescendants, groups]
  );

  const parentOptions = useMemo<ComboboxOption[]>(
    () =>
      groups.map((group) => ({
        value: String(group.id),
        label: `${getGroupLabel(group)} (#${group.id})`,
      })),
    [groups]
  );

  const rootCount = useMemo(
    () => groups.filter((group) => group.gParent == null).length,
    [groups]
  );

  const maxDepth = useMemo(() => countTreeDepth(tree), [tree]);

  const loadGroups = useCallback(async () => {
    if (!token) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      setGroups(await getGroups(token));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load groups";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadGroups();
  }, [sessionReady, loadGroups]);

  function resetCreateForm(parentId?: number | null) {
    setGNameAr("");
    setGNameEn("");
    setGParent(parentId != null ? String(parentId) : "");
  }

  function handleTreeSelect(id: number) {
    setSelectedTreeId((current) => (current === id ? null : id));
  }

  function handleAddChild(parentId: number) {
    resetCreateForm(parentId);
    const parent = groups.find((group) => group.id === parentId);
    toast.message(
      parent
        ? `Creating child under ${getGroupLabel(parent)}`
        : "Creating child group"
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      await createGroup(
        {
          gNameAr: gNameAr.trim(),
          gNameEn: gNameEn.trim(),
          gParent: parseParentId(gParent),
        },
        token
      );
      toast.success("Group created");
      resetCreateForm();
      await loadGroups();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create group"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: GroupItem) {
    setEditingGroup(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: GroupFormValues) {
    if (!token || !editingGroup) return;

    setSheetSaving(true);
    try {
      await updateGroup(
        editingGroup.id,
        {
          gNameAr: values.gNameAr.trim(),
          gNameEn: values.gNameEn.trim(),
          gParent: parseParentId(values.gParent),
        },
        token
      );
      toast.success("Group updated");
      setSheetOpen(false);
      setEditingGroup(null);
      await loadGroups();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update group"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: GroupItem) {
    toast(`Delete group "${getGroupLabel(row)}"?`, {
      description:
        "Deletion is blocked if this group has child groups or linked items.",
      action: {
        label: "Delete",
        onClick: () => void confirmDelete(row),
      },
      cancel: {
        label: "Cancel",
        onClick: () => toast.message("Delete cancelled"),
      },
    });
  }

  async function confirmDelete(row: GroupItem) {
    if (!token) return;

    try {
      await deleteGroup(row.id, token);
      toast.success("Group deleted");
      if (selectedTreeId === row.id) setSelectedTreeId(null);
      await loadGroups();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete group"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.group.view}>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-violet-600/15 via-background to-cyan-500/15 p-6">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Network className="text-primary size-6" />
                <h2 className="text-lg font-semibold">Product Groups</h2>
              </div>
              <p className="text-muted-foreground max-w-2xl text-sm">
                Organize items in a nested group tree. Each group can belong to
                another parent group, forming unlimited hierarchy levels.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-sm backdrop-blur">
              <Sparkles className="text-primary size-4" />
              Self-referencing hierarchy
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(280px,360px)_1fr]">
          <GroupTreePanel
            tree={tree}
            totalGroups={groups.length}
            rootCount={rootCount}
            maxDepth={maxDepth}
            selectedId={selectedTreeId}
            onSelect={handleTreeSelect}
            onClearSelection={() => setSelectedTreeId(null)}
            onAddChild={handleAddChild}
            canAddChild={hasPermission(PERMISSIONS.group.create)}
          />

          <div className="space-y-6">
            <ActionGuard permission={PERMISSIONS.group.create}>
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>New group</CardTitle>
                  <CardDescription>
                    Leave parent empty for a root group, or pick a parent to nest
                    under it.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="gNameAr">Arabic name</Label>
                      <Input
                        id="gNameAr"
                        placeholder="مجموعة رئيسية"
                        value={gNameAr}
                        onChange={(event) => setGNameAr(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gNameEn">English name</Label>
                      <Input
                        id="gNameEn"
                        placeholder="Main group"
                        value={gNameEn}
                        onChange={(event) => setGNameEn(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="gParent">Parent group</Label>
                      <SearchableCombobox
                        value={gParent}
                        onValueChange={setGParent}
                        options={parentOptions}
                        placeholder="Root level (no parent)"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button type="submit" disabled={saving}>
                        {saving ? "Creating..." : "Create group"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </ActionGuard>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>
                      Groups table ({filteredRows.length}
                      {selectedTreeId != null ? ` filtered` : ""})
                    </CardTitle>
                    <CardDescription>
                      Hierarchy path, parent, children count, and level depth.
                    </CardDescription>
                  </div>
                  {selectedTreeId != null ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={includeDescendants}
                        onChange={(event) =>
                          setIncludeDescendants(event.target.checked)
                        }
                        className="size-4 rounded border"
                      />
                      Include child branches
                    </label>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columns}
                  data={filteredRows}
                  loading={!sessionReady || loading}
                  filterPlaceholder="Filter groups..."
                  emptyMessage="No groups match the current filter."
                  onEdit={
                    hasPermission(PERMISSIONS.group.edit) ? handleEdit : undefined
                  }
                  onDelete={
                    hasPermission(PERMISSIONS.group.delete)
                      ? handleDelete
                      : undefined
                  }
                />
                {loadError ? (
                  <div className="mt-3 space-y-3">
                    <p className="text-destructive text-sm">{loadError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void loadGroups()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        <GroupFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingGroup(null);
          }}
          group={editingGroup}
          groups={groups}
          saving={sheetSaving}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
