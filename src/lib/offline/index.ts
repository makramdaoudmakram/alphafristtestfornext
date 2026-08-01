export type {
  EnqueueInput,
} from "@/lib/offline/sync-queue";
export {
  clearSyncQueue,
  countPendingSyncItems,
  enqueueSyncItem,
  getMeta,
  getPendingSyncItems,
  listFailedSyncItems,
  markSyncItemDone,
  markSyncItemFailed,
  markSyncItemProcessing,
  resetFailedSyncItem,
  setMeta,
} from "@/lib/offline/sync-queue";

export {
  getOfflineDb,
  isOfflineDbAvailable,
  resetOfflineDbForTests,
} from "@/lib/offline/db";
export type { OfflineMetaRecord } from "@/lib/offline/db";

export {
  getNetworkMonitor,
  NetworkMonitor,
} from "@/lib/offline/network-monitor";
export type { NetworkMonitorOptions } from "@/lib/offline/network-monitor";

export {
  createOfflineInfrastructure,
  getSyncEngine,
  SyncEngine,
} from "@/lib/offline/sync-engine";
export type { CreateOfflineInfrastructureOptions } from "@/lib/offline/sync-engine";

export type {
  NetworkListener,
  NetworkStatus,
  SyncEngineEvent,
  SyncEngineListener,
  SyncEngineOptions,
  SyncHandler,
  SyncHandlerResult,
  SyncOperation,
  SyncQueueItem,
  SyncQueueStatus,
} from "@/lib/offline/types";
