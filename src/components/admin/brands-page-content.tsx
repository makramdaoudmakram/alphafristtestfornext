"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createBrand,
  deleteBrand,
  getBrands,
  updateBrand,
} from "@/lib/api-client";
import type { BrandItem } from "@/types/brand";
import {
  BrandFormSheet,
  type BrandFormValues,
} from "@/components/admin/brand-form-sheet";
import { useBrandColumns } from "@/components/admin/brand-table-columns";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/data-table";

function getBrandLabel(brand: BrandItem): string {
  return (
    brand.brandNameEn?.trim() ||
    brand.brandNameAr?.trim() ||
    `#${brand.id}`
  );
}

export function BrandsPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);

  const [brandNameAr, setBrandNameAr] = useState("");
  const [brandNameEn, setBrandNameEn] = useState("");

  const columns = useBrandColumns();

  const loadBrands = useCallback(async () => {
    if (!token) {
      setBrands([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setBrands(await getBrands(token));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load brands";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadBrands();
  }, [sessionReady, loadBrands]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      await createBrand(
        {
          brandNameAr: brandNameAr.trim(),
          brandNameEn: brandNameEn.trim(),
        },
        token
      );
      toast.success("Brand created");
      setBrandNameAr("");
      setBrandNameEn("");
      await loadBrands();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create brand"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: BrandItem) {
    setEditingBrand(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: BrandFormValues) {
    if (!token || !editingBrand) return;

    setSheetSaving(true);
    try {
      await updateBrand(
        editingBrand.id,
        {
          brandNameAr: values.brandNameAr.trim(),
          brandNameEn: values.brandNameEn.trim(),
        },
        token
      );
      toast.success("Brand updated");
      setSheetOpen(false);
      setEditingBrand(null);
      await loadBrands();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update brand"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: BrandItem) {
    toast(`Delete brand "${getBrandLabel(row)}"?`, {
      description:
        "Deletion is blocked if this brand is linked to item catalog records.",
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

  async function confirmDelete(row: BrandItem) {
    if (!token) return;

    try {
      await deleteBrand(row.id, token);
      toast.success("Brand deleted");
      await loadBrands();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete brand"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.brand.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Brands</h2>
          <p className="text-muted-foreground text-sm">
            Manage product brands connected to the item catalog.
          </p>
        </div>

        <ActionGuard permission={PERMISSIONS.brand.create}>
          <Card>
            <CardHeader>
              <CardTitle>New brand</CardTitle>
              <CardDescription>Example: Pfizer, GSK</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brandNameAr">Arabic name</Label>
                  <Input
                    id="brandNameAr"
                    placeholder="ماركة"
                    value={brandNameAr}
                    onChange={(event) => setBrandNameAr(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandNameEn">English name</Label>
                  <Input
                    id="brandNameEn"
                    placeholder="Brand name"
                    value={brandNameEn}
                    onChange={(event) => setBrandNameEn(event.target.value)}
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create brand"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </ActionGuard>

        <Card>
          <CardHeader>
            <CardTitle>All brands ({brands.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={brands}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter brands..."
              emptyMessage="No brands yet. Create your first one above."
              onEdit={
                hasPermission(PERMISSIONS.brand.edit) ? handleEdit : undefined
              }
              onDelete={
                hasPermission(PERMISSIONS.brand.delete)
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
                  onClick={() => void loadBrands()}
                >
                  Refresh
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <BrandFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingBrand(null);
          }}
          brand={editingBrand}
          saving={sheetSaving}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
