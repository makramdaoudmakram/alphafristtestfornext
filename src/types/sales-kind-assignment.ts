export interface SalesKindAssignmentItem {
  id: number;
  pharmId: number;
  pharmName: string;
  salesKindId: number;
  salesKindName: string;
  salesKindIsActive: boolean;
  active: boolean;
}

export interface CreateSalesKindAssignmentRequest {
  pharmId: number;
  salesKindId: number;
  active: boolean;
}

export type UpdateSalesKindAssignmentRequest =
  CreateSalesKindAssignmentRequest;
