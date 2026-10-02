export const BENCHMARK_REQUEST_TIMEOUT_MS = 20_000;
export const QUEUE_LAG_TIMEOUT_SECONDS = 20;

export class BenchmarkTimeoutError extends Error {
  constructor(message = "Benchmark timed out after 20s.") {
    super(message);
    this.name = "BenchmarkTimeoutError";
  }
}

export function mergeAbortSignals(
  ...signals: (AbortSignal | undefined)[]
): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

export function createTimeoutSignal(timeoutMs: number): {
  signal: AbortSignal;
  clear: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

export function isSetupNeededMessage(message: string | null | undefined): boolean {
  return (message?.trim().toLowerCase() ?? "").startsWith("setup needed:");
}

export function needsDeliveryEmployeeFields(operation: string): boolean {
  return (
    operation.startsWith("StockTransfer.") ||
    operation === "Sales.Delivery"
  );
}

/** @deprecated Use needsDeliveryEmployeeFields */
export function needsDeliveryCodeField(operation: string): boolean {
  return needsDeliveryEmployeeFields(operation);
}

export function isStockTransferOperation(operation: string): boolean {
  return operation.startsWith("StockTransfer.");
}
