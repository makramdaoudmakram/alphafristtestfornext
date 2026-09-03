"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  listBatchManagement,
  saveBatchManagement,
  getStors,
} from "@/lib/api-client";
import { catalogDefaultPrices } from "@/lib/item-catalog-search";
import { formatExpDateMmYyyy, mmYyyyToExpDate } from "@/lib/purchase-exp-date";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import { ResizableTableHead } from "@/components/grid/resizable-table-head";
import { useGridPreferences } from "@/hooks/use-grid-preferences";
import { InventoryItemAutocomplete } from "@/components/inventory-adjustment/InventoryItemAutocomplete";
import { ItemLanguageToggle } from "@/components/pharm-recive/ItemLanguageToggle";
import { ExpDateMmYyyyInput } from "@/components/purchase/ExpDateMmYyyyInput";
import {
  BatchNoSearchAutocomplete,
  type BatchNoSearchResult,
} from "@/components/batch-management/BatchNoSearchAutocomplete";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BATCH_MANAGEMENT_GRID_COLUMNS,
  BATCH_MANAGEMENT_GRID_LEGACY_WIDTH_KEY,
  BATCH_MANAGEMENT_GRID_STORAGE_KEY,
} from "@/components/batch-management/batch-management-grid-columns";
import type { BatchManagementRow } from "@/types/batch-management";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PharmReciveItemLanguage } from "@/types/pharm-recive";
import type { StorItem } from "@/types/stor";

function nextClientRowId() {
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultExpDate() {
  const now = new Date();
  const month = now.getMonth() + 6;
  const date = new Date(now.getFullYear(), month, 1);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

function displayItemName(
  row: Pick<BatchManagementRow, "itemNameAr" | "itemNameEn">,
  language: PharmReciveItemLanguage
) {
  if (language === "ar") {
    return row.itemNameAr.trim() || row.itemNameEn.trim() || "";
  }
  return row.itemNameEn.trim() || row.itemNameAr.trim() || "";
}

function displayStoreName(
  row: Pick<BatchManagementRow, "storeName" | "storeNameAr" | "storeNameEn">,
  language: PharmReciveItemLanguage
) {
  if (language === "ar") {
    return row.storeNameAr.trim() || row.storeName.trim() || row.storeNameEn.trim() || "";
  }
  return row.storeNameEn.trim() || row.storeName.trim() || row.storeNameAr.trim() || "";
}

function storeOptionLabel(
  store: StorItem | undefined,
  language: PharmReciveItemLanguage
) {
  if (!store) return "";
  if (language === "ar") {
    return store.storArName?.trim() || store.storEnName?.trim() || `Store ${store.id}`;
  }
  return store.storEnName?.trim() || store.storArName?.trim() || `Store ${store.id}`;
}

function catalogIdOf(item: Pick<ItemCatalogItem, "id" | "itemCatalogId"> | null | undefined) {
  if (!item) return 0;
  if (item.id > 0) return item.id;
  if (item.itemCatalogId > 0) return item.itemCatalogId;
  return 0;
}

function resolveRowItemCatalogId(
  row: Pick<BatchManagementRow, "itemCatalogId">,
  selectedItem: ItemCatalogItem | null
) {
  if (row.itemCatalogId > 0) return row.itemCatalogId;
  return catalogIdOf(selectedItem);
}

type RowSnapshot = {
  id: number | null;
  expDate: string;
  salesPrice: number;
  costPrice: number;
};

function isDirtyRow(row: BatchManagementRow, originalById: Map<number, RowSnapshot>) {
  if (row.id == null) return true;
  const previous = originalById.get(row.id);
  if (!previous) return true;
  return (
    previous.expDate !== row.expDate ||
    previous.salesPrice !== row.salesPrice ||
    previous.costPrice !== row.costPrice
  );
}

function snapshotKey(rows: BatchManagementRow[]) {
  return JSON.stringify(
    rows.map((row) => ({
      id: row.id,
      expDate: row.expDate,
      salesPrice: row.salesPrice,
      costPrice: row.costPrice,
    }))
  );
}

function mapApiRow(row: {
  id: number | null;
  itemCatalogId: number;
  itemCode: string;
  itemNameAr: string;
  itemNameEn: string;
  batchNo: string;
  storeId: number;
  storeName: string;
  storeNameAr?: string;
  storeNameEn?: string;
  expDate: string | null;
  salesPrice: number;
  costPrice: number;
  qty: number;
}): BatchManagementRow {
  return {
    clientRowId: nextClientRowId(),
    id: row.id,
    itemCatalogId: row.itemCatalogId,
    itemCode: row.itemCode,
    itemNameAr: row.itemNameAr,
    itemNameEn: row.itemNameEn,
    batchNo: row.batchNo,
    storeId: row.storeId,
    storeName: row.storeName,
    storeNameAr: row.storeNameAr || row.storeName,
    storeNameEn: row.storeNameEn || row.storeName,
    expDate: row.expDate?.slice(0, 10) ?? "",
    salesPrice: row.salesPrice,
    costPrice: row.costPrice,
    qty: row.qty,
  };
}

function isValidExpDate(value: string) {
  return Boolean(mmYyyyToExpDate(formatExpDateMmYyyy(value)));
}

function isValidPrice(value: number) {
  return Number.isFinite(value) && value >= 0;
}

function validateDirtyRows(
  rows: BatchManagementRow[],
  originalById: Map<number, RowSnapshot>,
  selectedItem: ItemCatalogItem | null
): string[] {
  const errors: string[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]!;
    if (!isDirtyRow(row, originalById)) continue;
    const label = `Row ${index + 1}`;
    const rowErrors: string[] = [];
    if (resolveRowItemCatalogId(row, selectedItem) <= 0) {
      rowErrors.push("- Item is required.");
    }
    if (row.storeId <= 0) rowErrors.push("- Store cannot be changed.");
    if (!isValidExpDate(row.expDate)) {
      rowErrors.push("- Invalid expiration date.");
    }
    if (!isValidPrice(row.salesPrice)) {
      rowErrors.push("- Sales price must be a valid non-negative number.");
    }
    if (!isValidPrice(row.costPrice)) {
      rowErrors.push("- Cost price must be a valid non-negative number.");
    }
    if (rowErrors.length > 0) {
      errors.push(`${label}:\n${rowErrors.join("\n")}`);
    }
  }
  return errors;
}

type BatchSearchMode = "item" | "batch";

export function BatchManagementPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";
  const gridRootRef = useRef<HTMLDivElement>(null);

  const [itemLanguage, setItemLanguage] =
    useState<PharmReciveItemLanguage>("en");
  const [itemQuery, setItemQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<ItemCatalogItem | null>(null);
  const [batchNoQuery, setBatchNoQuery] = useState("");
  const [selectedBatchNo, setSelectedBatchNo] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<BatchSearchMode | null>(null);
  const [storeFilterId, setStoreFilterId] = useState("");
  const [stores, setStores] = useState<StorItem[]>([]);
  const [rows, setRows] = useState<BatchManagementRow[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState("[]");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { getWidth, getColumnStyle, getResizeHandleProps } = useGridPreferences({
    storageKey: BATCH_MANAGEMENT_GRID_STORAGE_KEY,
    legacyWidthStorageKey: BATCH_MANAGEMENT_GRID_LEGACY_WIDTH_KEY,
    columns: BATCH_MANAGEMENT_GRID_COLUMNS,
    gridRootRef,
  });

  const tableWidth = useMemo(
    () =>
      BATCH_MANAGEMENT_GRID_COLUMNS.reduce(
        (sum, column) => sum + getWidth(column.key),
        0
      ),
    [getWidth]
  );

  const dirty = snapshotKey(rows) !== savedSnapshot;
  const searchField = itemLanguage === "ar" ? "nameAr" : "nameEn";
  const storeOptions = useMemo<ComboboxOption[]>(
    () =>
      stores.map((store) => ({
        value: String(store.id),
        label: storeOptionLabel(store, itemLanguage),
      })),
    [stores, itemLanguage]
  );
  const selectedStore = stores.find((store) => String(store.id) === storeFilterId);

  const originalById = useMemo(() => {
    const map = new Map<number, RowSnapshot>();
    try {
      const snapshot = JSON.parse(savedSnapshot) as RowSnapshot[];
      for (const row of snapshot) {
        if (row.id != null) map.set(row.id, row);
      }
    } catch {
      /* ignore malformed snapshot */
    }
    return map;
  }, [savedSnapshot]);

  const loadStores = useCallback(async () => {
    if (!token) {
      setStores([]);
      return;
    }
    try {
      setStores(await getStors(token));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load stores"
      );
    }
  }, [token]);

  const loadBatchesByItem = useCallback(
    async (item: ItemCatalogItem, storeId: string) => {
      if (!token) return;
      setLoading(true);
      setLoadError(null);
      try {
        const parsedStore = storeId ? Number(storeId) : undefined;
        const catalogId = catalogIdOf(item);
        const items = await listBatchManagement(token, {
          itemCatalogId: catalogId || undefined,
          itemCode: item.itmCode ?? undefined,
          storeId:
            parsedStore && Number.isFinite(parsedStore) ? parsedStore : undefined,
        });
        const nextRows = items.map((row) =>
          mapApiRow({
            ...row,
            itemCatalogId: row.itemCatalogId > 0 ? row.itemCatalogId : catalogId,
            itemCode: row.itemCode || item.itmCode || "",
            itemNameAr: row.itemNameAr || item.itmNameAr || "",
            itemNameEn: row.itemNameEn || item.itmNameEn || "",
          })
        );
        setRows(nextRows);
        setSavedSnapshot(snapshotKey(nextRows));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load batches";
        setLoadError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const loadBatchByNo = useCallback(
    async (batchNo: string) => {
      if (!token) return;
      setLoading(true);
      setLoadError(null);
      try {
        const items = await listBatchManagement(token, { batchNo: batchNo.trim() });
        const match =
          items.find((row) => row.batchNo === batchNo.trim()) ?? items[0];
        if (!match) {
          setRows([]);
          setSavedSnapshot("[]");
          setLoadError("No batch found for this Batch No.");
          return;
        }
        const nextRows = [mapApiRow(match)];
        setRows(nextRows);
        setSavedSnapshot(snapshotKey(nextRows));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load batch";
        setLoadError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const reloadCurrentSearch = useCallback(async () => {
    if (searchMode === "batch" && selectedBatchNo) {
      await loadBatchByNo(selectedBatchNo);
      return;
    }
    if (selectedItem) {
      await loadBatchesByItem(selectedItem, storeFilterId);
    }
  }, [
    searchMode,
    selectedBatchNo,
    selectedItem,
    storeFilterId,
    loadBatchByNo,
    loadBatchesByItem,
  ]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadStores();
  }, [sessionReady, loadStores]);

  useEffect(() => {
    if (!sessionReady || !token) return;
    if (searchMode === "batch" && selectedBatchNo) {
      void loadBatchByNo(selectedBatchNo);
      return;
    }
    if (searchMode === "item" && selectedItem) {
      void loadBatchesByItem(selectedItem, storeFilterId);
      return;
    }
    if (!selectedItem && !selectedBatchNo) {
      setRows([]);
      setSavedSnapshot("[]");
      setLoadError(null);
    }
  }, [
    sessionReady,
    token,
    searchMode,
    selectedItem,
    selectedBatchNo,
    storeFilterId,
    loadBatchesByItem,
    loadBatchByNo,
  ]);

  const handleSelectSearchItem = (item: ItemCatalogItem) => {
    if (dirty) {
      toast.error("Save or discard changes before switching search.");
      return;
    }
    setSearchMode("item");
    setSelectedBatchNo(null);
    setBatchNoQuery("");
    setSelectedItem(item);
    setItemQuery(
      itemLanguage === "ar"
        ? item.itmNameAr?.trim() || item.itmNameEn?.trim() || ""
        : item.itmNameEn?.trim() || item.itmNameAr?.trim() || ""
    );
  };

  const handleSelectBatch = (batch: BatchNoSearchResult) => {
    if (dirty) {
      toast.error("Save or discard changes before switching search.");
      return;
    }
    setSearchMode("batch");
    setSelectedItem(null);
    setItemQuery("");
    setSelectedBatchNo(batch.batchNo);
    setBatchNoQuery(batch.batchNo);
    setLoadError(null);
  };

  const handleBatchNoQueryChange = (value: string) => {
    setBatchNoQuery(value);
    if (!value.trim()) {
      setSelectedBatchNo(null);
      if (searchMode === "batch") {
        setSearchMode(null);
        setRows([]);
        setSavedSnapshot("[]");
      }
    }
  };

  const handleStoreFilterChange = (value: string) => {
    const next = value === "__all__" ? "" : value;
    if (dirty) {
      toast.error("Save or discard changes before changing the store filter.");
      return;
    }
    if (searchMode === "batch") {
      toast.error("Store filter applies to Item Search only.");
      return;
    }
    setStoreFilterId(next);
  };

  const patchRow = (
    clientRowId: string,
    patch: Partial<BatchManagementRow>
  ) => {
    setRows((current) =>
      current.map((row) =>
        row.clientRowId === clientRowId ? { ...row, ...patch } : row
      )
    );
  };

  const handleAddNewBatch = () => {
    if (!selectedItem) {
      toast.error("Select an item using Item Search before adding a new batch.");
      return;
    }
    if (!storeFilterId) {
      toast.error("Select a store first. Store cannot be changed after the batch is created.");
      return;
    }
    const prices = catalogDefaultPrices(selectedItem);
    const storeNameAr = selectedStore?.storArName?.trim() ?? "";
    const storeNameEn = selectedStore?.storEnName?.trim() ?? "";
    const newRow: BatchManagementRow = {
      clientRowId: nextClientRowId(),
      id: null,
      itemCatalogId: catalogIdOf(selectedItem),
      itemCode: selectedItem.itmCode?.trim() ?? "",
      itemNameAr: selectedItem.itmNameAr?.trim() ?? "",
      itemNameEn: selectedItem.itmNameEn?.trim() ?? "",
      batchNo: "",
      storeId: Number(storeFilterId) || 0,
      storeName: selectedStore
        ? storeOptionLabel(selectedStore, itemLanguage)
        : "",
      storeNameAr: storeNameAr || storeNameEn,
      storeNameEn: storeNameEn || storeNameAr,
      expDate: defaultExpDate(),
      salesPrice: prices.itmSell,
      costPrice: prices.itmPurPrice,
      qty: 0,
    };
    setRows((current) => [...current, newRow]);
  };

  const handleRemoveNewRow = (clientRowId: string) => {
    setRows((current) =>
      current.filter((row) => row.clientRowId !== clientRowId)
    );
  };

  const handleSave = async () => {
    if (!token) return;
    const rowsToSave = rows.filter((row) => isDirtyRow(row, originalById));
    if (rowsToSave.length === 0) return;
    const errors = validateDirtyRows(rows, originalById, selectedItem);
    if (errors.length > 0) {
      const message = errors.join("\n");
      setSaveError(message);
      toast.error("Save failed. Fix the highlighted validation errors.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await saveBatchManagement(
        token,
        rows.flatMap((row, index) => {
          if (!isDirtyRow(row, originalById)) return [];
          const itemCatalogId = resolveRowItemCatalogId(row, selectedItem);
          return [
            {
              id: row.id,
              rowIndex: index + 1,
              itemCatalogId,
              itemId: itemCatalogId,
              storeId: row.storeId,
              expDate: row.expDate,
              salesPrice: row.salesPrice,
              costPrice: row.costPrice,
            },
          ];
        })
      );
      toast.success("Batch changes saved.");
      await reloadCurrentSearch();
    } catch (saveErrorValue) {
      const message =
        saveErrorValue instanceof Error
          ? saveErrorValue.message
          : "Failed to save batches";
      setSaveError(message);
      toast.error("Save failed. The sheet was not cleared.");
    } finally {
      setSaving(false);
    }
  };

  const storeSelectOptions = useMemo<ComboboxOption[]>(
    () => [{ value: "__all__", label: "All stores" }, ...storeOptions],
    [storeOptions]
  );

  return (
    <PageGuard permission={PERMISSIONS.stock.view}>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Batch Management</h2>
          <p className="text-muted-foreground text-sm">
           
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(280px,360px)_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Batch Search</CardTitle>
              <CardDescription>
               
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ItemLanguageToggle
                value={itemLanguage}
                onChange={setItemLanguage}
                disabled={saving}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Item Search</Label>
                  <InventoryItemAutocomplete
                    field={searchField}
                    value={itemQuery}
                    token={token}
                    disabled={!token || saving}
                    placeholder="Search Item..."
                    onChange={setItemQuery}
                    onItemSelected={handleSelectSearchItem}
                  />
                </div>
                <br></br>
                <div className="grid gap-2">
                  <Label>Batch No Search</Label>
                  <BatchNoSearchAutocomplete
                    value={batchNoQuery}
                    token={token}
                    language={itemLanguage}
                    disabled={!token || saving}
                    placeholder="Search Batch No..."
                    onChange={handleBatchNoQueryChange}
                    onBatchSelected={handleSelectBatch}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Store (new batches)</Label>
                <SearchableCombobox
                  value={storeFilterId || "__all__"}
                  onValueChange={handleStoreFilterChange}
                  options={storeSelectOptions}
                  placeholder="All stores"
                  searchPlaceholder="Search store name..."
                  emptyMessage="No stores found."
                  disabled={saving}
                />
              </div>
              <Button
                type="button"
                onClick={handleAddNewBatch}
                disabled={saving}
                className="w-full"
              >
                <Plus className="size-4" />
                Add New Batch
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Batch Sheet</CardTitle>
                <CardDescription>
                  ExpDate, Sales Price, and Cost Price can be edited. Item Name,
                  Store, Batch No, and Quantity cannot.
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !dirty || rows.length === 0}
              >
                <Save className="size-4" />
                Save Changes
              </Button>
            </CardHeader>
            <CardContent>
              {loadError ? (
                <p className="text-destructive mb-3 text-sm">{loadError}</p>
              ) : null}
              {saveError ? (
                <pre className="text-destructive mb-3 whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  {saveError}
                </pre>
              ) : null}
              <div
                ref={gridRootRef}
                className="overflow-auto rounded-md border"
              >
                <Table
                  className="table-fixed"
                  containerClassName="min-w-full overflow-visible"
                  style={{ width: tableWidth, minWidth: tableWidth }}
                >
                  <TableHeader>
                    <TableRow>
                      {BATCH_MANAGEMENT_GRID_COLUMNS.map((column) => (
                        <ResizableTableHead
                          key={column.key}
                          columnId={column.key}
                          width={getWidth(column.key)}
                          resizeHandleProps={getResizeHandleProps(column.key)}
                        >
                          {column.title}
                        </ResizableTableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={BATCH_MANAGEMENT_GRID_COLUMNS.length}
                          className="text-muted-foreground h-24 whitespace-normal text-center"
                        >
                          Loading batches...
                        </TableCell>
                      </TableRow>
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={BATCH_MANAGEMENT_GRID_COLUMNS.length}
                          className="text-muted-foreground h-24 whitespace-normal text-center"
                        >
                          {searchMode === "batch"
                            ? "No batch found for this Batch No."
                            : selectedItem
                              ? "No batches found for this item."
                              : "Search an item or Batch No to load batches."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row, rowIndex) => (
                        <TableRow key={row.clientRowId}>
                          <TableCell
                            data-grid-col="item"
                            style={getColumnStyle("item")}
                            className="overflow-hidden p-1"
                          >
                            <Input
                              readOnly
                              tabIndex={-1}
                              value={
                                displayItemName(row, itemLanguage) ||
                                row.itemCode ||
                                ""
                              }
                              className="bg-muted h-8"
                            />
                          </TableCell>
                          <TableCell
                            data-grid-col="batchNo"
                            style={getColumnStyle("batchNo")}
                            className="overflow-hidden p-1"
                          >
                            <Input
                              readOnly
                              tabIndex={-1}
                              value={row.batchNo || "Assigned on save"}
                              className="bg-muted h-8 font-mono text-sm"
                            />
                          </TableCell>
                          <TableCell
                            data-grid-col="expDate"
                            style={getColumnStyle("expDate")}
                            className="overflow-hidden p-1"
                          >
                            <ExpDateMmYyyyInput
                              rowIndex={rowIndex}
                              storedValue={row.expDate}
                              disabled={saving}
                              onFocusRow={() => undefined}
                              onCommit={(expDate) =>
                                patchRow(row.clientRowId, { expDate })
                              }
                            />
                          </TableCell>
                          <TableCell
                            data-grid-col="store"
                            style={getColumnStyle("store")}
                            className="overflow-hidden p-1"
                          >
                            <Input
                              readOnly
                              tabIndex={-1}
                              value={
                                displayStoreName(row, itemLanguage) ||
                                (row.storeId > 0 ? `Store ${row.storeId}` : "")
                              }
                              className="bg-muted h-8"
                            />
                          </TableCell>
                          <TableCell
                            data-grid-col="salesPrice"
                            style={getColumnStyle("salesPrice")}
                            className="overflow-hidden p-1"
                          >
                            <Input
                              type="number"
                              min={0}
                              step="0.0001"
                              value={
                                Number.isFinite(row.salesPrice)
                                  ? row.salesPrice
                                  : 0
                              }
                              disabled={saving}
                              onChange={(event) =>
                                patchRow(row.clientRowId, {
                                  salesPrice: Number(event.target.value),
                                })
                              }
                            />
                          </TableCell>
                          <TableCell
                            data-grid-col="costPrice"
                            style={getColumnStyle("costPrice")}
                            className="overflow-hidden p-1"
                          >
                            <Input
                              type="number"
                              min={0}
                              step="0.0001"
                              value={
                                Number.isFinite(row.costPrice)
                                  ? row.costPrice
                                  : 0
                              }
                              disabled={saving}
                              onChange={(event) =>
                                patchRow(row.clientRowId, {
                                  costPrice: Number(event.target.value),
                                })
                              }
                            />
                          </TableCell>
                          <TableCell
                            data-grid-col="qty"
                            style={getColumnStyle("qty")}
                            className="overflow-hidden p-1"
                          >
                            <div className="text-muted-foreground flex h-8 items-center px-2 tabular-nums">
                              {row.qty.toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                              })}
                            </div>
                          </TableCell>
                          <TableCell
                            data-grid-col="actions"
                            style={getColumnStyle("actions")}
                            className="overflow-hidden p-1 text-center"
                          >
                            {row.id == null ? (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                disabled={saving}
                                onClick={() =>
                                  handleRemoveNewRow(row.clientRowId)
                                }
                                aria-label="Remove unsaved batch"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageGuard>
  );
}
