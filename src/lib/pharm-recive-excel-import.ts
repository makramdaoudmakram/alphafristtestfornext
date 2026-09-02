import { catalogDefaultPrices } from "@/lib/item-catalog-search";
import { applyPharmReciveDetailPatch } from "@/lib/pharm-recive-calculations";
import { createEmptyDetailRow } from "@/lib/pharm-recive.mapper";
import { parsePharmReciveExcelPreview } from "@/lib/pharm-recive-excel-parse";
import {
  flattenPharmReciveExcelValidationErrors,
  formatPharmReciveExcelFieldError,
  validatePharmReciveExcelPreview,
} from "@/lib/pharm-recive-excel-validate";
import {
  ensureCatalogItemsForItmCodes,
  findCatalogItemByCode,
  getItemDefaultUnitId,
} from "@/lib/item-unit-options";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PharmReciveDetail } from "@/types/pharm-recive";
import type {
  PharmReciveExcelPreviewRowValidated,
  PharmReciveExcelPreviewValidated,
} from "@/types/pharm-recive-excel";

export type PharmReciveExcelImportProgress = {
  percent: number;
  label: string;
};

function parseRequiredNumber(raw: string): number {
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function enrichPreviewRows(
  preview: PharmReciveExcelPreviewValidated,
  itemByCode: Map<string, ItemCatalogItem>
): PharmReciveExcelPreviewValidated {
  return {
    ...preview,
    rows: preview.rows.map((row) => {
      const code = row.itmId?.trim();
      const item = code ? findCatalogItemByCode(code, itemByCode) : null;
      return {
        ...row,
        itmNameAr: row.itmNameAr?.trim() || item?.itmNameAr?.trim() || "",
        itmNameEn: row.itmNameEn?.trim() || item?.itmNameEn?.trim() || "",
      };
    }),
  };
}

export function mapPharmReciveExcelRowToDetail(
  row: PharmReciveExcelPreviewRowValidated,
  itemByCode: Map<string, ItemCatalogItem>
): PharmReciveDetail {
  const code = row.itmId.trim();
  const item = findCatalogItemByCode(code, itemByCode);
  const qty = parseRequiredNumber(row.qnty);
  const { itmPurPrice, itmSell } = item
    ? catalogDefaultPrices(item)
    : { itmPurPrice: 0, itmSell: 0 };
  const salesPrice =
    row.salesPrice != null && Number.isFinite(row.salesPrice)
      ? row.salesPrice
      : itmSell;
  const purchasePrice =
    row.purshPrice != null && Number.isFinite(row.purshPrice)
      ? row.purshPrice
      : itmPurPrice;
  const costPrice =
    row.costPrice != null && Number.isFinite(row.costPrice)
      ? row.costPrice
      : purchasePrice;

  const base = createEmptyDetailRow();
  return applyPharmReciveDetailPatch(base, {
    itmId: code,
    itmNameAr: row.itmNameAr?.trim() || item?.itmNameAr?.trim() || "",
    itmNameEn: row.itmNameEn?.trim() || item?.itmNameEn?.trim() || "",
    qnty: qty,
    maxSearchQty: qty,
    itmStock: qty,
    itmPurPrice: purchasePrice,
    itmSellPrice: salesPrice,
    itemCostPrice: costPrice,
    unitId: row.unitId ?? (item ? getItemDefaultUnitId(item) : null),
    batchNo: row.batchNo?.trim() ?? "",
    expDate: row.expDate?.trim() ?? "",
  });
}

export function mapPharmReciveExcelPreviewToDetails(
  preview: PharmReciveExcelPreviewValidated,
  itemByCode: Map<string, ItemCatalogItem>
): PharmReciveDetail[] {
  return preview.rows
    .filter((row) => row.isValid)
    .map((row) => mapPharmReciveExcelRowToDetail(row, itemByCode));
}

export type PharmReciveExcelImportResult = {
  details: PharmReciveDetail[];
  itemByCode: Map<string, ItemCatalogItem>;
  preview: PharmReciveExcelPreviewValidated;
  validCount: number;
  invalidCount: number;
  errorMessages: string[];
};

export async function importPharmReciveExcelFile(
  file: File,
  token: string,
  onProgress?: (progress: PharmReciveExcelImportProgress) => void
): Promise<PharmReciveExcelImportResult> {
  onProgress?.({ percent: 4, label: "Starting…" });

  const buffer = await file.arrayBuffer();
  onProgress?.({ percent: 20, label: "Reading Excel…" });

  const parsed = parsePharmReciveExcelPreview(buffer, file.name || "upload.xlsx");
  onProgress?.({ percent: 35, label: "Loading item catalog…" });

  const itemByCode = await ensureCatalogItemsForItmCodes(
    parsed.rows.map((row) => ({ itmId: row.itmId })),
    new Map<string, ItemCatalogItem>(),
    undefined,
    token,
    (done, total) => {
      const fraction = total <= 0 ? 1 : done / total;
      onProgress?.({
        percent: Math.round(35 + fraction * 30),
        label:
          total <= 0
            ? "Loading item catalog…"
            : `Loading items… ${done} of ${total}`,
      });
    }
  );

  onProgress?.({ percent: 68, label: "Validating rows…" });
  let validated = validatePharmReciveExcelPreview(parsed, itemByCode);
  validated = enrichPreviewRows(validated, itemByCode);

  const totalRows = validated.rows.length;
  for (let index = 0; index < totalRows; index += 1) {
    if (totalRows > 0 && (index === totalRows - 1 || index % 20 === 0)) {
      onProgress?.({
        percent: Math.round(68 + ((index + 1) / totalRows) * 22),
        label: `Validating rows… ${index + 1} of ${totalRows}`,
      });
      await new Promise((resolve) =>
        requestAnimationFrame(() => resolve(undefined))
      );
    }
  }

  const details = mapPharmReciveExcelPreviewToDetails(validated, itemByCode);
  const invalidCount = validated.rows.filter((row) => !row.isValid).length;
  const errorMessages = flattenPharmReciveExcelValidationErrors(validated)
    .slice(0, 8)
    .map(({ row, error }) => formatPharmReciveExcelFieldError(row, error));

  onProgress?.({
    percent: 100,
    label:
      totalRows <= 0 ? "Done" : `Loading ${details.length} / ${totalRows}`,
  });

  return {
    details,
    itemByCode,
    preview: validated,
    validCount: details.length,
    invalidCount,
    errorMessages,
  };
}
