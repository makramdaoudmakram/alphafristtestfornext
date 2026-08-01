"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  countPendingSyncItems,
  createOfflineInfrastructure,
  type SyncEngine,
  type SyncEngineEvent,
} from "@/lib/offline";

export type OfflineProviderProps = {
  children: ReactNode;
  /** When set, probes this URL to detect real connectivity (not just navigator.onLine). */
  probeUrl?: string;
  autoSync?: boolean;
};

type OfflineContextValue = {
  online: boolean;
  pendingCount: number;
  lastEvent: SyncEngineEvent | null;
  syncEngine: SyncEngine | null;
  syncNow: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({
  children,
  probeUrl,
  autoSync = true,
}: OfflineProviderProps) {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastEvent, setLastEvent] = useState<SyncEngineEvent | null>(null);
  const [syncEngine, setSyncEngine] = useState<SyncEngine | null>(null);

  useEffect(() => {
    const { network, syncEngine: engine } = createOfflineInfrastructure({
      probeUrl,
    });
    setSyncEngine(engine);

    const unsubNetwork = network.subscribe((isOnline) => {
      setOnline(isOnline);
    });

    const unsubEngine = engine.subscribe((event) => {
      setLastEvent(event);
      if (event.type === "sync-idle") {
        setPendingCount(event.pendingCount);
      }
    });

    void countPendingSyncItems().then(setPendingCount);

    if (autoSync) {
      engine.startAutoSync();
    }

    return () => {
      unsubNetwork();
      unsubEngine();
      engine.stopAutoSync();
    };
  }, [autoSync, probeUrl]);

  const syncNow = useCallback(async () => {
    await syncEngine?.syncNow();
    const count = await countPendingSyncItems().catch(() => pendingCount);
    setPendingCount(count);
  }, [pendingCount, syncEngine]);

  const value: OfflineContextValue = {
    online,
    pendingCount,
    lastEvent,
    syncEngine,
    syncNow,
  };

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    throw new Error("useOffline must be used within OfflineProvider");
  }
  return ctx;
}
