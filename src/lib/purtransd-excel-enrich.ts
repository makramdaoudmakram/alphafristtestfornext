import { getUnitConversionInfo } from "@/lib/api-client";
import { catalogDefaultPrices } from "@/lib/item-catalog-search";
import {
  ensureCatalogItemsForItmCodes,
  findCatalogItemByCode,
  getItemDefaultUnitId,
} from "@/lib/item-unit-options";
import { applyPriceQtyNetToBasePrices } from "@/lib/purchase-unit-conversion";
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

function excelConversionQuantity(row: PurTransDExcelPreviewRow): number {
  return (Number(row.qnty) || 0) + (Number(row.bonus) || 0);
}

function formatPreviewNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Number(value.toFixed(4));
  return String(rounded);
}

function enrichCatalogFields(
  row: PurTransDExcelPreviewRow,
  itemByCode: Map<string, ItemCatalogItem>
): PurTransDExcelPreviewRow {
  const code = row.itmId?.trim();
  if (!code) return row;

  const item = findCatalogItemByCode(code, itemByCode);
  if (!item) return row;

  const defaultUnitId = getItemDefaultUnitId(item);

  return {
    ...row,
    itmNameAr: item.itmNameAr?.trim() || row.itmNameAr,
    itmNameEn: item.itmNameEn?.trim() || row.itmNameEn,
    unitId:
      isUnitEmpty(row.unitId) && defaultUnitId != null
        ? String(defaultUnitId)
        : row.unitId,
  };
}

async function enrichPricesAndUnitConversion(
  row: PurTransDExcelPreviewRow,
  itemByCode: Map<string, ItemCatalogItem>,
  token: string
): Promise<PurTransDExcelPreviewRow> {
  const enriched = enrichCatalogFields(row, itemByCode);

  const code = enriched.itmId?.trim();
  if (!code) return enriched;

  const item = findCatalogItemByCode(code, itemByCode);
  if (!item) return enriched;

  const unitId = Number(enriched.unitId);
  if (!Number.isFinite(unitId) || unitId <= 0) return enriched;

  const fillPurFromCatalog = isPriceEmpty(enriched.itmPurPrice);
  const fillSellFromCatalog = isPriceEmpty(enriched.itmSell);
  if (!fillPurFromCatalog && !fillSellFromCatalog) return enriched;

  const { itmPurPrice: catalogPur, itmSell: catalogSell } =
    catalogDefaultPrices(item);

  let priceQtyNet: number | null = 1;
  try {
    const info = await getUnitConversionInfo(
      token,
      code,
      unitId,
      excelConversionQuantity(enriched)
    );
    if (!info.errorMessage) {
      priceQtyNet = info.priceQtyNet;
    }
  } catch {
    priceQtyNet = 1;
  }

  const converted = applyPriceQtyNetToBasePrices(
    catalogPur,
    catalogSell,
    priceQtyNet
  );

  return {
    ...enriched,
    itmPurPrice: fillPurFromCatalog
      ? formatPreviewNumber(converted.itmPurPrice)
      : enriched.itmPurPrice,
    itmSell: fillSellFromCatalog
      ? formatPreviewNumber(converted.itmSell)
      : enriched.itmSell,
  };
}

/**
 * Phase 4: ItemCatalog names + default Unit (Itm_Unit1).
 * Phase 5: catalog prices when empty/zero + GetUnitConversionInfo PriceQtyNet.
 */
export async function enrichPurTransDExcelPreview(
  preview: PurTransDExcelPreview,
  token: string
): Promise<{
  preview: PurTransDExcelPreview;
  itemByCode: Map<string, ItemCatalogItem>;
}> {
  const itemByCode = await ensureCatalogItemsForItmCodes(
    preview.rows.map((row) => ({ itmId: row.itmId })),
    new Map<string, ItemCatalogItem>(),
    undefined,
    token
  );

  const rows = await Promise.all(
    preview.rows.map((row) =>
      enrichPricesAndUnitConversion(row, itemByCode, token)
    )
  );

  return {
    preview: {
      ...preview,
      rows,
    },
    itemByCode,
  };
}
