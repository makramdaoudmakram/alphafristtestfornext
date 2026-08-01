"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createMovment,
  deleteMovment,
  getMovments,
  getMovParients,
  updateMovment,
} from "@/lib/api-client";
import type { MovmentItem } from "@/types/movment";
import { MovmentFormFields } from "@/components/admin/movment-form-fields";
import {
  MovmentFormSheet,
} from "@/components/admin/movment-form-sheet";
import { useMovmentColumns } from "@/components/admin/movment-table-columns";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import {
  emptyMovmentFormValues,
  getNextMovChiledId,
  toMovmentUpsertRequest,
  type MovmentFormValues,
} from "@/lib/movment-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/data-table";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";

export function MovmentPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<MovmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MovmentItem | null>(null);
  const [createValues, setCreateValues] = useState<MovmentFormValues>(
    emptyMovmentFormValues
  );
  const [filterMovParientId, setFilterMovParientId] = useState("");
  const [movParientOptions, setMovParientOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const columns = useMovmentColumns();

  const loadMovParientOptions = useCallback(async () => {
    if (!token) {
      setMovParientOptions([]);
      return;
    }

    try {
      const rows = await getMovParients(token);
      setMovParientOptions(
        rows.map((row) => ({
          value: String(row.movParientId),
          label:
            [row.movParientAname, row.movParientEname]
              .filter(Boolean)
              .join(" / ") || `#${row.movParientId}`,
        }))
      );
    } catch {
      setMovParientOptions([]);
    }
  }, [token]);

  const loadItems = useCallback(async (): Promise<string | null> => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const movParientId = filterMovParientId
        ? Number(filterMovParientId)
        : undefined;
      const [rows, allRows] = await Promise.all([
        getMovments(
          token,
          Number.isFinite(movParientId) ? movParientId : undefined
        ),
        filterMovParientId ? getMovments(token) : Promise.resolve(null),
      ]);
      setItems(rows);
      const nextChildId = getNextMovChiledId(allRows ?? rows);
      setCreateValues((prev) => ({ ...prev, movChiledId: nextChildId }));
      return nextChildId;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load movements";
      setLoadError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, filterMovParientId]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadMovParientOptions();
  }, [sessionReady, loadMovParientOptions]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadItems();
  }, [sessionReady, loadItems]);

  const filterOptions = useMemo(
    () => [{ value: "", label: "All move parient" }, ...movParientOptions],
    [movParientOptions]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      await createMovment(toMovmentUpsertRequest(createValues), token);
      toast.success("Movement created");
      const nextChildId = await loadItems();
      setCreateValues({
        ...emptyMovmentFormValues,
        movChiledId: nextChildId ?? "1",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create movement"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: MovmentItem) {
    setEditingItem(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: MovmentFormValues) {
    if (!token || !editingItem) return;

    setSheetSaving(true);
    try {
      await updateMovment(
        editingItem.id,
        toMovmentUpsertRequest(values),
        token
      );
      toast.success("Movement updated");
      setSheetOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update movement"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: MovmentItem) {
    toast(`Delete movement #${row.id}?`, {
      description: `"${row.movChiledName ?? "Movement"}" will be removed permanently.`,
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

  async function confirmDelete(row: MovmentItem) {
    if (!token) return;

    try {
      await deleteMovment(row.id, token);
      toast.success("Movement deleted");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete movement"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.movment.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Movement Setting</h2>
          <p className="text-muted-foreground text-sm">
            Manage movements. Account entry fields use ActivityType; store fields use BranchType.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New movement</CardTitle>
            <CardDescription>
              Link each movement to a move parient and configure account/store comboboxes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <MovmentFormFields
                values={createValues}
                onChange={setCreateValues}
                movParientOptions={movParientOptions}
                idPrefix="create-"
              />
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create movement"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
            <CardTitle>All movements ({items.length})</CardTitle>
            <div className="w-full max-w-xs space-y-2">
              <Label>Filter by move parient</Label>
              <SearchableCombobox
                value={filterMovParientId}
                onValueChange={setFilterMovParientId}
                options={filterOptions}
                placeholder="All move parient"
                searchPlaceholder="Search move parient..."
              />
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter movements..."
              emptyMessage="No movements yet. Create your first one above."
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            {loadError ? (
              <div className="mt-3 space-y-3">
                <p className="text-destructive text-sm">{loadError}</p>
                <Button type="button" variant="outline" onClick={() => void loadItems()}>
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <MovmentFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingItem(null);
          }}
          item={editingItem}
          saving={sheetSaving}
          movParientOptions={movParientOptions}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
