"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createSalesmovment,
  deleteSalesmovment,
  getPharms,
  getSalesmovments,
  getStors,
  updateSalesmovment,
} from "@/lib/api-client";
import { getAccountChartSelect } from "@/lib/customer-api";
import {
  SalesMovementFormSheet,
  validateSalesMovementForm,
  type SalesMovementFormValues,
} from "@/components/admin/sales-movement-form-sheet";
import { useSalesMovementColumns } from "@/components/admin/sales-movement-table-columns";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ComboboxOption } from "@/components/ui/searchable-combobox";
import type { SalesmovmentDetail } from "@/types/sales-movment";

export function SalesMovementSettingPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<SalesmovmentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<SalesmovmentDetail | null>(null);

  const [storOptions, setStorOptions] = useState<ComboboxOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<ComboboxOption[]>([]);
  const [pharmOptions, setPharmOptions] = useState<ComboboxOption[]>([]);

  const columns = useSalesMovementColumns();

  const loadItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setItems(await getSalesmovments(token));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load sales movements";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadLookups = useCallback(async () => {
    if (!token) {
      setStorOptions([]);
      setAccountOptions([]);
      setPharmOptions([]);
      return;
    }

    setLookupsLoading(true);
    try {
      const [stores, accounts, pharms] = await Promise.all([
        getStors(token),
        getAccountChartSelect(token),
        getPharms(token),
      ]);
      setStorOptions(
        stores
          .map((store) => ({
            value: String(store.id),
            label:
              store.storArName?.trim() ||
              store.storEnName?.trim() ||
              `Store ${store.id}`,
          }))
          .sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { numeric: true })
          )
      );
      setAccountOptions(
        accounts
          .filter((account) => account.accCode?.trim())
          .map((account) => ({
            value: account.accCode.trim(),
            label: account.accName.trim() || account.accCode.trim(),
          }))
          .sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { numeric: true })
          )
      );
      setPharmOptions(
        pharms
          .map((pharm) => ({
            value: String(pharm.parmId),
            label:
              pharm.parmEnName?.trim() ||
              pharm.parmArName?.trim() ||
              `Pharmacy ${pharm.parmId}`,
          }))
          .sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { numeric: true })
          )
      );
    } catch {
      setStorOptions([]);
      setAccountOptions([]);
      setPharmOptions([]);
      toast.error("Failed to load lookup lists.");
    } finally {
      setLookupsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadItems();
  }, [sessionReady, loadItems]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadLookups();
  }, [sessionReady, loadLookups]);

  function handleNew() {
    setEditing(null);
    setSheetOpen(true);
  }

  function handleEdit(row: SalesmovmentDetail) {
    setEditing(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: SalesMovementFormValues) {
    if (!token) return;

    const validationError = validateSalesMovementForm(values);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSheetSaving(true);
    try {
      if (editing && editing.id > 0) {
        await updateSalesmovment(editing.id, values, token);
        toast.success("Sales movement updated");
      } else {
        await createSalesmovment(values, token);
        toast.success("Sales movement created");
      }
      setSheetOpen(false);
      setEditing(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save sales movement"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: SalesmovmentDetail) {
    const label = row.movName?.trim() || `MovId ${row.movId ?? row.id}`;
    toast(`Delete "${label}"?`, {
      description: "Blocked if the movement is used by a shift or sales transactions.",
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

  async function confirmDelete(row: SalesmovmentDetail) {
    if (!token) return;
    try {
      await deleteSalesmovment(row.id, token);
      toast.success("Sales movement deleted");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete sales movement"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.salesMovment.view}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Sales Movement</h2>
            <p className="text-muted-foreground text-sm">
              Maintain Sales and Return Sales configurations per pharmacy.
              Account ComboBoxes display ACCName and save ACCCode. Stores save
              Stor Id.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleNew}
            disabled={!sessionReady || !token}
          >
            New
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sales movements ({items.length})</CardTitle>
            <CardDescription>
              {loadError
                ? loadError
                : "Search, create, edit, or delete sales movement configuration."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter sales movements..."
              emptyMessage="No sales movements yet. Click New to create one."
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            {loadError ? (
              <div className="mt-3 space-y-3">
                <p className="text-destructive text-sm">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadItems()}
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <SalesMovementFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditing(null);
          }}
          item={editing}
          saving={sheetSaving}
          lookupsLoading={lookupsLoading}
          pharmOptions={pharmOptions}
          storOptions={storOptions}
          accountOptions={accountOptions}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
