import { getNetworkMonitor } from "@/lib/offline/network-monitor";

const STORAGE_KEY = "alfa-simulate-offline";
export const SIMULATE_OFFLINE_CHANGED = "alfa-simulate-offline-changed";

export function getSimulateOffline(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSimulateOffline(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(SIMULATE_OFFLINE_CHANGED));
}

export function subscribeSimulateOffline(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(SIMULATE_OFFLINE_CHANGED, handler);
  return () => window.removeEventListener(SIMULATE_OFFLINE_CHANGED, handler);
}

/** Browser/probe online and not in test simulate-offline mode. */
export function getEffectiveOnlineSync(): boolean {
  if (getSimulateOffline()) return false;
  return getNetworkMonitor().getIsOnline();
}

/** Like getEffectiveOnlineSync but may probe when a probe URL is configured. */
export async function refreshEffectiveOnline(): Promise<boolean> {
  if (getSimulateOffline()) return false;
  const network = getNetworkMonitor();
  if (!network.getIsOnline()) return false;
  return network.refresh(true);
}
