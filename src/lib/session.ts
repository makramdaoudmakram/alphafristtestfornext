import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { getAuthConfigError, ensureAuthEnv } from "./env";

export async function getSession() {
  ensureAuthEnv();

  if (getAuthConfigError()) {
    return null;
  }

  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error("[auth] getServerSession failed:", error);
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
