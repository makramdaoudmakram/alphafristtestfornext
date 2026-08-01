import { getOfflineDb } from "@/lib/offline/db";
import type { SyncOperation, SyncQueueItem } from "@/lib/offline/types";

export type EnqueueInput = {
  entityType: string;
  operation: SyncOperation;
  clientMutationId: string;
  entityId?: string | number | null;
  payload: unknown;
};

function now(): number {
  return Date.now();
}

export async function enqueueSyncItem(input: EnqueueInput): Promise<number> {
  const db = getOfflineDb();
  const ts = now();

  const existing = await db.syncQueue
    .where("clientMutationId")
    .equals(input.clientMutationId)
    .first();

  if (existing?.id != null) {
    await db.syncQueue.update(existing.id, {
      entityType: input.entityType,
      operation: input.operation,
      entityId: input.entityId,
      payload: input.payload,
      updatedAt: ts,
      status: "pending",
      lastError: undefined,
    });
    return existing.id;
  }

  const record: SyncQueueItem = {
    entityType: input.entityType,
    operation: input.operation,
    clientMutationId: input.clientMutationId,
    entityId: input.entityId,
    payload: input.payload,
    createdAt: ts,
    updatedAt: ts,
    retryCount: 0,
    status: "pending",
  };

  return db.syncQueue.add(record);
}

export async function getPendingSyncItems(
  limit = 50
): Promise<SyncQueueItem[]> {
  const db = getOfflineDb();
  const rows = await db.syncQueue
    .where("status")
    .equals("pending")
    .sortBy("createdAt");
  return rows.slice(0, limit);
}

export async function countPendingSyncItems(): Promise<number> {
  const db = getOfflineDb();
  return db.syncQueue.where("status").equals("pending").count();
}

export async function markSyncItemProcessing(id: number): Promise<void> {
  const db = getOfflineDb();
  await db.syncQueue.update(id, {
    status: "processing",
    updatedAt: now(),
  });
}

export async function markSyncItemDone(id: number): Promise<void> {
  const db = getOfflineDb();
  await db.syncQueue.delete(id);
}

export async function markSyncItemFailed(
  id: number,
  message: string,
  options?: { retry: boolean; maxRetries: number }
): Promise<"pending" | "failed"> {
  const db = getOfflineDb();
  const row = await db.syncQueue.get(id);
  if (!row) return "failed";

  const retryCount = row.retryCount + 1;
  const maxRetries = options?.maxRetries ?? 8;
  const shouldRetry = options?.retry !== false && retryCount < maxRetries;
  const status = shouldRetry ? "pending" : "failed";

  await db.syncQueue.update(id, {
    retryCount,
    lastError: message,
    updatedAt: now(),
    status,
  });

  return status;
}

export async function resetFailedSyncItem(id: number): Promise<void> {
  const db = getOfflineDb();
  await db.syncQueue.update(id, {
    status: "pending",
    retryCount: 0,
    lastError: undefined,
    updatedAt: now(),
  });
}

export async function listFailedSyncItems(): Promise<SyncQueueItem[]> {
  const db = getOfflineDb();
  return db.syncQueue.where("status").equals("failed").sortBy("createdAt");
}

export async function clearSyncQueue(): Promise<void> {
  const db = getOfflineDb();
  await db.syncQueue.clear();
}

export async function getMeta(key: string): Promise<string | null> {
  const db = getOfflineDb();
  const row = await db.meta.get(key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = getOfflineDb();
  await db.meta.put({ key, value, updatedAt: now() });
}
