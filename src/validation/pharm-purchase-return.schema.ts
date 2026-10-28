import { z } from "zod";
import { purchaseHeaderSchema } from "@/validation/purchase.schema";
import { returnDetailRowSchema } from "@/validation/return.schema";

/** Same batch + detail rules as sales return — stock batch required from search. */
export const pharmPurchaseReturnDetailRowSchema = returnDetailRowSchema;

export const pharmPurchaseReturnDocumentSchema = z.object({
  header: purchaseHeaderSchema,
  details: z
    .array(pharmPurchaseReturnDetailRowSchema)
    .min(1, "At least one detail line is required"),
});
