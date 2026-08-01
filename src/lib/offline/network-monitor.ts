import type { NetworkListener, NetworkStatus } from "@/lib/offline/types";

export type NetworkMonitorOptions = {
  probeUrl?: string;
  probeTimeoutMs?: number;
  /** Interval while online to re-probe (default 30s). 0 = disabled. */
  probeIntervalMs?: number;
};

/**
 * Tracks browser online/offline and optional HTTP reachability probes.
 * Safe to construct only in the browser (call `createNetworkMonitor` from client code).
 */
export class NetworkMonitor {
  private listeners = new Set<NetworkListener>();
  private online: boolean;
  private status: NetworkStatus;
  private probeTimer: ReturnType<typeof setInterval> | null = null;
  private readonly options: Required<
    Pick<NetworkMonitorOptions, "probeTimeoutMs" | "probeIntervalMs">
  > &
    NetworkMonitorOptions;

  constructor(options: NetworkMonitorOptions = {}) {
    this.options = {
      probeTimeoutMs: options.probeTimeoutMs ?? 5000,
      probeIntervalMs: options.probeIntervalMs ?? 30_000,
      probeUrl: options.probeUrl,
    };

    const initial =
      typeof navigator !== "undefined" ? navigator.onLine : true;
    this.online = initial;
    this.status = initial ? "online" : "offline";

    if (typeof window !== "undefined") {
      window.addEventListener("online", this.onBrowserOnline);
      window.addEventListener("offline", this.onBrowserOffline);
      void this.refresh(true);
      this.startProbeInterval();
    }
  }

  getIsOnline(): boolean {
    return this.online;
  }

  getStatus(): NetworkStatus {
    return this.status;
  }

  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    listener(this.online, this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Re-check connectivity (browser flag + optional probe). */
  async refresh(silent = false): Promise<boolean> {
    if (typeof navigator === "undefined") {
      this.setState(true, "unknown", silent);
      return true;
    }

    if (!navigator.onLine) {
      this.setState(false, "offline", silent);
      return false;
    }

    if (!this.options.probeUrl) {
      this.setState(true, "online", silent);
      return true;
    }

    const reachable = await this.probe();
    this.setState(reachable, reachable ? "online" : "offline", silent);
    return reachable;
  }

  dispose(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.onBrowserOnline);
      window.removeEventListener("offline", this.onBrowserOffline);
    }
    if (this.probeTimer) {
      clearInterval(this.probeTimer);
      this.probeTimer = null;
    }
    this.listeners.clear();
  }

  private onBrowserOnline = (): void => {
    void this.refresh();
  };

  private onBrowserOffline = (): void => {
    this.setState(false, "offline");
  };

  private startProbeInterval(): void {
    if (!this.options.probeUrl || this.options.probeIntervalMs <= 0) return;
    this.probeTimer = setInterval(() => {
      if (this.online) void this.refresh(true);
    }, this.options.probeIntervalMs);
  }

  private async probe(): Promise<boolean> {
    const url = this.options.probeUrl;
    if (!url) return navigator.onLine;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.options.probeTimeoutMs
    );

    try {
      const response = await fetch(url, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private setState(online: boolean, status: NetworkStatus, silent = false): void {
    const changed = this.online !== online || this.status !== status;
    this.online = online;
    this.status = status;
    if (!changed && !silent) return;
    if (silent && !changed) return;
    for (const listener of this.listeners) {
      listener(this.online, this.status);
    }
  }
}

let defaultMonitor: NetworkMonitor | null = null;

export function getNetworkMonitor(
  options?: NetworkMonitorOptions
): NetworkMonitor {
  if (typeof window === "undefined") {
    throw new Error("NetworkMonitor is only available in the browser.");
  }
  if (!defaultMonitor) {
    defaultMonitor = new NetworkMonitor(options);
  }
  return defaultMonitor;
}
