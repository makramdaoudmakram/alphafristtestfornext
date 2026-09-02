import { getUnitConversionInfo } from "@/lib/api-client";

/**
 * Convert base stock quantity (Stock.Qty / Unit3) to the selected catalog unit
 * using the same UnitConversion service as Purchase/Return/Stock.
 */
export async function convertBaseStockQtyToUnit(
  token: string,
  itemCode: string,
  unitId: number,
  baseQty: number
): Promise<{ qty: number; error?: string }> {
  const code = itemCode.trim();
  if (!code) return { qty: 0, error: "Item code is required." };
  if (unitId <= 0) return { qty: 0, error: "Unit is required." };
  if (!Number.isFinite(baseQty) || baseQty < 0) return { qty: 0 };

  const info = await getUnitConversionInfo(token, code, unitId, 1);
  if (info.errorMessage?.trim()) {
    return { qty: 0, error: info.errorMessage.trim() };
  }

  const factor =
    info.conversionValue != null &&
    Number.isFinite(info.conversionValue) &&
    info.conversionValue > 0
      ? info.conversionValue
      : info.quantityNet != null &&
          Number.isFinite(info.quantityNet) &&
          info.quantityNet > 0
        ? info.quantityNet
        : 0;

  if (factor <= 0) {
    return { qty: 0, error: `Could not resolve unit conversion for item '${code}'.` };
  }

  return { qty: baseQty / factor };
}
