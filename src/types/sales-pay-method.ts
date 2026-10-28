export interface SalesPayMethodItem {
  id: number;
  paymentName: string;
  affectsCash: boolean;
  salesKindId: number;
  /** SQL tinyint; null when unset. */
  salesclasid: number | null;
  accountCode: string;
  active: boolean;
  deleveryRequair: boolean;
}

export interface CreateSalesPayMethodRequest {
  paymentName: string;
  affectsCash: boolean;
  salesKindId: number;
  salesclasid: number | null;
  accountCode: string;
  active: boolean;
  deleveryRequair: boolean;
}

export type UpdateSalesPayMethodRequest = CreateSalesPayMethodRequest;

export interface SalesPayMethodCompoItem {
  id: number;
  paymentName: string;
  active: boolean;
}
