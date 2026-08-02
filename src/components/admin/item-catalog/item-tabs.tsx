"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdditionalInformationTab } from "@/components/admin/item-catalog/additional-information-tab";
import { GeneralInformationTab } from "@/components/admin/item-catalog/general-information-tab";
import { InventoryTab } from "@/components/admin/item-catalog/inventory-tab";
import { PurchaseTab } from "@/components/admin/item-catalog/purchase-tab";
import { SalesTab } from "@/components/admin/item-catalog/sales-tab";
import type { ItemCatalogFormProps } from "@/components/admin/item-catalog/types";
import { cn } from "@/lib/utils";

const TAB_ITEMS = [
  { value: "general", label: "General" },
  { value: "sales", label: "Sales" },
  { value: "purchase", label: "Purchase" },
  { value: "inventory", label: "Inventory" },
  { value: "additional", label: "Additional" },
] as const;

export function ItemTabs({
  formValues,
  setField,
  activeTab,
  onTabChange,
  lookups,
  compact = false,
  idPrefix = "",
}: ItemCatalogFormProps) {
  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="text-base">Item details</CardTitle>
        <CardDescription>
          Switch tabs to edit related fields. Values are kept while you navigate.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col pt-0">
        <Tabs
          value={activeTab}
          onValueChange={onTabChange}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="bg-background sticky top-0 z-10 shrink-0 pb-1">
            <TabsList
              className={cn(
                "flex h-auto w-full flex-wrap justify-start gap-1",
                compact && "gap-0.5"
              )}
            >
              {TAB_ITEMS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="px-2.5 py-1.5 text-xs sm:text-sm"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="general" className="mt-0 min-h-[16rem]">
            <GeneralInformationTab
              formValues={formValues}
              setField={setField}
              lookups={lookups}
              compact={compact}
              idPrefix={idPrefix}
            />
          </TabsContent>
          <TabsContent value="sales" className="mt-0 min-h-[16rem]">
            <SalesTab
              formValues={formValues}
              setField={setField}
              lookups={lookups}
              idPrefix={idPrefix}
            />
          </TabsContent>
          <TabsContent value="purchase" className="mt-0 min-h-[16rem]">
            <PurchaseTab
              formValues={formValues}
              setField={setField}
              lookups={lookups}
              idPrefix={idPrefix}
            />
          </TabsContent>
          <TabsContent value="inventory" className="mt-0 min-h-[16rem]">
            <InventoryTab
              formValues={formValues}
              setField={setField}
              idPrefix={idPrefix}
            />
          </TabsContent>
          <TabsContent value="additional" className="mt-0 min-h-[16rem]">
            <AdditionalInformationTab
              formValues={formValues}
              setField={setField}
              idPrefix={idPrefix}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
