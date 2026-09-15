export interface SalesServiceAssignmentItem {
  id: number;
  pharmId: number;
  pharmName: string;
  salesServiceId: number;
  serviceName: string;
  serviceType: string;
  cost: number;
  active: boolean;
}

export interface CreateSalesServiceAssignmentRequest {
  pharmId: number;
  salesServiceId: number;
  active: boolean;
}

export type UpdateSalesServiceAssignmentRequest =
  CreateSalesServiceAssignmentRequest;

export interface SalesServiceAssignmentCurrentPharmacyItem {
  id: number;
  serviceName: string;
  serviceType: string;
  cost: number;
}
