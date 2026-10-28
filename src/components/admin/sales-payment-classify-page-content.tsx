"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createSalesPaymentClassify,
  deleteSalesPaymentClassify,
  getSalesPaymentClassifies,
  updateSalesPaymentClassify,
} from "@/lib/api-client";
import type { SalesPaymentClassifyItem } from "@/types/sales-payment-classify";
import {
  SalesPaymentClassifyFormSheet,
  type SalesPaymentClassifyFormValues,
} from "@/components/admin/sales-payment-classify-form-sheet";
import { useSalesPaymentClassifyColumns } from "@/components/admin/sales-payment-classify-table-columns";
import { PageGuard } from "@/components/permissions/page-guard";
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
import { DataTable } from "@/components/data-table";

export function SalesPaymentClassifyPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<SalesPaymentClassifyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesPaymentClassifyItem | null>(
    null
  );

  const [salesclassifyName, setSalesclassifyName] = useState("");

  const columns = useSalesPaymentClassifyColumns();

  const loadItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setItems(await getSalesPaymentClassifies(token));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load sales payment classifications";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      await createSalesPaymentClassify(
        { salesclassifyName: salesclassifyName.trim() },
        token
      );
      toast.success("Payment classification created");
      setSalesclassifyName("");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create payment classification"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: SalesPaymentClassifyItem) {
    setEditingItem(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: SalesPaymentClassifyFormValues) {
    if (!token || !editingItem) return;

    setSheetSaving(true);
    try {
      await updateSalesPaymentClassify(
        editingItem.id,
        { salesclassifyName: values.salesclassifyName.trim() },
        token
      );
      toast.success("Payment classification updated");
      setSheetOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update payment classification"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: SalesPaymentClassifyItem) {
    toast(`Delete payment classification #${row.id}?`, {
      description: `"${row.salesclassifyName}" will be removed if not used by shift lines.`,
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

  async function confirmDelete(row: SalesPaymentClassifyItem) {
    if (!token) return;

    try {
      await deleteSalesPaymentClassify(row.id, token);
      toast.success("Payment classification deleted");
      await loadItems();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete payment classification"
      );
    }
  }

  return (
    <PageGuard permission={null}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Sales Payment Classification</h2>
          <p className="text-muted-foreground text-sm">
            Master payment classifications used on shift child lines.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New classification</CardTitle>
            <CardDescription>
              Classification names must be unique.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
              <div className="space-y-2">
                <Label htmlFor="salesclassifyName">Classification name</Label>
                <Input
                  id="salesclassifyName"
                  value={salesclassifyName}
                  onChange={(e) => setSalesclassifyName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Classifications</CardTitle>
            <CardDescription>
              {loadError
                ? loadError
                : "Search, edit, or delete existing classifications."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter classifications..."
              emptyMessage="No classifications yet. Create your first one above."
              onEdit={handleEdit}
              onDelete={handleDelete}
              deleteLabel="Delete"
            />
          </CardContent>
        </Card>

        <SalesPaymentClassifyFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingItem(null);
          }}
          item={editingItem}
          saving={sheetSaving}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
