import type { DiagnosticsSetupCheckItem } from "./diagnostics-types";

export function isSalesBenchmarkOperation(operation: string): boolean {
  return (
    operation.startsWith("Sales.") &&
    !operation.startsWith("SalesReturn.")
  );
}

export function shouldPollQueueLag(
  operation: string,
  jobKind: string | null | undefined,
  headerId: number | null | undefined
): boolean {
  if (operation === "Sales.Create") return false;
  if (!jobKind || headerId == null) return false;
  return true;
}

export function resolveQueueStatusForRun(
  operation: string,
  jobKind: string | null | undefined,
  headerId: number | null | undefined,
  hasError: boolean
): string | null {
  if (hasError) return null;
  if (operation === "Sales.Create" && (jobKind == null || jobKind === "")) {
    return "not tracked";
  }
  if (jobKind == null || jobKind === "") return "no job";
  if (jobKind && headerId != null) return "Pending";
  return null;
}

export function parseDistinctStockCap(missing: string[]): number | null {
  for (const message of missing) {
    const match = message.match(/^only (\d+) distinct stocked items in store \d+$/i);
    if (match) return Number(match[1]);
  }
  return null;
}

export function parseStockIdsInput(raw: string): number[] {
  return raw
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number(part))
    .filter((id) => Number.isFinite(id) && id > 0);
}

export function capLinesForSales(
  operation: string,
  requestedLines: number,
  distinctCap: number | null
): number {
  if (!isSalesBenchmarkOperation(operation)) return requestedLines;
  if (distinctCap == null || distinctCap <= 0) return requestedLines;
  return Math.min(requestedLines, distinctCap);
}

export function salesLinesHint(
  operation: string,
  requestedLines: number,
  setup: DiagnosticsSetupCheckItem | null
): string | null {
  if (!isSalesBenchmarkOperation(operation) || !setup) return null;
  const cap = parseDistinctStockCap(setup.missing);
  if (cap != null && requestedLines > cap) {
    return `Lines capped to ${cap} (only ${cap} distinct stocked items in store).`;
  }
  if (!setup.runnable && setup.missing.length > 0) {
    return setup.missing.join("; ");
  }
  return null;
}
