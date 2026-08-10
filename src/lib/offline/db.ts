import Dexie, { type Table } from "dexie";

import type { SyncQueueItem } from "@/lib/offline/types";

import type { UnitCacheRecord } from "@/lib/offline/units/types";

import { parseUnitCode } from "@/lib/unit-code";



export type OfflineMetaRecord = {

  key: string;

  value: string;

  updatedAt: number;

};



class OfflineDatabase extends Dexie {

  syncQueue!: Table<SyncQueueItem, number>;

  meta!: Table<OfflineMetaRecord, string>;

  units!: Table<UnitCacheRecord, number>;



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



    this.version(3).stores({

      syncQueue:

        "++id, status, entityType, clientMutationId, createdAt, [status+createdAt]",

      meta: "key",

      units: "uCode, updatedAt",

    }).upgrade(async (transaction) => {

      const table = transaction.table("units");

      const rows = await table.toArray();

      await table.clear();

      for (const row of rows) {

        const legacy = row as UnitCacheRecord & { uCode?: string | number };

        const code = parseUnitCode(legacy.uCode);

        if (code == null) continue;

        await table.put({

          uCode: code,

          uNameAr: legacy.uNameAr ?? "",

          uNameEn: legacy.uNameEn ?? "",

          updatedAt: legacy.updatedAt ?? Date.now(),

          pendingSync: legacy.pendingSync === true,

        });

      }

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

