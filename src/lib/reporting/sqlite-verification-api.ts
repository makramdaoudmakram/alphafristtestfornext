import { API_BASE_URL } from "@/lib/api-config";

export type SqliteDatabaseVerification = {
  fileName: string;
  fileExists: boolean;
  canConnect: boolean;
  integrityCheckPassed: boolean;
  integrityCheckMessage: string | null;
  mainDatabaseSizeBytes: number;
  walSizeBytes: number;
  shmSizeBytes: number;
  movementFactCount: number | null;
  documentHeaderCount: number | null;
  documentLineCount: number | null;
  auditEventCount: number | null;
  schemaValid: boolean;
  missingTables: string[];
  errorMessage: string | null;
};

export type ReportingJobVerificationSummary = {
  pending: number;
  processing: number;
  completed: number;
  retryPending: number;
  failed: number;
  expiredProcessing: number;
  oldestPendingAgeSeconds: number;
};

export type ReconciliationVerificationSummary = {
  from: string;
  to: string;
  rangeTruncated: boolean;
  synchronizedDocuments: number;
  missingSqliteDocuments: number;
  mismatchedDocuments: number;
  pendingReportingDocuments: number;
  failedReportingDocuments: number;
};

export type SqliteReportingVerificationResponse = {
  verifiedAtUtc: string;
  overallStatus: string;
  readStore: string;
  movement: SqliteDatabaseVerification;
  audit: SqliteDatabaseVerification;
  jobs: ReportingJobVerificationSummary;
  reconciliation: ReconciliationVerificationSummary;
};

function reportingUrl(path: string): string {
  return `${API_BASE_URL}/Reporting/${path}`;
}

export async function fetchSqliteReportingVerification(
  token: string
): Promise<SqliteReportingVerificationResponse> {
  const response = await fetch(reportingUrl("sqlite-verification"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as SqliteReportingVerificationResponse;
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
