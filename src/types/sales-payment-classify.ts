/** API ids are SQL tinyint (1–255). */
export interface SalesPaymentClassifyItem {
  id: number;
  salesclassifyName: string;
}

export interface CreateSalesPaymentClassifyRequest {
  salesclassifyName: string;
}

export type UpdateSalesPaymentClassifyRequest = CreateSalesPaymentClassifyRequest;

export interface SalesPaymentClassifyCompoItem {
  id: number;
  salesclassifyName: string;
}
