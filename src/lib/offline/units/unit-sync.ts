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

import { parseUnitCode } from "@/lib/unit-code";

import { unitRepository } from "@/repository/unit.repository";

import type { SyncHandlerResult, SyncQueueItem } from "@/lib/offline/types";

import type { CreateUnitRequest, UpdateUnitRequest } from "@/types/unit";



export const UNIT_ENTITY_TYPE = "unit";



type UnitDeletePayload = { uCode: number };



type UnitUpdatePayload = UpdateUnitRequest & { uCode: number };



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



async function finalizeUnitSyncedToServer(

  token: string,

  uCode: number

): Promise<void> {

  if (uCode <= 0) return;



  await removeCachedUnit(uCode);



  if (!(await refreshEffectiveOnline())) return;

  if (!(await isAlfaApiReachable())) return;



  try {

    const units = await unitRepository.getAll(token);

    await replaceAllUnits(units);

  } catch {

    /* API unavailable — local pending rows remain via replaceAllUnits merge */

  }

}



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

  const code = parseUnitCode(data.uCode);

  if (code == null) {

    return { ok: false, retry: false, message: "Unit code must be a positive number." };

  }



  try {

    const created = await createUnit({ ...data, uCode: code }, token);

    await finalizeUnitSyncedToServer(token, created.uCode ?? code);

    return { ok: true, serverEntityId: String(created.uCode ?? code) };

  } catch (error) {

    if (isDuplicateKeyError(error)) {

      await finalizeUnitSyncedToServer(token, code);

      return { ok: true, serverEntityId: String(code) };

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

        const code = parseUnitCode(payload.uCode);

        if (code == null) {

          return { ok: false, retry: false, message: "Unit code must be a positive number." };

        }

        await updateUnit(

          code,

          { uNameAr: payload.uNameAr, uNameEn: payload.uNameEn },

          token

        );

        await finalizeUnitSyncedToServer(token, code);

        return { ok: true, serverEntityId: String(code) };

      }

      case "delete": {

        const payload = item.payload as UnitDeletePayload;

        const code = parseUnitCode(payload.uCode);

        if (code == null) {

          return { ok: false, retry: false, message: "Unit code must be a positive number." };

        }

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

      const code = parseUnitCode((item.payload as { uCode?: number }).uCode);

      if (code != null) await finalizeUnitSyncedToServer(token, code);

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

