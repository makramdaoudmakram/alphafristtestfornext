"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PaginationState, SortingState } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  createItemCatalog,
  deleteItemCatalog,
  getBrands,
  getGroups,
  getItemCatalogPage,
  getItemFormats,
  getItemOrigins,
  updateItemCatalog,
} from "@/lib/api-client";
import { createUnitService } from "@/services/unit.service";
import {
  emptyItemCatalogFormValues,
  formValuesToUpsertRequest,
  itemCatalogToFormValues,
  resolveItemCatalogApiId,
  type ItemCatalogFormValues,
} from "@/lib/item-catalog-form";
import type { BrandItem } from "@/types/brand";
import type { GroupItem } from "@/types/group";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { ItemFormatItem } from "@/types/item-format";
import type { ItemOriginItem } from "@/types/item-origin";
import type { UnitItem } from "@/types/unit";
import { ItemCatalogForm } from "@/components/admin/item-catalog/item-catalog-form";
import { InternationalBarcodDialog } from "@/components/admin/item-catalog/international-barcode-dialog";
import { ItemCatalogUpdateActions } from "@/components/admin/item-catalog/item-catalog-update-actions";
import {
  itemCatalogDialogBodyClass,
  itemCatalogDialogFooterClass,
  itemCatalogDialogHeaderClass,
  itemCatalogEditDialogContentClass,
} from "@/components/admin/item-catalog/item-catalog-dialog-styles";
import { VendorCodeDialog } from "@/components/admin/item-catalog/vendor-code-dialog";
import { useItemCatalogColumns } from "@/components/admin/item-catalog-table-columns";
import { ExcelTemplateWizard } from "@/components/excel/excel-template-wizard";
import { ExcelImportDialog } from "@/components/excel/excel-import-dialog";
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
import type { ComboboxOption } from "@/components/ui/searchable-combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PERMISSIONS } from "@/lib/route-permissions";

const DEFAULT_TAB = "general";

function unitValueFromItem(
  unitId: number | null | undefined,
  units: UnitItem[]
): string {
  if (unitId === null || unitId === undefined) return "";
  const match = units.find((unit) => unit.uCode === unitId);
  return match ? String(match.uCode) : String(unitId);
}

export function ItemCatalogPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<ItemCatalogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "itmCode", desc: false },
  ]);
  const [tableSearch, setTableSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [formats, setFormats] = useState<ItemFormatItem[]>([]);
  const [origins, setOrigins] = useState<ItemOriginItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [templateWizardOpen, setTemplateWizardOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [vendorCodeDialogOpen, setVendorCodeDialogOpen] = useState(false);
  const [internationalBarcodDialogOpen, setInternationalBarcodDialogOpen] =
    useState(false);
  const [formValues, setFormValues] = useState<ItemCatalogFormValues>(
    emptyItemCatalogFormValues
  );

  const columns = useItemCatalogColumns();

  const brandOptions = useMemo<ComboboxOption[]>(
    () =>
      brands.map((brand) => ({
        value: String(brand.id),
        label: `${brand.brandNameEn || brand.brandNameAr || brand.id} (#${brand.id})`,
      })),
    [brands]
  );

  const unitOptions = useMemo<ComboboxOption[]>(
    () =>
      units.map((unit) => ({
        value: String(unit.uCode),
        label: `${unit.uNameEn || unit.uNameAr || unit.uCode} (${unit.uCode})`,
      })),
    [units]
  );

  const selectedGroupId = useMemo(() => {
    const parsed = Number.parseInt(formValues.itmGroup, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [formValues.itmGroup]);

  const formatOptions = useMemo<ComboboxOption[]>(() => {
    const visibleFormats =
      selectedGroupId == null
        ? formats
        : formats.filter((format) => format.groupId === selectedGroupId);

    return visibleFormats.map((format) => ({
      value: String(format.itfCode),
      label: `${format.itfNameEn || format.itfNameAr || format.itfCode} (#${format.itfCode})`,
    }));
  }, [formats, selectedGroupId]);

  const originOptions = useMemo<ComboboxOption[]>(
    () =>
      origins.map((origin) => ({
        value: String(origin.ioId),
        label: `${origin.ioTextAr || origin.ioId} (#${origin.ioId})`,
      })),
    [origins]
  );

  const groupOptions = useMemo<ComboboxOption[]>(
    () =>
      groups.map((group) => ({
        value: String(group.id),
        label: `${group.gNameEn || group.gNameAr || group.id} (#${group.id})`,
      })),
    [groups]
  );

  const lookups = useMemo(
    () => ({
      brandOptions,
      unitOptions,
      formatOptions,
      originOptions,
      groupOptions,
    }),
    [brandOptions, unitOptions, formatOptions, originOptions, groupOptions]
  );

  const setField = useCallback(
    <K extends keyof ItemCatalogFormValues>(
      key: K,
      value: ItemCatalogFormValues[K]
    ) => {
      setFormValues((current) => {
        const next = { ...current, [key]: value };

        if (key === "itmGroup") {
          const groupId = Number.parseInt(String(value), 10);
          const currentFormatId = Number.parseInt(current.itemForm, 10);

          if (
            Number.isFinite(currentFormatId) &&
            currentFormatId > 0 &&
            Number.isFinite(groupId) &&
            groupId > 0
          ) {
            const stillValid = formats.some(
              (format) =>
                format.itfCode === currentFormatId &&
                format.groupId === groupId
            );

            if (!stillValid) {
              next.itemForm = "";
            }
          } else if (!Number.isFinite(groupId) || groupId <= 0) {
            next.itemForm = "";
          }
        }

        return next;
      });
    },
    [formats]
  );

  const loadPageData = useCallback(async () => {
    if (!token) {
      setItems([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    const sort = sorting[0];
    const sortBy = sort?.id ?? "itmCode";

    try {
      const unitService = createUnitService(token);
      const [
        catalogPage,
        brandList,
        unitResult,
        formatList,
        originList,
        groupList,
      ] = await Promise.all([
        getItemCatalogPage(token, {
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          sortBy,
          sortDesc: sort?.desc ?? false,
          search: debouncedSearch.trim() || undefined,
        }),
        getBrands(token),
        unitService.listUnits(),
        getItemFormats(token),
        getItemOrigins(token),
        getGroups(token),
      ]);

      setItems(catalogPage.items);
      setTotalCount(catalogPage.totalCount);
      setBrands(brandList);
      setUnits(unitResult.units);
      setFormats(formatList);
      setOrigins(originList);
      setGroups(groupList);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load item catalog";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token, pagination, sorting, debouncedSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(tableSearch);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [tableSearch]);

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [debouncedSearch]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadPageData();
  }, [sessionReady, loadPageData]);

  const pageCount = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

  function handleNew() {
    setEditDialogOpen(false);
    setEditingId(null);
    setFormValues(emptyItemCatalogFormValues);
    setActiveTab(DEFAULT_TAB);
  }

  function handleEditDialogOpenChange(open: boolean) {
    setEditDialogOpen(open);
    if (!open) {
      setEditingId(null);
      setFormValues(emptyItemCatalogFormValues);
      setActiveTab(DEFAULT_TAB);
      setVendorCodeDialogOpen(false);
      setInternationalBarcodDialogOpen(false);
    }
  }

  function handleEdit(row: ItemCatalogItem) {
    if (!hasPermission(PERMISSIONS.itemCatalog.edit)) {
      toast.error("You need ItemCatalog.Edit permission to update items.");
      return;
    }

    const id = resolveItemCatalogApiId(row);
    if (!id) {
      toast.error(
        "This row has no valid item id. Refresh the list and try again."
      );
      return;
    }

    const nextValues = itemCatalogToFormValues(row);
    nextValues.itmUnit1 = unitValueFromItem(row.itmUnit1, units);
    nextValues.itmUnit2 = unitValueFromItem(row.itmUnit2, units);
    nextValues.itmUnit3 = unitValueFromItem(row.itmUnit3, units);
    nextValues.itmPurchaseUnit = unitValueFromItem(
      row.child?.itmPurchaseUnit,
      units
    );
    nextValues.itmSellUnit = unitValueFromItem(row.child?.itmSellUnit, units);

    setEditingId(id);
    setFormValues(nextValues);
    setActiveTab(DEFAULT_TAB);
    setEditDialogOpen(true);
  }

  async function handleSave(options?: { closeDialog?: boolean }) {
    if (!token) return;

    if (!hasPermission(PERMISSIONS.itemCatalog.edit) && editingId) {
      toast.error("You need ItemCatalog.Edit permission to update items.");
      return;
    }
    if (!hasPermission(PERMISSIONS.itemCatalog.create) && !editingId) {
      toast.error("You need ItemCatalog.Create permission to save new items.");
      return;
    }

    if (!formValues.itmCode.trim()) {
      toast.error("Item code is required in the General tab.");
      setActiveTab("general");
      return;
    }

    setSaving(true);
    try {
      const payload = formValuesToUpsertRequest(formValues);

      if (editingId) {
        await updateItemCatalog(editingId, payload, token);
        toast.success("Item updated");
        if (options?.closeDialog !== false) {
          setEditDialogOpen(false);
          setEditingId(null);
          setFormValues(emptyItemCatalogFormValues);
        }
      } else {
        const created = await createItemCatalog(payload, token);
        setEditingId(created.id);
        toast.success("Item created");
      }

      await loadPageData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save item"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(row: ItemCatalogItem) {
    if (!hasPermission(PERMISSIONS.itemCatalog.delete)) {
      toast.error("You need ItemCatalog.Delete permission to delete items.");
      return;
    }

    const id = resolveItemCatalogApiId(row);
    if (!id) {
      toast.error(
        "This row has no valid item id. Refresh the list and try again."
      );
      return;
    }

    toast(`Delete item "${row.itmNameEn || row.itmNameAr || row.itmCode}"?`, {
      description:
        "Deletion is blocked if this item is used in transactions or price lists.",
      duration: Infinity,
      action: {
        label: "Delete",
        onClick: () => void confirmDelete(row, id),
      },
      cancel: {
        label: "Cancel",
        onClick: () => toast.message("Delete cancelled"),
      },
    });
  }

  async function confirmDelete(row: ItemCatalogItem, id: number) {
    if (!token) return;

    try {
      await deleteItemCatalog(id, token);
      toast.success("Item deleted");
      if (editingId === id) handleNew();
      await loadPageData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete item"
      );
    }
  }

  const editDialogTitle =
    formValues.itmCode?.trim() ||
    formValues.itmNameEn?.trim() ||
    formValues.itmNameAr?.trim() ||
    "Item";

  return (
    <PageGuard permission={PERMISSIONS.itemCatalog.view}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Item Catalog</h2>
            <p className="text-muted-foreground text-sm">
              Manage item master data with a structured ERP layout.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionGuard permission={PERMISSIONS.itemCatalog.import}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setImportDialogOpen(true)}
                disabled={!sessionReady || !token}
              >
                <Upload className="size-4" />
                Import Excel
              </Button>
            </ActionGuard>
            <ActionGuard permission={PERMISSIONS.itemCatalog.export}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTemplateWizardOpen(true)}
                disabled={!sessionReady || !token}
              >
                <FileSpreadsheet className="size-4" />
                Download Excel Template
              </Button>
            </ActionGuard>
            <ActionGuard permission={PERMISSIONS.itemCatalog.create}>
              <Button type="button" variant="outline" onClick={handleNew}>
                New item
              </Button>
            </ActionGuard>
            <ActionGuard permission={PERMISSIONS.itemCatalog.create}>
              <Button
                type="button"
                onClick={() => void handleSave({ closeDialog: false })}
                disabled={saving || editDialogOpen}
              >
                {saving ? "Saving..." : "Save item"}
              </Button>
            </ActionGuard>
          </div>
        </div>

        {!editDialogOpen ? (
          <div className="flex min-h-[calc(100vh-12rem)] flex-col gap-3">
            {editingId ? (
              <ItemCatalogUpdateActions
                editingId={editingId}
                disabled={saving}
                onVendorCodeClick={() => setVendorCodeDialogOpen(true)}
                onInternationalCodeClick={() =>
                  setInternationalBarcodDialogOpen(true)
                }
              />
            ) : null}
            <ItemCatalogForm
              formValues={formValues}
              setField={setField}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              lookups={lookups}
              idPrefix="page-"
            />
          </div>
        ) : null}

        <Dialog open={editDialogOpen} onOpenChange={handleEditDialogOpenChange}>
          <DialogContent className={itemCatalogEditDialogContentClass}>
            <DialogHeader className={itemCatalogDialogHeaderClass}>
              <DialogTitle>Edit item</DialogTitle>
              <DialogDescription>{editDialogTitle}</DialogDescription>
            </DialogHeader>
            {editingId ? (
              <div className="shrink-0 border-b border-neutral-500/70 bg-neutral-400/40 px-6 py-3 dark:border-neutral-600 dark:bg-neutral-800/80">
                <ItemCatalogUpdateActions
                  editingId={editingId}
                  disabled={saving}
                  onVendorCodeClick={() => setVendorCodeDialogOpen(true)}
                  onInternationalCodeClick={() =>
                    setInternationalBarcodDialogOpen(true)
                  }
                />
              </div>
            ) : null}
            <div className={itemCatalogDialogBodyClass}>
              <ItemCatalogForm
                formValues={formValues}
                setField={setField}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                lookups={lookups}
                compact
                idPrefix="dialog-"
              />
            </div>
            <DialogFooter className={`${itemCatalogDialogFooterClass} gap-2 sm:justify-end`}>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleEditDialogOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="update"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <VendorCodeDialog
          open={vendorCodeDialogOpen}
          onOpenChange={setVendorCodeDialogOpen}
          itmId={editingId}
          itemCode={formValues.itmCode?.trim() || null}
          token={token}
        />

        <InternationalBarcodDialog
          open={internationalBarcodDialogOpen}
          onOpenChange={setInternationalBarcodDialogOpen}
          itmId={editingId}
          itemCode={formValues.itmCode?.trim() || null}
          token={token}
        />

        <Card>
          <CardHeader>
            <CardTitle>All items ({totalCount})</CardTitle>
            <CardDescription>
              Sort columns by clicking headers. Use Update to open the edit
              dialog.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Search code or name..."
              emptyMessage="No items yet. Fill the form and click Save item."
              manualPagination
              manualSorting
              pageCount={pageCount}
              pagination={pagination}
              onPaginationChange={setPagination}
              sorting={sorting}
              onSortingChange={setSorting}
              totalRowCount={totalCount}
              filterValue={tableSearch}
              onFilterChange={setTableSearch}
              pageSizeOptions={[10, 20, 50, 100]}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            {loadError ? (
              <div className="mt-3 space-y-3">
                <p className="text-destructive text-sm">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadPageData()}
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <ExcelTemplateWizard
          open={templateWizardOpen}
          onOpenChange={setTemplateWizardOpen}
          entityName="ItemCatalog"
          entityLabel="Item Catalog"
          token={token}
        />

        <ExcelImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          entityName="ItemCatalog"
          entityLabel="Item Catalog"
          token={token}
          onCommitted={loadPageData}
        />
      </div>
    </PageGuard>
  );
}
