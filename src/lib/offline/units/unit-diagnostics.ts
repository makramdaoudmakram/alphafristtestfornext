import { getOfflineDb } from "@/lib/offline/db";
import {
  listFailedSyncItems,
  resetFailedSyncItem,
} from "@/lib/offline/sync-queue";
import { getAllCachedUnitRows } from "@/lib/offline/units/unit-store";
import { UNIT_ENTITY_TYPE } from "@/lib/offline/units/unit-sync";
import type { SyncQueueItem } from "@/lib/offline/types";

export type UnitOfflineStats = {
  cachedCount: number;
  pendingSyncCount: number;
  queuePending: number;
  queueFailed: number;
};

export async function getUnitOfflineStats(): Promise<UnitOfflineStats> {
  const rows = await getAllCachedUnitRows();
  const cachedCount = rows.length;
  const pendingSyncCount = rows.filter((r) => r.pendingSync).length;

  let queuePending = 0;
  let queueFailed = 0;

  try {
    const db = getOfflineDb();
    const queueItems = await db.syncQueue
      .where("entityType")
      .equals(UNIT_ENTITY_TYPE)
      .toArray();
    for (const item of queueItems) {
      if (item.status === "pending" || item.status === "processing") {
        queuePending += 1;
      } else if (item.status === "failed") {
        queueFailed += 1;
      }
    }
  } catch {
    /* IndexedDB unavailable */
  }

  return {
    cachedCount,
    pendingSyncCount,
    queuePending,
    queueFailed,
  };
}

export async function listFailedUnitSyncItems(): Promise<SyncQueueItem[]> {
  const failed = await listFailedSyncItems();
  return failed.filter((item) => item.entityType === UNIT_ENTITY_TYPE);
}

export async function retryAllFailedUnitSyncItems(): Promise<number> {
  const failed = await listFailedUnitSyncItems();
  for (const item of failed) {
    if (item.id != null) {
      await resetFailedSyncItem(item.id);
    }
  }
  return failed.length;
}
