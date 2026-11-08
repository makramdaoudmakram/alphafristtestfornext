export type DeliveryMonitoringPendingSale = {
  deliveryInfoId: number;
  sthId: number;
  orderDateTimeCairo: string | null;
  pharmacyId: number | null;
  pharmacyName: string | null;
  deliveryEmployeeId: number | null;
  deliveryEmployeeName: string | null;
  orderTotal: number | null;
};

export type DeliveryMonitoringPendingSalesPage = {
  items: DeliveryMonitoringPendingSale[];
  totalRecords: number;
};

export type DeliveryMonitoringPendingTransfer = {
  transferHeaderId: number;
  serialNo: number | null;
  transferDate: string | null;
  transferDateTimeCairo: string | null;
  deliveryEmployeeId: number | null;
  deliveryEmployeeName: string | null;
  sourcePharmacyId: number | null;
  sourcePharmacyName: string | null;
  destinationPharmacyId: number | null;
  destinationPharmacyName: string | null;
};

export type DeliveryMonitoringPendingTransfersPage = {
  items: DeliveryMonitoringPendingTransfer[];
  totalRecords: number;
};

export type DeliveryMonitoringEmployeeStatistics = {
  employeeId: number;
  employeeName: string | null;
  salesDeliveryCount: number;
  acceptedTransferCount: number;
  totalCompletedOrders: number;
};

export type DeliveryMonitoringStatisticsPage = {
  items: DeliveryMonitoringEmployeeStatistics[];
  appliedDateFrom: string;
  appliedDateTo: string;
  totalSalesDeliveries: number;
  totalAcceptedTransfers: number;
  totalCompletedOrders: number;
};
