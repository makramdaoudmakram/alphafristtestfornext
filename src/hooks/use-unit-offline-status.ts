"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getEffectiveOnlineSync,
  getSimulateOffline,
  subscribeSimulateOffline,
} from "@/lib/offline/effective-online";
import { getNetworkMonitor } from "@/lib/offline";
import {
  getUnitOfflineStats,
  type UnitOfflineStats,
} from "@/lib/offline/units/unit-diagnostics";

export function useUnitOfflineStatus(pollMs = 4000) {
  const [online, setOnline] = useState(true);
  const [simulated, setSimulated] = useState(false);
  const [stats, setStats] = useState<UnitOfflineStats>({
    cachedCount: 0,
    pendingSyncCount: 0,
    queuePending: 0,
    queueFailed: 0,
  });

  const refresh = useCallback(async () => {
    setSimulated(getSimulateOffline());
    setOnline(getEffectiveOnlineSync());
    try {
      const next = await getUnitOfflineStats();
      setStats(next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const network = getNetworkMonitor();
    const unsubNetwork = network.subscribe(() => {
      setOnline(getEffectiveOnlineSync());
    });
    const unsubSim = subscribeSimulateOffline(() => {
      setSimulated(getSimulateOffline());
      setOnline(getEffectiveOnlineSync());
      void refresh();
    });

    void refresh();
    const timer = setInterval(() => void refresh(), pollMs);

    return () => {
      unsubNetwork();
      unsubSim();
      clearInterval(timer);
    };
  }, [pollMs, refresh]);

  return { online, simulated, stats, refresh };
}
