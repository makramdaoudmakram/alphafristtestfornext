import { catalogDefaultPrices } from "@/lib/item-catalog-search";
import {
  ensureCatalogItemsForItmCodes,
  findCatalogItemByCode,
  getItemDefaultUnitId,
} from "@/lib/item-unit-options";
import {
  applyPriceQtyNetToBasePrices,
  priceQtyNetFromCatalogItem,
} from "@/lib/purchase-unit-conversion";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type {
  PurTransDExcelPreview,
  PurTransDExcelPreviewRow,
} from "@/types/purchase";

function isUnitEmpty(unitId: string | null | undefined): boolean {
  const trimmed = unitId?.trim();
  if (!trimmed) return true;
  const parsed = Number(trimmed);
  return !Number.isFinite(parsed) || parsed <= 0;
}

function isPriceEmpty(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return true;
  const parsed = Number(trimmed);
  return !Number.isFinite(parsed) || parsed === 0;
}

function formatPreviewNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Number(value.toFixed(4));
  return String(rounded);
}

function enrichPreviewRow(
  row: PurTransDExcelPreviewRow,
  itemByCode: Map<string, ItemCatalogItem>
): PurTransDExcelPreviewRow {
  const code = row.itmId?.trim();
  if (!code) return row;

  const item = findCatalogItemByCode(code, itemByCode);
  if (!item) return row;

  const defaultUnitId = getItemDefaultUnitId(item);
  const unitId =
    isUnitEmpty(row.unitId) && defaultUnitId != null
      ? String(defaultUnitId)
      : row.unitId;

  const fillPurFromCatalog = isPriceEmpty(row.itmPurPrice);
  const fillSellFromCatalog = isPriceEmpty(row.itmSell);

  const next: PurTransDExcelPreviewRow = {
    ...row,
    itmNameAr: item.itmNameAr?.trim() || row.itmNameAr,
    itmNameEn: item.itmNameEn?.trim() || row.itmNameEn,
    unitId,
  };

  if (!fillPurFromCatalog && !fillSellFromCatalog) return next;

  const parsedUnitId = Number(unitId);
  if (!Number.isFinite(parsedUnitId) || parsedUnitId <= 0) return next;

  const { itmPurPrice: catalogPur, itmSell: catalogSell } =
    catalogDefaultPrices(item);
  const converted = applyPriceQtyNetToBasePrices(
    catalogPur,
    catalogSell,
    priceQtyNetFromCatalogItem(item, parsedUnitId)
  );

  return {
    ...next,
    itmPurPrice: fillPurFromCatalog
      ? formatPreviewNumber(converted.itmPurPrice)
      : next.itmPurPrice,
    itmSell: fillSellFromCatalog
      ? formatPreviewNumber(converted.itmSell)
      : next.itmSell,
  };
}

/**
 * Phase 4: ItemCatalog names + default Unit (Itm_Unit1).
 * Phase 5: catalog prices when empty/zero + PriceQtyNet from catalog unit factors.
 */
export async function enrichPurTransDExcelPreview(
  preview: PurTransDExcelPreview,
  token: string,
  options?: {
    onProgress?: (
      done: number,
      total: number,
      phase: "catalog" | "rows"
    ) => void;
  }
): Promise<{
  preview: PurTransDExcelPreview;
  itemByCode: Map<string, ItemCatalogItem>;
}> {
  const itemByCode = await ensureCatalogItemsForItmCodes(
    preview.rows.map((row) => ({ itmId: row.itmId })),
    new Map<string, ItemCatalogItem>(),
    undefined,
    token,
    (done, total) => options?.onProgress?.(done, total, "catalog")
  );

  const total = preview.rows.length;
  const rows: PurTransDExcelPreviewRow[] = [];
  const chunkSize = 250;
  options?.onProgress?.(0, total, "rows");

  for (let index = 0; index < total; index += chunkSize) {
    const end = Math.min(index + chunkSize, total);
    for (let rowIndex = index; rowIndex < end; rowIndex += 1) {
      const row = preview.rows[rowIndex];
      if (!row) continue;
      rows.push(enrichPreviewRow(row, itemByCode));
    }
    options?.onProgress?.(end, total, "rows");
    if (end < total) {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    }
  }

  return {
    preview: {
      ...preview,
      rows,
    },
    itemByCode,
  };
}
