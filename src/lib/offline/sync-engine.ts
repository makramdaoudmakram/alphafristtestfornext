import {
  getNetworkMonitor,
  type NetworkMonitor,
  type NetworkMonitorOptions,
} from "@/lib/offline/network-monitor";
import {
  countPendingSyncItems,
  getPendingSyncItems,
  markSyncItemDone,
  markSyncItemFailed,
  markSyncItemProcessing,
} from "@/lib/offline/sync-queue";
import { isAlfaApiReachable } from "@/lib/offline/alfa-reachable";
import { getSimulateOffline } from "@/lib/offline/effective-online";
import type {
  SyncEngineEvent,
  SyncEngineListener,
  SyncEngineOptions,
  SyncHandler,
  SyncQueueItem,
} from "@/lib/offline/types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Processes Dexie sync queue items using registered per-entity handlers.
 */
export class SyncEngine {
  private handlers = new Map<string, SyncHandler>();
  private listeners = new Set<SyncEngineListener>();
  private running = false;
  private autoSyncStarted = false;
  private unsubscribeNetwork: (() => void) | null = null;
  private readonly options: Required<
    Pick<SyncEngineOptions, "batchSize" | "retryBaseMs" | "maxRetries">
  > &
    SyncEngineOptions;

  constructor(
    private readonly network: NetworkMonitor,
    options: SyncEngineOptions = {}
  ) {
    this.options = {
      batchSize: options.batchSize ?? 20,
      retryBaseMs: options.retryBaseMs ?? 2000,
      maxRetries: options.maxRetries ?? 8,
      probeUrl: options.probeUrl,
      probeTimeoutMs: options.probeTimeoutMs,
    };
  }

  registerHandler(entityType: string, handler: SyncHandler): () => void {
    this.handlers.set(entityType, handler);
    return () => {
      this.handlers.delete(entityType);
    };
  }

  subscribe(listener: SyncEngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Process pending queue while online (no-op if already running or offline). */
  async syncNow(): Promise<void> {
    if (this.running) return;
    if (getSimulateOffline()) return;
    if (!this.network.getIsOnline()) return;

    const online = await this.network.refresh(true);
    if (!online) return;

    if (!(await isAlfaApiReachable())) return;

    this.running = true;
    this.emit({ type: "sync-started" });

    try {
      const batch = await getPendingSyncItems(this.options.batchSize);

      for (const item of batch) {
        if (!this.network.getIsOnline()) break;
        await this.processItem(item);
      }
    } finally {
      this.running = false;
      const pendingCount = await countPendingSyncItems();
      this.emit({ type: "sync-idle", pendingCount });
    }
  }

  /** Subscribe to network monitor and sync when connectivity returns. */
  startAutoSync(): void {
    if (this.autoSyncStarted) return;
    this.autoSyncStarted = true;

    this.unsubscribeNetwork = this.network.subscribe((online) => {
      if (online) void this.syncNow();
    });

    if (this.network.getIsOnline()) {
      void this.syncNow();
    }
  }

  stopAutoSync(): void {
    this.autoSyncStarted = false;
    this.unsubscribeNetwork?.();
    this.unsubscribeNetwork = null;
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    if (item.id == null) return;

    const handler = this.handlers.get(item.entityType);
    if (!handler) {
      const status = await markSyncItemFailed(
        item.id,
        `No sync handler for "${item.entityType}"`,
        {
          retry: false,
          maxRetries: this.options.maxRetries,
        }
      );
      if (status === "failed") {
        this.emit({
          type: "item-failed",
          item,
          message: `No sync handler for "${item.entityType}"`,
        });
      }
      return;
    }

    if (item.retryCount > 0) {
      const delay =
        this.options.retryBaseMs * Math.pow(2, Math.min(item.retryCount - 1, 6));
      await sleep(delay);
    }

    await markSyncItemProcessing(item.id);

    try {
      const result = await handler(item);
      this.emit({ type: "item-processed", item, result });

      if (result.ok) {
        await markSyncItemDone(item.id);
        return;
      }

      const status = await markSyncItemFailed(item.id, result.message, {
        retry: result.retry,
        maxRetries: this.options.maxRetries,
      });
      if (status === "failed") {
        this.emit({ type: "item-failed", item, message: result.message });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Sync handler threw unexpectedly";
      const status = await markSyncItemFailed(item.id, message, {
        retry: true,
        maxRetries: this.options.maxRetries,
      });
      if (status === "failed") {
        this.emit({ type: "item-failed", item, message });
      }
    }
  }

  private emit(event: SyncEngineEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

let defaultEngine: SyncEngine | null = null;

export type CreateOfflineInfrastructureOptions = NetworkMonitorOptions &
  SyncEngineOptions;

/** Singleton offline stack for the browser session. */
export function createOfflineInfrastructure(
  options: CreateOfflineInfrastructureOptions = {}
): { network: NetworkMonitor; syncEngine: SyncEngine } {
  if (typeof window === "undefined") {
    throw new Error("Offline infrastructure is only available in the browser.");
  }

  const network = getNetworkMonitor({
    probeUrl: options.probeUrl,
    probeTimeoutMs: options.probeTimeoutMs,
    probeIntervalMs: options.probeIntervalMs,
  });

  if (!defaultEngine) {
    defaultEngine = new SyncEngine(network, options);
  }

  return { network, syncEngine: defaultEngine };
}

export function getSyncEngine(): SyncEngine {
  if (!defaultEngine) {
    const { syncEngine } = createOfflineInfrastructure();
    return syncEngine;
  }
  return defaultEngine;
}
