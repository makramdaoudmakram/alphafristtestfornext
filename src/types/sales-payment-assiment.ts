export interface SalesPaymentAssimentItem {
  id: number;
  pharmId: string;
  pharmName: string;
  spmId: number;
  paymentName: string;
}

export interface CreateSalesPaymentAssimentRequest {
  pharmId: string;
  spmId: number;
}

export type UpdateSalesPaymentAssimentRequest = CreateSalesPaymentAssimentRequest;
