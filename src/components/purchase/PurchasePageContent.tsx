"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ApiError,
  fetchAllItemCatalogItems,
  getItemCatalogPage,
  getMovmentById,
  getNextMovValue,
} from "@/lib/api-client";
import type { ItemCatalogItem } from "@/types/item-catalog";
import { DetailsGrid } from "@/components/purchase/DetailsGrid";
import {
  HeaderPrimaryFields,
  HeaderTotalsFields,
} from "@/components/purchase/HeaderForm";
import { SearchDialog } from "@/components/purchase/SearchDialog";
import { Toolbar } from "@/components/purchase/Toolbar";
import { TotalsCard } from "@/components/purchase/TotalsCard";
import { MovementLookup } from "@/components/movement/MovementLookup";
import { PageGuard } from "@/components/permissions/page-guard";
import {
  FormFieldInlineWrap,
} from "@/components/ui/form-field-inline";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePurchase } from "@/hooks/usePurchase";
import type { MovmentLookupItem } from "@/types/movment";

/** Purchase transactions use MovParent / MovParientId = 1 */
const PURCHASE_MOV_PARENT_ID = 1;

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
  const [selectedMovement, setSelectedMovement] =
    useState<MovmentLookupItem | null>(null);
  const [pthIdLoading, setPthIdLoading] = useState(false);
  const nextValueAbortRef = useRef<AbortController | null>(null);
  const nextValueRequestRef = useRef(0);

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

    const applyCatalog = (items: ItemCatalogItem[]) => {
      setCatalogItems(items);
      const map = new Map<string, ItemCatalogItem>();
      for (const item of items) {
        const code = item.itmCode?.trim();
        if (code) map.set(code.toLowerCase(), item);
      }
      setItemByCode(map);
    };

    try {
      // 1) Fast first page so autocomplete works immediately
      const firstPage = await getItemCatalogPage(token, {
        page: 1,
        pageSize: 100,
        sortBy: "itmCode",
        sortDesc: false,
      });
      applyCatalog(firstPage.items);
      setCatalogLoaded(true);

      // 2) Load remaining pages in the background (contains-search needs full list)
      if (firstPage.totalCount > firstPage.items.length) {
        try {
          const all = await fetchAllItemCatalogItems(token);
          if (all.length > 0) applyCatalog(all);
        } catch {
          // Keep first page — better than clearing autocomplete entirely
        }
      }

      if (firstPage.items.length === 0 && firstPage.totalCount === 0) {
        toast.message("Item catalog is empty", {
          description:
            "Add items under Item Catalog, or check that the API returns data.",
        });
      }
    } catch (err) {
      // Last resort: try the full fetch
      try {
        const all = await fetchAllItemCatalogItems(token);
        applyCatalog(all);
        setCatalogLoaded(true);
        if (all.length === 0) {
          toast.message("Item catalog is empty", {
            description:
              "Add items under Item Catalog, or check that the API returns data.",
          });
        }
      } catch {
        setCatalogItems([]);
        setItemByCode(new Map());
        setCatalogLoaded(true);
        toast.error("Could not load item catalog for autocomplete.", {
          description:
            err instanceof Error
              ? err.message
              : "Check API connection and try Refresh.",
        });
      }
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

  const showMovementToast = useCallback((src: {
    movStor: string | null | undefined;
    movChiledId: number | null | undefined;
    movAccountEntry1: string | null | undefined;
    movAccountEntry2: string | null | undefined;
    movAccountEntry3: string | null | undefined;
  }) => {
    const movStor = src.movStor?.trim() || "—";
    const movChiledId = src.movChiledId != null ? String(src.movChiledId) : "—";
    const entry1 = src.movAccountEntry1?.trim() || "—";
    const entry2 = src.movAccountEntry2?.trim() || "—";
    const entry3 = src.movAccountEntry3?.trim() || "—";

    toast.message("Movement selected", {
      duration: 10000,
      description: [
        `MovStor = ${movStor}`,
        `MovChiledId = ${movChiledId}`,
        `MovAccountEntry1 = ${entry1}`,
        `MovAccountEntry2 = ${entry2}`,
        `MovAccountEntry3 = ${entry3}`,
      ].join("\n"),
      classNames: {
        description: "whitespace-pre-line font-mono text-xs",
      },
    });
  }, []);

  const applyMovementFields = useCallback(
    (mapped: MovmentLookupItem) => {
      setSelectedMovement(mapped);

      const movChiledId = mapped.movChiledId;
      const entry1 = mapped.movAccountEntry1?.trim() ?? "";
      const entry2 = mapped.movAccountEntry2?.trim() ?? "";
      const entry3 = mapped.movAccountEntry3?.trim() ?? "";
      const movStor = mapped.movStor?.trim() ?? "";

      form.setValue("movmentRowId", mapped.id, {
        shouldDirty: true,
        shouldValidate: false,
      });
      form.setValue("stoId", movStor, { shouldDirty: true, shouldValidate: false });
      form.setValue("movId", movChiledId, { shouldDirty: true, shouldValidate: false });
      form.setValue("venId", entry1, { shouldDirty: true, shouldValidate: false });
      form.setValue("movAccountsec", entry1, { shouldDirty: true, shouldValidate: false });
      form.setValue("movAccount", entry2, { shouldDirty: true, shouldValidate: false });
      form.setValue("movAccounttherd", entry3, {
        shouldDirty: true,
        shouldValidate: false,
      });

      showMovementToast(mapped);
    },
    [form, showMovementToast]
  );

  const handleMovementChange = useCallback(
    async (item: MovmentLookupItem | null) => {
      if (!item) {
        setSelectedMovement(null);
        form.setValue("movmentRowId", null, { shouldDirty: true, shouldValidate: false });
        form.setValue("stoId", "", { shouldDirty: true, shouldValidate: false });
        form.setValue("movId", null, { shouldDirty: true, shouldValidate: false });
        form.setValue("venId", "", { shouldDirty: true, shouldValidate: false });
        form.setValue("movAccountsec", "", { shouldDirty: true, shouldValidate: false });
        form.setValue("movAccount", "", { shouldDirty: true, shouldValidate: false });
        form.setValue("movAccounttherd", "", { shouldDirty: true, shouldValidate: false });
        return;
      }

      // Show immediately from combobox row (lookup), then enrich from GET by id
      applyMovementFields(item);

      if (!token) {
        toast.error("Sign in is required to load the next PthId.");
        return;
      }

      nextValueAbortRef.current?.abort();
      const controller = new AbortController();
      nextValueAbortRef.current = controller;
      const requestId = ++nextValueRequestRef.current;

      setPthIdLoading(true);
      try {
        const full = await getMovmentById(item.id, token, {
          signal: controller.signal,
        });

        if (requestId !== nextValueRequestRef.current) return;

        const mapped: MovmentLookupItem = {
          id: full.id,
          movChiledId: full.movChiledId,
          movChiledName: full.movChiledName,
          movParientId: full.movParientId,
          movStor: full.movStor,
          movSingleStore: full.movSingleStore,
          movAccountEntry1: full.movAccountEntry1,
          movAccountEntry2: full.movAccountEntry2,
          movAccountEntry3: full.movAccountEntry3,
        };
        applyMovementFields(mapped);

        const movChiledId = mapped.movChiledId;
        if (movChiledId == null) {
          toast.error("Selected movement has no MovChiledId.");
          return;
        }

        const result = await getNextMovValue(movChiledId, token, {
          signal: controller.signal,
        });

        if (requestId !== nextValueRequestRef.current) return;

        if (!result.success) {
          toast.error(result.message?.trim() || "Could not get the next PthId.");
          return;
        }

        form.setValue("pthId", result.value, {
          shouldDirty: true,
          shouldValidate: true,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (requestId !== nextValueRequestRef.current) return;

        toast.error(
          error instanceof ApiError
            ? error.message
            : "Could not load movement / next PthId. Please try again."
        );
      } finally {
        if (requestId === nextValueRequestRef.current) {
          setPthIdLoading(false);
        }
      }
    },
    [applyMovementFields, form, token]
  );

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
          onSave={() => void handleSave(itemByCode, selectedMovement)}
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
              <div className="space-y-4">
                <FormFieldInlineWrap
                  id="purchase-movement"
                  label="Movement"
                  className="sm:grid-cols-[4.75rem_minmax(0,1fr)] w-full max-w-full sm:max-w-[50%]"
                  labelClassName="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
                >
                  <MovementLookup
                    parentId={PURCHASE_MOV_PARENT_ID}
                    token={token}
                    value={selectedMovement}
                    disabled={!isEditable || pthIdLoading}
                    onChange={(item) => void handleMovementChange(item)}
                  />
                </FormFieldInlineWrap>
                {pthIdLoading ? (
                  <p className="text-muted-foreground text-sm sm:pl-[calc(4.75rem+1rem)]">
                    Loading next PthId…
                  </p>
                ) : null}
                <HeaderPrimaryFields form={form} disabled={!isEditable} />
              </div>
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
