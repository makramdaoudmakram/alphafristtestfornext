"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  bulkSaveSalesPushList,
  getSalesPushListItems,
  updateSalesPushList,
} from "@/lib/sales-push-list-api";
import {
  downloadSalesPushListExcelTemplate,
  parseSalesPushListExcel,
  resolveSalesPushListImportItems,
} from "@/lib/sales-push-list-excel";
import type {
  SalesPushListFormValues,
  SalesPushListImportPreview,
  SalesPushListItem,
} from "@/types/sales-push-list";
import { SalesPushListFormSheet } from "@/components/admin/sales-push-list-form-sheet";
import { SalesPushListImportPreviewDialog } from "@/components/admin/sales-push-list-import-preview-dialog";
import { useSalesPushListColumns } from "@/components/admin/sales-push-list-table-columns";
import { PageGuard } from "@/components/permissions/page-guard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/data-table";

export function SalesPushListPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<SalesPushListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"new" | "edit">("new");
  const [editingItem, setEditingItem] = useState<SalesPushListItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] =
    useState<SalesPushListImportPreview | null>(null);

  const columns = useSalesPushListColumns();

  const loadItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setItems(await getSalesPushListItems(token));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load SalesPushList";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadItems();
  }, [sessionReady, loadItems]);

  function handleNew() {
    setSheetMode("new");
    setEditingItem(null);
    setSheetOpen(true);
  }

  function handleEdit(row: SalesPushListItem) {
    setSheetMode("edit");
    setEditingItem(row);
    setSheetOpen(true);
  }

  async function handleSaveNew(rows: SalesPushListFormValues[]) {
    if (!token) return;
    setSaving(true);
    try {
      await bulkSaveSalesPushList(token, {
        create: rows.map((row) => ({
          itemCode: row.itemCode.trim(),
          batchNo: row.batchNo.trim(),
          percent: row.percent,
          comection: row.comection,
          startdate: row.startdate,
          endDate: row.endDate,
          active: row.active,
        })),
        update: [],
        deleteIds: [],
      });
      toast.success("SalesPushList saved successfully.");
      setSheetOpen(false);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save SalesPushList"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(values: SalesPushListFormValues) {
    if (!token || !editingItem) return;
    setSaving(true);
    try {
      await updateSalesPushList(
        editingItem.id,
        {
          itemCode: values.itemCode.trim(),
          batchNo: values.batchNo.trim(),
          percent: values.percent,
          comection: values.comection,
          startdate: values.startdate,
          endDate: values.endDate,
          active: values.active,
        },
        token
      );
      toast.success("SalesPushList updated.");
      setSheetOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update SalesPushList"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(row: SalesPushListItem) {
    toast("Remove this saved row?", {
      description: "The row will be deleted when this action is confirmed.",
      action: {
        label: "Remove",
        onClick: () => void confirmDelete(row),
      },
      cancel: {
        label: "Cancel",
        onClick: () => toast.message("Remove cancelled"),
      },
    });
  }

  async function confirmDelete(row: SalesPushListItem) {
    if (!token) return;
    try {
      await bulkSaveSalesPushList(token, {
        create: [],
        update: [],
        deleteIds: [row.id],
      });
      toast.success("SalesPushList row deleted.");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete SalesPushList"
      );
    }
  }

  async function handleExcelSelected(file: File | undefined) {
    if (!file || !token) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Select an .xlsx file.");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseSalesPushListExcel(buffer, file.name, items);
      const preview = await resolveSalesPushListImportItems(token, parsed);
      setImportPreview(preview);
      setImportOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to read Excel file"
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSaveValidImport() {
    if (!token || !importPreview) return;
    const valid = importPreview.rows.filter((row) => row.valid && row.parsed);
    if (valid.length === 0) return;

    setSaving(true);
    try {
      await bulkSaveSalesPushList(token, {
        create: valid.map((row) => ({
          itemCode: row.parsed!.itemCode.trim(),
          batchNo: row.parsed!.batchNo.trim(),
          percent: row.parsed!.percent,
          comection: row.parsed!.comection,
          startdate: row.parsed!.startdate,
          endDate: row.parsed!.endDate,
          active: row.parsed!.active,
        })),
        update: [],
        deleteIds: [],
      });
      toast.success("SalesPushList saved successfully.");
      setImportOpen(false);
      setImportPreview(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save SalesPushList"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageGuard permission={null}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Sales Push List</h2>
          <p className="text-muted-foreground text-sm">
            Create rows in the right-side sheet, then save them together. The
            grid shows saved records with catalog names.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Saved records</CardTitle>
            <CardDescription>
              {loadError
                ? loadError
                : "Search existing rows, or open New to enter several items at once."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleNew}>
                New
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Import Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={downloadSalesPushListExcelTemplate}
              >
                Excel Template
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadItems()}
                disabled={loading || saving}
              >
                Refresh
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(event) =>
                  void handleExcelSelected(event.target.files?.[0])
                }
              />
            </div>

            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter Sales Push List..."
              emptyMessage="No saved rows yet. Click New to add items."
              pageSize={25}
              pageSizeOptions={[25, 50, 100]}
              onEdit={handleEdit}
              onDelete={handleDelete}
              editLabel="Edit"
              deleteLabel="Remove"
              getRowId={(row) => String(row.id)}
            />
          </CardContent>
        </Card>

        <SalesPushListFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingItem(null);
          }}
          mode={sheetMode}
          editItem={editingItem}
          saving={saving}
          onSaveNew={handleSaveNew}
          onUpdate={handleUpdate}
        />

        <SalesPushListImportPreviewDialog
          open={importOpen}
          onOpenChange={(open) => {
            if (saving) return;
            setImportOpen(open);
            if (!open) setImportPreview(null);
          }}
          preview={importPreview}
          saving={saving}
          onSaveValidRows={() => void handleSaveValidImport()}
        />
      </div>
    </PageGuard>
  );
}
