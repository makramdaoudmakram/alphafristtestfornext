"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PaginationState, SortingState } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createItemCatalog,
  deleteItemCatalog,
  getCompanies,
  getGroups,
  getItemCatalogs,
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
import type { CompanyItem } from "@/types/company";
import type { GroupItem } from "@/types/group";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { ItemFormatItem } from "@/types/item-format";
import type { ItemOriginItem } from "@/types/item-origin";
import type { UnitItem } from "@/types/unit";
import { useItemCatalogColumns } from "@/components/admin/item-catalog-table-columns";
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
import {
  FormFieldInline,
  FormFieldInlineWrap,
} from "@/components/ui/form-field-inline";
import { Label } from "@/components/ui/label";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PERMISSIONS } from "@/lib/route-permissions";
import { cn } from "@/lib/utils";

function unitValueFromItem(
  unitId: number | null | undefined,
  units: UnitItem[]
): string {
  if (unitId === null || unitId === undefined) return "";
  const match = units.find(
    (unit) =>
      unit.uCode === String(unitId) || Number(unit.uCode) === unitId
  );
  return match?.uCode ?? String(unitId);
}

function CheckboxFieldInline({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="form-field-inline grid grid-cols-1 items-center gap-2 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-4">
      <Label
        htmlFor={id}
        className="text-muted-foreground shrink-0 text-sm font-medium sm:text-end"
      >
        {label}
      </Label>
      <div className="flex items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 rounded border"
        />
      </div>
    </div>
  );
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
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [formats, setFormats] = useState<ItemFormatItem[]>([]);
  const [origins, setOrigins] = useState<ItemOriginItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("master");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<ItemCatalogFormValues>(
    emptyItemCatalogFormValues
  );

  const columns = useItemCatalogColumns();

  const companyOptions = useMemo<ComboboxOption[]>(
    () =>
      companies.map((company) => ({
        value: String(company.comId),
        label: `${company.comNameEn || company.comNameAr || company.comCode} (#${company.comId})`,
      })),
    [companies]
  );

  const unitOptions = useMemo<ComboboxOption[]>(
    () =>
      units.map((unit) => ({
        value: unit.uCode,
        label: `${unit.uNameEn || unit.uNameAr || unit.uCode} (${unit.uCode})`,
      })),
    [units]
  );

  const formatOptions = useMemo<ComboboxOption[]>(
    () =>
      formats.map((format) => ({
        value: String(format.itfCode),
        label: `${format.itfNameEn || format.itfNameAr || format.itfCode} (#${format.itfCode})`,
      })),
    [formats]
  );

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

  const setField = useCallback(
    <K extends keyof ItemCatalogFormValues>(
      key: K,
      value: ItemCatalogFormValues[K]
    ) => {
      setFormValues((current) => ({ ...current, [key]: value }));
    },
    []
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
      const [catalogPage, companyList, unitResult, formatList, originList, groupList] =
        await Promise.all([
          getItemCatalogPage(token, {
            page: pagination.pageIndex + 1,
            pageSize: pagination.pageSize,
            sortBy,
            sortDesc: sort?.desc ?? false,
            search: debouncedSearch.trim() || undefined,
          }),
          getCompanies(token),
          unitService.listUnits(),
          getItemFormats(token),
          getItemOrigins(token),
          getGroups(token),
        ]);

      setItems(catalogPage.items);
      setTotalCount(catalogPage.totalCount);
      setCompanies(companyList);
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
    setActiveTab("master");
  }

  function handleEditDialogOpenChange(open: boolean) {
    setEditDialogOpen(open);
    if (!open) {
      setEditingId(null);
      setFormValues(emptyItemCatalogFormValues);
      setActiveTab("master");
    }
  }

  function handleEdit(row: ItemCatalogItem) {
    if (!hasPermission(PERMISSIONS.itemCatalog.edit)) {
      toast.error("You need ItemCatalog.Edit permission to update items.");
      return;
    }

    const id = resolveItemCatalogApiId(row);
    if (!id) {
      toast.error("This row has no valid item id. Refresh the list and try again.");
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
    setActiveTab("master");
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
      toast.error("Item code is required in the Master Details tab.");
      setActiveTab("master");
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
      toast.error("This row has no valid item id. Refresh the list and try again.");
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

  const itemCatalogFieldsGrid = (inDialog: boolean) =>
    cn(
      "item-catalog-fields-grid grid gap-3 md:grid-cols-2 xl:grid-cols-3",
      inDialog && "gap-2 xl:grid-cols-2"
    );

  function renderItemCatalogForm(inDialog: boolean) {
    return (
        <div
          className={cn(
            "flex min-h-0 flex-col gap-4",
            inDialog && "item-catalog-edit-form"
          )}
        >
          <Card className="shrink-0 basis-[40%] overflow-y-auto">
            <CardHeader>
              <CardTitle>Primary item information</CardTitle>
              <CardDescription>
                Main identifiers and default prices (~40% of the form area).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={itemCatalogFieldsGrid(inDialog)}>
                <FormFieldInline
                  id="itmCode2"
                  label="User code"
                  value={formValues.itmCode2}
                  onChange={(event) => setField("itmCode2", event.target.value)}
                />
                <FormFieldInline
                  id="itmIntCode"
                  label="International code"
                  value={formValues.itmIntCode}
                  onChange={(event) => setField("itmIntCode", event.target.value)}
                />
                <FormFieldInline
                  id="itmNameAr"
                  label="Arabic name"
                  value={formValues.itmNameAr}
                  onChange={(event) => setField("itmNameAr", event.target.value)}
                />
                <FormFieldInline
                  id="itmNameEn"
                  label="English name"
                  value={formValues.itmNameEn}
                  onChange={(event) => setField("itmNameEn", event.target.value)}
                />
                <FormFieldInline
                  id="itmDefSellPrice"
                  label="Sales price"
                  type="number"
                  step="0.01"
                  value={formValues.itmDefSellPrice}
                  onChange={(event) =>
                    setField("itmDefSellPrice", event.target.value)
                  }
                />
                <FormFieldInline
                  id="itmDefPharmPrice"
                  label="Purch price"
                  type="number"
                  step="0.01"
                  value={formValues.itmDefPharmPrice}
                  onChange={(event) =>
                    setField("itmDefPharmPrice", event.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle>Additional details</CardTitle>
              <CardDescription>
                Use the tabs for remaining master fields and child entity data.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="min-h-0 flex-1"
              >
                <TabsList>
                  <TabsTrigger value="master">Master details</TabsTrigger>
                  <TabsTrigger value="child">Child details</TabsTrigger>
                </TabsList>

                <TabsContent value="master" className="mt-3 space-y-4">
                  <div className={itemCatalogFieldsGrid(inDialog)}>
                    <FormFieldInline
                      id="itmCode"
                      label="Item code"
                      value={formValues.itmCode}
                      onChange={(event) => setField("itmCode", event.target.value)}
                      required
                    />
                    <FormFieldInline
                      id="itmDefTax"
                      label="Default tax"
                      type="number"
                      step="0.01"
                      value={formValues.itmDefTax}
                      onChange={(event) => setField("itmDefTax", event.target.value)}
                    />
                    <FormFieldInlineWrap id="comId" label="Company">
                      <SearchableCombobox
                        value={formValues.comId}
                        onValueChange={(value) => setField("comId", value)}
                        options={companyOptions}
                        placeholder="Select company"
                      />
                    </FormFieldInlineWrap>
                    <FormFieldInlineWrap id="itmOrigin" label="Item origin">
                      <SearchableCombobox
                        value={formValues.itmOrigin}
                        onValueChange={(value) => setField("itmOrigin", value)}
                        options={originOptions}
                        placeholder="Select origin"
                      />
                    </FormFieldInlineWrap>
                    <FormFieldInlineWrap id="itmGroup" label="Group">
                      <SearchableCombobox
                        value={formValues.itmGroup}
                        onValueChange={(value) => setField("itmGroup", value)}
                        options={groupOptions}
                        placeholder="Select group"
                      />
                    </FormFieldInlineWrap>
                    <FormFieldInlineWrap id="itemForm" label="Item format">
                      <SearchableCombobox
                        value={formValues.itemForm}
                        onValueChange={(value) => setField("itemForm", value)}
                        options={formatOptions}
                        placeholder="Select format"
                      />
                    </FormFieldInlineWrap>
                    <FormFieldInlineWrap id="itmUnit1" label="Unit 1">
                      <SearchableCombobox
                        value={formValues.itmUnit1}
                        onValueChange={(value) => setField("itmUnit1", value)}
                        options={unitOptions}
                        placeholder="Select unit"
                      />
                    </FormFieldInlineWrap>
                    <FormFieldInlineWrap id="itmUnit2" label="Unit 2">
                      <SearchableCombobox
                        value={formValues.itmUnit2}
                        onValueChange={(value) => setField("itmUnit2", value)}
                        options={unitOptions}
                        placeholder="Select unit"
                      />
                    </FormFieldInlineWrap>
                    <FormFieldInlineWrap id="itmUnit3" label="Unit 3">
                      <SearchableCombobox
                        value={formValues.itmUnit3}
                        onValueChange={(value) => setField("itmUnit3", value)}
                        options={unitOptions}
                        placeholder="Select unit"
                      />
                    </FormFieldInlineWrap>
                    <FormFieldInline
                      id="itmUnit1Unit2"
                      label="Unit 1 / Unit 2"
                      type="number"
                      step="0.01"
                      value={formValues.itmUnit1Unit2}
                      onChange={(event) =>
                        setField("itmUnit1Unit2", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmUnit1Unit3"
                      label="Unit 1 / Unit 3"
                      type="number"
                      step="0.01"
                      value={formValues.itmUnit1Unit3}
                      onChange={(event) =>
                        setField("itmUnit1Unit3", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmMaxDiscPer"
                      label="Max discount %"
                      type="number"
                      step="0.01"
                      value={formValues.itmMaxDiscPer}
                      onChange={(event) =>
                        setField("itmMaxDiscPer", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmMaxDiscVal"
                      label="Max discount value"
                      type="number"
                      step="0.01"
                      value={formValues.itmMaxDiscVal}
                      onChange={(event) =>
                        setField("itmMaxDiscVal", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmNotes"
                      label="Notes"
                      value={formValues.itmNotes}
                      onChange={(event) => setField("itmNotes", event.target.value)}
                    />
                  </div>

                  <div className={itemCatalogFieldsGrid(inDialog)}>
                    <CheckboxFieldInline
                      id="itmHasExpire"
                      label="Has expiry"
                      checked={formValues.itmHasExpire}
                      onChange={(checked) => setField("itmHasExpire", checked)}
                    />
                    <CheckboxFieldInline
                      id="itmIsmedicine"
                      label="Medicine"
                      checked={formValues.itmIsmedicine}
                      onChange={(checked) => setField("itmIsmedicine", checked)}
                    />
                    <CheckboxFieldInline
                      id="itmActive"
                      label="Active"
                      checked={formValues.itmActive}
                      onChange={(checked) => setField("itmActive", checked)}
                    />
                    <CheckboxFieldInline
                      id="itmStopSell"
                      label="Stop sell"
                      checked={formValues.itmStopSell}
                      onChange={(checked) => setField("itmStopSell", checked)}
                    />
                    <CheckboxFieldInline
                      id="itmSrvc"
                      label="Service item"
                      checked={formValues.itmSrvc}
                      onChange={(checked) => setField("itmSrvc", checked)}
                    />
                    <CheckboxFieldInline
                      id="itmStopPur"
                      label="Stop purchase"
                      checked={formValues.itmStopPur}
                      onChange={(checked) => setField("itmStopPur", checked)}
                    />
                    <CheckboxFieldInline
                      id="itmPrintBarcode"
                      label="Print barcode"
                      checked={formValues.itmPrintBarcode}
                      onChange={(checked) => setField("itmPrintBarcode", checked)}
                    />
                    <CheckboxFieldInline
                      id="itmAllowDiscount"
                      label="Allow discount"
                      checked={formValues.itmAllowDiscount}
                      onChange={(checked) => setField("itmAllowDiscount", checked)}
                    />
                    <CheckboxFieldInline
                      id="itmFreez"
                      label="Frozen"
                      checked={formValues.itmFreez}
                      onChange={(checked) => setField("itmFreez", checked)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="child" className="mt-3">
                  <div className={itemCatalogFieldsGrid(inDialog)}>
                    <FormFieldInline
                      id="itmComCode"
                      label="Company item code"
                      value={formValues.itmComCode}
                      onChange={(event) => setField("itmComCode", event.target.value)}
                    />
                    <FormFieldInline
                      id="itmLocation"
                      label="Location"
                      value={formValues.itmLocation}
                      onChange={(event) => setField("itmLocation", event.target.value)}
                    />
                    <FormFieldInlineWrap id="itmPurchaseUnit" label="Purchase unit">
                      <SearchableCombobox
                        value={formValues.itmPurchaseUnit}
                        onValueChange={(value) => setField("itmPurchaseUnit", value)}
                        options={unitOptions}
                        placeholder="Select purchase unit"
                      />
                    </FormFieldInlineWrap>
                    <FormFieldInlineWrap id="itmSellUnit" label="Sell unit">
                      <SearchableCombobox
                        value={formValues.itmSellUnit}
                        onValueChange={(value) => setField("itmSellUnit", value)}
                        options={unitOptions}
                        placeholder="Select sell unit"
                      />
                    </FormFieldInlineWrap>
                    <FormFieldInline
                      id="itmRequestLimit"
                      label="Request limit"
                      type="number"
                      step="0.01"
                      value={formValues.itmRequestLimit}
                      onChange={(event) =>
                        setField("itmRequestLimit", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmMaxLimit"
                      label="Max limit"
                      type="number"
                      step="0.01"
                      value={formValues.itmMaxLimit}
                      onChange={(event) => setField("itmMaxLimit", event.target.value)}
                    />
                    <FormFieldInline
                      id="itmMinLimit"
                      label="Min limit"
                      type="number"
                      step="0.01"
                      value={formValues.itmMinLimit}
                      onChange={(event) => setField("itmMinLimit", event.target.value)}
                    />
                    <FormFieldInline
                      id="itmDefaultLimit"
                      label="Default limit"
                      type="number"
                      step="0.01"
                      value={formValues.itmDefaultLimit}
                      onChange={(event) =>
                        setField("itmDefaultLimit", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmScientificN1"
                      label="Scientific name 1"
                      value={formValues.itmScientificN1}
                      onChange={(event) =>
                        setField("itmScientificN1", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmScientificN2"
                      label="Scientific name 2"
                      value={formValues.itmScientificN2}
                      onChange={(event) =>
                        setField("itmScientificN2", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmG1"
                      label="G1"
                      type="number"
                      step="0.01"
                      value={formValues.itmG1}
                      onChange={(event) => setField("itmG1", event.target.value)}
                    />
                    <FormFieldInline
                      id="itmG2"
                      label="G2"
                      type="number"
                      step="0.01"
                      value={formValues.itmG2}
                      onChange={(event) => setField("itmG2", event.target.value)}
                    />
                    <FormFieldInline
                      id="itmG3"
                      label="G3"
                      type="number"
                      step="0.01"
                      value={formValues.itmG3}
                      onChange={(event) => setField("itmG3", event.target.value)}
                    />
                    <FormFieldInline
                      id="itmScientificGroupId"
                      label="Scientific group"
                      type="number"
                      step="0.01"
                      value={formValues.itmScientificGroupId}
                      onChange={(event) =>
                        setField("itmScientificGroupId", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmUsageMannerId"
                      label="Usage manner"
                      type="number"
                      step="0.01"
                      value={formValues.itmUsageMannerId}
                      onChange={(event) =>
                        setField("itmUsageMannerId", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmMidUnitDif"
                      label="Mid unit diff"
                      type="number"
                      step="0.01"
                      value={formValues.itmMidUnitDif}
                      onChange={(event) =>
                        setField("itmMidUnitDif", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmSmallUnitDif"
                      label="Small unit diff"
                      type="number"
                      step="0.01"
                      value={formValues.itmSmallUnitDif}
                      onChange={(event) =>
                        setField("itmSmallUnitDif", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmSalesDisc"
                      label="Sales discount"
                      type="number"
                      step="0.01"
                      value={formValues.itmSalesDisc}
                      onChange={(event) =>
                        setField("itmSalesDisc", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="ucpCode"
                      label="UCP code"
                      value={formValues.ucpCode}
                      onChange={(event) => setField("ucpCode", event.target.value)}
                    />
                    <FormFieldInline
                      id="itmFracQty"
                      label="Fraction qty"
                      type="number"
                      value={formValues.itmFracQty}
                      onChange={(event) => setField("itmFracQty", event.target.value)}
                    />
                    <FormFieldInline
                      id="itmFavourite"
                      label="Favourite"
                      type="number"
                      value={formValues.itmFavourite}
                      onChange={(event) =>
                        setField("itmFavourite", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmIsShortage"
                      label="Is shortage"
                      type="number"
                      value={formValues.itmIsShortage}
                      onChange={(event) =>
                        setField("itmIsShortage", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmNopurreturn"
                      label="No purchase return"
                      type="number"
                      value={formValues.itmNopurreturn}
                      onChange={(event) =>
                        setField("itmNopurreturn", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmSellNostock"
                      label="Sell no stock"
                      type="number"
                      value={formValues.itmSellNostock}
                      onChange={(event) =>
                        setField("itmSellNostock", event.target.value)
                      }
                    />
                    <FormFieldInline
                      id="itmGId"
                      label="G ID"
                      type="number"
                      value={formValues.itmGId}
                      onChange={(event) => setField("itmGId", event.target.value)}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
    );
  }

  return (
    <PageGuard permission={PERMISSIONS.itemCatalog.view}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Item Catalog</h2>
            <p className="text-muted-foreground text-sm">
              Manage item master data and child details together.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
          <div className="flex min-h-[calc(100vh-12rem)] flex-col gap-4">
            {renderItemCatalogForm(false)}
          </div>
        ) : null}

        <Dialog open={editDialogOpen} onOpenChange={handleEditDialogOpenChange}>
          <DialogContent className="flex max-h-[92vh] w-[98vw] max-w-[84rem] flex-col gap-0 overflow-hidden p-0 sm:max-w-[84rem]">
            <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
              <DialogTitle>Edit item</DialogTitle>
              <DialogDescription>{editDialogTitle}</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {renderItemCatalogForm(true)}
            </div>
            <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:justify-end">
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

        <Card>
          <CardHeader>
            <CardTitle>All items ({totalCount})</CardTitle>
            <CardDescription>
              Sort columns by clicking headers. Use Update to open the edit dialog.
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
      </div>
    </PageGuard>
  );
}
