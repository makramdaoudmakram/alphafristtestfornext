export type EmployeeCommissionLine = {
  invoiceNo: number;
  invoiceDateUtc: string | null;
  pharmacyId: string | null;
  pharmacyName: string | null;
  empId: number | null;
  employeeName: string | null;
  itemName: string | null;
  quantity: number;
  commission: number;
};

export type EmployeeCommissionPersonalResponse = {
  employeeName: string | null;
  empId: number;
  lines: EmployeeCommissionLine[];
  finalizedTransactionCount: number;
  totalCommission: number;
  qualifyingLineCount: number;
  appliedDateFrom: string;
  appliedDateTo: string;
};

export type EmployeeCommissionSummaryRow = {
  empId: number;
  employeeName: string | null;
  finalizedTransactionCount: number;
  totalCommission: number;
};

export type EmployeeCommissionSummaryResponse = {
  rows: EmployeeCommissionSummaryRow[];
  appliedDateFrom: string;
  appliedDateTo: string;
};

export type EmployeeCommissionDetailsResponse = {
  lines: EmployeeCommissionLine[];
  totalCommission: number;
  appliedDateFrom: string;
  appliedDateTo: string;
};