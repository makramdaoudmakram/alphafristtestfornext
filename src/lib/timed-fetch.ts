export const API_CLIENT_TIMEOUT_MS = 28_000;
export const REQUEST_ID_HEADER = "X-Request-Id";

export class ApiTimeoutError extends Error {
  constructor(ms = API_CLIENT_TIMEOUT_MS) {
    super(
      `Request timed out after ${Math.round(ms / 1000)} seconds. The save did not finish. This is not a Vercel 504 — the client stopped waiting.`
    );
    this.name = "ApiTimeoutError";
  }
}

export function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

export async function timedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = API_CLIENT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer =
    timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;
  const onAbort = () => controller.abort();
  init.signal?.addEventListener("abort", onAbort);

  const headers = new Headers(init.headers);
  if (!headers.has(REQUEST_ID_HEADER)) {
    headers.set(REQUEST_ID_HEADER, newRequestId());
  }

  try {
    return await fetch(input, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted && !init.signal?.aborted) {
      throw new ApiTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    init.signal?.removeEventListener("abort", onAbort);
  }
}
