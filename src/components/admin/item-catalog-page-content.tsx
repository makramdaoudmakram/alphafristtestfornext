"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createItemCatalog,
  deleteItemCatalog,
  getCompanies,
  getGroups,
  getItemCatalog,
  getItemCatalogs,
  getItemFormats,
  getItemOrigins,
  getUnits,
  updateItemCatalog,
} from "@/lib/api-client";
import {
  emptyItemCatalogFormValues,
  formValuesToUpsertRequest,
  itemCatalogToFormValues,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PERMISSIONS } from "@/lib/route-permissions";

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

function FormField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function CheckboxField({
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
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border"
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

export function ItemCatalogPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<ItemCatalogItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [formats, setFormats] = useState<ItemFormatItem[]>([]);
  const [origins, setOrigins] = useState<ItemOriginItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("master");
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
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const [
        itemCatalogs,
        companyList,
        unitList,
        formatList,
        originList,
        groupList,
      ] = await Promise.all([
        getItemCatalogs(token),
        getCompanies(token),
        getUnits(token),
        getItemFormats(token),
        getItemOrigins(token),
        getGroups(token),
      ]);

      setItems(itemCatalogs);
      setCompanies(companyList);
      setUnits(unitList);
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
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadPageData();
  }, [sessionReady, loadPageData]);

  function handleNew() {
    setEditingId(null);
    setFormValues(emptyItemCatalogFormValues);
    setActiveTab("master");
  }

  async function handleEdit(row: ItemCatalogItem) {
    if (!token) return;

    try {
      const detail = await getItemCatalog(row.id, token);
      const nextValues = itemCatalogToFormValues(detail);
      nextValues.itmUnit1 = unitValueFromItem(detail.itmUnit1, units);
      nextValues.itmUnit2 = unitValueFromItem(detail.itmUnit2, units);
      nextValues.itmUnit3 = unitValueFromItem(detail.itmUnit3, units);
      nextValues.itmPurchaseUnit = unitValueFromItem(
        detail.child?.itmPurchaseUnit,
        units
      );
      nextValues.itmSellUnit = unitValueFromItem(detail.child?.itmSellUnit, units);

      setEditingId(detail.id);
      setFormValues(nextValues);
      setActiveTab("master");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load item details"
      );
    }
  }

  async function handleSave() {
    if (!token) return;

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
    toast(`Delete item "${row.itmNameEn || row.itmNameAr || row.itmCode}"?`, {
      description:
        "Deletion is blocked if this item is used in transactions or price lists.",
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

  async function confirmDelete(row: ItemCatalogItem) {
    if (!token) return;

    try {
      await deleteItemCatalog(row.id, token);
      toast.success("Item deleted");
      if (editingId === row.id) handleNew();
      await loadPageData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete item"
      );
    }
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
            <ActionGuard
              permission={
                editingId
                  ? PERMISSIONS.itemCatalog.edit
                  : PERMISSIONS.itemCatalog.create
              }
            >
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update item" : "Save item"}
              </Button>
            </ActionGuard>
          </div>
        </div>

        <div className="flex min-h-[calc(100vh-12rem)] flex-col gap-4">
          <Card className="shrink-0 basis-[40%] overflow-y-auto">
            <CardHeader>
              <CardTitle>Primary item information</CardTitle>
              <CardDescription>
                Main identifiers and default prices (~40% of the form area).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FormField id="itmCode2" label="User Code">
                  <Input
                    id="itmCode2"
                    value={formValues.itmCode2}
                    onChange={(event) => setField("itmCode2", event.target.value)}
                  />
                </FormField>
                <FormField id="itmIntCode" label="International code">
                  <Input
                    id="itmIntCode"
                    value={formValues.itmIntCode}
                    onChange={(event) => setField("itmIntCode", event.target.value)}
                  />
                </FormField>
                <FormField id="itmNameAr" label="Arabic Name">
                  <Input
                    id="itmNameAr"
                    value={formValues.itmNameAr}
                    onChange={(event) => setField("itmNameAr", event.target.value)}
                  />
                </FormField>
                <FormField id="itmNameEn" label="En Name">
                  <Input
                    id="itmNameEn"
                    value={formValues.itmNameEn}
                    onChange={(event) => setField("itmNameEn", event.target.value)}
                  />
                </FormField>
                <FormField id="itmDefSellPrice" label="Sales price">
                  <Input
                    id="itmDefSellPrice"
                    type="number"
                    step="0.01"
                    value={formValues.itmDefSellPrice}
                    onChange={(event) =>
                      setField("itmDefSellPrice", event.target.value)
                    }
                  />
                </FormField>
                <FormField id="itmDefPharmPrice" label="Purch price">
                  <Input
                    id="itmDefPharmPrice"
                    type="number"
                    step="0.01"
                    value={formValues.itmDefPharmPrice}
                    onChange={(event) =>
                      setField("itmDefPharmPrice", event.target.value)
                    }
                  />
                </FormField>
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

                <TabsContent value="master">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <FormField id="itmCode" label="Item code">
                      <Input
                        id="itmCode"
                        value={formValues.itmCode}
                        onChange={(event) => setField("itmCode", event.target.value)}
                        required
                      />
                    </FormField>
                    <FormField id="itmDefTax" label="Default tax">
                      <Input
                        id="itmDefTax"
                        type="number"
                        step="0.01"
                        value={formValues.itmDefTax}
                        onChange={(event) => setField("itmDefTax", event.target.value)}
                      />
                    </FormField>
                    <FormField id="comId" label="Company">
                      <SearchableCombobox
                        value={formValues.comId}
                        onValueChange={(value) => setField("comId", value)}
                        options={companyOptions}
                        placeholder="Select company"
                      />
                    </FormField>
                    <FormField id="itmOrigin" label="Item origin">
                      <SearchableCombobox
                        value={formValues.itmOrigin}
                        onValueChange={(value) => setField("itmOrigin", value)}
                        options={originOptions}
                        placeholder="Select origin"
                      />
                    </FormField>
                    <FormField id="itmGroup" label="Group">
                      <SearchableCombobox
                        value={formValues.itmGroup}
                        onValueChange={(value) => setField("itmGroup", value)}
                        options={groupOptions}
                        placeholder="Select group"
                      />
                    </FormField>
                    <FormField id="itemForm" label="Item format">
                      <SearchableCombobox
                        value={formValues.itemForm}
                        onValueChange={(value) => setField("itemForm", value)}
                        options={formatOptions}
                        placeholder="Select format"
                      />
                    </FormField>
                    <FormField id="itmUnit1" label="Unit 1">
                      <SearchableCombobox
                        value={formValues.itmUnit1}
                        onValueChange={(value) => setField("itmUnit1", value)}
                        options={unitOptions}
                        placeholder="Select unit"
                      />
                    </FormField>
                    <FormField id="itmUnit2" label="Unit 2">
                      <SearchableCombobox
                        value={formValues.itmUnit2}
                        onValueChange={(value) => setField("itmUnit2", value)}
                        options={unitOptions}
                        placeholder="Select unit"
                      />
                    </FormField>
                    <FormField id="itmUnit3" label="Unit 3">
                      <SearchableCombobox
                        value={formValues.itmUnit3}
                        onValueChange={(value) => setField("itmUnit3", value)}
                        options={unitOptions}
                        placeholder="Select unit"
                      />
                    </FormField>
                    <FormField id="itmUnit1Unit2" label="Unit 1 / Unit 2">
                      <Input
                        id="itmUnit1Unit2"
                        type="number"
                        step="0.01"
                        value={formValues.itmUnit1Unit2}
                        onChange={(event) =>
                          setField("itmUnit1Unit2", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmUnit1Unit3" label="Unit 1 / Unit 3">
                      <Input
                        id="itmUnit1Unit3"
                        type="number"
                        step="0.01"
                        value={formValues.itmUnit1Unit3}
                        onChange={(event) =>
                          setField("itmUnit1Unit3", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmMaxDiscPer" label="Max discount %">
                      <Input
                        id="itmMaxDiscPer"
                        type="number"
                        step="0.01"
                        value={formValues.itmMaxDiscPer}
                        onChange={(event) =>
                          setField("itmMaxDiscPer", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmMaxDiscVal" label="Max discount value">
                      <Input
                        id="itmMaxDiscVal"
                        type="number"
                        step="0.01"
                        value={formValues.itmMaxDiscVal}
                        onChange={(event) =>
                          setField("itmMaxDiscVal", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmNotes" label="Notes">
                      <Input
                        id="itmNotes"
                        value={formValues.itmNotes}
                        onChange={(event) => setField("itmNotes", event.target.value)}
                      />
                    </FormField>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <CheckboxField
                      id="itmHasExpire"
                      label="Has expiry"
                      checked={formValues.itmHasExpire}
                      onChange={(checked) => setField("itmHasExpire", checked)}
                    />
                    <CheckboxField
                      id="itmIsmedicine"
                      label="Medicine"
                      checked={formValues.itmIsmedicine}
                      onChange={(checked) => setField("itmIsmedicine", checked)}
                    />
                    <CheckboxField
                      id="itmActive"
                      label="Active"
                      checked={formValues.itmActive}
                      onChange={(checked) => setField("itmActive", checked)}
                    />
                    <CheckboxField
                      id="itmStopSell"
                      label="Stop sell"
                      checked={formValues.itmStopSell}
                      onChange={(checked) => setField("itmStopSell", checked)}
                    />
                    <CheckboxField
                      id="itmSrvc"
                      label="Service item"
                      checked={formValues.itmSrvc}
                      onChange={(checked) => setField("itmSrvc", checked)}
                    />
                    <CheckboxField
                      id="itmStopPur"
                      label="Stop purchase"
                      checked={formValues.itmStopPur}
                      onChange={(checked) => setField("itmStopPur", checked)}
                    />
                    <CheckboxField
                      id="itmPrintBarcode"
                      label="Print barcode"
                      checked={formValues.itmPrintBarcode}
                      onChange={(checked) => setField("itmPrintBarcode", checked)}
                    />
                    <CheckboxField
                      id="itmAllowDiscount"
                      label="Allow discount"
                      checked={formValues.itmAllowDiscount}
                      onChange={(checked) => setField("itmAllowDiscount", checked)}
                    />
                    <CheckboxField
                      id="itmFreez"
                      label="Frozen"
                      checked={formValues.itmFreez}
                      onChange={(checked) => setField("itmFreez", checked)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="child">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <FormField id="itmComCode" label="Company item code">
                      <Input
                        id="itmComCode"
                        value={formValues.itmComCode}
                        onChange={(event) => setField("itmComCode", event.target.value)}
                      />
                    </FormField>
                    <FormField id="itmLocation" label="Location">
                      <Input
                        id="itmLocation"
                        value={formValues.itmLocation}
                        onChange={(event) => setField("itmLocation", event.target.value)}
                      />
                    </FormField>
                    <FormField id="itmPurchaseUnit" label="Purchase unit">
                      <SearchableCombobox
                        value={formValues.itmPurchaseUnit}
                        onValueChange={(value) => setField("itmPurchaseUnit", value)}
                        options={unitOptions}
                        placeholder="Select purchase unit"
                      />
                    </FormField>
                    <FormField id="itmSellUnit" label="Sell unit">
                      <SearchableCombobox
                        value={formValues.itmSellUnit}
                        onValueChange={(value) => setField("itmSellUnit", value)}
                        options={unitOptions}
                        placeholder="Select sell unit"
                      />
                    </FormField>
                    <FormField id="itmRequestLimit" label="Request limit">
                      <Input
                        id="itmRequestLimit"
                        type="number"
                        step="0.01"
                        value={formValues.itmRequestLimit}
                        onChange={(event) =>
                          setField("itmRequestLimit", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmMaxLimit" label="Max limit">
                      <Input
                        id="itmMaxLimit"
                        type="number"
                        step="0.01"
                        value={formValues.itmMaxLimit}
                        onChange={(event) => setField("itmMaxLimit", event.target.value)}
                      />
                    </FormField>
                    <FormField id="itmMinLimit" label="Min limit">
                      <Input
                        id="itmMinLimit"
                        type="number"
                        step="0.01"
                        value={formValues.itmMinLimit}
                        onChange={(event) => setField("itmMinLimit", event.target.value)}
                      />
                    </FormField>
                    <FormField id="itmDefaultLimit" label="Default limit">
                      <Input
                        id="itmDefaultLimit"
                        type="number"
                        step="0.01"
                        value={formValues.itmDefaultLimit}
                        onChange={(event) =>
                          setField("itmDefaultLimit", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmScientificN1" label="Scientific name 1">
                      <Input
                        id="itmScientificN1"
                        value={formValues.itmScientificN1}
                        onChange={(event) =>
                          setField("itmScientificN1", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmScientificN2" label="Scientific name 2">
                      <Input
                        id="itmScientificN2"
                        value={formValues.itmScientificN2}
                        onChange={(event) =>
                          setField("itmScientificN2", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmG1" label="G1">
                      <Input
                        id="itmG1"
                        type="number"
                        step="0.01"
                        value={formValues.itmG1}
                        onChange={(event) => setField("itmG1", event.target.value)}
                      />
                    </FormField>
                    <FormField id="itmG2" label="G2">
                      <Input
                        id="itmG2"
                        type="number"
                        step="0.01"
                        value={formValues.itmG2}
                        onChange={(event) => setField("itmG2", event.target.value)}
                      />
                    </FormField>
                    <FormField id="itmG3" label="G3">
                      <Input
                        id="itmG3"
                        type="number"
                        step="0.01"
                        value={formValues.itmG3}
                        onChange={(event) => setField("itmG3", event.target.value)}
                      />
                    </FormField>
                    <FormField id="itmScientificGroupId" label="Scientific group">
                      <Input
                        id="itmScientificGroupId"
                        type="number"
                        step="0.01"
                        value={formValues.itmScientificGroupId}
                        onChange={(event) =>
                          setField("itmScientificGroupId", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmUsageMannerId" label="Usage manner">
                      <Input
                        id="itmUsageMannerId"
                        type="number"
                        step="0.01"
                        value={formValues.itmUsageMannerId}
                        onChange={(event) =>
                          setField("itmUsageMannerId", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmMidUnitDif" label="Mid unit diff">
                      <Input
                        id="itmMidUnitDif"
                        type="number"
                        step="0.01"
                        value={formValues.itmMidUnitDif}
                        onChange={(event) =>
                          setField("itmMidUnitDif", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmSmallUnitDif" label="Small unit diff">
                      <Input
                        id="itmSmallUnitDif"
                        type="number"
                        step="0.01"
                        value={formValues.itmSmallUnitDif}
                        onChange={(event) =>
                          setField("itmSmallUnitDif", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmSalesDisc" label="Sales discount">
                      <Input
                        id="itmSalesDisc"
                        type="number"
                        step="0.01"
                        value={formValues.itmSalesDisc}
                        onChange={(event) =>
                          setField("itmSalesDisc", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="ucpCode" label="UCP code">
                      <Input
                        id="ucpCode"
                        value={formValues.ucpCode}
                        onChange={(event) => setField("ucpCode", event.target.value)}
                      />
                    </FormField>
                    <FormField id="itmFracQty" label="Fraction qty">
                      <Input
                        id="itmFracQty"
                        type="number"
                        value={formValues.itmFracQty}
                        onChange={(event) => setField("itmFracQty", event.target.value)}
                      />
                    </FormField>
                    <FormField id="itmFavourite" label="Favourite">
                      <Input
                        id="itmFavourite"
                        type="number"
                        value={formValues.itmFavourite}
                        onChange={(event) =>
                          setField("itmFavourite", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmIsShortage" label="Is shortage">
                      <Input
                        id="itmIsShortage"
                        type="number"
                        value={formValues.itmIsShortage}
                        onChange={(event) =>
                          setField("itmIsShortage", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmNopurreturn" label="No purchase return">
                      <Input
                        id="itmNopurreturn"
                        type="number"
                        value={formValues.itmNopurreturn}
                        onChange={(event) =>
                          setField("itmNopurreturn", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmSellNostock" label="Sell no stock">
                      <Input
                        id="itmSellNostock"
                        type="number"
                        value={formValues.itmSellNostock}
                        onChange={(event) =>
                          setField("itmSellNostock", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="itmGId" label="G ID">
                      <Input
                        id="itmGId"
                        type="number"
                        value={formValues.itmGId}
                        onChange={(event) => setField("itmGId", event.target.value)}
                      />
                    </FormField>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All items ({items.length})</CardTitle>
            <CardDescription>
              Select Update on a row to load it into the form above.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Filter items..."
              emptyMessage="No items yet. Fill the form and click Save item."
              onEdit={
                hasPermission(PERMISSIONS.itemCatalog.edit) ? handleEdit : undefined
              }
              onDelete={
                hasPermission(PERMISSIONS.itemCatalog.delete)
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
