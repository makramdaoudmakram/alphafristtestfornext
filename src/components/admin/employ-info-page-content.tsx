"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createEmployInfo,
  deleteEmployInfo,
  generateEmployInfoPassword,
  getEmployInfoById,
  getEmployInfos,
  updateEmployInfo,
} from "@/lib/api-client";
import type { EmployInfoItem } from "@/types/employ-info";
import type { EmployInfoFormValues } from "@/types/employ-info";
import { EmployInfoFormSheet } from "@/components/admin/employ-info-form-sheet";
import { useEmployInfoColumns } from "@/components/admin/employ-info-table-columns";
import { PageGuard } from "@/components/permissions/page-guard";
import { isValidEmployType } from "@/lib/employ-info-enums";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/data-table";

function validateFormValues(
  values: EmployInfoFormValues,
  mode: "create" | "edit"
): string | null {
  if (!values.name.trim()) return "Employee Name is required.";
  if (!values.code.trim()) return "Employee Code is required.";
  if (mode === "create" && !values.generatedPassword.trim()) {
    return "Generated password is not ready yet.";
  }
  if (values.pharm == null || values.pharm <= 0) return "Cost Center is required.";

  const employType = Number.parseInt(values.employType, 10);
  if (!isValidEmployType(employType)) {
    return "Employee Type must be Employ or Delivery.";
  }

  return null;
}

export function EmployInfoPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<EmployInfoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EmployInfoItem | null>(null);

  const columns = useEmployInfoColumns();

  const loadData = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setItems(await getEmployInfos(token));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load employee info";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadData();
  }, [sessionReady, loadData]);

  const requestGeneratedPassword = useCallback(async () => {
    if (!token) return "";
    setPasswordLoading(true);
    try {
      return await generateEmployInfoPassword(token);
    } finally {
      setPasswordLoading(false);
    }
  }, [token]);

  function handleNew() {
    setEditingItem(null);
    setSheetOpen(true);
  }

  async function handleEdit(row: EmployInfoItem) {
    if (!token) return;

    try {
      const full = await getEmployInfoById(row.id, token);
      setEditingItem(full);
      setSheetOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load employee details"
      );
    }
  }

  async function handleSheetSubmit(
    values: EmployInfoFormValues,
    mode: "create" | "edit"
  ) {
    if (!token) return;

    const validationError = validateFormValues(values, mode);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const employType = Number.parseInt(values.employType, 10);
    const payload = {
      name: values.name.trim(),
      code: values.code.trim(),
      pharm: values.pharm!,
      employType,
      active: values.active,
    };

    setSheetSaving(true);
    try {
      if (mode === "create") {
        const result = await createEmployInfo(
          {
            ...payload,
            previewPassword: values.generatedPassword.trim(),
          },
          token
        );
        toast.success(`Employee created. Password: ${result.generatedPassword}`);
      } else if (editingItem) {
        await updateEmployInfo(editingItem.id, payload, token);
        toast.success("Employee info updated");
      }

      setSheetOpen(false);
      setEditingItem(null);
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save employee info"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: EmployInfoItem) {
    const label = row.name?.trim() || row.code?.trim() || `#${row.id}`;

    toast(`Delete employee "${label}"?`, {
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

  async function confirmDelete(row: EmployInfoItem) {
    if (!token) return;

    try {
      await deleteEmployInfo(row.id, token);
      toast.success("Employee info deleted");
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete employee info"
      );
    }
  }

  return (
    <PageGuard permission={null}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Employee Info</h2>
          <p className="text-muted-foreground text-sm">
            Manage employee master data: name, code, cost center, type, and active status.
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <Button onClick={handleNew} className="sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee info list</CardTitle>
            <CardDescription>
              Passwords are hidden in the grid and shown only when editing an employee.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadError ? (
              <p className="text-destructive text-sm">{loadError}</p>
            ) : null}
            <DataTable
              columns={columns}
              data={items}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>

        <EmployInfoFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingItem(null);
          }}
          item={editingItem}
          saving={sheetSaving}
          passwordLoading={passwordLoading}
          onRequestGeneratedPassword={requestGeneratedPassword}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
