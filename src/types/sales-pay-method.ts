export interface SalesPayMethodItem {
  id: number;
  paymentName: string;
  affectsCash: boolean;
  salesKindId: number;
  accountCode: string;
  active: boolean;
}

export interface CreateSalesPayMethodRequest {
  paymentName: string;
  affectsCash: boolean;
  salesKindId: number;
  accountCode: string;
  active: boolean;
}

export type UpdateSalesPayMethodRequest = CreateSalesPayMethodRequest;

export interface SalesPayMethodCompoItem {
  id: number;
  paymentName: string;
  active: boolean;
}
