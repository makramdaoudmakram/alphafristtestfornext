"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { fetchAllItemCatalogItems, getItemCatalogs } from "@/lib/api-client";
import type { ItemCatalogItem } from "@/types/item-catalog";
import { DetailsGrid } from "@/components/purchase/DetailsGrid";
import {
  HeaderPrimaryFields,
  HeaderTotalsFields,
} from "@/components/purchase/HeaderForm";
import { SearchDialog } from "@/components/purchase/SearchDialog";
import { Toolbar } from "@/components/purchase/Toolbar";
import { TotalsCard } from "@/components/purchase/TotalsCard";
import { PageGuard } from "@/components/permissions/page-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePurchase } from "@/hooks/usePurchase";

export function PurchasePageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";
  const sessionAuthenticated = status === "authenticated" && !!token;

  const purchase = usePurchase(token);
  const [catalogItems, setCatalogItems] = useState<ItemCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [itemByCode, setItemByCode] = useState<Map<string, ItemCatalogItem>>(
    () => new Map()
  );

  const loadItemCatalog = useCallback(async () => {
    if (!token) {
      setCatalogItems([]);
      setItemByCode(new Map());
      setCatalogLoaded(false);
      setCatalogLoading(false);
      return;
    }

    setCatalogLoading(true);
    setCatalogLoaded(false);

    try {
      let items: ItemCatalogItem[] = [];
      try {
        items = await getItemCatalogs(token);
      } catch (listError) {
        items = await fetchAllItemCatalogItems(token);
        if (items.length === 0 && listError instanceof Error) throw listError;
      }

      if (items.length === 0) {
        try {
          items = await fetchAllItemCatalogItems(token);
        } catch {
          // keep empty; message shown below
        }
      }

      setCatalogItems(items);
      const map = new Map<string, ItemCatalogItem>();
      for (const item of items) {
        const code = item.itmCode?.trim();
        if (code) map.set(code.toLowerCase(), item);
      }
      setItemByCode(map);
      setCatalogLoaded(true);

      if (items.length === 0) {
        toast.message("Item catalog is empty", {
          description:
            "Add items under Item Catalog, or check that the API returns data.",
        });
      }
    } catch (err) {
      setCatalogItems([]);
      setItemByCode(new Map());
      setCatalogLoaded(true);
      toast.error("Could not load item catalog for autocomplete.", {
        description:
          err instanceof Error ? err.message : "Check API connection and try Refresh.",
      });
    } finally {
      setCatalogLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!sessionAuthenticated) {
      setCatalogItems([]);
      setItemByCode(new Map());
      setCatalogLoaded(true);
      return;
    }
    void loadItemCatalog();
  }, [sessionReady, sessionAuthenticated, loadItemCatalog]);

  const {
    form,
    mode,
    details,
    selectedRowIndex,
    setSelectedRowIndex,
    loading,
    saving,
    isEditable,
    searchOpen,
    setSearchOpen,
    handleNew,
    handleEdit,
    handleSave,
    handleDelete,
    handleRefresh,
    navigate,
    navState,
    loadRecord,
    runSearch,
    addDetailRow,
    removeDetailRow,
    updateDetailRow,
    computedTotals,
  } = purchase;

  const hasRecord = !!form.watch("id");

  function confirmDelete() {
    toast("Delete this purchase document?", {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: () => void handleDelete(),
      },
      cancel: { label: "Cancel", onClick: () => toast.message("Cancelled") },
    });
  }

  if (!sessionReady) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-3xl" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <PageGuard permission={null}>
      <div className="space-y-4 print:space-y-2 lg:flex lg:min-h-[calc(100vh-6rem)] lg:flex-col">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Purchase transaction</h2>
            <p className="text-muted-foreground text-sm">
              PurTransH / PurTransD — vendor purchase invoice entry
            </p>
          </div>
          <span className="text-muted-foreground text-xs uppercase tracking-wide">
            Mode: {mode}
          </span>
        </div>

        <Toolbar
          mode={mode}
          saving={saving}
          loading={loading}
          hasRecord={hasRecord}
          nav={navState}
          onNew={handleNew}
          onSave={() => void handleSave(itemByCode)}
          onEdit={handleEdit}
          onDelete={confirmDelete}
          onPrint={() => {
            if (!hasRecord) {
              toast.message("Load or save a document before printing.");
              return;
            }
            window.print();
          }}
          onRefresh={() => {
            void loadItemCatalog();
            void handleRefresh(itemByCode);
          }}
          onFirst={() => void navigate("first", itemByCode)}
          onPrev={() => void navigate("prev", itemByCode)}
          onNext={() => void navigate("next", itemByCode)}
          onLast={() => void navigate("last", itemByCode)}
          onSearch={() => setSearchOpen(true)}
        />

        <TotalsCard {...computedTotals} />

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <HeaderPrimaryFields form={form} disabled={!isEditable} />
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col">
          <CardContent className="min-h-0 flex-1 pt-6">
            <DetailsGrid
              rows={details}
              catalogItems={catalogItems}
              catalogLoading={catalogLoading}
              catalogLoaded={catalogLoaded}
              disabled={!isEditable || loading}
              selectedRowIndex={selectedRowIndex}
              onSelectRow={setSelectedRowIndex}
              onChangeRow={updateDetailRow}
              onAddRow={addDetailRow}
              onRemoveRow={removeDetailRow}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full max-w-md ml-auto" />
                <Skeleton className="h-9 w-full max-w-md ml-auto" />
                <Skeleton className="h-9 w-full max-w-md ml-auto" />
              </div>
            ) : (
              <HeaderTotalsFields form={form} disabled={!isEditable} />
            )}
          </CardContent>
        </Card>

        <SearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onSearch={runSearch}
          onSelect={(row) => void loadRecord(row.id, itemByCode)}
        />
      </div>
    </PageGuard>
  );
}
