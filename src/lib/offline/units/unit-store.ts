import { getOfflineDb } from "@/lib/offline/db";
import type { UnitCacheRecord } from "@/lib/offline/units/types";
import type { UnitItem } from "@/types/unit";

export type { UnitCacheRecord } from "@/lib/offline/units/types";

function now(): number {
  return Date.now();
}

export function toUnitItem(record: UnitCacheRecord): UnitItem {
  return {
    uCode: record.uCode,
    uNameAr: record.uNameAr,
    uNameEn: record.uNameEn,
  };
}

export async function getAllCachedUnits(): Promise<UnitItem[]> {
  const rows = await getAllCachedUnitRows();
  return rows.map(({ pendingSync: _p, ...unit }) => unit);
}

export type UnitListRow = UnitItem & { pendingSync?: boolean };

export async function getAllCachedUnitRows(): Promise<UnitListRow[]> {
  const db = getOfflineDb();
  const rows = await db.units.orderBy("uCode").toArray();
  return rows.map((r) => ({
    ...toUnitItem(r),
    pendingSync: r.pendingSync === true,
  }));
}

export async function replaceAllUnits(units: UnitItem[]): Promise<void> {
  const db = getOfflineDb();
  const ts = now();
  await db.transaction("rw", db.units, async () => {
    const pending = await db.units.filter((r) => r.pendingSync === true).toArray();
    const pendingByCode = new Map(pending.map((r) => [r.uCode, r]));
    await db.units.clear();
    for (const unit of units) {
      const local = pendingByCode.get(unit.uCode);
      if (local?.pendingSync) {
        await db.units.put(local);
        pendingByCode.delete(unit.uCode);
        continue;
      }
      await db.units.put({
        ...unit,
        updatedAt: ts,
        pendingSync: false,
      });
    }
    for (const local of pendingByCode.values()) {
      await db.units.put(local);
    }
  });
}

/** Overwrites IndexedDB with the server list only (drops synced offline copies). */
export async function replaceAllUnitsFromServerOnly(
  units: UnitItem[]
): Promise<void> {
  const db = getOfflineDb();
  const ts = now();
  await db.transaction("rw", db.units, async () => {
    await db.units.clear();
    for (const unit of units) {
      await db.units.put({
        ...unit,
        updatedAt: ts,
        pendingSync: false,
      });
    }
  });
}

export async function putCachedUnit(
  unit: UnitItem,
  options?: { pendingSync?: boolean }
): Promise<void> {
  const db = getOfflineDb();
  const existing = await db.units.get(unit.uCode);
  await db.units.put({
    ...unit,
    updatedAt: now(),
    pendingSync: options?.pendingSync ?? existing?.pendingSync ?? false,
  });
}

export async function removeCachedUnit(uCode: string): Promise<void> {
  const db = getOfflineDb();
  await db.units.delete(uCode.trim());
}

export async function clearUnitPendingSync(uCode: string): Promise<void> {
  const db = getOfflineDb();
  const row = await db.units.get(uCode.trim());
  if (!row) return;
  await db.units.put({
    ...row,
    pendingSync: false,
    updatedAt: now(),
  });
}
