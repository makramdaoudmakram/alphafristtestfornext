export const DIAGNOSTICS_NAV_PERMISSION = "__diagnostics_admin__";

export type DiagnosticsPingResponse = {
  utcNow: string;
  serverTicks: number;
};

export type DiagnosticsLatencyStats = {
  count: number;
  minMs: number;
  avgMs: number;
  maxMs: number;
  p95Ms: number;
};

export type DiagnosticsDbPingResponse = {
  count: number;
  sqlServer: DiagnosticsLatencyStats;
  sqlite: DiagnosticsLatencyStats;
};

export type DiagnosticsLookupItem = {
  id: number;
  name: string;
  code?: string | null;
};

export type DiagnosticsLookupVendor = {
  id: string;
  name: string;
  code?: string | null;
};

export type DiagnosticsLookupCustomer = {
  id: number;
  name: string;
  code?: string | null;
};

/** Unified row shape from GET /Diagnostics/lookup */
export type DiagnosticsLookupEntry = {
  id: string;
  name: string;
  code: string;
};

export type DiagnosticsApiErrorBody = {
  message?: string;
  exceptionType?: string;
  innerMessage?: string;
};

export type DiagnosticsUsedDefault = {
  name: string;
  value: string;
};

export type DiagnosticsOperationInfo = {
  key: string;
  label: string;
  needsVendor: boolean;
  needsCustomer: boolean;
  needsPharmacyScope: boolean;
  needsStock: boolean;
  needsMovement: boolean;
  needsEmployee: boolean;
  movements?: DiagnosticsLookupItem[];
};

export type DiagnosticsSetupCheckItem = {
  operation: string;
  runnable: boolean;
  missing: string[];
  usedDefaults: DiagnosticsUsedDefault[];
};

export type DiagnosticsSetupCheckResponse = {
  operations: DiagnosticsSetupCheckItem[];
};

export type DiagnosticsOptionsResponse = {
  items: DiagnosticsLookupItem[];
  stores: DiagnosticsLookupItem[];
  vendors: DiagnosticsLookupVendor[];
  customers: DiagnosticsLookupCustomer[];
  movements: DiagnosticsLookupItem[];
  operations: DiagnosticsOperationInfo[];
  hasPharmacyScope: boolean;
  pharmacyScopeMessage: string | null;
};

export type DiagnosticsBenchmarkRequest = {
  operation: string;
  lines: number;
  repeat: number;
  itemIds: number[];
  storeId?: number;
  vendorId?: string;
  customerId?: number;
  movmentRowId?: number;
  employeeId?: number;
  stockIds?: number[];
  destinationStoreId?: number;
  salesServiceId?: number;
  paymentMethodId?: number;
  salesKindId?: number;
  deliveryEmployeeCode?: string;
  receivingEmployeePassword?: string;
};

export type DiagnosticsN1Entry = {
  count: number;
  sql: string;
};

export type DiagnosticsBenchmarkRun = {
  runIndex: number;
  phase: string;
  serverMs: number;
  commandCount: number;
  saveChangesCount: number;
  dbWaitMs: number;
  transactionMs: number;
  n1Top: DiagnosticsN1Entry[];
  jobKind?: string | null;
  headerId?: number | null;
  jobId?: number | null;
  error?: string | null;
};

export type DiagnosticsBenchmarkResponse = {
  operation: string;
  lines: number;
  truncated: boolean;
  runs: DiagnosticsBenchmarkRun[];
  warmSummary?: {
    serverMs: { min: number; median: number; max: number };
    commandCount: { min: number; median: number; max: number };
    dbWaitMs: { min: number; median: number; max: number };
  } | null;
  usedDefaults?: DiagnosticsUsedDefault[];
};

export type DiagnosticsQueueLagResponse = {
  jobKind: string;
  headerId: number;
  queueStatus: "Completed" | "Failed" | "Timeout" | "Pending";
  queueLagMs: number | null;
  jobId: number | null;
  lastError: string | null;
};

export type DiagnosticsConcurrencyRequest = {
  operation: string;
  totalSales: number;
  concurrency: number;
  deliveryEmployeeCode?: string;
  receivingEmployeePassword?: string;
};

export type DiagnosticsConcurrencyFailureGroup = {
  message: string;
  count: number;
};

export type DiagnosticsConcurrencyQueueSample = {
  elapsedSeconds: number;
  pending: number;
  processing: number;
  failed: number;
  completed: number;
};

export type DiagnosticsConcurrencyResponse = {
  operation: string;
  runId: string;
  batchNo: string;
  storeId: number;
  employeeId: number;
  totalSales: number;
  concurrency: number;
  unitsPerSale: number;
  successes: number;
  failures: number;
  failuresByMessage: DiagnosticsConcurrencyFailureGroup[];
  deadlock1205Count: number;
  lockTimeoutCount: number;
  p50ServerMs: number;
  p95ServerMs: number;
  p99ServerMs: number;
  maxServerMs: number;
  totalWallSeconds: number;
  salesPerSecond: number;
  stockBefore: number;
  stockAfter: number;
  distinctMovementNumbers: number;
  duplicateMovementNumbers: number;
  sqliteDocumentHeaderCount: number;
  queueSamples: DiagnosticsConcurrencyQueueSample[];
  usedDefaults?: DiagnosticsUsedDefault[];
};

export type DiagnosticsSamplePayloadResponse = {
  operation: string;
  payload: unknown;
  targetRoute: string;
  httpMethod: string;
};

export type DiagnosticsXDiagHeaders = {
  serverMs: number | null;
  commands: number | null;
  saveChanges: number | null;
  dbMs: number | null;
  transactionMs: number | null;
  authCommands: number | null;
  n1Top: string | null;
  exposed: boolean;
};

export type DiagnosticsResultRow = {
  id: string;
  source: "benchmark" | "real-request" | "custom";
  operation: string;
  lines: number;
  phase: string;
  browserTotalMs: number;
  serverMs: number | null;
  networkMs: number | null;
  dbWaitMs: number | null;
  transactionMs: number | null;
  commandCount: number | null;
  saveChangesCount: number | null;
  n1Top: string;
  jobKind?: string | null;
  headerId?: number | null;
  queueLagMs: number | null;
  queueStatus: string | null;
  authCommands: number | null;
  error: string | null;
  skipped: boolean;
  usedDefaults: string | null;
};
