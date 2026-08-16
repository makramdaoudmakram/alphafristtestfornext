import { apiFetch } from "@/lib/api-client";
import type { AccountSelectItem } from "@/types/collected-voucher";

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

/** AddManualJournal: accounts from AccountsChart (ChartView leaves). */
export async function getChartLeaves(token: string): Promise<AccountSelectItem[]> {
  try {
    const data = await apiFetch<unknown>("AccountsChart/chart-leaves", {}, token);
    if (Array.isArray(data) && data.length > 0) {
      return data.map((x) => {
        const row = x as Record<string, unknown>;
        const accCode = readString(row, "accCode", "ACCCode");
        const name =
          readString(row, "name", "Name", "accaName", "ACCAName") || accCode;
        return { accCode, name };
      });
    }
  } catch {
    /* fall through — load AccountsChart table directly */
  }

  // Source of truth: dbo.AccountsChart (same as Web Forms ChartView leaves)
  const { getVoucherAccountsChart } = await import("@/lib/api-client");
  const chart = await getVoucherAccountsChart(token);
  const parentCodes = new Set(
    chart
      .map((a) => a.parentCode)
      .filter((p): p is string => !!p && p.trim() !== "")
  );

  const leaves = chart
    .filter((a) => a.accCode && !parentCodes.has(a.accCode))
    .map((a) => ({
      accCode: a.accCode,
      name: (a.accAName ?? a.accName ?? a.accCode).trim() || a.accCode,
    }))
    .sort((a, b) =>
      a.accCode.localeCompare(b.accCode, undefined, { numeric: true })
    );

  // If leaf filter yields nothing, still show all chart rows so the combobox is usable
  if (leaves.length === 0) {
    return chart
      .filter((a) => !!a.accCode)
      .map((a) => ({
        accCode: a.accCode,
        name: (a.accAName ?? a.accName ?? a.accCode).trim() || a.accCode,
      }))
      .sort((a, b) =>
        a.accCode.localeCompare(b.accCode, undefined, { numeric: true })
      );
  }

  return leaves;
}

export type CurrencySelectItem = {
  code: string;
  name: string;
  rate: number | null;
};

/** Manual Journal / Adjustment Voucher — only these three currencies. */
export const MANUAL_JOURNAL_CURRENCIES: ReadonlyArray<{
  code: string;
  name: string;
  defaultRate: number;
}> = [
  { code: "EGP", name: "Egyptian Pound", defaultRate: 1 },
  { code: "USD", name: "US Dollar", defaultRate: 1 },
  { code: "EUR", name: "Euro", defaultRate: 1 },
];

export async function getCurrencies(token: string): Promise<CurrencySelectItem[]> {
  const allowed = new Map(
    MANUAL_JOURNAL_CURRENCIES.map((c) => [
      c.code,
      { code: c.code, name: c.name, rate: c.defaultRate as number | null },
    ])
  );

  try {
    const data = await apiFetch<unknown>("GeneralLedger/currencies", {}, token);
    if (Array.isArray(data)) {
      for (const x of data) {
        const row = x as Record<string, unknown>;
        const code = readString(row, "code", "Code").toUpperCase();
        const existing = allowed.get(code);
        if (!existing) continue;
        const rate = readNullableNumber(row, "rate", "Rate");
        existing.rate = rate ?? existing.rate;
      }
    }
  } catch {
    /* keep defaults */
  }

  return MANUAL_JOURNAL_CURRENCIES.map((c) => allowed.get(c.code)!);
}

export type ManualJournalLineView = {
  type: string;
  acccountCode: string;
  accName: string | null;
  description: string | null;
  amount: number | null;
  amountEGP: number | null;
};

export type ManualJournalView = {
  accOrder: number;
  transType: string | null;
  receiptNO: string | null;
  ref: string | null;
  transDate: string | null;
  vNote: string | null;
  currency: string | null;
  rate: number | null;
  dueDate: string | null;
  costCenter: string | null;
  lines: ManualJournalLineView[];
};

function normalizeManualJournal(data: Record<string, unknown>): ManualJournalView {
  const linesRaw = (data.lines ?? data.Lines) as unknown;
  const lines = Array.isArray(linesRaw)
    ? linesRaw.map((x) => {
        const row = x as Record<string, unknown>;
        const depit = readNullableNumber(row, "depit", "Depit") ?? 0;
        const credit = readNullableNumber(row, "credit", "Credit") ?? 0;
        return {
          type: depit > 0 ? "Debit" : "Credit",
          acccountCode: readString(
            row,
            "acCcountCode",
            "ACCcountCode",
            "acccountCode",
            "accCode",
            "ACCCode"
          ),
          accName: readNullableString(row, "accName", "AccName"),
          description: readNullableString(
            row,
            "notes",
            "Notes",
            "description",
            "Description"
          ),
          amount: readNullableNumber(row, "amount", "Amount"),
          amountEGP: depit > 0 ? depit : credit,
        };
      })
    : [];

  const first =
    Array.isArray(linesRaw) && linesRaw[0]
      ? (linesRaw[0] as Record<string, unknown>)
      : {};

  return {
    accOrder: readNumber(data, "accOrder", "ACCOrder"),
    transType: readNullableString(data, "transType", "TransType"),
    receiptNO: readNullableString(data, "receiptNO", "ReceiptNO"),
    ref: readNullableString(data, "ref", "REF"),
    transDate: readNullableString(data, "transDate", "TransDate"),
    vNote:
      readNullableString(first, "vNote", "VNote") ??
      readNullableString(data, "vNote", "VNote"),
    currency: readNullableString(
      first,
      "currancy",
      "Currancy",
      "currency",
      "Currency"
    ),
    rate: readNullableNumber(first, "rate", "Rate"),
    dueDate: readNullableString(first, "dueDate", "DueDate"),
    costCenter: readNullableString(first, "costCenter", "CostCenter"),
    lines,
  };
}

export async function getManualJournalLast(token: string) {
  return apiFetch<Record<string, unknown>>("GeneralLedger/aj/last", {}, token).then(
    normalizeManualJournal
  );
}

export async function getManualJournal(receiptNo: string, token: string) {
  return apiFetch<Record<string, unknown>>(
    `GeneralLedger/aj/${encodeURIComponent(receiptNo)}`,
    {},
    token
  ).then(normalizeManualJournal);
}

export async function getManualJournalAdjacent(
  receiptNo: string,
  direction: string,
  token: string
) {
  return apiFetch<{ receiptNo?: string; ReceiptNo?: string }>(
    `GeneralLedger/aj/${encodeURIComponent(receiptNo)}/adjacent?direction=${encodeURIComponent(direction)}`,
    {},
    token
  ).then((r) => r.receiptNo ?? r.ReceiptNo ?? null);
}

export async function searchManualJournals(
  mode: string,
  value: string,
  token: string
) {
  const params = new URLSearchParams({ mode, value });
  const data = await apiFetch<unknown>(
    `GeneralLedger/aj/search?${params.toString()}`,
    {},
    token
  );
  if (!Array.isArray(data)) return [];
  return data.map((x) => {
    const row = x as Record<string, unknown>;
    return {
      receiptNO: readString(row, "receiptNO", "ReceiptNO"),
      ref: readNullableString(row, "ref", "REF"),
      transDate: readNullableString(row, "transDate", "TransDate"),
      notes: readNullableString(row, "notes", "Notes"),
      amount: readNullableNumber(row, "amount", "Amount"),
    };
  });
}

export type ManualJournalCreateRequest = {
  transDate: string;
  vNote: string;
  addedBy?: string;
  costCenter?: string;
  dueDate?: string | null;
  currancy?: string;
  rate?: number;
  lines: Array<{
    acccountCode: string;
    notes: string;
    amount: number;
    depit: number;
    credit: number;
    currancy?: string;
    rate?: number;
    dueDate?: string | null;
    costCenter?: string;
  }>;
};

export async function createManualJournal(
  data: ManualJournalCreateRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    "GeneralLedger/journal",
    {
      method: "POST",
      body: JSON.stringify({
        TransDate: data.transDate,
        TransType: "AJ",
        TreasuryCode: 0,
        VNote: data.vNote,
        AddedBy: data.addedBy,
        CostCenter: data.costCenter,
        DueDate: data.dueDate,
        Currancy: data.currancy,
        Rate: data.rate,
        Lines: data.lines.map((l) => ({
          ACCcountCode: l.acccountCode,
          Notes: l.notes,
          Amount: l.amount,
          Depit: l.depit,
          Credit: l.credit,
          Depit1: 0,
          Credit1: 0,
          Currancy: l.currancy ?? data.currancy,
          Rate: l.rate ?? data.rate,
          DueDate: l.dueDate ?? data.dueDate,
          CostCenter: l.costCenter ?? data.costCenter,
          BankAccount: "",
          ChequeNO: "",
        })),
      }),
    },
    token
  ).then(normalizeManualJournal);
}
