import type { DiagnosticsResultRow } from "./diagnostics-types";

export function computeNetworkMs(
  browserTotalMs: number,
  serverMs: number | null | undefined
): number | null {
  if (serverMs == null || Number.isNaN(serverMs)) return null;
  const network = browserTotalMs - serverMs;
  return network < 0 ? 0 : Math.round(network);
}

export function minAvgMax(values: number[]): {
  min: number;
  avg: number;
  max: number;
} {
  if (values.length === 0) return { min: 0, avg: 0, max: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return { min, avg: Math.round(avg * 10) / 10, max };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

export function warmMinMedianMax(values: number[]) {
  const warm = values.filter((v) => v > 0 || values.length === 1);
  if (warm.length === 0) return { min: 0, median: 0, max: 0 };
  return { min: Math.min(...warm), median: median(warm), max: Math.max(...warm) };
}

export function formatN1Top(
  entries: { count: number; sql: string }[] | undefined | null
): string {
  if (!entries?.length) return "";
  return entries
    .map((e) => `${e.count}:${e.sql.slice(0, 200)}`)
    .join(" | ");
}

export function isScopeSkipError(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("pharmacy scope") ||
    lower.includes("store/pharmacy scope") ||
    lower.includes("scope is not configured")
  );
}

const RESULT_TABLE_HEADERS = [
  "Operation",
  "Lines",
  "Run",
  "Browser total ms",
  "Server ms",
  "Network ms",
  "DB wait ms",
  "Transaction ms",
  "Commands",
  "SaveChanges",
  "N+1",
  "Queue lag ms",
  "Used defaults",
  "Error",
] as const;

export function formatUsedDefaultsText(
  usedDefaults: string | null | undefined
): string {
  return usedDefaults?.trim() ?? "";
}

export function formatSkippedError(error: string | null | undefined): string {
  const text = error?.trim() ?? "";
  if (!text) return "skipped";
  return text.toLowerCase().startsWith("skipped:")
    ? text
    : `skipped: ${text}`;
}

export function resultsToTsv(rows: DiagnosticsResultRow[]): string {
  const lines = [RESULT_TABLE_HEADERS.join("\t")];
  for (const row of rows) {
    lines.push(
      [
        row.operation,
        String(row.lines),
        row.phase,
        String(row.browserTotalMs),
        row.serverMs ?? "",
        row.networkMs ?? "",
        row.dbWaitMs ?? "",
        row.transactionMs ?? "",
        row.commandCount ?? "",
        row.saveChangesCount ?? "",
        row.n1Top,
        row.queueLagMs ?? "",
        formatUsedDefaultsText(row.usedDefaults),
        row.skipped
          ? formatSkippedError(row.error)
          : row.error ?? "",
      ].join("\t")
    );
  }
  return lines.join("\n");
}

export function summarizeWarmByOperationLines(rows: DiagnosticsResultRow[]) {
  const groups = new Map<string, DiagnosticsResultRow[]>();
  for (const row of rows) {
    if (row.phase !== "warm" || row.skipped) continue;
    const key = `${row.operation}\t${row.lines}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  return [...groups.entries()].map(([key, groupRows]) => {
    const [operation, linesStr] = key.split("\t");
    return {
      operation,
      lines: Number(linesStr),
      browserTotal: warmMinMedianMax(groupRows.map((r) => r.browserTotalMs)),
      serverMs: warmMinMedianMax(
        groupRows.map((r) => r.serverMs ?? 0).filter((v) => v > 0)
      ),
      commands: warmMinMedianMax(
        groupRows.map((r) => r.commandCount ?? 0).filter((v) => v > 0)
      ),
    };
  });
}

export function topN1ByOperation(rows: DiagnosticsResultRow[]) {
  const counts = new Map<string, { sql: string; count: number }>();
  for (const row of rows) {
    if (!row.n1Top) continue;
    for (const part of row.n1Top.split("|")) {
      const trimmed = part.trim();
      const colon = trimmed.indexOf(":");
      if (colon <= 0) continue;
      const count = Number(trimmed.slice(0, colon));
      const sql = trimmed.slice(colon + 1).trim();
      if (!sql || Number.isNaN(count)) continue;
      const existing = counts.get(sql);
      if (existing) existing.count += count;
      else counts.set(sql, { sql, count });
    }
  }

  const byOp = new Map<string, { sql: string; count: number }[]>();
  for (const row of rows) {
    if (!row.n1Top) continue;
    const list = byOp.get(row.operation) ?? [];
    for (const part of row.n1Top.split("|")) {
      const trimmed = part.trim();
      const colon = trimmed.indexOf(":");
      if (colon <= 0) continue;
      const count = Number(trimmed.slice(0, colon));
      const sql = trimmed.slice(colon + 1).trim().slice(0, 200);
      if (!sql) continue;
      const found = list.find((x) => x.sql === sql);
      if (found) found.count += count;
      else list.push({ sql, count: Number.isNaN(count) ? 1 : count });
    }
    list.sort((a, b) => b.count - a.count);
    byOp.set(row.operation, list.slice(0, 5));
  }
  return byOp;
}
