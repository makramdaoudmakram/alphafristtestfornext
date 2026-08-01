import {
  enqueueSyncItem,
  isOfflineDbAvailable,
} from "@/lib/offline";
import { isLikelyNetworkError } from "@/lib/offline/alfa-reachable";
import { getSimulateOffline, refreshEffectiveOnline } from "@/lib/offline/effective-online";
import { getSyncEngine } from "@/lib/offline/sync-engine";
import {
  getAllCachedUnitRows,
  putCachedUnit,
  removeCachedUnit,
  replaceAllUnits,
} from "@/lib/offline/units/unit-store";
import {
  ensureUnitSyncHandlersRegistered,
  UNIT_ENTITY_TYPE,
} from "@/lib/offline/units/unit-sync";
import { unitRepository } from "@/repository/unit.repository";
import type {
  CreateUnitRequest,
  UnitItem,
  UnitListItem,
  UpdateUnitRequest,
} from "@/types/unit";

export type UnitListSource = "network" | "cache";

export type UnitListResult = {
  units: UnitListItem[];
  source: UnitListSource;
};

export type UnitMutationResult = {
  queued: boolean;
  unit?: UnitItem;
};

function normalizeCode(code: string): string {
  return code.trim();
}

function requestBackgroundSync(): void {
  if (getSimulateOffline()) return;
  void getSyncEngine().syncNow();
}

export function createUnitService(token: string) {
  ensureUnitSyncHandlersRegistered();

  return {
    /** Read only from IndexedDB (ignores network). */
    async listUnitsFromIndexedDb(): Promise<UnitListItem[]> {
      if (!isOfflineDbAvailable()) return [];
      return getAllCachedUnitRows();
    },

    async listUnits(): Promise<UnitListResult> {
      if (!isOfflineDbAvailable()) {
        const units = await unitRepository.getAll(token);
        return { units, source: "network" };
      }

      const online = await refreshEffectiveOnline();
      if (online) {
        try {
          const units = await unitRepository.getAll(token);
          await replaceAllUnits(units);
          const rows = await getAllCachedUnitRows();
          return { units: rows, source: "network" };
        } catch (error) {
          const cached = await getAllCachedUnitRows();
          if (cached.length > 0) {
            return { units: cached, source: "cache" };
          }
          if (isLikelyNetworkError(error)) {
            return { units: cached, source: "cache" };
          }
          throw error;
        }
      }

      const cached = await getAllCachedUnitRows();
      return { units: cached, source: "cache" };
    },

    async createUnit(data: CreateUnitRequest): Promise<UnitMutationResult> {
      const uCode = normalizeCode(data.uCode);
      const payload: CreateUnitRequest = {
        uCode,
        uNameAr: data.uNameAr.trim(),
        uNameEn: data.uNameEn.trim(),
      };

      if (!isOfflineDbAvailable()) {
        const unit = await unitRepository.create(payload, token);
        return { queued: false, unit };
      }

      const online = await refreshEffectiveOnline();
      if (online) {
        try {
          const unit = await unitRepository.create(payload, token);
          await putCachedUnit(unit, { pendingSync: false });
          return { queued: false, unit };
        } catch (error) {
          if (!isLikelyNetworkError(error)) throw error;
        }
      }

      return queueUnitCreate(payload);
    },

    async updateUnit(
      uCode: string,
      data: UpdateUnitRequest
    ): Promise<UnitMutationResult> {
      const code = normalizeCode(uCode);
      const payload = {
        uNameAr: data.uNameAr.trim(),
        uNameEn: data.uNameEn.trim(),
      };

      if (!isOfflineDbAvailable()) {
        await unitRepository.update(code, payload, token);
        return { queued: false };
      }

      const online = await refreshEffectiveOnline();
      const unit: UnitItem = { uCode: code, ...payload };

      if (online) {
        try {
          await unitRepository.update(code, payload, token);
          await putCachedUnit(unit, { pendingSync: false });
          return { queued: false, unit };
        } catch (error) {
          if (!isLikelyNetworkError(error)) throw error;
        }
      }

      await putCachedUnit(unit, { pendingSync: true });
      await enqueueSyncItem({
        entityType: UNIT_ENTITY_TYPE,
        operation: "update",
        clientMutationId: `unit:update:${code}`,
        entityId: code,
        payload: { uCode: code, ...payload },
      });
      void requestBackgroundSync();

      return { queued: true, unit };
    },

    async deleteUnit(uCode: string): Promise<UnitMutationResult> {
      const code = normalizeCode(uCode);

      if (!isOfflineDbAvailable()) {
        await unitRepository.delete(code, token);
        return { queued: false };
      }

      const online = await refreshEffectiveOnline();

      if (online) {
        try {
          await unitRepository.delete(code, token);
          await removeCachedUnit(code);
          return { queued: false };
        } catch (error) {
          if (!isLikelyNetworkError(error)) throw error;
        }
      }

      await removeCachedUnit(code);
      await enqueueSyncItem({
        entityType: UNIT_ENTITY_TYPE,
        operation: "delete",
        clientMutationId: `unit:delete:${code}`,
        entityId: code,
        payload: { uCode: code },
      });
      void requestBackgroundSync();

      return { queued: true };
    },
  };
}

async function queueUnitCreate(
  payload: CreateUnitRequest
): Promise<UnitMutationResult> {
  const uCode = payload.uCode;
  const unit: UnitItem = {
    uCode: payload.uCode,
    uNameAr: payload.uNameAr,
    uNameEn: payload.uNameEn,
  };
  await putCachedUnit(unit, { pendingSync: true });
  await enqueueSyncItem({
    entityType: UNIT_ENTITY_TYPE,
    operation: "create",
    clientMutationId: `unit:create:${uCode}`,
    entityId: uCode,
    payload,
  });
  void requestBackgroundSync();
  return { queued: true, unit };
}
