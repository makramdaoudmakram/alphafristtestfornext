import { getUnitConversionInfo } from "@/lib/api-client";
import {
  applyPriceQtyNetToBasePrices,
  basePricesFromDisplayed,
  resolveRowBasePrices,
} from "@/lib/purchase-unit-conversion";

type PurchaseStyleDetailRow = {
  unitId: number | null;
  qnty: number;
  bonus: number;
  itmPurPrice: number;
  itmSell: number;
  baseItmPurPrice?: number | null;
  baseItmSell?: number | null;
  priceQtyNet?: number | null;
};

export type PurchaseStyleUnitChangePatch = {
  unitId: number;
  qnty: number;
  bonus: number;
  itmPurPrice: number;
  itmSell: number;
  baseItmPurPrice: number;
  baseItmSell: number;
  priceQtyNet: number;
  skipDiscPercent?: true;
  skipTax?: boolean;
};

function stockConversionQuantity(row: PurchaseStyleDetailRow): number {
  return (Number(row.qnty) || 0) + (Number(row.bonus) || 0);
}

function roundTransactionQty(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

/**
 * Purchase / return / pharm-receive detail rows: keep base stock quantity fixed when the unit changes.
 */
export async function buildPurchaseStyleUnitChangePatch(
  token: string,
  row: PurchaseStyleDetailRow,
  itemCode: string,
  unitId: number,
  basePrices?: { baseItmPurPrice: number; baseItmSell: number },
  options?: { skipDiscPercent?: boolean; skipTax?: boolean }
): Promise<PurchaseStyleUnitChangePatch | null> {
  const code = itemCode.trim();
  if (!code || unitId <= 0) return null;

  let base = basePrices;
  const totalQty = stockConversionQuantity(row);

  if (!base && (row.baseItmPurPrice == null || row.baseItmSell == null)) {
    if (row.unitId != null && row.unitId > 0 && row.unitId !== unitId && totalQty > 0) {
      const current = await getUnitConversionInfo(token, code, row.unitId, totalQty);
      base = basePricesFromDisplayed(
        row.itmPurPrice,
        row.itmSell,
        current.priceQtyNet
      );
    }
  }
  base ??= resolveRowBasePrices(
    row as Parameters<typeof resolveRowBasePrices>[0]
  );

  let nextQnty = row.qnty;
  let nextBonus = row.bonus;

  if (
    row.unitId != null &&
    row.unitId > 0 &&
    row.unitId !== unitId &&
    totalQty > 0
  ) {
    const from = await getUnitConversionInfo(token, code, row.unitId, totalQty);
    const toOne = await getUnitConversionInfo(token, code, unitId, 1);
    if (
      !from.errorMessage &&
      from.quantityNet != null &&
      !toOne.errorMessage &&
      toOne.quantityNet != null &&
      toOne.quantityNet > 0
    ) {
      const converted = roundTransactionQty(from.quantityNet / toOne.quantityNet);
      nextQnty = converted;
      nextBonus = 0;
    }
  }

  const info = await getUnitConversionInfo(
    token,
    code,
    unitId,
    stockConversionQuantity({ ...row, qnty: nextQnty, bonus: nextBonus })
  );

  const nextPrices = applyPriceQtyNetToBasePrices(
    base.baseItmPurPrice,
    base.baseItmSell,
    info.priceQtyNet
  );

  return {
    unitId,
    qnty: nextQnty,
    bonus: nextBonus,
    itmPurPrice: nextPrices.itmPurPrice,
    itmSell: nextPrices.itmSell,
    baseItmPurPrice: base.baseItmPurPrice,
    baseItmSell: base.baseItmSell,
    priceQtyNet: nextPrices.priceQtyNet,
    skipDiscPercent: options?.skipDiscPercent === true ? true : undefined,
    skipTax: options?.skipTax === true ? true : undefined,
  };
}