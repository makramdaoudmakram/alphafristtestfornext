import { z } from "zod";
import {
  purchaseHeaderSchema,
  purchaseDetailRowSchema,
} from "@/validation/purchase.schema";

export {
  purchaseHeaderSchema as returnHeaderSchema,
  type PurchaseHeaderFormValues as ReturnHeaderFormValues,
} from "@/validation/purchase.schema";

/** Purchase detail schema plus the selected stock BatchNo from Return search. */
export const returnDetailRowSchema = purchaseDetailRowSchema.extend({
  batchNo: z
    .string()
    .trim()
    .min(1, "Select an item from search so the stock batch is saved."),
});

export const returnDocumentSchema = z.object({
  header: purchaseHeaderSchema,
  details: z
    .array(returnDetailRowSchema)
    .min(1, "At least one detail line is required"),
});

export const returnDocumentUpdateSchema = z.object({
  header: purchaseHeaderSchema,
  details: z.array(returnDetailRowSchema),
});
