"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { DiagnosticsAdminGuard } from "@/components/diagnostics/DiagnosticsAdminGuard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DiagnosticsLookupCombobox } from "@/components/diagnostics/DiagnosticsLookupCombobox";
import { DiagnosticsMultiItemPicker } from "@/components/diagnostics/DiagnosticsMultiItemPicker";
import {
  checkDiagnosticsEnabled,
  diagnosticsBenchmark,
  diagnosticsDbPing,
  diagnosticsOptions,
  diagnosticsPing,
  diagnosticsQueueLag,
  diagnosticsRealRequest,
  diagnosticsSamplePayload,
  DiagnosticsDisabledError,
} from "@/lib/diagnostics/diagnostics-api";
import {
  customerToEntry,
  itemToEntry as mapItemToEntry,
  vendorToEntry,
} from "@/lib/diagnostics/diagnostics-picker-utils";
import {
  computeNetworkMs,
  formatN1Top,
  isScopeSkipError,
  minAvgMax,
  resultsToTsv,
  summarizeWarmByOperationLines,
  topN1ByOperation,
} from "@/lib/diagnostics/diagnostics-stats";
import type {
  DiagnosticsBenchmarkRequest,
  DiagnosticsOperationInfo,
  DiagnosticsOptionsResponse,
  DiagnosticsResultRow,
} from "@/lib/diagnostics/diagnostics-types";

function newRowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function LatencyStatBlock({
  title,
  hint,
  stats,
}: {
  title: string;
  hint: string;
  stats: { min: number; avg: number; max: number; p95?: number } | null;
}) {
  return (
    <div className="bg-muted/40 space-y-2 rounded-lg border p-4">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground text-xs">{hint}</p>
      {stats ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Min</dt>
          <dd>{stats.min.toFixed(1)} ms</dd>
          <dt className="text-muted-foreground">Avg</dt>
          <dd>{stats.avg.toFixed(1)} ms</dd>
          <dt className="text-muted-foreground">Max</dt>
          <dd>{stats.max.toFixed(1)} ms</dd>
          {stats.p95 != null ? (
            <>
              <dt className="text-muted-foreground">P95</dt>
              <dd>{stats.p95.toFixed(1)} ms</dd>
            </>
          ) : null}
        </dl>
      ) : (
        <p className="text-muted-foreground text-sm">Not run yet.</p>
      )}
    </div>
  );
}

export function DiagnosticsPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;

  const [disabled, setDisabled] = useState<boolean | null>(null);
  const [options, setOptions] = useState<DiagnosticsOptionsResponse | null>(
    null
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const [browserPingStats, setBrowserPingStats] = useState<ReturnType<
    typeof minAvgMax
  > | null>(null);
  const [dbPingStats, setDbPingStats] = useState<{
    sqlServer: ReturnType<typeof minAvgMax> & { p95: number };
    sqlite: ReturnType<typeof minAvgMax> & { p95: number };
  } | null>(null);
  const [latencyRunning, setLatencyRunning] = useState(false);

  const [operation, setOperation] = useState("Purchase.Create");
  const [linesPreset, setLinesPreset] = useState("3");
  const [customLines, setCustomLines] = useState("3");
  const [repeatCount, setRepeatCount] = useState("3");
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [storeId, setStoreId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [movmentRowId, setMovmentRowId] = useState("");
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);

  const [realRepeat, setRealRepeat] = useState("3");
  const [realRunning, setRealRunning] = useState(false);

  const [customMethod, setCustomMethod] = useState("POST");
  const [customPath, setCustomPath] = useState("PurTransH");
  const [customBody, setCustomBody] = useState("{}");
  const [customRunning, setCustomRunning] = useState(false);

  const [results, setResults] = useState<DiagnosticsResultRow[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const lines = useMemo(() => {
    if (linesPreset === "custom") return Math.max(1, Number(customLines) || 1);
    return Number(linesPreset) || 3;
  }, [linesPreset, customLines]);

  const currentOp: DiagnosticsOperationInfo | undefined = useMemo(
    () => options?.operations.find((o) => o.key === operation),
    [options, operation]
  );

  const defaultsAppliedRef = useRef(false);

  useEffect(() => {
    if (status === "loading" || !token) return;

    let cancelled = false;

    async function loadInitial() {
      setLoadError(null);
      try {
        const enabled = await checkDiagnosticsEnabled(token!);
        if (cancelled) return;
        if (!enabled) {
          setDisabled(true);
          return;
        }
        setDisabled(false);
        const opts = await diagnosticsOptions(token!);
        if (cancelled) return;
        setOptions(opts);
        if (!defaultsAppliedRef.current) {
          defaultsAppliedRef.current = true;
          if (opts.items.length > 0) {
            setSelectedItemIds([opts.items[0]!.id]);
          }
          if (opts.vendors.length > 0) {
            setVendorId(opts.vendors[0]!.id);
          }
          if (opts.movements.length > 0) {
            setMovmentRowId(String(opts.movements[0]!.id));
          }
          if (opts.stores.length > 0) {
            setStoreId(String(opts.stores[0]!.id));
          }
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof DiagnosticsDisabledError) {
          setDisabled(true);
          return;
        }
        setLoadError(
          error instanceof Error ? error.message : "Could not load diagnostics."
        );
      }
    }

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [status, token]);

  function buildBenchmarkBody(
    op: string,
    lineCount: number
  ): DiagnosticsBenchmarkRequest {
    const body: DiagnosticsBenchmarkRequest = {
      operation: op,
      lines: lineCount,
      repeat: 1,
      itemIds: selectedItemIds,
    };
    if (vendorId) body.vendorId = vendorId;
    if (storeId) body.storeId = Number(storeId);
    if (customerId) body.customerId = Number(customerId);
    if (movmentRowId) body.movmentRowId = Number(movmentRowId);
    return body;
  }

  function appendResult(row: DiagnosticsResultRow) {
    setResults((prev) => [...prev, row]);
  }

  function pollQueueLag(
    rowId: string,
    jobKind: string,
    headerId: number,
    authToken: string
  ) {
    void diagnosticsQueueLag(authToken, jobKind, headerId, 15)
      .then((lag) => {
        setResults((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? {
                  ...r,
                  queueLagMs: lag.queueLagMs,
                  queueStatus: lag.queueStatus,
                }
              : r
          )
        );
      })
      .catch(() => {
        setResults((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? { ...r, queueStatus: "Timeout", queueLagMs: null }
              : r
          )
        );
      });
  }

  async function runLatencyTest() {
    if (!token) return;
    setLatencyRunning(true);
    try {
      const browserTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const { browserMs } = await diagnosticsPing(token);
        browserTimes.push(browserMs);
      }
      setBrowserPingStats(minAvgMax(browserTimes));

      const db = await diagnosticsDbPing(token, 20);
      setDbPingStats({
        sqlServer: {
          min: db.sqlServer.minMs,
          avg: db.sqlServer.avgMs,
          max: db.sqlServer.maxMs,
          p95: db.sqlServer.p95Ms,
        },
        sqlite: {
          min: db.sqlite.minMs,
          avg: db.sqlite.avgMs,
          max: db.sqlite.maxMs,
          p95: db.sqlite.p95Ms,
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Latency test failed."
      );
    } finally {
      setLatencyRunning(false);
    }
  }

  async function runSingleBenchmark(
    op: string,
    lineCount: number,
    phase: string,
    authToken: string,
    signal: AbortSignal
  ): Promise<{ stop: boolean; skipped: boolean }> {
    try {
      const { data, browserMs } = await diagnosticsBenchmark(
        authToken,
        buildBenchmarkBody(op, lineCount),
        signal
      );
      const run = data.runs[0];
      if (!run) {
        appendResult({
          id: newRowId(),
          source: "benchmark",
          operation: op,
          lines: lineCount,
          phase,
          browserTotalMs: browserMs,
          serverMs: null,
          networkMs: null,
          dbWaitMs: null,
          transactionMs: null,
          commandCount: null,
          saveChangesCount: null,
          n1Top: "",
          queueLagMs: null,
          queueStatus: null,
          authCommands: null,
          error: "Empty benchmark response",
          skipped: false,
        });
        return { stop: true, skipped: false };
      }

      const rowId = newRowId();
      appendResult({
        id: rowId,
        source: "benchmark",
        operation: op,
        lines: lineCount,
        phase,
        browserTotalMs: browserMs,
        serverMs: run.serverMs,
        networkMs: computeNetworkMs(browserMs, run.serverMs),
        dbWaitMs: run.dbWaitMs,
        transactionMs: run.transactionMs,
        commandCount: run.commandCount,
        saveChangesCount: run.saveChangesCount,
        n1Top: formatN1Top(run.n1Top),
        queueLagMs: null,
        queueStatus: null,
        authCommands: null,
        error: run.error ?? null,
        skipped: false,
      });

      if (run.error) {
        if (isScopeSkipError(run.error)) {
          setResults((prev) =>
            prev.map((r) =>
              r.id === rowId
                ? { ...r, skipped: true, error: run.error ?? null }
                : r
            )
          );
          return { stop: false, skipped: true };
        }
        return { stop: true, skipped: false };
      }

      if (run.jobKind && run.headerId) {
        pollQueueLag(rowId, run.jobKind, run.headerId, authToken);
      }
      return { stop: false, skipped: false };
    } catch (error) {
      if (signal.aborted) return { stop: true, skipped: false };
      const message =
        error instanceof Error ? error.message : "Benchmark failed.";
      appendResult({
        id: newRowId(),
        source: "benchmark",
        operation: op,
        lines: lineCount,
        phase,
        browserTotalMs: 0,
        serverMs: null,
        networkMs: null,
        dbWaitMs: null,
        transactionMs: null,
        commandCount: null,
        saveChangesCount: null,
        n1Top: "",
        queueLagMs: null,
        queueStatus: null,
        authCommands: null,
        error: message,
        skipped: false,
      });
      return { stop: true, skipped: false };
    }
  }

  async function runBenchmarkLoop(mode: "single" | "all") {
    if (!token || !options) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBenchmarkRunning(true);

    try {
      if (mode === "single") {
        const repeats = Math.max(1, Number(repeatCount) || 1);
        for (let i = 0; i < repeats; i++) {
          if (controller.signal.aborted) break;
          const phase = i === 0 ? "cold" : "warm";
          const { stop } = await runSingleBenchmark(
            operation,
            lines,
            phase,
            token,
            controller.signal
          );
          if (stop) break;
        }
      } else {
        for (const op of options.operations) {
          for (const lineCount of [3, 30]) {
            for (let i = 0; i < 3; i++) {
              if (controller.signal.aborted) break;
              const phase = i === 0 ? "cold" : "warm";
              const { stop } = await runSingleBenchmark(
                op.key,
                lineCount,
                phase,
                token,
                controller.signal
              );
              if (stop) break;
            }
          }
        }
      }
    } finally {
      setBenchmarkRunning(false);
      abortRef.current = null;
    }
  }

  function stopRuns() {
    abortRef.current?.abort();
    setBenchmarkRunning(false);
    setRealRunning(false);
    setCustomRunning(false);
  }

  async function runRealRequestLoop() {
    if (!token) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRealRunning(true);

    try {
      const sample = await diagnosticsSamplePayload(
        token,
        {
          operation: "Purchase.Create",
          lines,
          itemIds: selectedItemIds,
          vendorId: vendorId || undefined,
          movmentRowId: movmentRowId ? Number(movmentRowId) : undefined,
        },
        controller.signal
      );

      const repeats = Math.max(1, Number(realRepeat) || 1);
      for (let i = 0; i < repeats; i++) {
        if (controller.signal.aborted) break;
        const phase = i === 0 ? "cold" : "warm";
        const result = await diagnosticsRealRequest(
          token,
          sample.httpMethod,
          sample.targetRoute,
          sample.payload,
          controller.signal
        );
        const headers = result.headers;
        if (!headers.exposed) {
          toast.error("Server did not expose diagnostic headers");
        }
        appendResult({
          id: newRowId(),
          source: "real-request",
          operation: "Purchase.Create (HTTP)",
          lines,
          phase,
          browserTotalMs: result.browserMs,
          serverMs: headers.serverMs,
          networkMs: computeNetworkMs(result.browserMs, headers.serverMs),
          dbWaitMs: headers.dbMs,
          transactionMs: headers.transactionMs,
          commandCount: headers.commands,
          saveChangesCount: headers.saveChanges,
          n1Top: headers.n1Top ?? "",
          queueLagMs: null,
          queueStatus: null,
          authCommands: headers.authCommands,
          error: result.error ?? null,
          skipped: false,
        });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        toast.error(
          error instanceof Error ? error.message : "Real request test failed."
        );
      }
    } finally {
      setRealRunning(false);
      abortRef.current = null;
    }
  }

  async function runCustomRequest() {
    if (!token) return;
    setCustomRunning(true);
    try {
      let body: unknown = undefined;
      if (customMethod !== "GET" && customBody.trim()) {
        body = JSON.parse(customBody) as unknown;
      }
      const result = await diagnosticsRealRequest(
        token,
        customMethod,
        customPath,
        body
      );
      if (!result.headers.exposed) {
        toast.error("Server did not expose diagnostic headers");
      }
      appendResult({
        id: newRowId(),
        source: "custom",
        operation: `${customMethod} ${customPath}`,
        lines: 0,
        phase: "cold",
        browserTotalMs: result.browserMs,
        serverMs: result.headers.serverMs,
        networkMs: computeNetworkMs(result.browserMs, result.headers.serverMs),
        dbWaitMs: result.headers.dbMs,
        transactionMs: result.headers.transactionMs,
        commandCount: result.headers.commands,
        saveChangesCount: result.headers.saveChanges,
        n1Top: result.headers.n1Top ?? "",
        queueLagMs: null,
        queueStatus: null,
        authCommands: result.headers.authCommands,
        error: result.error ?? null,
        skipped: false,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Custom request failed."
      );
    } finally {
      setCustomRunning(false);
    }
  }

  function copyJson() {
    void navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    toast.success("Results copied as JSON");
  }

  function copyTsv() {
    void navigator.clipboard.writeText(resultsToTsv(results));
    toast.success("Results copied as text table");
  }

  const initialVendors = useMemo(
    () => options?.vendors.map(vendorToEntry) ?? [],
    [options?.vendors]
  );
  const initialCustomers = useMemo(
    () => options?.customers.map(customerToEntry) ?? [],
    [options?.customers]
  );
  const initialStores = useMemo(
    () => options?.stores.map(mapItemToEntry) ?? [],
    [options?.stores]
  );
  const initialItems = useMemo(
    () => options?.items.map(mapItemToEntry) ?? [],
    [options?.items]
  );
  const initialMovements = useMemo(
    () => options?.movements.map(mapItemToEntry) ?? [],
    [options?.movements]
  );

  const warmSummaries = useMemo(
    () => summarizeWarmByOperationLines(results),
    [results]
  );
  const n1ByOp = useMemo(() => topN1ByOperation(results), [results]);

  const inProcessPurchase = useMemo(() => {
    return results.find(
      (r) =>
        r.source === "benchmark" &&
        r.operation === "Purchase.Create" &&
        r.serverMs != null
    );
  }, [results]);

  const realPurchase = useMemo(() => {
    return results.find(
      (r) => r.source === "real-request" && r.serverMs != null
    );
  }, [results]);

  if (disabled === true) {
    return (
      <DiagnosticsAdminGuard>
        <div className="p-4">
          <Card>
            <CardHeader>
              <CardTitle>Diagnostics is disabled on the server</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </DiagnosticsAdminGuard>
    );
  }

  return (
    <DiagnosticsAdminGuard>
      <div className="space-y-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Diagnostics</h1>
          <p className="text-muted-foreground text-sm">
            Measure server-side transaction save time. Admin only.
          </p>
        </div>

        {loadError ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Could not load</CardTitle>
              <CardDescription>{loadError}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle>Warning</CardTitle>
            <CardDescription>
              Benchmark and real-request tests create real documents and change
              stock. Documents are tagged [BENCH].
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>1. Network and database latency</CardTitle>
            <CardDescription>
              Compare browser-to-API time with database round-trips on the
              server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              disabled={latencyRunning || !token}
              onClick={() => void runLatencyTest()}
            >
              {latencyRunning ? "Running…" : "Run latency test"}
            </Button>
            <div className="grid gap-4 md:grid-cols-3">
              <LatencyStatBlock
                title="Browser → API"
                hint="Ten GET /Diagnostics/ping calls measured in the browser."
                stats={browserPingStats}
              />
              <LatencyStatBlock
                title="API → SQL Server"
                hint="Server-side SELECT 1 loop on the main database."
                stats={
                  dbPingStats
                    ? {
                        min: dbPingStats.sqlServer.min,
                        avg: dbPingStats.sqlServer.avg,
                        max: dbPingStats.sqlServer.max,
                        p95: dbPingStats.sqlServer.p95,
                      }
                    : null
                }
              />
              <LatencyStatBlock
                title="API → SQLite"
                hint="Server-side ping on the reporting SQLite database."
                stats={
                  dbPingStats
                    ? {
                        min: dbPingStats.sqlite.min,
                        avg: dbPingStats.sqlite.avg,
                        max: dbPingStats.sqlite.max,
                        p95: dbPingStats.sqlite.p95,
                      }
                    : null
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Save benchmark</CardTitle>
            <CardDescription>
              One POST /benchmark per run (repeat in browser). First run is cold,
              others warm.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Operation</Label>
                <Select value={operation} onValueChange={setOperation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.operations.map((op) => (
                      <SelectItem key={op.key} value={op.key}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lines</Label>
                <Select value={linesPreset} onValueChange={setLinesPreset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {linesPreset === "custom" ? (
                  <Input
                    type="number"
                    min={1}
                    value={customLines}
                    onChange={(e) => setCustomLines(e.target.value)}
                  />
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Repeat count</Label>
                <Input
                  type="number"
                  min={1}
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(e.target.value)}
                />
              </div>
            </div>

            {options?.pharmacyScopeMessage ? (
              <p className="text-muted-foreground text-sm">
                {options.pharmacyScopeMessage}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label>Items</Label>
              <DiagnosticsMultiItemPicker
                token={token}
                initialEntries={initialItems}
                selectedIds={selectedItemIds}
                onSelectedIdsChange={setSelectedItemIds}
                disabled={!options}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {currentOp?.needsMovement ? (
                <div className="space-y-2">
                  <Label>Movement</Label>
                  <DiagnosticsLookupCombobox
                    token={token}
                    kind="movement"
                    initialEntries={initialMovements}
                    value={movmentRowId}
                    onValueChange={setMovmentRowId}
                    placeholder="Movement"
                    disabled={!options}
                  />
                </div>
              ) : null}
              {currentOp?.needsVendor ? (
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <DiagnosticsLookupCombobox
                    token={token}
                    kind="vendor"
                    initialEntries={initialVendors}
                    value={vendorId}
                    onValueChange={setVendorId}
                    placeholder="Vendor"
                    disabled={!options}
                  />
                </div>
              ) : null}
              {currentOp?.needsStock || currentOp?.needsPharmacyScope ? (
                <div className="space-y-2">
                  <Label>Store</Label>
                  <DiagnosticsLookupCombobox
                    token={token}
                    kind="store"
                    initialEntries={initialStores}
                    value={storeId}
                    onValueChange={setStoreId}
                    placeholder="Store"
                    disabled={!options}
                  />
                </div>
              ) : null}
              {currentOp?.needsCustomer ? (
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <DiagnosticsLookupCombobox
                    token={token}
                    kind="customer"
                    initialEntries={initialCustomers}
                    value={customerId}
                    onValueChange={setCustomerId}
                    placeholder="Customer"
                    disabled={!options}
                  />
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={benchmarkRunning || !token}
                onClick={() => void runBenchmarkLoop("single")}
              >
                {benchmarkRunning ? "Running…" : "Run benchmark"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={benchmarkRunning || !token}
                onClick={() => void runBenchmarkLoop("all")}
              >
                Run all operations
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!benchmarkRunning && !realRunning}
                onClick={stopRuns}
              >
                Stop
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Real request (Purchase.Create)</CardTitle>
            <CardDescription>
              sample-payload → POST /api/PurTransH with X-Diag: 1
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Repeat</Label>
                <Input
                  type="number"
                  min={1}
                  className="w-24"
                  value={realRepeat}
                  onChange={(e) => setRealRepeat(e.target.value)}
                />
              </div>
              <Button
                type="button"
                disabled={realRunning || !token}
                onClick={() => void runRealRequestLoop()}
              >
                {realRunning ? "Running…" : "Run real HTTP test"}
              </Button>
            </div>
            {inProcessPurchase || realPurchase ? (
              <div className="bg-muted/40 rounded-md border p-3 text-sm">
                <p className="font-medium">Comparison (latest Purchase.Create)</p>
                <ul className="mt-2 space-y-1">
                  <li>
                    In-process server ms:{" "}
                    {inProcessPurchase?.serverMs ?? "—"}
                  </li>
                  <li>
                    Real request server ms (X-Diag):{" "}
                    {realPurchase?.serverMs ?? "—"}
                  </li>
                  <li>
                    Real request browser total:{" "}
                    {realPurchase?.browserTotalMs ?? "—"}
                  </li>
                  <li>
                    Auth commands (X-Diag-AuthCommands):{" "}
                    {realPurchase?.authCommands ?? "—"}
                  </li>
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Custom request</CardTitle>
            <CardDescription>
              Sends a real API call with X-Diag: 1. This runs the request for
              real.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={customMethod} onValueChange={setCustomMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Path (e.g. PurTransH or /api/PurTransH)</Label>
                <Input
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>JSON body</Label>
              <Textarea
                rows={4}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
              />
            </div>
            <Button
              type="button"
              disabled={customRunning || !token}
              onClick={() => void runCustomRequest()}
            >
              {customRunning ? "Sending…" : "Send custom request"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Results</CardTitle>
            <CardDescription>
              Copy results to share. Queue lag fills in asynchronously.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={copyJson}>
                Copy results as JSON
              </Button>
              <Button type="button" variant="secondary" onClick={copyTsv}>
                Copy results as text table
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResults([])}
              >
                Clear
              </Button>
            </div>

            <Table containerClassName="max-h-[420px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Operation</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Run</TableHead>
                  <TableHead>Browser</TableHead>
                  <TableHead>Server</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>DB wait</TableHead>
                  <TableHead>Tx</TableHead>
                  <TableHead>Cmd</TableHead>
                  <TableHead>Save</TableHead>
                  <TableHead>Queue</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[140px] truncate">
                      {row.operation}
                    </TableCell>
                    <TableCell>{row.lines || "—"}</TableCell>
                    <TableCell>{row.phase}</TableCell>
                    <TableCell>{row.browserTotalMs}</TableCell>
                    <TableCell>{row.serverMs ?? "—"}</TableCell>
                    <TableCell>{row.networkMs ?? "—"}</TableCell>
                    <TableCell>{row.dbWaitMs ?? "—"}</TableCell>
                    <TableCell>{row.transactionMs ?? "—"}</TableCell>
                    <TableCell>{row.commandCount ?? "—"}</TableCell>
                    <TableCell>{row.saveChangesCount ?? "—"}</TableCell>
                    <TableCell>
                      {row.queueLagMs != null
                        ? `${row.queueLagMs} (${row.queueStatus})`
                        : row.queueStatus ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-destructive">
                      {row.skipped ? `skipped: ${row.error}` : row.error ?? ""}
                    </TableCell>
                  </TableRow>
                ))}
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-muted-foreground">
                      No runs yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>

            {warmSummaries.length > 0 ? (
              <div className="space-y-2">
                <p className="font-medium text-sm">Warm summary</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operation</TableHead>
                      <TableHead>Lines</TableHead>
                      <TableHead>Browser min/med/max</TableHead>
                      <TableHead>Server min/med/max</TableHead>
                      <TableHead>Commands min/med/max</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warmSummaries.map((s) => (
                      <TableRow key={`${s.operation}-${s.lines}`}>
                        <TableCell>{s.operation}</TableCell>
                        <TableCell>{s.lines}</TableCell>
                        <TableCell>
                          {s.browserTotal.min}/{s.browserTotal.median}/
                          {s.browserTotal.max}
                        </TableCell>
                        <TableCell>
                          {s.serverMs.min}/{s.serverMs.median}/{s.serverMs.max}
                        </TableCell>
                        <TableCell>
                          {s.commands.min}/{s.commands.median}/{s.commands.max}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            {[...n1ByOp.entries()].map(([op, entries]) => (
              <div key={op} className="space-y-1">
                <p className="font-medium text-sm">Top queries — {op}</p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  {entries.map((e) => (
                    <li key={e.sql}>
                      [{e.count}] {e.sql}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DiagnosticsAdminGuard>
  );
}
