import { apiFetch } from "@/lib/api-client";

function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string") return value;
    if (value != null && typeof value !== "object") return String(value);
  }
  return "";
}

function readNullableString(
  obj: Record<string, unknown>,
  ...keys: string[]
): string | null {
  const value = readString(obj, ...keys);
  return value ? value : null;
}

function readNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value !== "") return Number(value);
  }
  return 0;
}

function readNullableNumber(
  obj: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    if (!(key in obj)) continue;
    const value = obj[key];
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return value;
    if (typeof value === "string" && value !== "") return Number(value);
  }
  return null;
}

function readBool(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "boolean") return value;
  }
  return false;
}

export type LedgerReportQuery = {
  dateFrom: string;
  dateTo: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  parentAccountCodes?: string[];
  accountCodes?: string[];
  costCenterCodes?: string[];
};

export type LedgerReportLine = {
  transNO: number;
  transDate: string | null;
  transType: string | null;
  receiptNO: string | null;
  acccountCode: string | null;
  accountLabel: string;
  description: string | null;
  currency: string | null;
  amount: number;
  debit: number;
  credit: number;
  balance: number;
  dueDate: string | null;
  ref: string | null;
  costCenter: string | null;
  costCenterLabel: string;
  isOpening: boolean;
};

export type LedgerAccountSection = {
  acccountCode: string;
  accountLabel: string;
  currency: string | null;
  openingBalance: number;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  finalBalance: number;
  lines: LedgerReportLine[];
};

export type LedgerCostCenterSection = {
  costCenter: string;
  costCenterLabel: string;
  openingBalance: number;
  finalBalance: number;
  accounts: LedgerAccountSection[];
};

export type LedgerReport = {
  dateFrom: string | null;
  dateTo: string | null;
  dueDateFrom: string | null;
  dueDateTo: string | null;
  costCenters: LedgerCostCenterSection[];
  totalDebit: number;
  totalCredit: number;
  transactionCount: number;
};

function normalizeLine(row: Record<string, unknown>): LedgerReportLine {
  return {
    transNO: readNumber(row, "transNO", "TransNO"),
    transDate: readNullableString(row, "transDate", "TransDate"),
    transType: readNullableString(row, "transType", "TransType"),
    receiptNO: readNullableString(row, "receiptNO", "ReceiptNO"),
    acccountCode: readNullableString(
      row,
      "acccountCode",
      "AcccountCode",
      "ACCcountCode"
    ),
    accountLabel: readString(row, "accountLabel", "AccountLabel"),
    description: readNullableString(row, "description", "Description"),
    currency: readNullableString(row, "currency", "Currency", "currancy", "Currancy"),
    amount: readNullableNumber(row, "amount", "Amount") ?? 0,
    debit: readNumber(row, "debit", "Debit"),
    credit: readNumber(row, "credit", "Credit"),
    balance: readNumber(row, "balance", "Balance"),
    dueDate: readNullableString(row, "dueDate", "DueDate"),
    ref: readNullableString(row, "ref", "Ref", "REF"),
    costCenter: readNullableString(row, "costCenter", "CostCenter"),
    costCenterLabel: readString(row, "costCenterLabel", "CostCenterLabel"),
    isOpening: readBool(row, "isOpening", "IsOpening"),
  };
}

function normalizeAccount(row: Record<string, unknown>): LedgerAccountSection {
  const linesRaw = (row.lines ?? row.Lines) as unknown;
  return {
    acccountCode: readString(row, "acccountCode", "AcccountCode", "ACCcountCode"),
    accountLabel: readString(row, "accountLabel", "AccountLabel"),
    currency: readNullableString(row, "currency", "Currency"),
    openingBalance: readNumber(row, "openingBalance", "OpeningBalance"),
    openingDebit: readNumber(row, "openingDebit", "OpeningDebit"),
    openingCredit: readNumber(row, "openingCredit", "OpeningCredit"),
    periodDebit: readNumber(row, "periodDebit", "PeriodDebit"),
    periodCredit: readNumber(row, "periodCredit", "PeriodCredit"),
    finalBalance: readNumber(row, "finalBalance", "FinalBalance"),
    lines: Array.isArray(linesRaw)
      ? linesRaw.map((x) => normalizeLine(x as Record<string, unknown>))
      : [],
  };
}

function normalizeCostCenter(row: Record<string, unknown>): LedgerCostCenterSection {
  const accountsRaw = (row.accounts ?? row.Accounts) as unknown;
  return {
    costCenter: readString(row, "costCenter", "CostCenter"),
    costCenterLabel: readString(row, "costCenterLabel", "CostCenterLabel"),
    openingBalance: readNumber(row, "openingBalance", "OpeningBalance"),
    finalBalance: readNumber(row, "finalBalance", "FinalBalance"),
    accounts: Array.isArray(accountsRaw)
      ? accountsRaw.map((x) => normalizeAccount(x as Record<string, unknown>))
      : [],
  };
}

const SUB_LEDGER_DATE_FROM = "1900-01-01";
const SUB_LEDGER_DATE_TO = "2099-12-31";

export type AccountSubLedgerLine = {
  transNO: number;
  transDate: string | null;
  transType: string | null;
  receiptNO: string | null;
  description: string | null;
  costCenter: string | null;
  costCenterLabel: string;
  dueDate: string | null;
  debit: number;
  credit: number;
  balance: number;
};

export type AccountSubLedger = {
  accountCode: string;
  accountLabel: string;
  openingBalance: number;
  finalBalance: number;
  totalDebit: number;
  totalCredit: number;
  lines: AccountSubLedgerLine[];
};

function normalizeSubLedgerLine(row: Record<string, unknown>): AccountSubLedgerLine {
  return {
    transNO: readNumber(row, "transNO", "TransNO"),
    transDate: readNullableString(row, "transDate", "TransDate"),
    transType: readNullableString(row, "transType", "TransType"),
    receiptNO: readNullableString(row, "receiptNO", "ReceiptNO"),
    description: readNullableString(row, "description", "Description"),
    costCenter: readNullableString(row, "costCenter", "CostCenter"),
    costCenterLabel: readString(row, "costCenterLabel", "CostCenterLabel"),
    dueDate: readNullableString(row, "dueDate", "DueDate"),
    debit: readNumber(row, "debit", "Debit"),
    credit: readNumber(row, "credit", "Credit"),
    balance: readNumber(row, "balance", "Balance"),
  };
}

export async function getAccountSubLedger(
  accountCode: string,
  token: string
): Promise<AccountSubLedger> {
  const data = await apiFetch<Record<string, unknown>>(
    `GeneralLedger/sub-ledger/${encodeURIComponent(accountCode)}`,
    {},
    token
  );
  const linesRaw = (data.lines ?? data.Lines) as unknown;
  return {
    accountCode: readString(data, "accountCode", "AccountCode"),
    accountLabel: readString(data, "accountLabel", "AccountLabel"),
    openingBalance: readNumber(data, "openingBalance", "OpeningBalance"),
    finalBalance: readNumber(data, "finalBalance", "FinalBalance"),
    totalDebit: readNumber(data, "totalDebit", "TotalDebit"),
    totalCredit: readNumber(data, "totalCredit", "TotalCredit"),
    lines: Array.isArray(linesRaw)
      ? linesRaw.map((line) => normalizeSubLedgerLine(line as Record<string, unknown>))
      : [],
  };
}

export async function getAccountSubLedgerReport(
  accountCode: string,
  token: string
): Promise<LedgerReport> {
  return getLedgerReport(
    {
      dateFrom: SUB_LEDGER_DATE_FROM,
      dateTo: SUB_LEDGER_DATE_TO,
      accountCodes: [accountCode],
    },
    token
  );
}

export function sortLedgerLinesByDateDesc(lines: LedgerReportLine[]): LedgerReportLine[] {
  const opening = lines.filter((line) => line.isOpening);
  const transactions = lines.filter((line) => !line.isOpening);

  transactions.sort((a, b) => {
    const dateA = a.transDate ? Date.parse(a.transDate) : 0;
    const dateB = b.transDate ? Date.parse(b.transDate) : 0;
    if (dateB !== dateA) return dateB - dateA;
    return b.transNO - a.transNO;
  });

  return [...opening, ...transactions];
}

export async function getLedgerReport(
  query: LedgerReportQuery,
  token: string
): Promise<LedgerReport> {
  const data = await apiFetch<Record<string, unknown>>(
    "GeneralLedger/ledger-report",
    {
      method: "POST",
      body: JSON.stringify({
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        dueDateFrom: query.dueDateFrom || null,
        dueDateTo: query.dueDateTo || null,
        parentAccountCodes: query.parentAccountCodes ?? [],
        accountCodes: query.accountCodes ?? [],
        costCenterCodes: query.costCenterCodes ?? [],
      }),
    },
    token
  );

  const centersRaw = (data.costCenters ?? data.CostCenters) as unknown;
  return {
    dateFrom: readNullableString(data, "dateFrom", "DateFrom"),
    dateTo: readNullableString(data, "dateTo", "DateTo"),
    dueDateFrom: readNullableString(data, "dueDateFrom", "DueDateFrom"),
    dueDateTo: readNullableString(data, "dueDateTo", "DueDateTo"),
    costCenters: Array.isArray(centersRaw)
      ? centersRaw.map((x) => normalizeCostCenter(x as Record<string, unknown>))
      : [],
    totalDebit: readNumber(data, "totalDebit", "TotalDebit"),
    totalCredit: readNumber(data, "totalCredit", "TotalCredit"),
    transactionCount: readNumber(data, "transactionCount", "TransactionCount"),
  };
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function ledgerReportToCsv(report: LedgerReport): string {
  const rows: string[] = [
    [
      "Cost Center",
      "Account",
      "Date",
      "Due Date",
      "Type",
      "Receipt",
      "Description",
      "Debit",
      "Credit",
      "Balance",
    ].join(","),
  ];

  for (const center of report.costCenters) {
    rows.push(
      [
        csvCell(center.costCenterLabel),
        "",
        "",
        "",
        "SECTION",
        "",
        "Opening Balance",
        "",
        "",
        csvCell(center.openingBalance.toFixed(2)),
      ].join(",")
    );
    for (const account of center.accounts) {
      for (const line of account.lines) {
        rows.push(
          [
            csvCell(center.costCenterLabel),
            csvCell(account.accountLabel),
            csvCell(line.transDate ? line.transDate.slice(0, 10) : ""),
            csvCell(line.dueDate ? line.dueDate.slice(0, 10) : ""),
            csvCell(line.transType),
            csvCell(line.receiptNO),
            csvCell(line.description),
            csvCell(line.debit.toFixed(2)),
            csvCell(line.credit.toFixed(2)),
            csvCell(line.balance.toFixed(2)),
          ].join(",")
        );
      }
      rows.push(
        [
          csvCell(center.costCenterLabel),
          csvCell(account.accountLabel),
          "",
          "",
          "FINAL",
          "",
          "Final Balance",
          csvCell(account.periodDebit.toFixed(2)),
          csvCell(account.periodCredit.toFixed(2)),
          csvCell(account.finalBalance.toFixed(2)),
        ].join(",")
      );
    }
    rows.push(
      [
        csvCell(center.costCenterLabel),
        "",
        "",
        "",
        "SECTION",
        "",
        "Cost Center Final Balance",
        "",
        "",
        csvCell(center.finalBalance.toFixed(2)),
      ].join(",")
    );
  }

  return `\uFEFF${rows.join("\n")}`;
}
