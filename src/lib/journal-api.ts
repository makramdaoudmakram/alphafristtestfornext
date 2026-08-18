import { apiFetch } from "@/lib/api-client";
import type { CollectedVoucherItem } from "@/types/collected-voucher";

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

/**
 * GeneralLedger.ACCcountCode serializes as "acCcountCode" under System.Text.Json
 * camelCase (same as Manual Journal). Collect/Payment ComboBoxes already use ACCCode.
 */
function readAccountCode(row: Record<string, unknown>): string {
  const direct = readString(
    row,
    "acCcountCode",
    "acccountCode",
    "ACCcountCode",
    "accCode",
    "ACCCode"
  ).trim();
  if (direct) return direct;

  for (const [key, value] of Object.entries(row)) {
    const normalized = key.replace(/_/g, "").toLowerCase();
    if (normalized !== "acccountcode" && normalized !== "acccode") continue;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value != null && typeof value !== "object") return String(value).trim();
  }
  return "";
}

export type JournalSearchLine = {
  transNO: number;
  accOrder: number;
  transDate: string | null;
  transType: string | null;
  dueDate: string | null;
  receiptNO: string | null;
  ref: string | null;
  acccountCode: string | null;
  accName: string | null;
  notes: string | null;
  currancy: string | null;
  rate: number | null;
  amount: number | null;
  debit: number;
  credit: number;
  costCenter: string | null;
  vNote: string | null;
};

export type JournalSearchResult = {
  items: JournalSearchLine[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalDebit: number;
  totalCredit: number;
  difference: number;
};

export type JournalLedgerLine = {
  transNO: number;
  type: "Debit" | "Credit";
  acccountCode: string;
  accName: string;
  description: string;
  amount: number;
  amountEGP: number;
  costCenter: string | null;
};

export type JournalSourceInfo = {
  sourceType: string;
  sourceLabel: string;
  collectedVoucher: CollectedVoucherItem | null;
  paymentVoucher: CollectedVoucherItem | null;
};

export type JournalEditBundle = {
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
  lines: JournalLedgerLine[];
  source: JournalSourceInfo;
  debitTotal: number;
  creditTotal: number;
  difference: number;
};

function normalizeSearchLine(row: Record<string, unknown>): JournalSearchLine {
  return {
    transNO: readNumber(row, "transNO", "TransNO"),
    accOrder: readNumber(row, "accOrder", "ACCOrder"),
    transDate: readNullableString(row, "transDate", "TransDate"),
    transType: readNullableString(row, "transType", "TransType"),
    dueDate: readNullableString(row, "dueDate", "DueDate"),
    receiptNO: readNullableString(row, "receiptNO", "ReceiptNO"),
    ref: readNullableString(row, "ref", "REF"),
    acccountCode: readAccountCode(row) || null,
    accName: readNullableString(row, "accName", "AccName"),
    notes: readNullableString(row, "notes", "Notes"),
    currancy: readNullableString(row, "currancy", "Currancy"),
    rate: readNullableNumber(row, "rate", "Rate"),
    amount: readNullableNumber(row, "amount", "Amount"),
    debit: readNumber(row, "debit", "Debit"),
    credit: readNumber(row, "credit", "Credit"),
    costCenter: readNullableString(row, "costCenter", "CostCenter")?.trim() ?? null,
    vNote: readNullableString(row, "vNote", "VNote"),
  };
}

function normalizeVoucherSummary(row: Record<string, unknown> | null): CollectedVoucherItem | null {
  if (!row) return null;
  return {
    receiptNO: readNumber(row, "receiptNO", "ReceiptNO"),
    recRef: readNullableString(row, "recRef", "RecRef"),
    receiptDate: readNullableString(row, "receiptDate", "ReceiptDate"),
    saveCode: readNullableString(row, "saveCode", "SaveCode"),
    amount: readNullableNumber(row, "amount", "Amount"),
    currency: readNullableString(row, "currency", "Currency"),
    rate: readNullableNumber(row, "rate", "Rate"),
    type: readNullableString(row, "type", "Type"),
    vSource: readNullableString(row, "vSource", "VSource"),
    collectedCode: readNullableString(row, "collectedCode", "CollectedCode"),
    collectedName: readNullableString(row, "collectedName", "CollectedName"),
    description: readNullableString(row, "description", "Description"),
    addedUser: readNullableString(row, "addedUser", "AddedUser"),
    chequeNO: readNullableString(row, "chequeNO", "ChequeNO"),
    bankCode: readNullableString(row, "bankCode", "BankCode"),
    dueDate: readNullableString(row, "dueDate", "DueDate"),
    accountNO: readNullableString(row, "accountNO", "AccountNO"),
    totalString: readNullableString(row, "totalString", "TotalString"),
    costCenter: readNullableString(row, "costCenter", "CostCenter"),
    approved: row.approved === true || row.Approved === true,
  };
}

function normalizeEditBundle(data: Record<string, unknown>): JournalEditBundle {
  const journal = (data.journal ?? data.Journal) as Record<string, unknown>;
  const source = (data.source ?? data.Source) as Record<string, unknown>;
  const linesRaw = (journal.lines ?? journal.Lines) as unknown;
  const first =
    Array.isArray(linesRaw) && linesRaw[0]
      ? (linesRaw[0] as Record<string, unknown>)
      : {};

  const lines: JournalLedgerLine[] = Array.isArray(linesRaw)
    ? linesRaw.map((x) => {
        const row = x as Record<string, unknown>;
        const depit =
          (readNullableNumber(row, "depit", "Depit") ?? 0) +
          (readNullableNumber(row, "depit1", "Depit1") ?? 0);
        const credit =
          (readNullableNumber(row, "credit", "Credit") ?? 0) +
          (readNullableNumber(row, "credit1", "Credit1") ?? 0);
        const type: "Debit" | "Credit" = depit > 0 ? "Debit" : "Credit";
        const amountEGP = type === "Debit" ? depit : credit;
        const acccountCode = readAccountCode(row);
        return {
          transNO: readNumber(row, "transNO", "TransNO"),
          type,
          acccountCode,
          accName: readString(row, "accName", "AccName"),
          description: readNullableString(row, "notes", "Notes") ?? "",
          amount: readNullableNumber(row, "amount", "Amount") ?? amountEGP,
          amountEGP,
          costCenter:
            readNullableString(row, "costCenter", "CostCenter")?.trim() ??
            null,
        };
      })
    : [];

  return {
    accOrder: readNumber(journal, "accOrder", "ACCOrder"),
    transType: readNullableString(journal, "transType", "TransType"),
    receiptNO: readNullableString(journal, "receiptNO", "ReceiptNO"),
    ref: readNullableString(journal, "ref", "REF"),
    transDate: readNullableString(journal, "transDate", "TransDate"),
    vNote:
      readNullableString(first, "vNote", "VNote") ??
      readNullableString(journal, "vNote", "VNote"),
    currency: readNullableString(first, "currancy", "Currancy", "currency", "Currency"),
    rate: readNullableNumber(first, "rate", "Rate"),
    dueDate: readNullableString(first, "dueDate", "DueDate"),
    costCenter: readNullableString(first, "costCenter", "CostCenter"),
    lines,
    source: {
      sourceType: readString(source, "sourceType", "SourceType"),
      sourceLabel: readString(source, "sourceLabel", "SourceLabel"),
      collectedVoucher: normalizeVoucherSummary(
        (source.collectedVoucher ?? source.CollectedVoucher) as Record<
          string,
          unknown
        > | null
      ),
      paymentVoucher: normalizeVoucherSummary(
        (source.paymentVoucher ?? source.PaymentVoucher) as Record<
          string,
          unknown
        > | null
      ),
    },
    debitTotal: readNumber(data, "debitTotal", "DebitTotal"),
    creditTotal: readNumber(data, "creditTotal", "CreditTotal"),
    difference: readNumber(data, "difference", "Difference"),
  };
}

export async function searchJournals(
  token: string,
  params: {
    dateFrom: string;
    dateTo: string;
    costCenters?: string[];
    pageNumber?: number;
    pageSize?: number;
  }
): Promise<JournalSearchResult> {
  const query = new URLSearchParams({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    pageNumber: String(params.pageNumber ?? 1),
    pageSize: String(params.pageSize ?? 100),
  });
  if (params.costCenters && params.costCenters.length > 0) {
    query.set("costCenters", params.costCenters.join(","));
  }

  const data = await apiFetch<Record<string, unknown>>(
    `GeneralLedger/journals/search?${query.toString()}`,
    {},
    token
  );

  const itemsRaw = (data.items ?? data.Items ?? data.data) as unknown;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((x) => normalizeSearchLine(x as Record<string, unknown>))
    : [];

  return {
    items,
    totalCount: readNumber(data, "totalCount", "TotalCount"),
    pageNumber: readNumber(data, "pageNumber", "PageNumber") || 1,
    pageSize: readNumber(data, "pageSize", "PageSize") || items.length,
    totalDebit: readNumber(data, "totalDebit", "TotalDebit"),
    totalCredit: readNumber(data, "totalCredit", "TotalCredit"),
    difference: readNumber(data, "difference", "Difference"),
  };
}

export async function getJournalEditBundle(
  accOrder: number,
  token: string
): Promise<JournalEditBundle> {
  const data = await apiFetch<Record<string, unknown>>(
    `GeneralLedger/journal/${accOrder}/edit`,
    {},
    token
  );
  return normalizeEditBundle(data);
}

export type JournalUpdateRequest = {
  transDate: string;
  vNote: string;
  addedBy?: string;
  dueDate?: string | null;
  currancy?: string;
  rate?: number;
  costCenter?: string;
  useUnofficialAmounts?: boolean;
  deleteTransNos?: number[];
  lines: Array<{
    transNO?: number;
    acccountCode: string;
    notes: string;
    amount: number;
    depit: number;
    credit: number;
    costCenter?: string;
  }>;
};

export async function updateJournal(
  accOrder: number,
  body: JournalUpdateRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    `GeneralLedger/journal/${accOrder}`,
    {
      method: "PUT",
      body: JSON.stringify({
        TransDate: body.transDate,
        VNote: body.vNote,
        AddedBy: body.addedBy,
        DueDate: body.dueDate,
        Currancy: body.currancy,
        Rate: body.rate,
        CostCenter: body.costCenter,
        UseUnofficialAmounts: body.useUnofficialAmounts ?? false,
        DeleteTransNos: body.deleteTransNos,
        Lines: body.lines.map((l) => ({
          TransNO: l.transNO,
          ACCcountCode: l.acccountCode,
          Notes: l.notes,
          Amount: l.amount,
          Depit: l.depit,
          Credit: l.credit,
          Depit1: 0,
          Credit1: 0,
          CostCenter: l.costCenter,
        })),
      }),
    },
    token
  );
}

export function sourceLabel(transType: string | null | undefined): string {
  switch (transType?.toUpperCase()) {
    case "CJ":
      return "Collection Voucher";
    case "PJ":
      return "Payment Voucher";
    case "AJ":
      return "Manual Journal";
    default:
      return transType ?? "Other";
  }
}
