import { ApiError } from "@/lib/api-client";

export type ShiftSessionFailureKind =
  | "authorization"
  | "missing_pharmacy"
  | "network"
  | "unknown";

export function classifyShiftApiError(error: unknown): ShiftSessionFailureKind {
  if (!(error instanceof ApiError)) {
    return "unknown";
  }
  if (error.status === 403) {
    return "authorization";
  }
  if (error.status === 400) {
    return "missing_pharmacy";
  }
  if (error.status === 0 || error.status >= 500) {
    return "network";
  }
  return "unknown";
}

export function shiftApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const body = error.message?.trim();
    if (body) return body;
  }
  return fallback;
}

export function shiftSessionStatusLabel(kind: ShiftSessionFailureKind): string {
  switch (kind) {
    case "authorization":
      return "Authorization denied";
    case "missing_pharmacy":
      return "No active pharmacy";
    case "network":
      return "Network error";
    default:
      return "Unavailable";
  }
}
