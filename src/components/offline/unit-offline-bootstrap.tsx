"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  ensureUnitSyncHandlersRegistered,
  setUnitSyncTokenGetter,
} from "@/lib/offline/units/unit-sync";

/** Registers unit sync handlers and keeps the auth token available for the sync engine. */
export function UnitOfflineBootstrap() {
  const { data: session } = useSession();
  const tokenRef = useRef(session?.accessToken);

  tokenRef.current = session?.accessToken;

  useEffect(() => {
    setUnitSyncTokenGetter(() => tokenRef.current);
    ensureUnitSyncHandlersRegistered();
  }, []);

  return null;
}
