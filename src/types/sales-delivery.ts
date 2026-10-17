export type SalesServiceOption = {
  salesServiceId: number;
  serviceName: string;
  serviceType: string;
  cost: number;
  requiresDeliveryEmployee: boolean;
};

export type SalesDeliveryEmployee = {
  employInfoId: number;
  delivEmpId: number;
  code: string | null;
  name: string | null;
};

export type SalesDeliveryInfo = {
  id: number | null;
  sthId: number;
  custId: number | null;
  customerName: string | null;
  tel: string | null;
  address: string | null;
  salesServiceId: number | null;
  serviceName: string | null;
  serviceType: string | null;
  serviceCost: number | null;
  delivEmpId: number | null;
  deliveryEmployeeName: string | null;
  requiresDeliveryEmployee: boolean;
};

export type SalesDeliveryContext = {
  sthId: number;
  pharmId: string | null;
  billTyp: number;
  delivery: SalesDeliveryInfo | null;
  availableServices: SalesServiceOption[];
};

/** One pending delivery order (SalesDelivInfo with DelivStat "P"); id is the accept target key. */
export type PendingDeliveryOrder = {
  id: number;
  sthId: number;
  deliveryName: string | null;
  totalInvoice: number | null;
  paymentType: string | null;
  billTyp: number;
};

export type AcceptDeliveryOrderResult = {
  id: number;
  sthId: number;
  delivStat: string;
};

export type UpsertSalesDeliveryRequest = {
  sthId: number;
  custId: number | null;
  customerName: string | null;
  tel: string | null;
  address: string | null;
  salesServiceId: number;
  deliveryCodeOrPassword: string | null;
};
