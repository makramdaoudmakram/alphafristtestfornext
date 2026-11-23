import { ApiError } from "@/lib/api-client";

/** User-safe message when GET UnitConversion/info fails (HTTP or transport). */
export function unitConversionRequestErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const text = err.message.trim();
    if (text.length > 0) return text;
  }

  if (err instanceof Error) {
    const text = err.message.trim();
    if (text.length > 0) return text;
  }

  return "Unit conversion failed.";
}