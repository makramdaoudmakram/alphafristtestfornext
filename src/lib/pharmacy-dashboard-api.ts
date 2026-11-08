import { apiFetch } from "@/lib/api-client";
import type {
  PharmacyDashboardDateRange,
  PharmacyDashboardMetricComparison,
  PharmacyDashboardPayload,
  PharmacyDashboardPeriodComparison,
} from "@/types/pharmacy-dashboard";

function readNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value !== "") return Number(value);
  }
  return 0;
}

function readBool(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "boolean") return value;
  }
  return false;
}

function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string") return value;
    if (value != null && typeof value !== "object") return String(value);
  }
  return "";
}

function readNullableString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  const s = readString(obj, ...keys);
  return s || null;
}

function mapTransfer(row: Record<string, unknown>): import("@/types/pharmacy-dashboard").PharmacyDashboardTransferNotice {
  return {
    transferId: readNumber(row, "transferId", "TransferId"),
    serialNo: readNullableString(row, "serialNo", "SerialNo")
      ? readNumber(row, "serialNo", "SerialNo")
      : null,
    transferDate: readNullableString(row, "transferDate", "TransferDate"),
    sendingPharmacyName: readNullableString(row, "sendingPharmacyName", "SendingPharmacyName"),
    receivingPharmacyName: readNullableString(row, "receivingPharmacyName", "ReceivingPharmacyName"),
    totalQuantity: readNumber(row, "totalQuantity", "TotalQuantity") || null,
    workflowHref: readString(row, "workflowHref", "WorkflowHref") || "/dashboard/pharm/transactions/pharmacy-acceptance",
  };
}

function mapEmployee(row: Record<string, unknown>): import("@/types/pharmacy-dashboard").PharmacyDashboardEmployeeRow {
  return {
    employeeKey: readString(row, "employeeKey", "EmployeeKey"),
    employeeName: readNullableString(row, "employeeName", "EmployeeName"),
    totalSales: readNumber(row, "totalSales", "TotalSales"),
    invoiceCount: readNumber(row, "invoiceCount", "InvoiceCount"),
    totalReturns: readNumber(row, "totalReturns", "TotalReturns"),
    returnCount: readNumber(row, "returnCount", "ReturnCount"),
  };
}

function mapDailyNet(row: Record<string, unknown>): import("@/types/pharmacy-dashboard").PharmacyDashboardDailyNetPoint {
  return {
    date: readString(row, "date", "Date"),
    salesAmount: readNumber(row, "salesAmount", "SalesAmount"),
    returnsAmount: readNumber(row, "returnsAmount", "ReturnsAmount"),
    netSales: readNumber(row, "netSales", "NetSales"),
    invoiceCount: readNumber(row, "invoiceCount", "InvoiceCount"),
  };
}

function mapMetricComparison(row: Record<string, unknown>): PharmacyDashboardMetricComparison {
  const pct = row.percentChange ?? row.PercentChange;
  return {
    current: readNumber(row, "current", "Current"),
    previous: readNumber(row, "previous", "Previous"),
    difference: readNumber(row, "difference", "Difference"),
    percentChange:
      pct === null || pct === undefined ? null : readNumber(row, "percentChange", "PercentChange"),
    percentUnavailable: readBool(row, "percentUnavailable", "PercentUnavailable"),
  };
}

function mapPeriodComparison(row: Record<string, unknown>): PharmacyDashboardPeriodComparison {
  return {
    comparisonPeriodStart: readString(row, "comparisonPeriodStart", "ComparisonPeriodStart"),
    comparisonPeriodEnd: readString(row, "comparisonPeriodEnd", "ComparisonPeriodEnd"),
    totalSales: mapMetricComparison((row.totalSales ?? row.TotalSales ?? {}) as Record<string, unknown>),
    totalReturns: mapMetricComparison((row.totalReturns ?? row.TotalReturns ?? {}) as Record<string, unknown>),
    netSales: mapMetricComparison((row.netSales ?? row.NetSales ?? {}) as Record<string, unknown>),
    totalExpenses: mapMetricComparison((row.totalExpenses ?? row.TotalExpenses ?? {}) as Record<string, unknown>),
    invoiceCount: mapMetricComparison((row.invoiceCount ?? row.InvoiceCount ?? {}) as Record<string, unknown>),
  };
}

export async function getPharmacyDashboard(
  token: string,
  range?: PharmacyDashboardDateRange
): Promise<PharmacyDashboardPayload> {
  const query =
    range?.from && range?.to
      ? `?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
      : "";
  const data = await apiFetch<Record<string, unknown>>(`PharmacyDashboard${query}`, {}, token);

  const overviewRaw = (data.overview ?? data.Overview ?? {}) as Record<string, unknown>;
  const kpisRaw = (data.kpis ?? data.Kpis ?? {}) as Record<string, unknown>;
  const reportingRaw = (data.reporting ?? data.Reporting ?? {}) as Record<string, unknown>;
  const transfersRaw = (data.transfers ?? data.Transfers ?? {}) as Record<string, unknown>;
  const comparisonRaw = (data.salesReturnsComparison ?? data.SalesReturnsComparison) as
    | Record<string, unknown>
    | undefined;
  const periodComparisonRaw = (data.periodComparison ?? data.PeriodComparison ?? {}) as Record<string, unknown>;

  const incomingRaw = transfersRaw.incoming ?? transfersRaw.Incoming;
  const outgoingRaw = transfersRaw.outgoing ?? transfersRaw.Outgoing;
  const employeesRaw = data.employees ?? data.Employees;
  const dailyRaw = data.dailyNetSalesTrend ?? data.DailyNetSalesTrend ?? data.dailySalesTrend ?? data.DailySalesTrend;

  const periodStart = readString(overviewRaw, "periodStart", "PeriodStart", "monthStart", "MonthStart");
  const periodEnd = readString(overviewRaw, "periodEnd", "PeriodEnd", "monthEnd", "MonthEnd");
  const periodLabel = readString(overviewRaw, "periodLabel", "PeriodLabel", "monthLabel", "MonthLabel");

  return {
    overview: {
      parmId: readNumber(overviewRaw, "parmId", "ParmId"),
      pharmId: readString(overviewRaw, "pharmId", "PharmId"),
      pharmacyName: readNullableString(overviewRaw, "pharmacyName", "PharmacyName"),
      periodLabel,
      periodStart,
      periodEnd,
      monthStart: periodStart,
      monthEnd: periodEnd,
      monthLabel: periodLabel,
    },
    kpis: {
      totalSales: readNumber(kpisRaw, "totalSales", "TotalSales"),
      invoiceCount: readNumber(kpisRaw, "invoiceCount", "InvoiceCount"),
      totalReturns: readNumber(kpisRaw, "totalReturns", "TotalReturns"),
      returnCount: readNumber(kpisRaw, "returnCount", "ReturnCount"),
      netSales: readNumber(kpisRaw, "netSales", "NetSales"),
      totalExpenses: readNumber(kpisRaw, "totalExpenses", "TotalExpenses"),
    },
    reporting: {
      sqliteSalesAvailable: Boolean(
        reportingRaw.sqliteSalesAvailable ?? reportingRaw.SqliteSalesAvailable
      ),
      lastSqliteSyncedAt: readNullableString(
        reportingRaw,
        "lastSqliteSyncedAt",
        "LastSqliteSyncedAt"
      ),
      sqliteUnavailableReason: readNullableString(
        reportingRaw,
        "sqliteUnavailableReason",
        "SqliteUnavailableReason"
      ),
    },
    transfers: {
      incoming: Array.isArray(incomingRaw)
        ? incomingRaw.map((r) => mapTransfer(r as Record<string, unknown>))
        : [],
      outgoing: Array.isArray(outgoingRaw)
        ? outgoingRaw.map((r) => mapTransfer(r as Record<string, unknown>))
        : [],
    },
    employees: Array.isArray(employeesRaw)
      ? employeesRaw.map((r) => mapEmployee(r as Record<string, unknown>))
      : [],
    dailyNetSalesTrend: Array.isArray(dailyRaw)
      ? dailyRaw.map((r) => mapDailyNet(r as Record<string, unknown>))
      : [],
    periodComparison: mapPeriodComparison(periodComparisonRaw),
    salesReturnsComparison: comparisonRaw
      ? {
          salesTotal: readNumber(comparisonRaw, "salesTotal", "SalesTotal"),
          returnsTotal: readNumber(comparisonRaw, "returnsTotal", "ReturnsTotal"),
        }
      : null,
  };
}
