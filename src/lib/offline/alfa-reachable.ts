import { API_BASE_URL } from "@/lib/api-config";
import { ApiError } from "@/lib/api-client";

export function isDuplicateKeyError(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return true;
    }
    const msg = error.message;
    if (
      /duplicate key|PK_Unit|already exists|Violation of PRIMARY KEY|2627|2601/i.test(
        msg
      )
    ) {
      return true;
    }
  }
  if (error instanceof Error) {
    const msg = error.message;
    if (/duplicate key|PK_Unit|Violation of PRIMARY KEY/i.test(msg)) {
      return true;
    }
  }
  return false;
}

export function isLikelyNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof ApiError) {
    if (error.status >= 502 && error.status <= 504) {
      return true;
    }
    if (/cannot reach alfa api/i.test(error.message)) {
      return true;
    }
  }
  if (error instanceof Error && /cannot reach alfa api/i.test(error.message)) {
    return true;
  }
  return false;
}

export function isPermanentSyncError(error: unknown): boolean {
  if (isDuplicateKeyError(error)) {
    return false;
  }
  if (error instanceof ApiError) {
    if (error.status === 400 || error.status === 404) {
      return true;
    }
  }
  return false;
}

/** True when the Next.js Alfa proxy can talk to the backend (401/404 still counts as up). */
export async function isAlfaApiReachable(timeoutMs = 5000): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}/Unit`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504
    ) {
      return false;
    }
    if (response.status === 401 || response.status === 403) {
      return true;
    }
    if (response.ok) {
      return true;
    }
    const text = await response.text();
    return !/cannot reach alfa api/i.test(text);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
