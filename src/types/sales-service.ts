export interface SalesServiceItem {
  id: number;
  serviceName: string;
  serviceType: string;
  cost: number;
  active: boolean;
}

export interface CreateSalesServiceRequest {
  serviceName: string;
  serviceType: string;
  cost: number;
  active: boolean;
}

export type UpdateSalesServiceRequest = CreateSalesServiceRequest;

export interface SalesServiceCompoItem {
  id: number;
  serviceName: string;
  serviceType: string;
  cost: number;
  active: boolean;
}
