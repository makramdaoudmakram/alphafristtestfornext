import { getUnitConversionInfo, searchStockBatches } from "@/lib/api-client";
import { applyPharmReciveDetailPatch } from "@/lib/pharm-recive-calculations";
import { createEmptyDetailRow } from "@/lib/pharm-recive.mapper";
import { formatReturnItemStockSearchExpDate } from "@/lib/return-item-stock-search";
import {
  findCatalogItemByCode,
  getItemDefaultUnitId,
} from "@/lib/item-unit-options";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PharmReciveDetail } from "@/types/pharm-recive";
import type { StockBatchItem } from "@/types/stock";

export type PharmReciveStockBatch = {
  batchNo: string;
  expDate: string | null;
  qtyBase: number;
  salesPrice: number;
  purshPrice: number;
  costPrice: number;
};

export type PharmReciveAllocationLine = {
  receivingQty: number;
  expDate: string;
  batchNo: string;
  salesPrice: number;
  purshPrice: number;
  costPrice: number;
  stockUsedBase: number;
};

export type PharmReciveAllocationResult =
  | {
      ok: true;
      lines: PharmReciveAllocationLine[];
      unitId: number;
      conversionValue: number;
    }
  | { ok: false; message: string };

function compareExpDateAsc(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  if (!a?.trim() && !b?.trim()) return 0;
  if (!a?.trim()) return 1;
  if (!b?.trim()) return -1;
  return a.localeCompare(b);
}

function batchGroupKey(
  batch: Pick<StockBatchItem, "batchNo" | "expDate" | "salesPrice">
): string {
  return `${batch.batchNo}|${batch.expDate ?? ""}|${batch.salesPrice}`;
}

export function groupPharmReciveStockBatches(
  items: StockBatchItem[]
): PharmReciveStockBatch[] {
  const grouped = new Map<string, PharmReciveStockBatch>();

  for (const item of items) {
    if (!Number.isFinite(item.qty) || item.qty <= 0) continue;
    const key = batchGroupKey(item);
    const existing = grouped.get(key);
    if (existing) {
      existing.qtyBase += item.qty;
      continue;
    }
    grouped.set(key, {
      batchNo: item.batchNo?.trim() ?? "",
      expDate: item.expDate,
      qtyBase: item.qty,
      salesPrice: item.salesPrice,
      purshPrice: item.purshPrice,
      costPrice: item.costPrice,
    });
  }

  return [...grouped.values()].sort((left, right) => {
    const byExp = compareExpDateAsc(left.expDate, right.expDate);
    if (byExp !== 0) return byExp;
    return left.batchNo.localeCompare(right.batchNo);
  });
}

export async function fetchPharmReciveStockBatchesForItem(
  token: string,
  itemCode: string,
  storeId: string
): Promise<PharmReciveStockBatch[]> {
  const collected: StockBatchItem[] = [];
  let pageNumber = 1;
  const pageSize = 500;

  while (true) {
    const page = await searchStockBatches(token, {
      itemCode,
      storeId,
      pageNumber,
      pageSize,
    });
    collected.push(...page.items);
    if (collected.length >= page.totalCount || page.items.length === 0) break;
    pageNumber += 1;
  }

  return groupPharmReciveStockBatches(collected);
}

export function clonePharmReciveStockBatches(
  batches: PharmReciveStockBatch[]
): PharmReciveStockBatch[] {
  return batches.map((batch) => ({ ...batch }));
}

function sumBatchBaseQty(batches: ReadonlyArray<PharmReciveStockBatch>): number {
  let total = 0;
  for (const batch of batches) {
    if (Number.isFinite(batch.qtyBase) && batch.qtyBase > 0) total += batch.qtyBase;
  }
  return total;
}

function formatExpDateForDetail(value: string | null): string {
  return formatReturnItemStockSearchExpDate(value) || "";
}

function batchMatchKey(batchNo: string, expDate: string): string {
  return `${batchNo.trim()}|${expDate.trim()}`;
}

function nearlyEqual(left: number, right: number, epsilon = 0.0001): boolean {
  return Math.abs(left - right) <= epsilon;
}

export function subtractCommittedPharmReciveStock(
  batches: PharmReciveStockBatch[],
  committedRows: ReadonlyArray<Pick<PharmReciveDetail, "batchNo" | "expDate" | "qnty">>,
  conversionValue: number
): void {
  if (conversionValue <= 0) return;

  for (const row of committedRows) {
    if (!row.batchNo?.trim() || row.qnty <= 0) continue;
    const key = batchMatchKey(row.batchNo, row.expDate ?? "");
    const batch = batches.find(
      (entry) => batchMatchKey(entry.batchNo, formatExpDateForDetail(entry.expDate)) === key
    );
    if (!batch) continue;
    batch.qtyBase = Math.max(0, batch.qtyBase - row.qnty * conversionValue);
  }
}

export function allocatePharmReciveFifoReceivingQuantity(
  requestedQty: number,
  conversionValue: number,
  batches: PharmReciveStockBatch[]
): PharmReciveAllocationLine[] {
  if (requestedQty <= 0 || conversionValue <= 0) return [];

  let remainingReceiving = requestedQty;
  const allocations: PharmReciveAllocationLine[] = [];

  for (const batch of batches) {
    if (remainingReceiving <= 0) break;
    if (!Number.isFinite(batch.qtyBase) || batch.qtyBase <= 0) continue;

    const receivingCapacity = batch.qtyBase / conversionValue;
    if (receivingCapacity <= 0) continue;

    const takeReceiving = Math.min(remainingReceiving, receivingCapacity);
    const stockUsedBase = takeReceiving * conversionValue;

    batch.qtyBase = Math.max(0, batch.qtyBase - stockUsedBase);
    remainingReceiving -= takeReceiving;

    allocations.push({
      receivingQty: takeReceiving,
      expDate: formatExpDateForDetail(batch.expDate),
      batchNo: batch.batchNo,
      salesPrice: batch.salesPrice,
      purshPrice: batch.purshPrice,
      costPrice: batch.costPrice,
      stockUsedBase,
    });
  }

  return allocations;
}

export async function resolvePharmReciveItemConversion(
  token: string,
  item: ItemCatalogItem,
  itemCode: string,
  quantity: number,
  unitId?: number | null
): Promise<{ unitId: number; conversionValue: number } | { error: string }> {
  const resolvedUnitId = unitId ?? getItemDefaultUnitId(item);
  if (resolvedUnitId == null || resolvedUnitId <= 0) {
    return { error: `Item '${itemCode}' has no receiving unit configured.` };
  }

  const info = await getUnitConversionInfo(token, itemCode, resolvedUnitId, quantity);
  if (info.errorMessage?.trim()) {
    return { error: info.errorMessage.trim() };
  }

  const conversionValue =
    info.conversionValue != null &&
    Number.isFinite(info.conversionValue) &&
    info.conversionValue > 0
      ? info.conversionValue
      : quantity > 0 &&
          info.quantityNet != null &&
          Number.isFinite(info.quantityNet) &&
          info.quantityNet > 0
        ? info.quantityNet / quantity
        : 0;

  if (conversionValue <= 0) {
    return { error: `Could not resolve unit conversion for item '${itemCode}'.` };
  }

  return { unitId: resolvedUnitId, conversionValue };
}

export async function allocatePharmReciveReceivingQuantity(options: {
  token: string;
  storeId: string;
  item: ItemCatalogItem;
  itemCode: string;
  requestedQty: number;
  unitId?: number | null;
  existingDetails: PharmReciveDetail[];
  excludeClientRowId?: string;
}): Promise<PharmReciveAllocationResult> {
  const storeId = options.storeId.trim();
  const itemCode = options.itemCode.trim();
  const requestedQty = options.requestedQty;

  if (!storeId) {
    return { ok: false, message: "Select a movement with a store first." };
  }
  if (!itemCode) {
    return { ok: false, message: "Item code is required." };
  }
  if (!Number.isFinite(requestedQty) || requestedQty < 1) {
    return { ok: false, message: "Quantity must be at least 1." };
  }

  const conversionResult = await resolvePharmReciveItemConversion(
    options.token,
    options.item,
    itemCode,
    requestedQty,
    options.unitId
  );
  if ("error" in conversionResult) {
    return { ok: false, message: conversionResult.error };
  }

  const { unitId, conversionValue } = conversionResult;
  const requiredBaseQty = requestedQty * conversionValue;
  const batches = clonePharmReciveStockBatches(
    await fetchPharmReciveStockBatchesForItem(options.token, itemCode, storeId)
  );

  const committedRows = options.existingDetails.filter((row) => {
    if (row.clientRowId === options.excludeClientRowId) return false;
    return row.itmId.trim().toLowerCase() === itemCode.toLowerCase() && row.batchNo.trim();
  });
  subtractCommittedPharmReciveStock(batches, committedRows, conversionValue);

  const availableBaseQty = sumBatchBaseQty(batches);
  if (availableBaseQty + 0.0001 < requiredBaseQty) {
    return { ok: false, message: "Not enough stock in the selected store." };
  }

  const lines = allocatePharmReciveFifoReceivingQuantity(
    requestedQty,
    conversionValue,
    batches
  );
  const allocatedReceiving = lines.reduce((sum, line) => sum + line.receivingQty, 0);
  const allocatedBase = lines.reduce((sum, line) => sum + line.stockUsedBase, 0);

  if (
    lines.length === 0 ||
    !nearlyEqual(allocatedReceiving, requestedQty) ||
    !nearlyEqual(allocatedBase, requiredBaseQty)
  ) {
    return { ok: false, message: "Not enough stock in the selected store." };
  }

  return { ok: true, lines, unitId, conversionValue };
}

/** Read-only FIFO allocation against a mutable in-memory batch pool (Excel Complete Task). */
export async function allocatePharmReciveReceivingQuantityFromPool(options: {
  token: string;
  item: ItemCatalogItem;
  itemCode: string;
  requestedQty: number;
  unitId?: number | null;
  batches: PharmReciveStockBatch[];
}): Promise<PharmReciveAllocationResult> {
  const itemCode = options.itemCode.trim();
  const requestedQty = options.requestedQty;

  if (!itemCode) {
    return { ok: false, message: "Item code is required." };
  }
  if (!Number.isFinite(requestedQty) || requestedQty < 1) {
    return { ok: false, message: "Quantity must be greater than zero." };
  }

  const conversionResult = await resolvePharmReciveItemConversion(
    options.token,
    options.item,
    itemCode,
    requestedQty,
    options.unitId
  );
  if ("error" in conversionResult) {
    return { ok: false, message: conversionResult.error };
  }

  const { unitId, conversionValue } = conversionResult;
  const requiredBaseQty = requestedQty * conversionValue;
  const availableBaseQty = sumBatchBaseQty(options.batches);

  if (availableBaseQty <= 0) {
    return { ok: false, message: "No stock batch is available." };
  }
  if (availableBaseQty + 0.0001 < requiredBaseQty) {
    return { ok: false, message: "Insufficient stock quantity." };
  }

  const lines = allocatePharmReciveFifoReceivingQuantity(
    requestedQty,
    conversionValue,
    options.batches
  );
  const allocatedReceiving = lines.reduce((sum, line) => sum + line.receivingQty, 0);
  const allocatedBase = lines.reduce((sum, line) => sum + line.stockUsedBase, 0);

  if (
    lines.length === 0 ||
    !nearlyEqual(allocatedReceiving, requestedQty) ||
    !nearlyEqual(allocatedBase, requiredBaseQty)
  ) {
    return {
      ok: false,
      message: "Unable to allocate quantity to available batches.",
    };
  }

  return { ok: true, lines, unitId, conversionValue };
}

export function buildPharmReciveDetailsFromAllocation(
  templateRow: PharmReciveDetail,
  lines: PharmReciveAllocationLine[],
  unitId: number
): PharmReciveDetail[] {
  return lines.map((line, index) => {
    const base = index === 0 ? templateRow : createEmptyDetailRow();
    return applyPharmReciveDetailPatch(base, {
      itmId: templateRow.itmId,
      itmNameAr: templateRow.itmNameAr,
      itmNameEn: templateRow.itmNameEn,
      qnty: line.receivingQty,
      expDate: line.expDate,
      batchNo: line.batchNo,
      itmSellPrice: line.salesPrice,
      itmPurPrice: line.purshPrice,
      itemCostPrice: line.costPrice,
      unitId,
      itmStock: line.receivingQty,
      maxSearchQty: line.receivingQty,
    });
  });
}

export function replacePharmReciveDetailRowsAtIndex(
  rows: PharmReciveDetail[],
  index: number,
  replacement: PharmReciveDetail[],
  emptyRowFactory: () => PharmReciveDetail = createEmptyDetailRow
): PharmReciveDetail[] {
  const next = [...rows.slice(0, index), ...replacement, ...rows.slice(index + 1)];
  return next.length ? next : [emptyRowFactory()];
}

export function findCatalogItemForPharmReciveRow(
  row: Pick<PharmReciveDetail, "itmId">,
  itemByCode: Map<string, ItemCatalogItem>,
  catalogItems: readonly ItemCatalogItem[]
): ItemCatalogItem | null {
  return findCatalogItemByCode(row.itmId, itemByCode, catalogItems);
}
