import Dexie, { type Table } from "dexie";
import type { SyncQueueItem } from "@/lib/offline/types";
import type { UnitCacheRecord } from "@/lib/offline/units/types";

export type OfflineMetaRecord = {
  key: string;
  value: string;
  updatedAt: number;
};

class OfflineDatabase extends Dexie {
  syncQueue!: Table<SyncQueueItem, number>;
  meta!: Table<OfflineMetaRecord, string>;
  units!: Table<UnitCacheRecord, string>;

  constructor() {
    super("AlfaOffline");

    this.version(1).stores({
      syncQueue:
        "++id, status, entityType, clientMutationId, createdAt, [status+createdAt]",
      meta: "key",
    });

    this.version(2).stores({
      syncQueue:
        "++id, status, entityType, clientMutationId, createdAt, [status+createdAt]",
      meta: "key",
      units: "uCode, updatedAt",
    });
  }
}

let db: OfflineDatabase | null = null;

export function isOfflineDbAvailable(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

/** Browser-only Dexie instance (throws on server). */
export function getOfflineDb(): OfflineDatabase {
  if (!isOfflineDbAvailable()) {
    throw new Error("Offline database is only available in the browser.");
  }
  if (!db) {
    db = new OfflineDatabase();
  }
  return db;
}

export async function resetOfflineDbForTests(): Promise<void> {
  if (!db) return;
  await db.delete();
  db = null;
}
