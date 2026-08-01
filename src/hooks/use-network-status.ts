"use client";

import { useEffect, useState } from "react";
import { getNetworkMonitor, type NetworkStatus } from "@/lib/offline";

export type UseNetworkStatusOptions = {
  probeUrl?: string;
};

/** Subscribe to online/offline without wrapping the full OfflineProvider. */
export function useNetworkStatus(options: UseNetworkStatusOptions = {}) {
  const [online, setOnline] = useState(true);
  const [status, setStatus] = useState<NetworkStatus>("unknown");

  useEffect(() => {
    const network = getNetworkMonitor({ probeUrl: options.probeUrl });
    return network.subscribe((isOnline, networkStatus) => {
      setOnline(isOnline);
      setStatus(networkStatus);
    });
  }, [options.probeUrl]);

  return { online, status };
}
