import { getItemCatalogByCodes } from "@/lib/api-client";
import {
  allocatePharmReciveReceivingQuantityFromPool,
  clonePharmReciveStockBatches,
  fetchPharmReciveStockBatchesForItem,
  type PharmReciveStockBatch,
} from "@/lib/pharm-recive-stock-allocation";
import {
  excludePharmReciveCurrentMonthBatches,
  pharmReciveItemHasExpiry,
  validatePharmReciveExcelHasExpiryUsableStock,
} from "@/lib/pharm-recive-excel-expiry";
import { findCatalogItemByCode, indexCatalogItem } from "@/lib/item-unit-options";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type {
  PharmReciveExcelPreviewRowValidated,
  PharmReciveExcelPreviewValidated,
  PharmReciveExcelProcessSummaryEntry,
} from "@/types/pharm-recive-excel";

export type PharmReciveExcelCompleteTaskProgress = {
  percent: number;
  label: string;
};

export type PharmReciveExcelCompleteTaskResult = {
  preview: PharmReciveExcelPreviewValidated;
  summary: {
    success: PharmReciveExcelProcessSummaryEntry[];
    errors: PharmReciveExcelProcessSummaryEntry[];
  };
};

function parseExcelQuantity(raw: string): number {
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatRowErrorMessage(row: PharmReciveExcelPreviewRowValidated): string {
  if (row.errors.length === 0) return "Validation failed.";
  return row.errors.map((error) => error.message).join("; ");
}

function resolveErrorItemNames(
  code: string,
  itemByCode: Map<string, ItemCatalogItem>,
  row?: Pick<PharmReciveExcelPreviewRowValidated, "itmNameAr" | "itmNameEn">
): { itmNameAr: string; itmNameEn: string } {
  const item = findCatalogItemByCode(code, itemByCode);
  const ar =
    item?.itmNameAr?.trim() ||
    row?.itmNameAr?.trim() ||
    "—";
  const en =
    item?.itmNameEn?.trim() ||
    row?.itmNameEn?.trim() ||
    "—";
  return { itmNameAr: ar, itmNameEn: en };
}

async function refreshPharmReciveExcelItemCatalog(
  preview: PharmReciveExcelPreviewValidated,
  itemByCode: Map<string, ItemCatalogItem>,
  token: string
): Promise<void> {
  const codes = [
    ...new Set(
      preview.rows
        .map((row) => row.itmId.trim())
        .filter((code) => code.length > 0)
    ),
  ];
  if (codes.length === 0) return;

  const items = await getItemCatalogByCodes(token, codes);
  for (const item of items) {
    indexCatalogItem(itemByCode, item);
  }
}

function buildErrorSummaryEntry(
  code: string,
  excelQuantity: number,
  message: string,
  itemByCode: Map<string, ItemCatalogItem>,
  row?: PharmReciveExcelPreviewRowValidated
): PharmReciveExcelProcessSummaryEntry {
  const names = resolveErrorItemNames(code, itemByCode, row);
  return {
    code,
    excelQuantity,
    result: message,
    success: false,
    itmNameAr: names.itmNameAr,
    itmNameEn: names.itmNameEn,
    sourceExcelRowNumber: row?.excelRowNumber ?? row?.sourceExcelRowNumber,
  };
}

export async function completePharmReciveExcelTask(
  preview: PharmReciveExcelPreviewValidated,
  itemByCode: Map<string, ItemCatalogItem>,
  movStor: string,
  token: string,
  onProgress?: (progress: PharmReciveExcelCompleteTaskProgress) => void
): Promise<PharmReciveExcelCompleteTaskResult> {
  const storeId = movStor.trim();
  if (!storeId) {
    throw new Error(
      "Store could not be determined from the selected movement."
    );
  }

  await refreshPharmReciveExcelItemCatalog(preview, itemByCode, token);

  const sourceRows = preview.rows.filter((row) => row.isValid);
  const invalidOriginalRows = preview.rows.filter((row) => !row.isValid);
  const total = sourceRows.length;
  const stockPool = new Map<string, PharmReciveStockBatch[]>();
  const summarySuccess: PharmReciveExcelProcessSummaryEntry[] = [];
  const summaryErrors: PharmReciveExcelProcessSummaryEntry[] = [];
  const successfulRows: PharmReciveExcelPreviewRowValidated[] = [];

  for (const row of invalidOriginalRows) {
    const code = row.itmId.trim() || "—";
    summaryErrors.push(
      buildErrorSummaryEntry(
        code,
        parseExcelQuantity(row.qnty),
        formatRowErrorMessage(row),
        itemByCode,
        row
      )
    );
  }

  for (let index = 0; index < sourceRows.length; index += 1) {
    const row = sourceRows[index]!;
    const code = row.itmId.trim();
    const excelQty = parseExcelQuantity(row.qnty);
    const item = findCatalogItemByCode(code, itemByCode);

    onProgress?.({
      percent: total <= 0 ? 100 : Math.round(((index + 1) / total) * 100),
      label:
        total <= 0
          ? "Completed"
          : `Processing item ${index + 1} / ${total}`,
    });

    if (!item) {
      summaryErrors.push(
        buildErrorSummaryEntry(
          code,
          excelQty,
          "Item code does not exist.",
          itemByCode,
          row
        )
      );
      await yieldToUi();
      continue;
    }

    if (!stockPool.has(code)) {
      stockPool.set(
        code,
        clonePharmReciveStockBatches(
          await fetchPharmReciveStockBatchesForItem(token, code, storeId)
        )
      );
    }
    const batches = stockPool.get(code)!;

    if (pharmReciveItemHasExpiry(item)) {
      const expiryCheck = await validatePharmReciveExcelHasExpiryUsableStock({
        token,
        item,
        itemCode: code,
        requestedQty: excelQty,
        batches,
      });
      if (!expiryCheck.ok) {
        summaryErrors.push(
          buildErrorSummaryEntry(
            code,
            excelQty,
            expiryCheck.message,
            itemByCode,
            row
          )
        );
        await yieldToUi();
        continue;
      }
      excludePharmReciveCurrentMonthBatches(batches);
    }

    const allocation = await allocatePharmReciveReceivingQuantityFromPool({
      token,
      item,
      itemCode: code,
      requestedQty: excelQty,
      batches,
    });

    if (!allocation.ok) {
      summaryErrors.push(
        buildErrorSummaryEntry(
          code,
          excelQty,
          allocation.message,
          itemByCode,
          row
        )
      );
      await yieldToUi();
      continue;
    }

    summarySuccess.push({
      code,
      excelQuantity: excelQty,
      result: "OK",
      success: true,
    });

    for (const line of allocation.lines) {
      successfulRows.push({
        excelRowNumber: 0,
        sourceExcelRowNumber: row.excelRowNumber,
        itmId: code,
        itmNameAr: row.itmNameAr?.trim() || item.itmNameAr?.trim() || "",
        itmNameEn: row.itmNameEn?.trim() || item.itmNameEn?.trim() || "",
        qnty: String(line.receivingQty),
        expDate: line.expDate,
        batchNo: line.batchNo,
        salesPrice: line.salesPrice,
        purshPrice: line.purshPrice,
        costPrice: line.costPrice,
        unitId: allocation.unitId,
        isValid: true,
        isAllocatedRow: true,
        errors: [],
      });
    }

    await yieldToUi();
  }

  const renumberedRows = successfulRows.map((row, index) => ({
    ...row,
    excelRowNumber: index + 1,
  }));

  onProgress?.({ percent: 100, label: "Completed" });

  const nextPreview: PharmReciveExcelPreviewValidated = {
    ...preview,
    rows: renumberedRows,
    rowCount: renumberedRows.length,
    isValid: renumberedRows.length > 0 && renumberedRows.every((row) => row.isValid),
    processComplete: true,
  };

  return {
    preview: nextPreview,
    summary: {
      success: summarySuccess,
      errors: summaryErrors,
    },
  };
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
