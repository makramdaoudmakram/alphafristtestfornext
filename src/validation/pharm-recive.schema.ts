import { z } from "zod";

export const pharmReciveHeaderSchema = z.object({
  id: z.number().int().positive().nullable(),
  movId: z.number().int().positive().nullable(),
  movmentRowId: z.number().int().positive().nullable(),
  fathId: z.number().int().positive().nullable(),
  movStor: z.string(),
  movDis: z.string(),
  movDate: z.string().min(1, "Date is required"),
  monNote: z.string(),
  accountDept: z.string(),
  accountCREDIT: z.string(),
  movTotalqunt: z.number().nonnegative(),
  movTotalSalesPrice: z.number().nonnegative(),
  movTotalPurchPrice: z.number().nonnegative(),
  movTotalCostPrice: z.number().nonnegative(),
});

export const pharmReciveDetailSchema = z.object({
  id: z.number().int().positive().nullable(),
  clientRowId: z.string(),
  itmId: z.string().min(1, "Item code is required"),
  itmNameAr: z.string(),
  itmNameEn: z.string(),
  expDate: z.string(),
  qnty: z.number().positive("Quantity must be greater than zero"),
  itmPurPrice: z.number().nonnegative(),
  itmSellPrice: z.number().nonnegative(),
  itemCostPrice: z.number().nonnegative(),
  unitId: z.number().int().positive().nullable(),
  itmStock: z.number().nonnegative(),
  batchNo: z.string().max(15),
  lineTotal: z.number().nonnegative(),
});

export const pharmReciveDocumentSchema = z.object({
  header: pharmReciveHeaderSchema.refine(
    (header) => header.movId != null || header.movmentRowId != null,
    { message: "Movement is required", path: ["movId"] }
  ),
  details: z.array(pharmReciveDetailSchema).min(1, "At least one detail line is required"),
});

export type PharmReciveHeaderFormValues = z.infer<typeof pharmReciveHeaderSchema>;
