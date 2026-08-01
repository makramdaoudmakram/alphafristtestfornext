import { createUnit, deleteUnit, updateUnit, ApiError } from "@/lib/api-client";
import {
  isAlfaApiReachable,
  isDuplicateKeyError,
  isLikelyNetworkError,
  isPermanentSyncError,
} from "@/lib/offline/alfa-reachable";
import { refreshEffectiveOnline } from "@/lib/offline/effective-online";
import {
  removeCachedUnit,
  replaceAllUnits,
  replaceAllUnitsFromServerOnly,
} from "@/lib/offline/units/unit-store";
import { getUnitOfflineStats } from "@/lib/offline/units/unit-diagnostics";
import { getSyncEngine } from "@/lib/offline/sync-engine";
import { unitRepository } from "@/repository/unit.repository";
import type { SyncHandlerResult, SyncQueueItem } from "@/lib/offline/types";
import type { CreateUnitRequest, UpdateUnitRequest } from "@/types/unit";

export const UNIT_ENTITY_TYPE = "unit";

type UnitDeletePayload = { uCode: string };

type UnitUpdatePayload = UpdateUnitRequest & { uCode: string };

let tokenGetter: (() => string | undefined) | null = null;
let unregisterHandler: (() => void) | null = null;
let unsubSyncEvents: (() => void) | null = null;

export function setUnitSyncTokenGetter(
  getter: () => string | undefined
): void {
  tokenGetter = getter;
}

export function ensureUnitSyncHandlersRegistered(): void {
  if (typeof window === "undefined") return;

  const engine = getSyncEngine();

  if (!unregisterHandler) {
    unregisterHandler = engine.registerHandler(
      UNIT_ENTITY_TYPE,
      handleUnitSyncItem
    );
  }

  if (!unsubSyncEvents) {
    unsubSyncEvents = engine.subscribe((event) => {
      if (event.type === "sync-idle") {
        void purgeIndexedDbAfterUnitSyncComplete();
      }
    });
  }
}

/** After a row is on the server, drop the offline copy and refresh cache from API. */
async function finalizeUnitSyncedToServer(
  token: string,
  uCode: string
): Promise<void> {
  const code = uCode.trim();
  if (!code) return;

  await removeCachedUnit(code);

  if (!(await refreshEffectiveOnline())) return;
  if (!(await isAlfaApiReachable())) return;

  try {
    const units = await unitRepository.getAll(token);
    await replaceAllUnits(units);
  } catch {
    /* API unavailable — local pending rows remain via replaceAllUnits merge */
  }
}

/** When the unit sync queue is empty, IndexedDB holds only the server snapshot. */
async function purgeIndexedDbAfterUnitSyncComplete(): Promise<void> {
  const token = tokenGetter?.();
  if (!token) return;
  if (!(await refreshEffectiveOnline())) return;
  if (!(await isAlfaApiReachable())) return;

  const stats = await getUnitOfflineStats();
  if (stats.queuePending > 0 || stats.queueFailed > 0) {
    return;
  }

  try {
    const units = await unitRepository.getAll(token);
    await replaceAllUnitsFromServerOnly(units);
  } catch {
    /* ignore */
  }
}

async function syncCreateUnit(
  data: CreateUnitRequest,
  token: string
): Promise<SyncHandlerResult> {
  const code = data.uCode.trim();
  try {
    const created = await createUnit(data, token);
    await finalizeUnitSyncedToServer(token, created.uCode ?? code);
    return { ok: true, serverEntityId: created.uCode };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      await finalizeUnitSyncedToServer(token, code);
      return { ok: true, serverEntityId: code };
    }
    throw error;
  }
}

async function handleUnitSyncItem(
  item: SyncQueueItem
): Promise<SyncHandlerResult> {
  const token = tokenGetter?.();
  if (!token) {
    return { ok: false, retry: true, message: "Not authenticated" };
  }

  try {
    switch (item.operation) {
      case "create": {
        const data = item.payload as CreateUnitRequest;
        return syncCreateUnit(data, token);
      }
      case "update": {
        const payload = item.payload as UnitUpdatePayload;
        const code = payload.uCode.trim();
        await updateUnit(
          code,
          { uNameAr: payload.uNameAr, uNameEn: payload.uNameEn },
          token
        );
        await finalizeUnitSyncedToServer(token, code);
        return { ok: true, serverEntityId: code };
      }
      case "delete": {
        const payload = item.payload as UnitDeletePayload;
        const code = payload.uCode.trim();
        try {
          await deleteUnit(code, token);
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            await removeCachedUnit(code);
            await purgeIndexedDbAfterUnitSyncComplete();
            return { ok: true };
          }
          throw error;
        }
        await removeCachedUnit(code);
        await purgeIndexedDbAfterUnitSyncComplete();
        return { ok: true };
      }
      default:
        return {
          ok: false,
          retry: false,
          message: `Unsupported unit sync operation: ${item.operation}`,
        };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unit sync failed unexpectedly";
    if (isDuplicateKeyError(error)) {
      const code = (item.payload as { uCode?: string }).uCode?.trim();
      if (code) await finalizeUnitSyncedToServer(token, code);
      return { ok: true };
    }
    if (isPermanentSyncError(error)) {
      return { ok: false, retry: false, message };
    }
    if (isLikelyNetworkError(error)) {
      return { ok: false, retry: true, message };
    }
    if (error instanceof ApiError && error.status === 401) {
      return { ok: false, retry: true, message };
    }
    return { ok: false, retry: true, message };
  }
}
