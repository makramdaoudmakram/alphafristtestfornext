"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ReturnItemStockSearchBox } from "@/components/return/ReturnItemStockSearchBox";
import { PharmTransferDetailsGrid } from "@/components/pharm-transfer/PharmTransferDetailsGrid";
import { PharmTransferEmployeeTotalsTable } from "@/components/pharm-transfer/PharmTransferEmployeeTotalsTable";
import { Toolbar } from "@/components/purchase/Toolbar";
import { ItemLanguageToggle } from "@/components/pharm-recive/ItemLanguageToggle";
import { PageGuard } from "@/components/permissions/page-guard";
import { usePharmacyScope } from "@/components/pharmacy/pharmacy-scope-provider";
import { FormFieldInlineWrap } from "@/components/ui/form-field-inline";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { usePharmTransfer } from "@/hooks/usePharmTransfer";
import {
  findEmptyPharmTransferDetailRowIndex,
  patchPharmTransferDetailFromStockSearch,
} from "@/lib/pharm-transfer-item-stock-search";
import { computePharmTransferTotals } from "@/services/pharm-transfer.service";
import { createPharmTransferService } from "@/services/pharm-transfer.service";
import { getItemCatalog, getUnitConversionInfo } from "@/lib/api-client";
import { applyPharmTransferUnitPrices } from "@/lib/pharm-transfer-calculations";
import { createUnitService } from "@/services/unit.service";
import {
  ensureCatalogItemsForItmCodes,
  findCatalogItemByCode,
  getItemDefaultUnitId,
  getItemUnitIds,
  indexCatalogItem,
  mergeCatalogItemWithCache,
} from "@/lib/item-unit-options";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PharmTransferContext } from "@/types/pharm-transfer";
import {
  EMPLOY_TYPE_DELIVERY,
} from "@/types/pharm-transfer";
import type { UnitItem } from "@/types/unit";
import type { ReturnItemStockSearchItem } from "@/types/stock";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PharmTransferPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";
  const { activePharmacyId } = usePharmacyScope();

  const {
    header,
    updateHeader,
    details,
    mode,
    selectedRowIndex,
    setSelectedRowIndex,
    loading,
    saving,
    isEditable,
    searchOpen,
    setSearchOpen,
    navState,
    handleNew,
    handleEdit,
    handleSave,
    handleDelete,
    handleRefresh,
    navigate,
    loadRecord,
    runSearch,
    addDetailRow,
    removeDetailRow,
    updateDetailRow,
    refreshNavIds,
  } = usePharmTransfer(token);

  const [context, setContext] = useState<PharmTransferContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [itemByCode, setItemByCode] = useState<Map<string, ItemCatalogItem>>(
    () => new Map()
  );
  const [itemLanguage, setItemLanguage] = useState<"en" | "ar">("en");
  const [searchResults, setSearchResults] = useState<
    Awaited<ReturnType<typeof runSearch>>
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchItemCode, setSearchItemCode] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");

  const service = useMemo(
    () => (token ? createPharmTransferService(token) : null),
    [token]
  );

  const loadContext = useCallback(async () => {
    if (!service) {
      setContext(null);
      setContextLoading(false);
      return;
    }

    setContextLoading(true);
    try {
      const next = await service.getContext();
      setContext(next);
    } catch (error) {
      setContext(null);
      toast.error(
        error instanceof Error ? error.message : "Failed to load pharmacy context."
      );
    } finally {
      setContextLoading(false);
    }
  }, [service]);

  useEffect(() => {
    void loadContext();
    void refreshNavIds();
  }, [loadContext, refreshNavIds, activePharmacyId]);

  useEffect(() => {
    if (!token) return;
    setUnitsLoading(true);
    createUnitService(token)
      .listUnits()
      .then(({ units: loaded }) => setUnits(loaded))
      .finally(() => setUnitsLoading(false));
  }, [token]);

  const detailCatalogKey = useMemo(
    () =>
      details
        .map((row) => `${row.itmId?.trim() ?? ""}:${row.itemCatalogId ?? ""}`)
        .filter((value) => value !== ":")
        .join("|"),
    [details]
  );

  useEffect(() => {
    if (!token || !detailCatalogKey) return;

    let cancelled = false;
    void ensureCatalogItemsForItmCodes(details, itemByCode, undefined, token).then(
      (map) => {
        if (cancelled) return;
        setItemByCode((prev) => {
          let changed = map.size !== prev.size;
          if (!changed) {
            for (const [key, value] of map) {
              const existing = prev.get(key);
              if (
                !existing ||
                (getItemUnitIds(existing).length === 0 &&
                  getItemUnitIds(value).length > 0)
              ) {
                changed = true;
                break;
              }
            }
          }
          return changed ? map : prev;
        });
      }
    );

    return () => {
      cancelled = true;
    };
    // itemByCode is read as a snapshot; including it would loop on enrichment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, detailCatalogKey]);

  const destinationOptions = useMemo<ComboboxOption[]>(
    () =>
      (context?.destinationPharmacies ?? []).map((pharmacy) => ({
        value: String(pharmacy.storeId),
        label: pharmacy.name?.trim() || `Store ${pharmacy.storeId}`,
      })),
    [context?.destinationPharmacies]
  );

  const totals = useMemo(() => computePharmTransferTotals(details), [details]);
  const hasRecord = (header.id ?? 0) > 0;
  const employeeIdentified = Boolean(
    header.receivingEmployeeCode.trim() && header.receivingEmployeeName?.trim()
  );
  const storeIdForSearch = context?.currentStoreId
    ? String(context.currentStoreId)
    : "";

  const lookupDeliveryEmployee = useCallback(
    async (code: string) => {
      const normalizedCode = code.trim();
      if (!service) return;

      if (!normalizedCode) {
        updateHeader({ deliveryEmployeeCode: "", deliveryEmployeeName: "" });
        return;
      }

      try {
        const employee = await service.lookupEmployee(
          normalizedCode,
          EMPLOY_TYPE_DELIVERY
        );
        if (!employee) {
          toast.error("Please check the delivery code.");
          updateHeader({
            deliveryEmployeeCode: normalizedCode,
            deliveryEmployeeName: "",
          });
          return;
        }

        updateHeader({
          deliveryEmployeeCode: normalizedCode,
          deliveryEmployeeName: employee.name,
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Employee lookup failed."
        );
      }
    },
    [service, updateHeader]
  );

  const lookupReceivingEmployeeByPassword = useCallback(
    async (password: string) => {
      const normalizedPassword = password.trim();
      if (!service) return;

      if (!normalizedPassword) {
        updateHeader({
          receivingEmployeePassword: "",
          receivingEmployeeCode: "",
          receivingEmployeeName: "",
        });
        return;
      }

      if (normalizedPassword.length !== 4) {
        toast.error("There is an error with the employee password.");
        updateHeader({
          receivingEmployeePassword: normalizedPassword,
          receivingEmployeeCode: "",
          receivingEmployeeName: "",
        });
        return;
      }

      try {
        const employee = await service.lookupEmployeeByPassword(normalizedPassword);
        if (!employee) {
          toast.error("There is an error with the employee password.");
          updateHeader({
            receivingEmployeePassword: normalizedPassword,
            receivingEmployeeCode: "",
            receivingEmployeeName: "",
          });
          return;
        }

        updateHeader({
          receivingEmployeePassword: normalizedPassword,
          receivingEmployeeCode: employee.code?.trim() ?? "",
          receivingEmployeeName: employee.name,
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Employee lookup failed."
        );
      }
    },
    [service, updateHeader]
  );

  const handleSaveWithValidation = useCallback(async () => {
    if (!context?.currentStoreId) {
      toast.error("Current pharmacy store is not configured.");
      return;
    }
    if (!header.movDis || header.movDis <= 0) {
      toast.error("Please select a destination pharmacy.");
      return;
    }
    if (header.movDis === context.currentStoreId) {
      toast.error("Source and destination pharmacies cannot be the same.");
      return;
    }

    const receivingPassword = header.receivingEmployeePassword?.trim() ?? "";
    const receivingCode = header.receivingEmployeeCode.trim();
    if (
      (!receivingPassword || receivingPassword === "0") &&
      (!receivingCode || receivingCode === "0")
    ) {
      toast.error("Employee code is required.");
      return;
    }

    const deliveryCode = header.deliveryEmployeeCode.trim();
    if (!deliveryCode || deliveryCode === "0") {
      toast.error("Delivery code is required.");
      return;
    }

    await handleSave();
  }, [
    context?.currentStoreId,
    handleSave,
    header.deliveryEmployeeCode,
    header.movDis,
    header.receivingEmployeeCode,
    header.receivingEmployeePassword,
  ]);

  const handleCatalogItemApplied = useCallback(
    (item: ItemCatalogItem) => {
      setItemByCode((prev) => {
        const merged = mergeCatalogItemWithCache(item, prev, []);
        const code = merged.itmCode?.trim().toLowerCase();
        if (!code) return prev;
        const next = new Map(prev);
        indexCatalogItem(next, merged, []);

        if (getItemUnitIds(merged).length === 0 && merged.id > 0 && token) {
          void getItemCatalog(merged.id, token)
            .then((full) => {
              setItemByCode((current) => {
                const updated = new Map(current);
                indexCatalogItem(updated, full, []);
                return updated;
              });
            })
            .catch(() => undefined);
        }

        return next;
      });
    },
    [token]
  );

  const handleStockItemSelected = useCallback(
    async (searchResult: ReturnItemStockSearchItem) => {
      if (!isEditable) {
        toast.message("Document is not editable.");
        return;
      }
      if (!token) return;

      let catalogItem = findCatalogItemByCode(searchResult.itemCode, itemByCode);

      if (
        (!catalogItem || getItemUnitIds(catalogItem).length === 0) &&
        searchResult.itemCatalogId > 0
      ) {
        try {
          catalogItem = await getItemCatalog(searchResult.itemCatalogId, token);
        } catch {
          toast.error("Could not load item catalog record.");
          return;
        }
      }

      if (!catalogItem) {
        toast.error(`Item "${searchResult.itemCode}" was not found in catalog.`);
        return;
      }

      if (getItemUnitIds(catalogItem).length === 0) {
        toast.error(
          `Item "${searchResult.itemCode}" has no units configured in the catalog.`
        );
        return;
      }

      handleCatalogItemApplied(catalogItem);

      const patchOrError = patchPharmTransferDetailFromStockSearch(
        catalogItem,
        searchResult
      );
      if ("error" in patchOrError) {
        toast.error(patchOrError.error);
        return;
      }

      const patch = patchOrError;
      const unitId = getItemDefaultUnitId(catalogItem) ?? patch.unitId ?? 0;
      patch.unitId = unitId;

      if (unitId > 0) {
        try {
          const info = await getUnitConversionInfo(
            token,
            searchResult.itemCode,
            unitId,
            1
          );
          if (!info.errorMessage?.trim()) {
            const prices = applyPharmTransferUnitPrices(
              Number(patch.baseItmSell) || 0,
              Number(patch.baseCostPrice) || 0,
              info.priceQtyNet
            );
            patch.itmSell = prices.itmSell;
            patch.purchPrice = prices.purchPrice;
            patch.priceQtyNet = prices.priceQtyNet;
            patch.unitName = info.unitName || patch.unitName;
          }
        } catch {
          // Keep base unit-1 prices if conversion lookup fails.
        }
      }

      if (!searchResult.batchNo?.trim()) {
        toast.error(`Item "${searchResult.itemCode}" has no stock batch available.`);
        return;
      }

      if (
        patch.purchPrice == null ||
        !Number.isFinite(patch.purchPrice) ||
        patch.purchPrice <= 0
      ) {
        toast.error(
          `Stock cost price is missing for item "${searchResult.itemCode}" batch "${searchResult.batchNo}".`
        );
        return;
      }

      const emptyIndex = findEmptyPharmTransferDetailRowIndex(details);
      const targetIndex = emptyIndex >= 0 ? emptyIndex : details.length;

      if (targetIndex >= details.length) {
        addDetailRow();
      }

      updateDetailRow(targetIndex, patch);
      setSelectedRowIndex(targetIndex);
    },
    [
      addDetailRow,
      details,
      handleCatalogItemApplied,
      isEditable,
      itemByCode,
      setSelectedRowIndex,
      token,
      updateDetailRow,
    ]
  );

  const confirmDelete = useCallback(() => {
    if (!hasRecord) return;
    if (window.confirm("Delete this pharmacy transfer?")) {
      void handleDelete();
    }
  }, [handleDelete, hasRecord]);

  const runDocumentSearch = useCallback(async () => {
    if (searchStartDate && searchEndDate && searchStartDate > searchEndDate) {
      toast.error("Start date cannot be greater than end date.");
      return;
    }

    setSearchLoading(true);
    try {
      const rows = await runSearch({
        itemCode: searchItemCode.trim() || undefined,
        startDate: searchStartDate.trim() || undefined,
        endDate: searchEndDate.trim() || undefined,
      });
      setSearchResults(rows);
    } catch (error) {
      setSearchResults([]);
      toast.error(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setSearchLoading(false);
    }
  }, [runSearch, searchEndDate, searchItemCode, searchStartDate]);

  const clearDocumentSearchFilters = useCallback(() => {
    setSearchItemCode("");
    setSearchStartDate("");
    setSearchEndDate("");
    setSearchResults([]);
  }, []);

  return (
    <PageGuard permission={PERMISSIONS.sales.view}>
      <div className="space-y-3 lg:flex lg:min-h-[calc(100vh-6rem)] lg:flex-col">
        <Toolbar
          mode={mode}
          saving={saving}
          posting={false}
          loading={loading}
          hasRecord={hasRecord}
          isPosted={!isEditable && hasRecord}
          isPostButtonVisible={false}
          isTransferButtonVisible={false}
          isBarcodeButtonVisible={false}
          nav={navState}
          onNew={handleNew}
          onSave={() => void handleSaveWithValidation()}
          onPost={() => undefined}
          onTransfer={() => undefined}
          onPrintBarcode={() => undefined}
          onEdit={handleEdit}
          onDelete={confirmDelete}
          onPrint={() => window.print()}
          onRefresh={() => {
            void loadContext();
            void handleRefresh();
          }}
          onFirst={() => void navigate("first")}
          onPrev={() => void navigate("prev")}
          onNext={() => void navigate("next")}
          onLast={() => void navigate("last")}
          onSearch={() => setSearchOpen(true)}
          onCreateExcelTemplate={() => undefined}
          excelImportHref="#"
        />

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">Pharmacy Transfer</h1>
                <p className="text-muted-foreground text-sm">
                  Serial:{" "}
                  {header.seial ?? header.id
                    ? String(header.seial ?? header.id)
                    : "Assigned after save"}
                  {header.movId ? ` · Store serial: ${header.movId}` : ""}
                </p>
              </div>
            </div>

            {contextLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FormFieldInlineWrap id="current-pharmacy" label="Current Pharmacy">
                  <Input
                    readOnly
                    disabled
                    value={
                      context?.currentPharmacyName ??
                      context?.currentStoreName ??
                      (context?.currentStoreId ? String(context.currentStoreId) : "")
                    }
                    className="bg-muted/50"
                  />
                </FormFieldInlineWrap>

                <FormFieldInlineWrap id="destination-pharmacy" label="Destination Pharmacy">
                  <SearchableCombobox
                    disabled={!isEditable || !sessionReady}
                    options={destinationOptions}
                    value={header.movDis > 0 ? String(header.movDis) : ""}
                    onValueChange={(value) => {
                      const movDis = Number(value);
                      updateHeader({ movDis: Number.isFinite(movDis) ? movDis : 0 });
                    }}
                    placeholder="Select destination pharmacy"
                  />
                </FormFieldInlineWrap>

                <FormFieldInlineWrap id="transfer-date" label="Transfer Date">
                  <Input
                    type="date"
                    readOnly
                    disabled
                    value={header.traDate ?? ""}
                    className="bg-muted/50"
                  />
                </FormFieldInlineWrap>

                <FormFieldInlineWrap id="transfer-serial" label="Serial">
                  <Input
                    readOnly
                    disabled
                    value={
                      header.seial ?? header.id
                        ? String(header.seial ?? header.id)
                        : ""
                    }
                    placeholder="Assigned after save"
                    className="bg-muted/50"
                  />
                </FormFieldInlineWrap>

                <FormFieldInlineWrap id="note" label="Note" className="md:col-span-2 xl:col-span-3">
                  <Input
                    disabled={!isEditable}
                    value={header.note ?? ""}
                    onChange={(event) => updateHeader({ note: event.target.value })}
                  />
                </FormFieldInlineWrap>
              </div>

              <PharmTransferEmployeeTotalsTable
                deliveryEmployeeCode={header.deliveryEmployeeCode}
                deliveryEmployeeName={header.deliveryEmployeeName ?? ""}
                receivingEmployeePassword={header.receivingEmployeePassword ?? ""}
                receivingEmployeeCode={header.receivingEmployeeCode}
                receivingEmployeeName={header.receivingEmployeeName ?? ""}
                employeeIdentified={employeeIdentified}
                totalQuantity={totals.traTotalq}
                totalAmount={totals.traTotals}
                totalCost={totals.traTotalCost}
                disabled={!isEditable}
                onDeliveryCodeChange={(value) =>
                  updateHeader({
                    deliveryEmployeeCode: value,
                    deliveryEmployeeName: "",
                  })
                }
                onDeliveryCodeBlur={(value) => void lookupDeliveryEmployee(value)}
                onReceivingPasswordChange={(value) =>
                  updateHeader({
                    receivingEmployeePassword: value,
                    receivingEmployeeCode: "",
                    receivingEmployeeName: "",
                  })
                }
                onReceivingPasswordBlur={(value) =>
                  void lookupReceivingEmployeeByPassword(value)
                }
              />

              <FormFieldInlineWrap
                id="pharm-transfer-item-search"
                label="Search Item"
                className="sm:grid-cols-[4.75rem_minmax(0,1fr)] w-full"
                labelClassName="text-neutral-950 shrink-0 text-sm font-semibold sm:text-end"
              >
                <div className="space-y-2">
                  <ReturnItemStockSearchBox
                    token={token}
                    storeId={storeIdForSearch}
                    itemLanguage={itemLanguage}
                    preferAvailableQty
                    disabled={!sessionReady || loading || !isEditable || !storeIdForSearch}
                    onItemSelected={(item) => void handleStockItemSelected(item)}
                  />
                  <ItemLanguageToggle
                    value={itemLanguage}
                    onChange={setItemLanguage}
                    disabled={loading}
                  />
                </div>
              </FormFieldInlineWrap>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col">
          <CardContent className="min-h-0 flex-1 pt-6">
            <PharmTransferDetailsGrid
              rows={details}
              itemByCode={itemByCode}
              units={units}
              unitsLoading={unitsLoading}
              token={token}
              disabled={!isEditable || loading || !sessionReady}
              selectedRowIndex={selectedRowIndex}
              onSelectRow={setSelectedRowIndex}
              onChangeRow={updateDetailRow}
              onAddRow={addDetailRow}
              onRemoveRow={removeDetailRow}
              itemLanguage={itemLanguage}
            />
          </CardContent>
        </Card>

        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Search Pharmacy Transfers</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Item code"
                value={searchItemCode}
                onChange={(event) => setSearchItemCode(event.target.value)}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs font-medium">Start Date</p>
                  <Input
                    type="date"
                    value={searchStartDate}
                    onChange={(event) => setSearchStartDate(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs font-medium">End Date</p>
                  <Input
                    type="date"
                    value={searchEndDate}
                    onChange={(event) => setSearchEndDate(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => void runDocumentSearch()}
                  disabled={searchLoading}
                >
                  Search
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearDocumentSearchFilters}
                  disabled={searchLoading}
                >
                  Clear
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSearchOpen(false);
                      void loadRecord(row.id);
                    }}
                  >
                    <TableCell>{row.movId}</TableCell>
                    <TableCell>{row.traDate ?? "—"}</TableCell>
                    <TableCell>{row.destinationPharmacyName ?? row.movDis}</TableCell>
                    <TableCell>{row.statusText ?? "—"}</TableCell>
                    <TableCell>{row.traTotalq ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {!searchLoading && searchResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground text-center">
                      No transfers found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            <DialogFooter />
          </DialogContent>
        </Dialog>
      </div>
    </PageGuard>
  );
}
