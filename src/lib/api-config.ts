/** Client-side path — all browser requests go through the Next.js proxy. */
export const API_BASE_URL = "/api/alfa";

/** Local Alfa API (https profile). */
export const DEV_ALFA_API_URL = "https://localhost:7211";

/** Published Alfa API (Swagger: /swagger/index.html). */
export const PROD_ALFA_API_URL = "https://apipharm.aghapy-company.com";

/**
 * Server-side Alfa API base URL (no trailing slash, no /swagger).
 * Set `ALFA_API_URL` in `.env.local` (dev) or hosting env vars (production).
 */
export function getAlfaApiUrl(): string {
  const configured =
    process.env.ALFA_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configured) return configured.replace(/\/$/, "");

  return process.env.NODE_ENV === "production"
    ? PROD_ALFA_API_URL
    : DEV_ALFA_API_URL;
}

/** Human-readable hint for error messages in the UI. */
export function getAlfaApiHint(): string {
  return process.env.NODE_ENV === "production"
    ? PROD_ALFA_API_URL
    : DEV_ALFA_API_URL;
}
