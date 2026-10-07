import { API_BASE_URL } from "@/lib/api-config";

export type ReportingMonitorItem = {
  documentType: string;
  documentId: number;
  jobHeaderId: number;
  documentDate: string | null;
  storeId: string | null;
  sqlExists: boolean;
  eligibleForReporting: boolean;
  jobExists: boolean;
  jobStatus: string | null;
  repairJobKind: string | null;
  jobId: number | null;
  attemptCount: number | null;
  requeueCount: number | null;
  lastAttemptAt: string | null;
  lastFailedAt: string | null;
  firstFailedAt: string | null;
  lastError: string | null;
  sqliteHeaderExists: boolean;
  sqliteLinesExist: boolean;
  sqliteMovementExists: boolean;
  sqliteComplete: boolean;
  status: string;
  repairAvailable: boolean;
};

export type ReportingMonitorResponse = {
  items: ReportingMonitorItem[];
  summary: {
    total: number;
    completed: number;
    pending: number;
    processing: number;
    retryPending: number;
    failed: number;
    missingJob: number;
    missingSqlite: number;
    mismatch: number;
    notEligible: number;
  };
  page: number;
  pageSize: number;
  totalCount: number;
  from: string;
  to: string;
  rangeTruncated: boolean;
};

const DOCUMENT_TYPES = [
  "Purchase",
  "Sales",
  "SalesReturn",
  "PharmacyPurchase",
  "Return",
  "PharmacyReceive",
  "StockTransfer",
  "PharmacyStoreReturn",
  "InventoryAdjustment",
] as const;

export const REPORTING_DOCUMENT_TYPES = DOCUMENT_TYPES;

function reportingUrl(path: string): string {
  return `${API_BASE_URL}/Reporting/${path}`;
}

export async function fetchReportingReconciliation(
  token: string,
  query: {
    type?: string;
    from: string;
    to: string;
    status?: string;
    store?: string;
    page: number;
    pageSize: number;
  }
): Promise<ReportingMonitorResponse> {
  const params = new URLSearchParams();
  if (query.type) params.set("type", query.type);
  params.set("from", query.from);
  params.set("to", query.to);
  if (query.status) params.set("status", query.status);
  if (query.store) params.set("store", query.store);
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  const response = await fetch(reportingUrl(`reconciliation?${params.toString()}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as ReportingMonitorResponse;
}

export async function repairReportingDocuments(
  token: string,
  items: Array<{
    documentType: string;
    jobHeaderId: number;
    documentId: number;
    jobKind: string | null;
  }>
): Promise<{ staged: number; skipped: number }> {
  const response = await fetch(reportingUrl("reconciliation/repair"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: items.map((item) => ({
        documentType: item.documentType,
        jobHeaderId: item.jobHeaderId,
        documentId: item.documentId,
        jobKind: item.jobKind,
      })),
    }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as { staged: number; skipped: number };
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return `HTTP ${response.status}`;
  try {
    const body = JSON.parse(text) as { message?: string };
    return body.message || text.slice(0, 200);
  } catch {
    return text.slice(0, 200);
  }
}
