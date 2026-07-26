"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createUnit,
  deleteUnit,
  getUnits,
  updateUnit,
} from "@/lib/api-client";
import type { UnitItem } from "@/types/unit";
import {
  UnitFormSheet,
  type UnitFormValues,
} from "@/components/admin/unit-form-sheet";
import { useUnitColumns } from "@/components/admin/unit-table-columns";
import { ActionGuard, PageGuard } from "@/components/permissions/page-guard";
import { usePermissions } from "@/components/permissions/permission-provider";
import { PERMISSIONS } from "@/lib/route-permissions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormFieldInline } from "@/components/ui/form-field-inline";
import { DataTable } from "@/components/data-table";

export function UnitsPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [units, setUnits] = useState<UnitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);

  const [uCode, setUCode] = useState("");
  const [uNameAr, setUNameAr] = useState("");
  const [uNameEn, setUNameEn] = useState("");

  const unitColumns = useUnitColumns();

  const loadUnits = useCallback(async () => {
    if (!token) {
      setUnits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const data = await getUnits(token);
      setUnits(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load units";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadUnits();
  }, [sessionReady, loadUnits]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      await createUnit(
        {
          uCode: uCode.trim(),
          uNameAr: uNameAr.trim(),
          uNameEn: uNameEn.trim(),
        },
        token
      );
      toast.success("Unit created");
      setUCode("");
      setUNameAr("");
      setUNameEn("");
      await loadUnits();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create unit"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEditUnit(row: UnitItem) {
    setEditingUnit(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: UnitFormValues) {
    if (!token || !editingUnit) return;

    setSheetSaving(true);
    try {
      await updateUnit(
        editingUnit.uCode,
        {
          uNameAr: values.uNameAr.trim(),
          uNameEn: values.uNameEn.trim(),
        },
        token
      );
      toast.success("Unit updated");
      setSheetOpen(false);
      setEditingUnit(null);
      await loadUnits();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update unit"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDeleteUnit(row: UnitItem) {
    toast(`Delete unit "${row.uCode}"?`, {
      description: "This will permanently remove the unit from the database.",
      action: {
        label: "Delete",
        onClick: () => void confirmDeleteUnit(row),
      },
      cancel: {
        label: "Cancel",
        onClick: () => {
          toast.message("Delete cancelled");
        },
      },
    });
  }

  async function confirmDeleteUnit(row: UnitItem) {
    if (!token) return;

    try {
      await deleteUnit(row.uCode, token);
      toast.success("Unit deleted");
      await loadUnits();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete unit"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.unit.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Units</h2>
          <p className="text-muted-foreground text-sm">
            Manage measurement units connected to the Alfa API.
          </p>
        </div>

        <ActionGuard permission={PERMISSIONS.unit.create}>
          <Card>
            <CardHeader>
              <CardTitle>New unit</CardTitle>
              <CardDescription>Example: PCS, BOX, KG</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="max-w-2xl space-y-3">
                <FormFieldInline
                  id="uCode"
                  label="Unit code"
                  placeholder="PCS"
                  value={uCode}
                  onChange={(e) => setUCode(e.target.value)}
                  required
                />
                <FormFieldInline
                  id="uNameAr"
                  label="Arabic name"
                  placeholder="قطعة"
                  value={uNameAr}
                  onChange={(e) => setUNameAr(e.target.value)}
                  required
                />
                <FormFieldInline
                  id="uNameEn"
                  label="English name"
                  placeholder="Piece"
                  value={uNameEn}
                  onChange={(e) => setUNameEn(e.target.value)}
                  required
                />
                <div className="pt-2 sm:pl-[calc(9.5rem+1rem)]">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Creating..." : "Create unit"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </ActionGuard>

        <Card>
          <CardHeader>
            <CardTitle>All units ({units.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={unitColumns}
              data={units}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter units..."
              emptyMessage="No units yet. Create your first one above."
              onEdit={
                hasPermission(PERMISSIONS.unit.edit) ? handleEditUnit : undefined
              }
              onDelete={
                hasPermission(PERMISSIONS.unit.delete)
                  ? handleDeleteUnit
                  : undefined
              }
            />
            {loadError ? (
              <div className="mt-3 space-y-3">
                <p className="text-destructive text-sm">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadUnits()}
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <UnitFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingUnit(null);
          }}
          unit={editingUnit}
          saving={sheetSaving}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
