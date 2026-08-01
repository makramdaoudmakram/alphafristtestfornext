/** HTTP-style mutation enqueued while offline or when sync is deferred. */
export type SyncOperation = "create" | "update" | "delete";

export type SyncQueueStatus = "pending" | "processing" | "failed";

export type SyncQueueItem = {
  id?: number;
  /** Logical domain, e.g. "purchase", "itemCatalog". */
  entityType: string;
  operation: SyncOperation;
  /** Stable client-side key for dedupe / UI (UUID or temp id). */
  clientMutationId: string;
  /** Optional server entity id (for update/delete). */
  entityId?: string | number | null;
  payload: unknown;
  createdAt: number;
  updatedAt: number;
  retryCount: number;
  lastError?: string;
  status: SyncQueueStatus;
};

export type SyncHandlerResult =
  | { ok: true; serverEntityId?: string | number }
  | { ok: false; retry: boolean; message: string };

export type SyncHandler = (item: SyncQueueItem) => Promise<SyncHandlerResult>;

export type NetworkStatus = "online" | "offline" | "unknown";

export type NetworkListener = (online: boolean, status: NetworkStatus) => void;

export type SyncEngineEvent =
  | { type: "sync-started" }
  | { type: "sync-idle"; pendingCount: number }
  | { type: "item-processed"; item: SyncQueueItem; result: SyncHandlerResult }
  | { type: "item-failed"; item: SyncQueueItem; message: string };

export type SyncEngineListener = (event: SyncEngineEvent) => void;

export type SyncEngineOptions = {
  /** Max queue items processed per sync run (default 20). */
  batchSize?: number;
  /** Base delay ms for exponential backoff (default 2000). */
  retryBaseMs?: number;
  /** Max retry attempts before marking failed (default 8). */
  maxRetries?: number;
  /** Optional HEAD/GET URL to verify connectivity (default none — uses navigator.onLine only). */
  probeUrl?: string;
  probeTimeoutMs?: number;
};
