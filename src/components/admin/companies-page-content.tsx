"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createCompany,
  deleteCompany,
  getCompanies,
  updateCompany,
} from "@/lib/api-client";
import type { CompanyItem } from "@/types/company";
import {
  CompanyFormSheet,
  type CompanyFormValues,
} from "@/components/admin/company-form-sheet";
import { useCompanyColumns } from "@/components/admin/company-table-columns";
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

export function CompaniesPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);

  const [comCode, setComCode] = useState("");
  const [comNameAr, setComNameAr] = useState("");
  const [comNameEn, setComNameEn] = useState("");
  const [comTel, setComTel] = useState("");
  const [comAddress, setComAddress] = useState("");
  const [comActive, setComActive] = useState(true);

  const columns = useCompanyColumns();

  const loadCompanies = useCallback(async () => {
    if (!token) {
      setCompanies([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setCompanies(await getCompanies(token));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load companies";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadCompanies();
  }, [sessionReady, loadCompanies]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      await createCompany(
        {
          comCode: comCode.trim(),
          comNameAr: comNameAr.trim(),
          comNameEn: comNameEn.trim(),
          comTel: comTel.trim(),
          comAddress: comAddress.trim(),
          comActive,
        },
        token
      );
      toast.success("Company created");
      setComCode("");
      setComNameAr("");
      setComNameEn("");
      setComTel("");
      setComAddress("");
      setComActive(true);
      await loadCompanies();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create company"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(row: CompanyItem) {
    setEditingCompany(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: CompanyFormValues) {
    if (!token || !editingCompany) return;

    setSheetSaving(true);
    try {
      await updateCompany(
        editingCompany.comId,
        {
          comCode: values.comCode.trim(),
          comNameAr: values.comNameAr.trim(),
          comNameEn: values.comNameEn.trim(),
          comTel: values.comTel.trim(),
          comAddress: values.comAddress.trim(),
          comActive: values.comActive,
        },
        token
      );
      toast.success("Company updated");
      setSheetOpen(false);
      setEditingCompany(null);
      await loadCompanies();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update company"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: CompanyItem) {
    toast(`Delete company "${row.comNameEn || row.comNameAr || row.comCode}"?`, {
      description:
        "Deletion is blocked if this company is linked to item catalog records.",
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

  async function confirmDelete(row: CompanyItem) {
    if (!token) return;

    try {
      await deleteCompany(row.comId, token);
      toast.success("Company deleted");
      await loadCompanies();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete company"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.company.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Companies</h2>
          <p className="text-muted-foreground text-sm">
            Manage companies connected to the Alfa API.
          </p>
        </div>

        <ActionGuard permission={PERMISSIONS.company.create}>
          <Card>
            <CardHeader>
              <CardTitle>New company</CardTitle>
              <CardDescription>Example: ALFA, PHARM-01</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
                <div className="space-y-2">
                  <Label htmlFor="comCode">Company code</Label>
                  <Input
                    id="comCode"
                    placeholder="ALFA"
                    value={comCode}
                    onChange={(e) => setComCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comNameAr">Arabic name</Label>
                  <Input
                    id="comNameAr"
                    placeholder="شركة ألفا"
                    value={comNameAr}
                    onChange={(e) => setComNameAr(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comNameEn">English name</Label>
                  <Input
                    id="comNameEn"
                    placeholder="Alfa Company"
                    value={comNameEn}
                    onChange={(e) => setComNameEn(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comTel">Phone</Label>
                  <Input
                    id="comTel"
                    placeholder="+966..."
                    value={comTel}
                    onChange={(e) => setComTel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comAddress">Address</Label>
                  <Input
                    id="comAddress"
                    placeholder="City, street"
                    value={comAddress}
                    onChange={(e) => setComAddress(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="comActive"
                    type="checkbox"
                    checked={comActive}
                    onChange={(e) => setComActive(e.target.checked)}
                    className="size-4 rounded border"
                  />
                  <Label htmlFor="comActive">Active company</Label>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create company"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </ActionGuard>

        <Card>
          <CardHeader>
            <CardTitle>All companies ({companies.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={companies}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter companies..."
              emptyMessage="No companies yet. Create your first one above."
              onEdit={
                hasPermission(PERMISSIONS.company.edit) ? handleEdit : undefined
              }
              onDelete={
                hasPermission(PERMISSIONS.company.delete)
                  ? handleDelete
                  : undefined
              }
            />
            {loadError ? (
              <div className="mt-3 space-y-3">
                <p className="text-destructive text-sm">{loadError}</p>
                <Button type="button" variant="outline" onClick={() => void loadCompanies()}>
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <CompanyFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingCompany(null);
          }}
          company={editingCompany}
          saving={sheetSaving}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
