export type PharmacyDashboardOverview = {
  parmId: number;
  pharmId: string;
  pharmacyName: string | null;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  /** @deprecated use periodStart */
  monthStart?: string;
  /** @deprecated use periodEnd */
  monthEnd?: string;
  /** @deprecated use periodLabel */
  monthLabel?: string;
};

export type PharmacyDashboardKpis = {
  totalSales: number;
  invoiceCount: number;
  totalReturns: number;
  returnCount: number;
  netSales: number;
  totalExpenses: number;
};

export type PharmacyDashboardReporting = {
  sqliteSalesAvailable: boolean;
  lastSqliteSyncedAt: string | null;
  sqliteUnavailableReason: string | null;
};

export type PharmacyDashboardTransferNotice = {
  transferId: number;
  serialNo: number | null;
  transferDate: string | null;
  sendingPharmacyName: string | null;
  receivingPharmacyName: string | null;
  totalQuantity: number | null;
  workflowHref: string;
};

export type PharmacyDashboardEmployeeRow = {
  employeeKey: string;
  employeeName: string | null;
  totalSales: number;
  invoiceCount: number;
  totalReturns: number;
  returnCount: number;
};

export type PharmacyDashboardDailyNetPoint = {
  date: string;
  salesAmount: number;
  returnsAmount: number;
  netSales: number;
  invoiceCount: number;
};

export type PharmacyDashboardMetricComparison = {
  current: number;
  previous: number;
  difference: number;
  percentChange: number | null;
  percentUnavailable: boolean;
};

export type PharmacyDashboardPeriodComparison = {
  comparisonPeriodStart: string;
  comparisonPeriodEnd: string;
  totalSales: PharmacyDashboardMetricComparison;
  totalReturns: PharmacyDashboardMetricComparison;
  netSales: PharmacyDashboardMetricComparison;
  totalExpenses: PharmacyDashboardMetricComparison;
  invoiceCount: PharmacyDashboardMetricComparison;
};

export type PharmacyDashboardDateRange = {
  from: string;
  to: string;
};

export type PharmacyDashboardPayload = {
  overview: PharmacyDashboardOverview;
  kpis: PharmacyDashboardKpis;
  reporting: PharmacyDashboardReporting;
  transfers: {
    incoming: PharmacyDashboardTransferNotice[];
    outgoing: PharmacyDashboardTransferNotice[];
  };
  employees: PharmacyDashboardEmployeeRow[];
  dailyNetSalesTrend: PharmacyDashboardDailyNetPoint[];
  periodComparison: PharmacyDashboardPeriodComparison;
  salesReturnsComparison: {
    salesTotal: number;
    returnsTotal: number;
  } | null;
  /** @deprecated use dailyNetSalesTrend */
  dailySalesTrend?: PharmacyDashboardDailyNetPoint[];
};
