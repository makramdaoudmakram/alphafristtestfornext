import { describe, expect, it, vi } from "vitest";
import {
  finalizeWithPrintIfNeeded,
  loadReceiptForPrint,
} from "@/lib/sales-receipt-print";
import type { FinalizeSalePaymentResponse } from "@/types/sales-payment";
import type { SalesReceipt } from "@/types/sales-receipt";

const finalizeResult: FinalizeSalePaymentResponse = {
  sthId: 4801,
  billTyp: 1,
  paymentStatus: "Paid / Payment Finalized",
  finalSaleTotal: 100,
  paymentTotal: 100,
  paymentDetails: [],
};

function makeReceipt(overrides: Partial<SalesReceipt> = {}): SalesReceipt {
  return {
    sthId: 4801,
    billTyp: 1,
    paymentStatus: "Paid / Payment Finalized",
    invoiceDate: "2026-10-15 11:30:00",
    pharmacyName: "Branch Pharmacy",
    pharmacyTel: null,
    pharmacyAddress: null,
    customerName: null,
    customerTel: null,
    totalBill: 100,
    totalDiscount: null,
    serviceCost: null,
    finalPayableAmount: 100,
    paidAmount: 100,
    remainingAmount: 0,
    changeAmount: 0,
    payments: [],
    lines: [],
    ...overrides,
  };
}

function makeArgs(
  overrides: Partial<Parameters<typeof finalizeWithPrintIfNeeded>[0]> = {}
) {
  const args = {
    inFlight: false,
    printAfter: false,
    finalize: vi.fn().mockResolvedValue(finalizeResult),
    fetchReceipt: vi.fn().mockResolvedValue(makeReceipt()),
    onFinalized: vi.fn(),
    ...overrides,
  };
  return args;
}

describe("finalizeWithPrintIfNeeded", () => {
  it("blocks every call while one is already in flight", async () => {
    const args = makeArgs({ inFlight: true, printAfter: true });
    const outcome = await finalizeWithPrintIfNeeded(args);

    expect(outcome.kind).toBe("in-flight");
    expect(args.finalize).not.toHaveBeenCalled();
    expect(args.fetchReceipt).not.toHaveBeenCalled();
  });

  it("Finalize without print never fetches receipt data", async () => {
    const args = makeArgs({ printAfter: false });
    const outcome = await finalizeWithPrintIfNeeded(args);

    expect(outcome.kind).toBe("finalized-only");
    expect(args.finalize).toHaveBeenCalledTimes(1);
    expect(args.onFinalized).toHaveBeenCalledTimes(1);
    expect(args.fetchReceipt).not.toHaveBeenCalled();
  });

  it("Finalize & Print fetches the persisted receipt after success", async () => {
    const args = makeArgs({ printAfter: true });
    const outcome = await finalizeWithPrintIfNeeded(args);

    expect(outcome.kind).toBe("printed");
    expect(args.finalize).toHaveBeenCalledTimes(1);
    expect(args.fetchReceipt).toHaveBeenCalledWith(4801);
    if (outcome.kind === "printed") expect(outcome.receipt.billTyp).toBe(1);
  });

  it("failed finalization does not fetch or print", async () => {
    const error = new Error("boom");
    const args = makeArgs({
      printAfter: true,
      finalize: vi.fn().mockRejectedValue(error),
    });
    const outcome = await finalizeWithPrintIfNeeded(args);

    expect(outcome.kind).toBe("finalize-failed");
    expect(args.onFinalized).not.toHaveBeenCalled();
    expect(args.fetchReceipt).not.toHaveBeenCalled();
  });

  it("failed receipt retrieval blocks printing but keeps the finalization", async () => {
    const args = makeArgs({
      printAfter: true,
      fetchReceipt: vi.fn().mockRejectedValue(new Error("offline")),
    });
    const outcome = await finalizeWithPrintIfNeeded(args);

    expect(outcome.kind).toBe("print-blocked");
    if (outcome.kind === "print-blocked") {
      expect(outcome.reason).toBe("receipt-unavailable");
    }
    expect(args.onFinalized).toHaveBeenCalledTimes(1);
    expect(args.finalize).toHaveBeenCalledTimes(1);
  });

  it("missing receipt payload blocks printing", async () => {
    const args = makeArgs({
      printAfter: true,
      fetchReceipt: vi.fn().mockResolvedValue(null),
    });
    const outcome = await finalizeWithPrintIfNeeded(args);

    expect(outcome.kind).toBe("print-blocked");
    if (outcome.kind === "print-blocked") {
      expect(outcome.reason).toBe("receipt-unavailable");
    }
  });

  it("refuses to print a receipt the server reports as not finalized", async () => {
    const args = makeArgs({
      printAfter: true,
      fetchReceipt: vi.fn().mockResolvedValue(makeReceipt({ billTyp: 0 })),
    });
    const outcome = await finalizeWithPrintIfNeeded(args);

    expect(outcome.kind).toBe("print-blocked");
    if (outcome.kind === "print-blocked") {
      expect(outcome.reason).toBe("not-finalized");
    }
  });

  it("a replay prints persisted rows and never finalizes a second time", async () => {
    const replay = { ...finalizeResult, replay: true };
    const args = makeArgs({
      printAfter: true,
      finalize: vi.fn().mockResolvedValue(replay),
    });
    const outcome = await finalizeWithPrintIfNeeded(args);

    expect(outcome.kind).toBe("printed");
    expect(args.finalize).toHaveBeenCalledTimes(1);
    expect(args.onFinalized).toHaveBeenCalledWith(replay);
  });

  it("sequential clicks: the second run while in flight is a no-op", async () => {
    let releaseFinalize: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseFinalize = resolve;
    });
    const finalize = vi.fn().mockImplementation(async () => {
      await gate;
      return finalizeResult;
    });
    const first = finalizeWithPrintIfNeeded({
      inFlight: false,
      printAfter: true,
      finalize,
      fetchReceipt: vi.fn().mockResolvedValue(makeReceipt()),
      onFinalized: vi.fn(),
    });

    const second = await finalizeWithPrintIfNeeded({
      inFlight: true,
      printAfter: true,
      finalize,
      fetchReceipt: vi.fn(),
      onFinalized: vi.fn(),
    });

    expect(second.kind).toBe("in-flight");
    releaseFinalize();
    await first;
    expect(finalize).toHaveBeenCalledTimes(1);
  });
});

describe("loadReceiptForPrint", () => {
  it("prints a previously finalized invoice through the read-only path only", async () => {
    const fetchReceipt = vi.fn().mockResolvedValue(makeReceipt());
    const outcome = await loadReceiptForPrint({ sthId: 4801, fetchReceipt });

    expect(outcome.ok).toBe(true);
    expect(fetchReceipt).toHaveBeenCalledWith(4801);
    expect(fetchReceipt).toHaveBeenCalledTimes(1);
  });

  it("a failed read blocks printing without any finalization", async () => {
    const outcome = await loadReceiptForPrint({
      sthId: 4801,
      fetchReceipt: vi.fn().mockRejectedValue(new Error("offline")),
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("receipt-unavailable");
  });

  it("a null payload blocks printing", async () => {
    const outcome = await loadReceiptForPrint({
      sthId: 4801,
      fetchReceipt: vi.fn().mockResolvedValue(null),
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("receipt-unavailable");
  });

  it("refuses responses the server reports as not finalized", async () => {
    const outcome = await loadReceiptForPrint({
      sthId: 4801,
      fetchReceipt: vi.fn().mockResolvedValue(makeReceipt({ billTyp: 0 })),
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("not-finalized");
  });
});
