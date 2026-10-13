import { API_BASE_URL } from "@/lib/api-config";
import { ApiTimeoutError, timedFetch } from "@/lib/timed-fetch";

/** Roles allowed to post legacy ledger data. Mirrors the backend gate. */
export const LEGACY_LEDGER_ROLES: readonly string[] = ["admin", "superadmin", "account"];

/** Nav sentinel: the sidebar item is gated by role, not by a seeded permission. */
export const LEGACY_LEDGER_NAV_PERMISSION = "LegacyLedger.Import";

export function isLegacyLedgerAdmin(roles?: readonly string[] | null): boolean {
  return (roles ?? []).some((role) =>
    LEGACY_LEDGER_ROLES.includes(role.trim().toLowerCase())
  );
}

export type LegacyLedgerError = {
  /** Excel row number; 0 means the whole workbook or the account selection. */
  rowNumber: number;
  reason: string;
};

export type LegacyLedgerRow = {
  rowNumber: number;
  date: string;
  description: string;
  depit: number;
  credit: number;
  amount: number;
  /**
   * Server-decided posting direction: true when the amount came from the Depit column, so the
   * Debit-combobox account is debited; false when it came from the Credit column, so that
   * account is credited and the Credit-combobox account is debited instead.
   */
  debitOnFirstAccount: boolean;
};

export type LegacyLedgerPreview = {
  success: boolean;
  importSessionId: string | null;
  batchRef: string | null;
  debitAccountCode: string | null;
  debitAccountName: string | null;
  creditAccountCode: string | null;
  creditAccountName: string | null;
  totalRows: number;
  validRowCount: number;
  ledgerEntryCount: number;
  totalAmount: number;
  rows: LegacyLedgerRow[];
  errors: LegacyLedgerError[];
};

export type LegacyLedgerCommitResult = {
  batchRef: string;
  transType: string;
  firstAccOrder: number;
  lastAccOrder: number;
  firstReceiptNo: string;
  lastReceiptNo: string;
  sourceRowCount: number;
  ledgerEntryCount: number;
  totalAmount: number;
  importedAt: string;
};

export class LegacyLedgerApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "LegacyLedgerApiError";
    this.status = status;
  }
}

function readString(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string") return value;
    if (value != null && typeof value !== "object") return String(value);
  }
  return "";
}

function readNullableString(
  row: Record<string, unknown>,
  ...keys: string[]
): string | null {
  const value = readString(row, ...keys);
  return value === "" ? null : value;
}

function readNumber(row: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value !== "") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

function readBoolean(row: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") return value;
  }
  return false;
}

/**
 * The Alfa API camel-cases names that start with an acronym inconsistently
 * (BatchRef, FirstACCOrder, ACCcountCode), so every field is read by all
 * plausible spellings.
 */
export function normalizeLegacyLedgerPreview(
  data: unknown
): LegacyLedgerPreview {
  const row = (data ?? {}) as Record<string, unknown>;

  const rowsRaw = Array.isArray(row.rows)
    ? row.rows
    : Array.isArray(row.Rows)
      ? row.Rows
      : [];
  const errorsRaw = Array.isArray(row.errors)
    ? row.errors
    : Array.isArray(row.Errors)
      ? row.Errors
      : [];

  return {
    success: readBoolean(row, "success", "Success"),
    importSessionId: readNullableString(row, "importSessionId", "ImportSessionId"),
    batchRef: readNullableString(row, "batchRef", "BatchRef", "batchREF"),
    debitAccountCode: readNullableString(
      row,
      "debitAccountCode",
      "DebitAccountCode"
    ),
    debitAccountName: readNullableString(
      row,
      "debitAccountName",
      "DebitAccountName"
    ),
    creditAccountCode: readNullableString(
      row,
      "creditAccountCode",
      "CreditAccountCode"
    ),
    creditAccountName: readNullableString(
      row,
      "creditAccountName",
      "CreditAccountName"
    ),
    totalRows: readNumber(row, "totalRows", "TotalRows"),
    validRowCount: readNumber(row, "validRowCount", "ValidRowCount"),
    ledgerEntryCount: readNumber(row, "ledgerEntryCount", "LedgerEntryCount"),
    totalAmount: readNumber(row, "totalAmount", "TotalAmount"),
    rows: rowsRaw.map((item) => {
      const source = (item ?? {}) as Record<string, unknown>;
      const depit = readNumber(source, "depit", "Depit");
      const credit = readNumber(source, "credit", "Credit");
      const direction =
        source.debitOnFirstAccount ?? source.DebitOnFirstAccount ?? source.debitFirst;

      return {
        rowNumber: readNumber(source, "rowNumber", "RowNumber"),
        date: readString(source, "date", "Date"),
        description: readString(source, "description", "Description"),
        depit,
        credit,
        amount: readNumber(source, "amount", "Amount"),
        debitOnFirstAccount:
          typeof direction === "boolean" ? direction : depit > 0 && credit === 0,
      };
    }),
    errors: errorsRaw.map((item) => {
      const source = (item ?? {}) as Record<string, unknown>;
      return {
        rowNumber: readNumber(source, "rowNumber", "RowNumber"),
        reason: readString(source, "reason", "Reason"),
      };
    }),
  };
}

export function normalizeLegacyLedgerCommitResult(
  data: unknown
): LegacyLedgerCommitResult {
  const row = (data ?? {}) as Record<string, unknown>;

  return {
    batchRef: readString(row, "batchRef", "BatchRef", "batchREF"),
    transType: readString(row, "transType", "TransType"),
    firstAccOrder: readNumber(row, "firstACCOrder", "firstAccOrder", "FirstACCOrder"),
    lastAccOrder: readNumber(row, "lastACCOrder", "lastAccOrder", "LastACCOrder"),
    firstReceiptNo: readString(row, "firstReceiptNO", "firstReceiptNo"),
    lastReceiptNo: readString(row, "lastReceiptNO", "lastReceiptNo"),
    sourceRowCount: readNumber(row, "sourceRowCount", "SourceRowCount"),
    ledgerEntryCount: readNumber(row, "ledgerEntryCount", "LedgerEntryCount"),
    totalAmount: readNumber(row, "totalAmount", "TotalAmount"),
    importedAt: readString(row, "importedAt", "ImportedAt"),
  };
}

function errorMessageFrom(status: number, body: Record<string, unknown>): string {
  return (
    readString(body, "message", "Message", "error", "title") ||
    `Request failed with status ${status}.`
  );
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text.slice(0, 200) };
  }
}

async function request(
  path: string,
  init: RequestInit,
  token: string
): Promise<{ response: Response; body: Record<string, unknown> }> {
  let response: Response;
  try {
    response = await timedFetch(`${API_BASE_URL}/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    });
  } catch (error) {
    if (error instanceof ApiTimeoutError) {
      throw new LegacyLedgerApiError(408, error.message);
    }
    throw error;
  }

  const body = await readJson(response);
  return { response, body };
}

/** Downloads the 4-column template (Date | Description | Depit | Credit). */
export async function downloadLegacyLedgerTemplate(
  token: string
): Promise<{ blob: Blob; fileName: string }> {
  const response = await timedFetch(`${API_BASE_URL}/LegacyLedger/template`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await readJson(response);
    throw new LegacyLedgerApiError(
      response.status,
      errorMessageFrom(response.status, body)
    );
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);

  return { blob: await response.blob(), fileName: match?.[1] ?? "legacy-ledger-import-template.xlsx" };
}

/** Server-side parse + validation. Creates no ledger rows. */
export async function previewLegacyLedger(
  token: string,
  file: File,
  debitAccount: string,
  creditAccount: string
): Promise<LegacyLedgerPreview> {
  const form = new FormData();
  form.append("file", file);
  form.append("debitAccount", debitAccount);
  form.append("creditAccount", creditAccount);

  const { response, body } = await request(
    "LegacyLedger/preview",
    { method: "POST", body: form },
    token
  );

  if (!response.ok && body.success !== false) {
    throw new LegacyLedgerApiError(response.status, errorMessageFrom(response.status, body));
  }

  return normalizeLegacyLedgerPreview(body);
}

/** Inserts the previewed rows in one transaction. Only the session id is sent. */
export async function commitLegacyLedger(
  token: string,
  importSessionId: string
): Promise<LegacyLedgerCommitResult> {
  const { response, body } = await request(
    "LegacyLedger/commit",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importSessionId }),
    },
    token
  );

  if (!response.ok) {
    throw new LegacyLedgerApiError(response.status, errorMessageFrom(response.status, body));
  }

  return normalizeLegacyLedgerCommitResult(body);
}
