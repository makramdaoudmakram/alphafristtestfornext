"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useOffline } from "@/components/providers/offline-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  getSimulateOffline,
  setSimulateOffline,
} from "@/lib/offline/effective-online";
import { isAlfaApiReachable } from "@/lib/offline/alfa-reachable";
import { retryAllFailedUnitSyncItems } from "@/lib/offline/units/unit-diagnostics";
import { useUnitOfflineStatus } from "@/hooks/use-unit-offline-status";

type UnitOfflinePanelProps = {
  token: string | undefined;
  onDataChanged: () => void | Promise<void>;
  onReloadFromIndexedDb: () => void | Promise<void>;
};

export function UnitOfflinePanel({
  token,
  onDataChanged,
  onReloadFromIndexedDb,
}: UnitOfflinePanelProps) {
  const { online, simulated, stats, refresh } = useUnitOfflineStatus();
  const { syncNow, pendingCount } = useOffline();
  const [simulate, setSimulate] = useState(() => getSimulateOffline());
  const [busy, setBusy] = useState(false);

  const statusLabel = simulated
    ? "Offline (simulated — IndexedDB only)"
    : online
      ? "Online"
      : "Offline (IndexedDB cache)";

  async function handleSimulateChange(checked: boolean) {
    setSimulate(checked);
    setSimulateOffline(checked);
    if (checked) {
      toast.message(
        "Simulate offline is on — Units page uses IndexedDB only until you turn it off."
      );
    } else {
      toast.message("Simulate offline is off — syncing with the API when online.");
    }
    onDataChanged();
    await refresh();
  }

  async function handleSyncNow() {
    if (getSimulateOffline()) {
      toast.message(
        "Turn off simulate offline to sync queued changes with the API."
      );
      return;
    }
    setBusy(true);
    try {
      if (!(await isAlfaApiReachable())) {
        toast.message(
          "Alfa API is not running or not reachable. Queued changes stay in IndexedDB until the API is available."
        );
        return;
      }
      await syncNow();
      onDataChanged();
      await refresh();
      toast.success("Sync finished");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Sync failed unexpectedly"
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLoadIndexedDb() {
    if (!token) return;
    setBusy(true);
    try {
      await onReloadFromIndexedDb();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRetryFailed() {
    setBusy(true);
    try {
      const count = await retryAllFailedUnitSyncItems();
      if (count === 0) {
        toast.message("No failed unit sync items to retry");
        return;
      }
      await syncNow();
      onDataChanged();
      await refresh();
      toast.success(
        count > 0
          ? `Retried ${count} failed item(s) — check sync status`
          : "Retry attempted"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Retry failed unexpectedly"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">IndexedDB & offline sync</CardTitle>
        <CardDescription>
          Load units once while online to fill IndexedDB, then test without
          internet (DevTools → Network → Offline) or use simulate offline
          below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span
            className={
              online && !simulated
                ? "rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-medium text-emerald-700 dark:text-emerald-400"
                : "rounded-full bg-amber-500/15 px-2.5 py-0.5 font-medium text-amber-800 dark:text-amber-300"
            }
          >
            {statusLabel}
          </span>
          <span className="text-muted-foreground">
            IndexedDB: {stats.cachedCount} cached · {stats.pendingSyncCount}{" "}
            pending row(s) · queue {stats.queuePending} / failed{" "}
            {stats.queueFailed} · app pending {pendingCount}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="simulate-offline"
            type="checkbox"
            className="size-4 rounded border border-input"
            checked={simulate}
            onChange={(e) => void handleSimulateChange(e.target.checked)}
          />
          <Label htmlFor="simulate-offline" className="cursor-pointer">
            Simulate offline (use IndexedDB only; no API calls)
          </Label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => void handleSyncNow()}
          >
            Sync now
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || !token}
            onClick={() => void handleLoadIndexedDb()}
          >
            Reload from IndexedDB
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || stats.queueFailed === 0}
            onClick={() => void handleRetryFailed()}
          >
            Retry failed ({stats.queueFailed})
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              void refresh();
              onDataChanged();
            }}
          >
            Refresh status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
