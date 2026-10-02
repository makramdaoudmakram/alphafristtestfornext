import { API_BASE_URL } from "@/lib/api-config";
import type {
  DiagnosticsApiErrorBody,
  DiagnosticsBenchmarkRequest,
  DiagnosticsBenchmarkResponse,
  DiagnosticsConcurrencyRequest,
  DiagnosticsConcurrencyResponse,
  DiagnosticsDbPingResponse,
  DiagnosticsLookupEntry,
  DiagnosticsOptionsResponse,
  DiagnosticsPingResponse,
  DiagnosticsQueueLagResponse,
  DiagnosticsSamplePayloadResponse,
  DiagnosticsSetupCheckItem,
  DiagnosticsSetupCheckResponse,
  DiagnosticsXDiagHeaders,
} from "./diagnostics-types";

export { DIAGNOSTICS_NAV_PERMISSION } from "./diagnostics-types";

export function isDiagnosticsAdmin(roles: string[]): boolean {
  return roles.some((role) => {
    const normalized = role.toLowerCase();
    return normalized === "admin" || normalized === "superadmin";
  });
}

function diagnosticsUrl(path: string): string {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE_URL}/Diagnostics/${normalized}`;
}

function alfaApiUrl(path: string): string {
  let normalized = path.trim();
  normalized = normalized.replace(/^\/api\/?/i, "");
  normalized = normalized.replace(/^\//, "");
  return `${API_BASE_URL}/${normalized}`;
}

export function formatDiagnosticsApiError(
  body: DiagnosticsApiErrorBody
): string {
  const message = body.message?.trim();
  const type = body.exceptionType?.trim();
  if (message && type) return `${message} (${type})`;
  if (message) return message;
  if (type) return type;
  return "Request failed.";
}

async function readApiErrorBody(
  response: Response
): Promise<DiagnosticsApiErrorBody & { status: number }> {
  const text = await response.text();
  if (!text) return { status: response.status, message: `HTTP ${response.status}` };
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    const message =
      typeof body.message === "string"
        ? body.message
        : typeof body.Message === "string"
          ? body.Message
          : typeof body.title === "string"
            ? body.title
            : typeof body.detail === "string"
              ? body.detail
              : undefined;
    const exceptionType =
      typeof body.exceptionType === "string" ? body.exceptionType : undefined;
    const innerMessage =
      typeof body.innerMessage === "string" ? body.innerMessage : undefined;
    if (message || exceptionType) {
      return { status: response.status, message, exceptionType, innerMessage };
    }
  } catch {
    return {
      status: response.status,
      message: text.slice(0, 200) || `HTTP ${response.status}`,
    };
  }
  return { status: response.status, message: `HTTP ${response.status}` };
}

async function readErrorMessage(response: Response): Promise<string> {
  const body = await readApiErrorBody(response);
  return formatDiagnosticsApiError(body);
}

export function parseXDiagHeaders(response: Response): DiagnosticsXDiagHeaders {
  const get = (name: string) => response.headers.get(name);
  const serverMsRaw = get("X-Diag-ServerMs");
  const serverMs = serverMsRaw != null ? Number(serverMsRaw) : null;
  const exposed =
    serverMsRaw != null ||
    get("X-Diag-Commands") != null ||
    get("X-Diag-ServerMs") != null;

  return {
    serverMs: serverMs != null && !Number.isNaN(serverMs) ? serverMs : null,
    commands: numberHeader(get("X-Diag-Commands")),
    saveChanges: numberHeader(get("X-Diag-SaveChanges")),
    dbMs: numberHeader(get("X-Diag-DbMs")),
    transactionMs: numberHeader(get("X-Diag-TransactionMs")),
    authCommands: numberHeader(get("X-Diag-AuthCommands")),
    n1Top: get("X-Diag-N1Top"),
    exposed,
  };
}

function numberHeader(value: string | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function checkDiagnosticsEnabled(
  token: string,
  signal?: AbortSignal
): Promise<boolean> {
  const response = await fetch(diagnosticsUrl("ping"), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  return response.status !== 404;
}

export async function diagnosticsPing(
  token: string,
  signal?: AbortSignal
): Promise<{ data: DiagnosticsPingResponse; browserMs: number }> {
  const started = performance.now();
  const response = await fetch(diagnosticsUrl("ping"), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  const browserMs = Math.round(performance.now() - started);
  if (response.status === 404) {
    throw new DiagnosticsDisabledError();
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const data = (await response.json()) as DiagnosticsPingResponse;
  return { data, browserMs };
}

export async function diagnosticsDbPing(
  token: string,
  count = 20,
  signal?: AbortSignal
): Promise<DiagnosticsDbPingResponse> {
  const response = await fetch(
    diagnosticsUrl(`db-ping?count=${encodeURIComponent(String(count))}`),
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal,
    }
  );
  if (response.status === 404) throw new DiagnosticsDisabledError();
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return response.json() as Promise<DiagnosticsDbPingResponse>;
}

export type DiagnosticsLookupKind =
  | "vendor"
  | "customer"
  | "store"
  | "item"
  | "movement";

export async function diagnosticsLookup(
  token: string,
  kind: DiagnosticsLookupKind,
  q?: string,
  take = 50,
  signal?: AbortSignal,
  operation?: string
): Promise<DiagnosticsLookupEntry[]> {
  const params = new URLSearchParams({
    kind,
    take: String(take),
  });
  const term = q?.trim();
  if (term) params.set("q", term);
  if (kind === "movement" && operation?.trim()) {
    params.set("operation", operation.trim());
  }

  const response = await fetch(
    diagnosticsUrl(`lookup?${params.toString()}`),
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal,
    }
  );
  if (response.status === 404) throw new DiagnosticsDisabledError();
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return response.json() as Promise<DiagnosticsLookupEntry[]>;
}

export async function diagnosticsSetupCheck(
  token: string,
  signal?: AbortSignal
): Promise<DiagnosticsSetupCheckResponse> {
  const response = await fetch(diagnosticsUrl("setup-check"), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (response.status === 404) throw new DiagnosticsDisabledError();
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return response.json() as Promise<DiagnosticsSetupCheckResponse>;
}

export async function diagnosticsSetupCheckOperation(
  token: string,
  operation: string,
  lines: number,
  storeId?: number,
  stockIds?: number[],
  employeeId?: number,
  signal?: AbortSignal
): Promise<DiagnosticsSetupCheckItem> {
  const params = new URLSearchParams({
    operation,
    lines: String(lines),
  });
  if (storeId != null && storeId > 0) {
    params.set("storeId", String(storeId));
  }
  if (stockIds != null && stockIds.length > 0) {
    params.set("stockIds", stockIds.join(","));
  }
  if (employeeId != null && employeeId > 0) {
    params.set("employeeId", String(employeeId));
  }

  const response = await fetch(
    diagnosticsUrl(`setup-check?${params.toString()}`),
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal,
    }
  );
  if (response.status === 404) throw new DiagnosticsDisabledError();
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return response.json() as Promise<DiagnosticsSetupCheckItem>;
}

export async function diagnosticsOptions(
  token: string,
  signal?: AbortSignal
): Promise<DiagnosticsOptionsResponse> {
  const response = await fetch(diagnosticsUrl("options"), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (response.status === 404) throw new DiagnosticsDisabledError();
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return response.json() as Promise<DiagnosticsOptionsResponse>;
}

export async function diagnosticsBenchmark(
  token: string,
  body: DiagnosticsBenchmarkRequest,
  signal?: AbortSignal
): Promise<{ data: DiagnosticsBenchmarkResponse; browserMs: number }> {
  const started = performance.now();
  const response = await fetch(diagnosticsUrl("benchmark"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });
  const browserMs = Math.round(performance.now() - started);
  if (response.status === 404) throw new DiagnosticsDisabledError();
  if (!response.ok) throw new Error(await readErrorMessage(response));
  const data = (await response.json()) as DiagnosticsBenchmarkResponse;
  return { data, browserMs };
}

export async function diagnosticsConcurrency(
  token: string,
  body: DiagnosticsConcurrencyRequest,
  signal?: AbortSignal
): Promise<{ data: DiagnosticsConcurrencyResponse; browserMs: number }> {
  const started = performance.now();
  const response = await fetch(diagnosticsUrl("concurrency"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });
  const browserMs = Math.round(performance.now() - started);
  if (response.status === 404) throw new DiagnosticsDisabledError();
  if (!response.ok) throw new Error(await readErrorMessage(response));
  const data = (await response.json()) as DiagnosticsConcurrencyResponse;
  return { data, browserMs };
}

export type DiagnosticsQueueHealthResponse = {
  workerRunning: boolean;
  pendingCount: number;
  processingCount: number;
  retryPendingCount: number;
  failedCount: number;
  oldestPendingAgeSeconds: number;
  stuckProcessingCount: number;
  stuckReason: string | null;
};

export async function diagnosticsQueueHealth(
  token: string,
  signal?: AbortSignal
): Promise<DiagnosticsQueueHealthResponse> {
  const response = await fetch(diagnosticsUrl("queue-health"), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (response.status === 404) throw new DiagnosticsDisabledError();
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return response.json() as Promise<DiagnosticsQueueHealthResponse>;
}

export async function diagnosticsQueueLag(
  token: string,
  jobKind: string,
  headerId: number,
  timeoutSeconds = 30,
  signal?: AbortSignal
): Promise<DiagnosticsQueueLagResponse> {
  const params = new URLSearchParams({
    jobKind,
    headerId: String(headerId),
    timeoutSeconds: String(timeoutSeconds),
  });
  const response = await fetch(
    diagnosticsUrl(`queue-lag?${params.toString()}`),
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal,
    }
  );
  if (response.status === 404) throw new DiagnosticsDisabledError();
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return response.json() as Promise<DiagnosticsQueueLagResponse>;
}

export async function diagnosticsSamplePayload(
  token: string,
  query: {
    operation: string;
    lines: number;
    itemIds: number[];
    vendorId?: string;
    movmentRowId?: number;
  },
  signal?: AbortSignal
): Promise<DiagnosticsSamplePayloadResponse> {
  const params = new URLSearchParams({
    operation: query.operation,
    lines: String(query.lines),
  });
  for (const id of query.itemIds) {
    params.append("itemIds", String(id));
  }
  if (query.vendorId) params.set("vendorId", query.vendorId);
  if (query.movmentRowId != null) {
    params.set("movmentRowId", String(query.movmentRowId));
  }

  const response = await fetch(
    diagnosticsUrl(`sample-payload?${params.toString()}`),
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal,
    }
  );
  if (response.status === 404) throw new DiagnosticsDisabledError();
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return response.json() as Promise<DiagnosticsSamplePayloadResponse>;
}

export async function diagnosticsRealRequest(
  token: string,
  method: string,
  path: string,
  body: unknown | undefined,
  signal?: AbortSignal
): Promise<{
  browserMs: number;
  status: number;
  headers: DiagnosticsXDiagHeaders;
  ok: boolean;
  error?: string;
}> {
  const started = performance.now();
  const headers = new Headers({
    Authorization: `Bearer ${token}`,
    "X-Diag": "1",
  });
  if (body != null) headers.set("Content-Type", "application/json");

  const response = await fetch(alfaApiUrl(path), {
    method: method.toUpperCase(),
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    signal,
  });
  const browserMs = Math.round(performance.now() - started);
  const xDiag = parseXDiagHeaders(response);
  const ok = response.ok;
  let error: string | undefined;
  if (!ok) {
    error = await readErrorMessage(response);
  } else {
    await response.text().catch(() => undefined);
  }

  return { browserMs, status: response.status, headers: xDiag, ok, error };
}

export class DiagnosticsDisabledError extends Error {
  constructor() {
    super("Diagnostics is disabled on the server");
    this.name = "DiagnosticsDisabledError";
  }
}
