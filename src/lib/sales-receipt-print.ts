import type { FinalizeSalePaymentResponse } from "@/types/sales-payment";
import type { SalesReceipt } from "@/types/sales-receipt";

export type FinalizePrintOutcome =
  | { kind: "in-flight" }
  | { kind: "finalize-failed"; error: unknown }
  | { kind: "finalized-only"; result: FinalizeSalePaymentResponse }
  | {
      kind: "print-blocked";
      result: FinalizeSalePaymentResponse;
      reason: "receipt-unavailable" | "not-finalized";
    }
  | { kind: "printed"; result: FinalizeSalePaymentResponse; receipt: SalesReceipt };

export type ReceiptLoadOutcome =
  | { ok: true; receipt: SalesReceipt }
  | { ok: false; reason: "receipt-unavailable" | "not-finalized" };

/**
 * Read-only receipt retrieval for printing. A throw, a null payload, or a
 * non-finalized response all resolve to a blocked (never printable) outcome.
 */
export async function loadReceiptForPrint(params: {
  sthId: number;
  fetchReceipt: (sthId: number) => Promise<SalesReceipt | null>;
}): Promise<ReceiptLoadOutcome> {
  let receipt: SalesReceipt | null = null;
  try {
    receipt = await params.fetchReceipt(params.sthId);
  } catch {
    receipt = null;
  }

  if (!receipt) return { ok: false, reason: "receipt-unavailable" };
  if (receipt.billTyp !== 1) return { ok: false, reason: "not-finalized" };
  return { ok: true, receipt };
}

/**
 * Sequences finalize -> authoritative read -> print readiness. A receipt is only
 * returned when finalization succeeded and the server confirms BillTyp = 1.
 * Never finalizes twice and never creates a payment to obtain print data.
 */
export async function finalizeWithPrintIfNeeded(params: {
  inFlight: boolean;
  printAfter: boolean;
  finalize: () => Promise<FinalizeSalePaymentResponse>;
  fetchReceipt: (sthId: number) => Promise<SalesReceipt | null>;
  onFinalized: (result: FinalizeSalePaymentResponse) => void;
}): Promise<FinalizePrintOutcome> {
  if (params.inFlight) return { kind: "in-flight" };

  let result: FinalizeSalePaymentResponse;
  try {
    result = await params.finalize();
  } catch (error) {
    return { kind: "finalize-failed", error };
  }

  params.onFinalized(result);

  if (!params.printAfter) return { kind: "finalized-only", result };

  const loaded = await loadReceiptForPrint({
    sthId: result.sthId,
    fetchReceipt: params.fetchReceipt,
  });
  if (!loaded.ok) return { kind: "print-blocked", result, reason: loaded.reason };
  return { kind: "printed", result, receipt: loaded.receipt };
}
