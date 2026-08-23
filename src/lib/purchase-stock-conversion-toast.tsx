import { toast } from "sonner";
import {
  getUnitConversionInfo,
  type StockUnitConversionResult,
} from "@/lib/api-client";

function formatToastNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}

function ConversionToastBody({
  itemCode,
  unitId,
  unitName,
  conversionValue,
  quantityNet,
  priceQtyNet,
  purchasePrice,
  salesPrice,
}: {
  itemCode: string;
  unitId: string;
  unitName: string;
  conversionValue: string;
  quantityNet: string;
  priceQtyNet: string;
  purchasePrice: string;
  salesPrice: string;
}) {
  return (
    <div className="whitespace-pre-wrap font-sans text-xs leading-5">
      {`Item Code: ${itemCode}
Unit ID: ${unitId}
Unit Name: ${unitName}
Conversion Value: ${conversionValue}
Quantity Net: ${quantityNet}
Price Qty Net: ${priceQtyNet}
Purchase Price: ${purchasePrice}
Sales Price: ${salesPrice}`}
    </div>
  );
}

/** Verification only: displays GetUnitConversionInfo plus row prices. */
export async function toastStockUnitConversion(
  token: string | null | undefined,
  itemCode: string,
  unitId: number,
  quantity: number,
  prices?: { purchasePrice?: number; salesPrice?: number },
  info?: StockUnitConversionResult
): Promise<StockUnitConversionResult | null> {
  const code = itemCode.trim();
  if (!token || !code || !Number.isFinite(unitId) || unitId <= 0) return null;

  try {
    const result =
      info ?? (await getUnitConversionInfo(token, code, unitId, quantity));

    const body = (
      <ConversionToastBody
        itemCode={result.itemCode || code}
        unitId={String(result.unitId || unitId)}
        unitName={result.unitName}
        conversionValue={formatToastNumber(result.conversionValue)}
        quantityNet={formatToastNumber(result.quantityNet)}
        priceQtyNet={formatToastNumber(result.priceQtyNet)}
        purchasePrice={formatToastNumber(prices?.purchasePrice)}
        salesPrice={formatToastNumber(prices?.salesPrice)}
      />
    );

    if (result.errorMessage) {
      toast.error(result.errorMessage, {
        description: body,
        duration: 8000,
      });
      return result;
    }

    toast.message("Unit conversion", {
      description: body,
      duration: 8000,
    });
    return result;
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "Unit conversion could not be retrieved."
    );
    return null;
  }
}
