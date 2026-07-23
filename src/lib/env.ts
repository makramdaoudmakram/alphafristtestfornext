/**
 * Ensures NextAuth env vars work on Vercel preview/production deploys.
 * Vercel sets VERCEL_URL automatically (e.g. alphafristtestfornext-robk.vercel.app).
 */
export function ensureAuthEnv(): void {
  if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
  }
}

export function getNextAuthUrl(): string | undefined {
  ensureAuthEnv();
  return process.env.NEXTAUTH_URL;
}

export function getNextAuthSecret(): string | undefined {
  return process.env.NEXTAUTH_SECRET?.trim() || undefined;
}

export function isNextAuthConfigured(): boolean {
  const secret = getNextAuthSecret();
  return Boolean(
    secret &&
      secret.length >= 32 &&
      secret !== "change-this-to-a-random-secret-at-least-32-chars"
  );
}

export function getAuthConfigError(): string | null {
  ensureAuthEnv();

  if (!getNextAuthSecret()) {
    return "NEXTAUTH_SECRET is missing. Add it in Vercel → Settings → Environment Variables.";
  }

  if (getNextAuthSecret()!.length < 32) {
    return "NEXTAUTH_SECRET must be at least 32 characters.";
  }

  if (!getNextAuthUrl()) {
    return "NEXTAUTH_URL is missing. On Vercel it is set automatically from VERCEL_URL.";
  }

  return null;
}
