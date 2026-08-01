import { z } from "zod";

/** Header fields edited on the form (readonly fields validated separately on save) */
export const purchaseHeaderSchema = z.object({
  id: z.number().nullable(),
  pthId: z.number().nullable(),
  venBillNo: z
    .string()
    .trim()
    .min(1, "Vendor invoice number is required"),
  venBillDate: z
    .string()
    .trim()
    .min(1, "Vendor invoice date is required"),
  phtDate: z.string().trim().min(1, "Purchase date is required"),
  venId: z.string().default(""),
  stoId: z.string().default(""),
  movId: z.number().nullable().default(null),
  movmentRowId: z.number().nullable().default(null),
  movAccount: z.string().default(""),
  movAccountsec: z.string().default(""),
  movAccounttherd: z.string().default(""),
  noOfItems: z.number(),
  totalQuantity: z.number(),
  totalBill: z.number(),
  purchExtraDisCount: z.coerce.number().min(0).default(0),
  totalDisPer: z.coerce.number().min(0).max(100).default(0),
  totalDesMon: z.number(),
  totalTax: z.number(),
  pOtherExpenses: z.coerce.number().min(0).default(0),
  pthNetBill: z.number(),
  pthNotice: z.string().default(""),
});

export type PurchaseHeaderFormValues = z.output<typeof purchaseHeaderSchema>;

export const purchaseDetailRowSchema = z.object({
  id: z.number().nullable(),
  clientRowId: z.string(),
  itmId: z.string().trim().min(1, "Item is required"),
  itmNameAr: z.string().default(""),
  itmNameEn: z.string().default(""),
  cId: z.coerce.number().int().min(0),
  expDate: z.string().optional().default(""),
  qnty: z.coerce.number().positive("Quantity must be greater than zero"),
  bonus: z.coerce.number().min(0).default(0),
  itmPurPrice: z.coerce.number().min(0),
  itmSell: z.coerce.number().min(0).default(0),
  itmDisPer: z.coerce.number().min(0).max(100).default(0),
  itmDisMon: z.coerce.number().min(0).default(0),
  itmTaxTotal: z.coerce.number().min(0).default(0),
  unitId: z.string().default(""),
  lineTotal: z.number(),
});

export const purchaseDocumentSchema = z.object({
  header: purchaseHeaderSchema,
  details: z
    .array(purchaseDetailRowSchema)
    .min(1, "At least one detail line is required"),
});
