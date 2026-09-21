export interface SalesKindItem {
  id: number;
  salesKindName: string;
  isActive: boolean;
  deleveryMandatory: boolean;
}

export interface CreateSalesKindRequest {
  salesKindName: string;
  isActive: boolean;
  deleveryMandatory: boolean;
}

export type UpdateSalesKindRequest = CreateSalesKindRequest;

export interface SalesKindCompoItem {
  id: number;
  salesKindName: string;
  isActive: boolean;
}
