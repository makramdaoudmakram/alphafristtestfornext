import { ensureAuthEnv } from "@/lib/env";

export async function register() {
  ensureAuthEnv();
}
