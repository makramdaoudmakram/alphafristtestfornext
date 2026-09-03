import { z } from "zod";

export const DECREASE_EXCEEDS_CURRENT_QTY_MESSAGE =
  "Decrease quantity cannot be greater than current quantity.";

export function isDecreaseGreaterThanCurrentQty(
  decreaseQty: number,
  currentQty: number
): boolean {
  const decrease = Number.isFinite(decreaseQty) ? decreaseQty : 0;
  const current = Number.isFinite(currentQty) ? currentQty : 0;
  return decrease > current;
}

export const inventoryAdjustmentHeaderSchema = z.object({
  id: z.number().nullable().optional(),
  fhId: z.number().nullable().optional(),
  movId: z
    .number({ required_error: "Movement is required." })
    .nullable()
    .refine((value) => value != null && value > 0, "Movement is required."),
  movmentRowId: z.number().nullable().optional(),
  invDat: z.string().optional(),
  invStore: z.string().trim().min(1, "Store is required."),
  invNotice: z.string().optional(),
  movStat: z.number().nullable().optional(),
  invAccount1: z.string().optional(),
  invAccount2: z.string().optional(),
});

export type InventoryAdjustmentHeaderFormValues = z.infer<
  typeof inventoryAdjustmentHeaderSchema
>;

export const inventoryAdjustmentDetailSchema = z.object({
  itmCode: z.string().trim().min(1, "Item is required."),
  batchNo: z.string().trim().min(1, "Batch is required."),
  unitId: z.number().min(1, "Unit is required."),
  itmStockQty: z.number().finite(),
  itmIncresQty: z.number().finite().min(0, "Increase must be non-negative."),
  itemShortQty: z.number().finite().min(0, "Decrease must be non-negative."),
});

export function validateInventoryDetails(
  details: Array<{
    itmCode: string;
    batchNo: string;
    unitId: number | null;
    itmStockQty: number;
    itmIncresQty: number;
    itemShortQty: number;
  }>
): string | null {
  const rows = details.filter((row) => row.itmCode.trim().length > 0);
  if (rows.length === 0) {
    return "Add at least one item to adjust.";
  }

  for (const [index, row] of rows.entries()) {
    const parsed = inventoryAdjustmentDetailSchema.safeParse(row);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid detail row.";
      return `Row ${index + 1}: ${message}`;
    }

    if (row.itmIncresQty > 0 && row.itemShortQty > 0) {
      return `Row ${index + 1}: Increase and Decrease cannot both have a value.`;
    }

    if (isDecreaseGreaterThanCurrentQty(row.itemShortQty, row.itmStockQty)) {
      return `Row ${index + 1}: ${DECREASE_EXCEEDS_CURRENT_QTY_MESSAGE}`;
    }
  }

  return null;
}
