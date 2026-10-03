"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy } from "lucide-react";
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
  diagnosticsConcurrency,
  diagnosticsDbPing,
  diagnosticsOptions,
  diagnosticsPing,
  diagnosticsQueueLag,
  diagnosticsRealRequest,
  diagnosticsSamplePayload,
  diagnosticsSetupCheck,
  diagnosticsSetupCheckOperation,
  diagnosticsQueueHealth,
  diagnosticsOpenTransactions,
  DiagnosticsDisabledError,
} from "@/lib/diagnostics/diagnostics-api";
import {
  BENCHMARK_REQUEST_TIMEOUT_MS,
  CONCURRENCY_REQUEST_TIMEOUT_MS,
  createTimeoutSignal,
  isSetupNeededMessage,
  isStockTransferOperation,
  mergeAbortSignals,
  needsDeliveryEmployeeFields,
  QUEUE_LAG_TIMEOUT_SECONDS,
} from "@/lib/diagnostics/diagnostics-run";
import type { DiagnosticsOpenTransactionsResponse } from "@/lib/diagnostics/diagnostics-types";
import {
  capLinesForSales,
  formatSalesReturnSetupReport,
  isSalesBenchmarkOperation,
  isSalesReturnBenchmarkOperation,
  parseDistinctStockCap,
  parseStockIdsInput,
  resolveQueueStatusForRun,
  salesLinesHint,
  shouldPollQueueLag,
} from "@/lib/diagnostics/diagnostics-sales";
import {
  customerToEntry,
  itemToEntry as mapItemToEntry,
  vendorToEntry,
} from "@/lib/diagnostics/diagnostics-picker-utils";
import {
  computeNetworkMs,
  formatSkippedError,
  formatN1Top,
  formatQueueCell,
  formatUsedDefaultsText,
  isScopeSkipError,
  minAvgMax,
  resultsToTsv,
  sanitizeResultsForCopy,
  summarizeWarmByOperationLines,
  topN1ByOperation,
  waitForQueueLagSettlement,
} from "@/lib/diagnostics/diagnostics-stats";
import type {
  DiagnosticsBenchmarkRequest,
  DiagnosticsConcurrencyResponse,
  DiagnosticsOperationInfo,
  DiagnosticsOptionsResponse,
  DiagnosticsResultRow,
  DiagnosticsSetupCheckItem,
  DiagnosticsUsedDefault,
} from "@/lib/diagnostics/diagnostics-types";

function newRowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatUsedDefaultsFromApi(
  used?: DiagnosticsUsedDefault[]
): string | null {
  if (!used?.length) return null;
  const filtered = used.filter((d) => {
    const name = d.name.toLowerCase();
    return (
      name !== "deliverycodeorpassword" &&
      name !== "deliveryemployeecode" &&
      name !== "receivingemployeepassword"
    );
  });
  if (!filtered.length) return null;
  return filtered.map((d) => `${d.name}=${d.value}`).join(", ");
}

function movementsForOperation(
  op: DiagnosticsOperationInfo | undefined,
  fallback: DiagnosticsOptionsResponse["movements"]
) {
  if (op?.movements?.length) return op.movements;
  return fallback;
}

type ParsedBenchmarkRunError = {
  exceptionType?: string;
  message?: string;
  innerMessage?: string;
  stackTop?: string[];
};

function parseBenchmarkRunError(raw: string): ParsedBenchmarkRunError | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed == null) return null;

    const hasStructured =
      typeof parsed.message === "string" ||
      typeof parsed.exceptionType === "string" ||
      typeof parsed.innerMessage === "string" ||
      Array.isArray(parsed.stackTop);
    if (!hasStructured) return null;

    return {
      exceptionType:
        typeof parsed.exceptionType === "string"
          ? parsed.exceptionType
          : undefined,
      message: typeof parsed.message === "string" ? parsed.message : undefined,
      innerMessage:
        typeof parsed.innerMessage === "string"
          ? parsed.innerMessage
          : undefined,
      stackTop: Array.isArray(parsed.stackTop)
        ? parsed.stackTop.filter(
            (line): line is string => typeof line === "string"
          )
        : undefined,
    };
  } catch {
    return null;
  }
}

function formatBenchmarkRunErrorText(raw: string): string {
  const parsed = parseBenchmarkRunError(raw);
  if (!parsed) return raw;

  const lines: string[] = [];
  if (parsed.exceptionType) {
    lines.push(`exceptionType: ${parsed.exceptionType}`);
  }
  if (parsed.message) {
    lines.push(`message: ${parsed.message}`);
  }
  if (parsed.innerMessage) {
    lines.push(`innerMessage: ${parsed.innerMessage}`);
  }
  if (parsed.stackTop?.length) {
    lines.push("stackTop:");
    for (const frame of parsed.stackTop) {
      lines.push(`  ${frame}`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : raw;
}

function BenchmarkRunErrorDetail({ row }: { row: DiagnosticsResultRow }) {
  const fullText = useMemo(
    () => formatBenchmarkRunErrorText(row.error ?? ""),
    [row.error]
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullText);
      toast.success("Error copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  return (
    <div className="border-destructive/30 bg-destructive/5 space-y-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-destructive text-sm font-medium">
          {row.operation} — run {row.phase}
          {row.skipped ? " (skipped)" : ""}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleCopy()}
        >
          <Copy className="size-4" />
          Copy
        </Button>
      </div>
      <pre className="text-destructive max-h-[320px] overflow-auto font-mono text-xs break-words whitespace-pre-wrap">
        {fullText}
      </pre>
    </div>
  );
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
  const [deliveryEmployeeCode, setDeliveryEmployeeCode] = useState("");
  const [receivingEmployeePassword, setReceivingEmployeePassword] = useState("");
  const [stockIdsText, setStockIdsText] = useState("");
  const [salesSetupCheck, setSalesSetupCheck] =
    useState<DiagnosticsSetupCheckItem | null>(null);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState<{
    current: number;
    total: number;
    label: string;
  } | null>(null);
  const [queueHealth, setQueueHealth] = useState<Awaited<
    ReturnType<typeof diagnosticsQueueHealth>
  > | null>(null);

  const [openTransactions, setOpenTransactions] =
    useState<DiagnosticsOpenTransactionsResponse | null>(null);

  const [concurrencyOperation, setConcurrencyOperation] =
    useState("Sales.Create");
  const [concurrencyScenario, setConcurrencyScenario] = useState("default");
  const [concurrencyTotalSales, setConcurrencyTotalSales] = useState("1000");
  const [concurrencyDegree, setConcurrencyDegree] = useState("57");
  const [concurrencyRunning, setConcurrencyRunning] = useState(false);
  const [concurrencyError, setConcurrencyError] = useState<string | null>(null);
  const [concurrencyResult, setConcurrencyResult] =
    useState<DiagnosticsConcurrencyResponse | null>(null);
  const [concurrencyBrowserMs, setConcurrencyBrowserMs] = useState<number | null>(
    null
  );

  const [realRepeat, setRealRepeat] = useState("3");
  const [realRunning, setRealRunning] = useState(false);

  const [customMethod, setCustomMethod] = useState("POST");
  const [customPath, setCustomPath] = useState("PurTransH");
  const [customBody, setCustomBody] = useState("{}");
  const [customRunning, setCustomRunning] = useState(false);

  const [results, setResults] = useState<DiagnosticsResultRow[]>([]);
  const resultsRef = useRef<DiagnosticsResultRow[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      try {
        const snapshot = await diagnosticsOpenTransactions(token);
        if (!cancelled) setOpenTransactions(snapshot);
      } catch {
        if (!cancelled) setOpenTransactions(null);
      }
    };
    void load();
    const id = window.setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token]);

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
          const initialOp =
            opts.operations.find((o) => o.key === operation) ??
            opts.operations[0];
          const initialMovements = movementsForOperation(
            initialOp,
            opts.movements
          );
          if (initialMovements.length > 0) {
            setMovmentRowId(String(initialMovements[0]!.id));
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

  useEffect(() => {
    if (!options || !currentOp?.needsMovement) return;
    const list = movementsForOperation(currentOp, options.movements);
    if (list.length === 0) {
      setMovmentRowId("");
      return;
    }
    setMovmentRowId((current) => {
      const stillValid = list.some((m) => String(m.id) === current);
      return stillValid ? current : String(list[0]!.id);
    });
  }, [operation, currentOp, options]);

  useEffect(() => {
    if (!token || (!isSalesBenchmarkOperation(operation) && !isSalesReturnBenchmarkOperation(operation))) {
      setSalesSetupCheck(null);
      return;
    }

    let cancelled = false;
    const parsedStoreId = storeId ? Number(storeId) : undefined;
    const stockIds = parseStockIdsInput(stockIdsText);

    void diagnosticsSetupCheckOperation(
      token,
      operation,
      lines,
      parsedStoreId,
      stockIds.length > 0 ? stockIds : undefined
    )
      .then((check) => {
        if (!cancelled) setSalesSetupCheck(check);
      })
      .catch(() => {
        if (!cancelled) setSalesSetupCheck(null);
      });

    return () => {
      cancelled = true;
    };
  }, [token, operation, lines, storeId, stockIdsText]);

  useEffect(() => {
    if (!token) {
      setQueueHealth(null);
      return;
    }

    let cancelled = false;
    void diagnosticsQueueHealth(token)
      .then((health) => {
        if (!cancelled) setQueueHealth(health);
      })
      .catch(() => {
        if (!cancelled) setQueueHealth(null);
      });

    return () => {
      cancelled = true;
    };
  }, [token, benchmarkRunning]);

  function buildBenchmarkBody(
    op: string,
    lineCount: number
  ): DiagnosticsBenchmarkRequest {
    const stockIds = parseStockIdsInput(stockIdsText);
    const effectiveLines = capLinesForSales(
      op,
      lineCount,
      salesSetupCheck ? parseDistinctStockCap(salesSetupCheck.missing) : null
    );

    const body: DiagnosticsBenchmarkRequest = {
      operation: op,
      lines: effectiveLines,
      repeat: 1,
      itemIds: selectedItemIds,
    };
    if (vendorId) body.vendorId = vendorId;
    if (storeId) body.storeId = Number(storeId);
    if (customerId) body.customerId = Number(customerId);
    if (movmentRowId) body.movmentRowId = Number(movmentRowId);
    if (deliveryEmployeeCode.trim()) {
      body.deliveryEmployeeCode = deliveryEmployeeCode.trim();
    }
    if (receivingEmployeePassword.trim()) {
      body.receivingEmployeePassword = receivingEmployeePassword.trim();
    }
    if (stockIds.length > 0) {
      body.stockIds = stockIds;
      if (isSalesBenchmarkOperation(op)) {
        body.lines = Math.min(body.lines, stockIds.length);
      }
    }
    return body;
  }

  function buildBenchmarkBodyForRunAll(
    op: string,
    lineCount: number
  ): DiagnosticsBenchmarkRequest {
    const body: DiagnosticsBenchmarkRequest = {
      operation: op,
      lines: lineCount,
      repeat: 1,
      itemIds: [],
    };
    if (deliveryEmployeeCode.trim()) {
      body.deliveryEmployeeCode = deliveryEmployeeCode.trim();
    }
    if (receivingEmployeePassword.trim()) {
      body.receivingEmployeePassword = receivingEmployeePassword.trim();
    }
    return body;
  }

  function appendResult(row: DiagnosticsResultRow) {
    setResults((prev) => [...prev, row]);
  }

  function pollQueueLag(
    rowId: string,
    jobKind: string,
    headerId: number,
    authToken: string,
    signal?: AbortSignal
  ) {
    void diagnosticsQueueLag(
      authToken,
      jobKind,
      headerId,
      QUEUE_LAG_TIMEOUT_SECONDS,
      signal
    )
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
    signal: AbortSignal,
    bodyOverride?: DiagnosticsBenchmarkRequest
  ): Promise<{ stop: boolean; skipped: boolean; timedOut: boolean }> {
    if (
      isStockTransferOperation(op) &&
      (!deliveryEmployeeCode.trim() || !receivingEmployeePassword.trim())
    ) {
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
        error:
          "deliveryEmployeeCode and receivingEmployeePassword are required for stock transfer benchmarks.",
        skipped: true,
        usedDefaults: null,
      });
      return { stop: true, skipped: true, timedOut: false };
    }

    const timeout = createTimeoutSignal(BENCHMARK_REQUEST_TIMEOUT_MS);
    try {
      const requestSignal = mergeAbortSignals(signal, timeout.signal);
      const { data, browserMs } = await diagnosticsBenchmark(
        authToken,
        bodyOverride ?? buildBenchmarkBody(op, lineCount),
        requestSignal
      );
      const usedDefaultsText = formatUsedDefaultsFromApi(data.usedDefaults);
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
          usedDefaults: usedDefaultsText,
        });
        return { stop: true, skipped: false, timedOut: false };
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
        jobKind: run.jobKind ?? null,
        headerId: run.headerId ?? null,
        queueLagMs: null,
        queueStatus: resolveQueueStatusForRun(
          op,
          run.jobKind,
          run.headerId ?? null,
          Boolean(run.error)
        ),
        authCommands: null,
        error: run.error ?? null,
        skipped: false,
        usedDefaults: usedDefaultsText,
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
          return { stop: false, skipped: true, timedOut: false };
        }
        return { stop: true, skipped: false, timedOut: false };
      }

      if (shouldPollQueueLag(op, run.jobKind, run.headerId ?? null)) {
        pollQueueLag(rowId, run.jobKind!, run.headerId!, authToken, signal);
      }
      return { stop: false, skipped: false, timedOut: false };
    } catch (error) {
      if (signal.aborted) return { stop: true, skipped: false, timedOut: false };
      if (timeout.signal.aborted) {
        appendResult({
          id: newRowId(),
          source: "benchmark",
          operation: op,
          lines: lineCount,
          phase,
          browserTotalMs: BENCHMARK_REQUEST_TIMEOUT_MS,
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
          error: `Benchmark timed out after ${BENCHMARK_REQUEST_TIMEOUT_MS / 1000}s.`,
          skipped: false,
          usedDefaults: null,
        });
        return { stop: true, skipped: false, timedOut: true };
      }
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
        usedDefaults: null,
      });
      return { stop: true, skipped: false, timedOut: false };
    } finally {
      timeout.clear();
    }
  }

  async function runBenchmarkLoop(mode: "single" | "all") {
    if (!token || !options) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBenchmarkRunning(true);
    setBenchmarkProgress(null);

    try {
      if (mode === "single") {
        const repeats = Math.max(1, Number(repeatCount) || 1);
        setBenchmarkProgress({
          current: 0,
          total: repeats,
          label: operation,
        });
        for (let i = 0; i < repeats; i++) {
          if (controller.signal.aborted) break;
          const phase = i === 0 ? "cold" : "warm";
          setBenchmarkProgress({
            current: i + 1,
            total: repeats,
            label: `${operation} (${phase})`,
          });
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
        const setup = await diagnosticsSetupCheck(token, controller.signal);
        const setupByOp = new Map(
          setup.operations.map((item) => [item.operation, item])
        );
        const runnableOps = options.operations.filter(
          (op) => setupByOp.get(op.key)?.runnable
        );
        const totalRuns = runnableOps.length * 2 * 3;
        let completedRuns = 0;

        for (const op of options.operations) {
          if (controller.signal.aborted) break;

          const check = setupByOp.get(op.key);
          if (!check?.runnable) {
            const reason =
              check?.missing.filter(Boolean).join("; ") ||
              "Operation is not runnable.";
            const setupNeeded =
              check?.missing.some((m) => isSetupNeededMessage(m)) ?? false;
            appendResult({
              id: newRowId(),
              source: "benchmark",
              operation: op.key,
              lines: 0,
              phase: setupNeeded ? "setup-needed" : "skipped",
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
              error: reason,
              skipped: true,
              usedDefaults: formatUsedDefaultsFromApi(check?.usedDefaults),
            });
            continue;
          }

          let opTimedOut = false;
          for (const lineCount of [3, 30]) {
            if (opTimedOut) break;
            for (let i = 0; i < 3; i++) {
              if (controller.signal.aborted || opTimedOut) break;
              const phase = i === 0 ? "cold" : "warm";
              completedRuns += 1;
              setBenchmarkProgress({
                current: completedRuns,
                total: totalRuns,
                label: `${op.key} ${lineCount}L ${phase}`,
              });
              const { stop, timedOut } = await runSingleBenchmark(
                op.key,
                lineCount,
                phase,
                token,
                controller.signal,
                buildBenchmarkBodyForRunAll(op.key, lineCount)
              );
              if (timedOut) {
                opTimedOut = true;
                break;
              }
              if (stop) break;
            }
          }
        }
      }
    } finally {
      setBenchmarkRunning(false);
      setBenchmarkProgress(null);
      abortRef.current = null;
      if (token) {
        void diagnosticsQueueHealth(token)
          .then(setQueueHealth)
          .catch(() => setQueueHealth(null));
      }
    }
  }

  function stopRuns() {
    abortRef.current?.abort();
    setBenchmarkRunning(false);
    setRealRunning(false);
    setCustomRunning(false);
    setConcurrencyRunning(false);
  }

  async function runConcurrency() {
    if (!token) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setConcurrencyRunning(true);
    setConcurrencyError(null);
    setConcurrencyResult(null);
    setConcurrencyBrowserMs(null);

    const timeout = createTimeoutSignal(CONCURRENCY_REQUEST_TIMEOUT_MS);
    const signal = mergeAbortSignals(controller.signal, timeout.signal);
    const body = {
      operation: concurrencyOperation,
      ...(concurrencyScenario !== "default"
        ? { scenario: concurrencyScenario }
        : {}),
      totalSales: Math.max(1, Number(concurrencyTotalSales) || 1000),
      concurrency: Math.max(1, Number(concurrencyDegree) || 57),
      ...(deliveryEmployeeCode.trim()
        ? { deliveryEmployeeCode: deliveryEmployeeCode.trim() }
        : {}),
      ...(receivingEmployeePassword.trim()
        ? { receivingEmployeePassword: receivingEmployeePassword.trim() }
        : {}),
    };

    try {
      const { data, browserMs } = await diagnosticsConcurrency(
        token,
        body,
        signal
      );
      setConcurrencyResult(data);
      setConcurrencyBrowserMs(browserMs);
    } catch (error) {
      if (controller.signal.aborted && !timeout.signal.aborted) {
        setConcurrencyError("Concurrency run stopped.");
      } else if (timeout.signal.aborted) {
        setConcurrencyError(
          `Concurrency timed out after ${CONCURRENCY_REQUEST_TIMEOUT_MS / 1000}s.`
        );
      } else {
        setConcurrencyError(
          error instanceof Error ? error.message : "Concurrency run failed."
        );
      }
    } finally {
      timeout.clear();
      setConcurrencyRunning(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
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
          usedDefaults: null,
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
        usedDefaults: null,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Custom request failed."
      );
    } finally {
      setCustomRunning(false);
    }
  }

  async function copyJson() {
    const settled = await waitForQueueLagSettlement(() => resultsRef.current);
    const payload = sanitizeResultsForCopy(settled);
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast.success("Results copied as JSON");
  }

  async function copyTsv() {
    const settled = await waitForQueueLagSettlement(() => resultsRef.current);
    await navigator.clipboard.writeText(resultsToTsv(sanitizeResultsForCopy(settled)));
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
  const operationMovements = useMemo(
    () =>
      movementsForOperation(currentOp, options?.movements ?? []).map(
        mapItemToEntry
      ),
    [currentOp, options?.movements]
  );

  const warmSummaries = useMemo(
    () => summarizeWarmByOperationLines(results),
    [results]
  );
  const n1ByOp = useMemo(() => topN1ByOperation(results), [results]);
  const benchmarkErrorRows = useMemo(
    () =>
      results.filter(
        (row) => row.source === "benchmark" && Boolean(row.error?.trim())
      ),
    [results]
  );

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
                    initialEntries={operationMovements}
                    value={movmentRowId}
                    onValueChange={setMovmentRowId}
                    placeholder="Movement"
                    disabled={!options}
                    operation={operation}
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
              {isSalesReturnBenchmarkOperation(operation) && salesSetupCheck ? (
                <div className="space-y-2 md:col-span-2">
                  <p className="text-muted-foreground text-xs">
                    {formatSalesReturnSetupReport(salesSetupCheck)}
                  </p>
                </div>
              ) : null}
              {isSalesBenchmarkOperation(operation) ? (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="diag-stock-ids">Stock IDs (optional)</Label>
                  <Input
                    id="diag-stock-ids"
                    type="text"
                    autoComplete="off"
                    value={stockIdsText}
                    onChange={(e) => setStockIdsText(e.target.value)}
                    placeholder="e.g. 501, 502"
                  />
                  <p className="text-muted-foreground text-xs">
                    Comma-separated stock row ids. When set, lines are capped to
                    the number of ids (distinct items still apply via
                    setup-check).
                  </p>
                  {salesLinesHint(operation, lines, salesSetupCheck) ? (
                    <p className="text-amber-700 text-xs dark:text-amber-400">
                      {salesLinesHint(operation, lines, salesSetupCheck)}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {needsDeliveryEmployeeFields(operation) ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="diag-delivery-employee-code">
                      Delivery employee code
                    </Label>
                    <Input
                      id="diag-delivery-employee-code"
                      type="text"
                      autoComplete="off"
                      value={deliveryEmployeeCode}
                      onChange={(e) => setDeliveryEmployeeCode(e.target.value)}
                      placeholder="Delivery employee code"
                    />
                    <p className="text-muted-foreground text-xs">
                      Sent as{" "}
                      <span className="font-mono">deliveryEmployeeCode</span>{" "}
                      to StockTransfer and Sales.Delivery. Kept in page state
                      only. Not stored or included in copied results.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diag-receiving-employee-password">
                      Receiving employee password
                    </Label>
                    <Input
                      id="diag-receiving-employee-password"
                      type="password"
                      autoComplete="off"
                      value={receivingEmployeePassword}
                      onChange={(e) =>
                        setReceivingEmployeePassword(e.target.value)
                      }
                      placeholder="Receiving employee password"
                    />
                    <p className="text-muted-foreground text-xs">
                      Sent as{" "}
                      <span className="font-mono">
                        receivingEmployeePassword
                      </span>{" "}
                      to StockTransfer and Sales.Delivery. Kept in page state
                      only. Not stored or included in copied results.
                    </p>
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
              {benchmarkProgress ? (
                <span className="text-muted-foreground text-sm">
                  {benchmarkProgress.current} of {benchmarkProgress.total}
                  {benchmarkProgress.label ? ` — ${benchmarkProgress.label}` : ""}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open document transactions</CardTitle>
            <CardDescription>
              Live SQL document saves. Rows older than 10s are highlighted. Pool
              shows connections in use versus Max Pool Size.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              SQL pool{" "}
              <span className="font-medium text-foreground">
                {openTransactions
                  ? `${openTransactions.pool.inUse} / ${openTransactions.pool.max}`
                  : "—"}
              </span>
            </p>
            {openTransactions && openTransactions.transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>SPID</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Request</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openTransactions.transactions.map((row) => (
                    <TableRow
                      key={row.id}
                      className={
                        row.ageSeconds >= 10
                          ? "bg-destructive/15 text-destructive"
                          : undefined
                      }
                    >
                      <TableCell>{row.documentType}</TableCell>
                      <TableCell>{row.action}</TableCell>
                      <TableCell>{row.stage}</TableCell>
                      <TableCell>{row.store ?? "—"}</TableCell>
                      <TableCell>{row.spid ?? "—"}</TableCell>
                      <TableCell>{row.ageSeconds.toFixed(1)}s</TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.requestId ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No open document transactions.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Concurrency</CardTitle>
            <CardDescription>
              Server-side parallel sales against batch 000000000000148 (store 8,
              employee 3). Uses the normal save path. Does not change benchmark
              runs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="diag-concurrency-operation">Operation</Label>
                <Select
                  value={concurrencyOperation}
                  onValueChange={setConcurrencyOperation}
                >
                  <SelectTrigger id="diag-concurrency-operation" className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sales.Create">Sales.Create</SelectItem>
                    <SelectItem value="Sales.Delivery">Sales.Delivery</SelectItem>
                    <SelectItem value="Sales.PaymentFinalize">
                      Sales.PaymentFinalize
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="diag-concurrency-scenario">Stock scenario</Label>
                <Select
                  value={concurrencyScenario}
                  onValueChange={setConcurrencyScenario}
                >
                  <SelectTrigger id="diag-concurrency-scenario" className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (current Sales.Create)</SelectItem>
                    <SelectItem value="lock-order">
                      Opposite line order (no deadlock)
                    </SelectItem>
                    <SelectItem value="insufficient">
                      Oversell same batch
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="diag-concurrency-total">Total sales</Label>
                <Input
                  id="diag-concurrency-total"
                  type="number"
                  min={1}
                  className="w-28"
                  value={concurrencyTotalSales}
                  onChange={(e) => setConcurrencyTotalSales(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diag-concurrency-degree">Concurrency</Label>
                <Input
                  id="diag-concurrency-degree"
                  type="number"
                  min={1}
                  className="w-28"
                  value={concurrencyDegree}
                  onChange={(e) => setConcurrencyDegree(e.target.value)}
                />
              </div>
              <Button
                type="button"
                disabled={concurrencyRunning || !token}
                onClick={() => void runConcurrency()}
              >
                {concurrencyRunning ? "Running…" : "Run"}
              </Button>
            </div>
            {concurrencyOperation === "Sales.Delivery" ? (
              <p className="text-muted-foreground text-xs">
                Delivery uses the employee fields above (page state only).
              </p>
            ) : null}
            {concurrencyError ? (
              <p className="text-destructive text-sm">{concurrencyError}</p>
            ) : null}
            {concurrencyResult ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ["Run id", concurrencyResult.runId],
                      ["Operation", concurrencyResult.operation],
                      ["Batch", concurrencyResult.batchNo],
                      ["Store / employee", `${concurrencyResult.storeId} / ${concurrencyResult.employeeId}`],
                      ["Total / concurrency", `${concurrencyResult.totalSales} / ${concurrencyResult.concurrency}`],
                      ["Units per sale", String(concurrencyResult.unitsPerSale)],
                      ["Successes", String(concurrencyResult.successes)],
                      ["Failures", String(concurrencyResult.failures)],
                      ["Deadlock 1205", String(concurrencyResult.deadlock1205Count)],
                      ["Lock timeout", String(concurrencyResult.lockTimeoutCount)],
                      ["p50 / p95 / p99 / max ms", `${concurrencyResult.p50ServerMs} / ${concurrencyResult.p95ServerMs} / ${concurrencyResult.p99ServerMs} / ${concurrencyResult.maxServerMs}`],
                      ["Wall seconds", String(concurrencyResult.totalWallSeconds)],
                      ["Sales / sec", String(concurrencyResult.salesPerSecond)],
                      ["Stock before → after", `${concurrencyResult.stockBefore} → ${concurrencyResult.stockAfter}`],
                      ["Distinct movements", String(concurrencyResult.distinctMovementNumbers)],
                      ["Duplicate movements", String(concurrencyResult.duplicateMovementNumbers)],
                      ["SQLite DocumentHeader", String(concurrencyResult.sqliteDocumentHeaderCount)],
                      ["Browser ms", concurrencyBrowserMs != null ? String(concurrencyBrowserMs) : "—"],
                    ].map(([label, value]) => (
                      <TableRow key={label}>
                        <TableCell className="font-medium">{label}</TableCell>
                        <TableCell className="font-mono text-sm">{value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {concurrencyResult.failuresByMessage.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Failure message</TableHead>
                        <TableHead>Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {concurrencyResult.failuresByMessage.map((row) => (
                        <TableRow key={row.message}>
                          <TableCell className="whitespace-pre-wrap text-sm">
                            {row.message}
                          </TableCell>
                          <TableCell>{row.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
                {(concurrencyResult.sqlFailures?.length ?? 0) > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SQL stage</TableHead>
                        <TableHead>Elapsed ms</TableHead>
                        <TableHead>Command</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {concurrencyResult.sqlFailures!.map((row, index) => (
                        <TableRow key={`${row.stage}-${index}`}>
                          <TableCell className="font-mono text-sm">{row.stage}</TableCell>
                          <TableCell>{row.elapsedMs}</TableCell>
                          <TableCell className="whitespace-pre-wrap font-mono text-xs">
                            {row.commandText}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
                {concurrencyResult.queueSamples.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Queue s</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Processing</TableHead>
                        <TableHead>Failed</TableHead>
                        <TableHead>Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {concurrencyResult.queueSamples.map((sample, index) => (
                        <TableRow key={`${sample.elapsedSeconds}-${index}`}>
                          <TableCell>{sample.elapsedSeconds}</TableCell>
                          <TableCell>{sample.pending}</TableCell>
                          <TableCell>{sample.processing}</TableCell>
                          <TableCell>{sample.failed}</TableCell>
                          <TableCell>{sample.completed}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
              </div>
            ) : null}
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
              Copy waits up to 30s for queue cells to settle, then exports.
              Queue lag fills in asynchronously while results stream in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {queueHealth ? (
              <div className="bg-muted/40 rounded-md border p-3 text-sm">
                <p className="font-medium">Reporting queue</p>
                <ul className="mt-2 space-y-1">
                  <li>
                    Worker running: {queueHealth.workerRunning ? "yes" : "no"}
                  </li>
                  <li>
                    Pending / processing / failed: {queueHealth.pendingCount} /{" "}
                    {queueHealth.processingCount} / {queueHealth.failedCount}
                  </li>
                  <li>
                    Stuck processing: {queueHealth.stuckProcessingCount}
                    {queueHealth.oldestPendingAgeSeconds > 0
                      ? ` · oldest pending ${queueHealth.oldestPendingAgeSeconds}s`
                      : ""}
                  </li>
                  {queueHealth.stuckReason ? (
                    <li className="text-amber-700 dark:text-amber-400">
                      {queueHealth.stuckReason}
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void copyJson()}
              >
                Copy results as JSON
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void copyTsv()}
              >
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
                    <TableCell className="max-w-[140px]">
                      <div className="truncate">{row.operation}</div>
                      {formatUsedDefaultsText(row.usedDefaults) ? (
                        <p className="text-muted-foreground mt-0.5 truncate text-xs">
                          defaults: {formatUsedDefaultsText(row.usedDefaults)}
                        </p>
                      ) : null}
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
                    <TableCell>{formatQueueCell(row)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-destructive">
                      {row.skipped
                        ? formatSkippedError(row.error)
                        : row.error ?? ""}
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

            {benchmarkErrorRows.length > 0 ? (
              <div className="space-y-3">
                <p className="font-medium text-sm">Benchmark run errors</p>
                {benchmarkErrorRows.map((row) => (
                  <BenchmarkRunErrorDetail key={row.id} row={row} />
                ))}
              </div>
            ) : null}

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
