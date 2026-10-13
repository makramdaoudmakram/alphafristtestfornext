import { describe, expect, it } from "vitest";
import {
  isLegacyLedgerAdmin,
  normalizeLegacyLedgerCommitResult,
  normalizeLegacyLedgerPreview,
} from "./legacy-ledger-api";

describe("isLegacyLedgerAdmin", () => {
  it("allows the accounting roles in any casing", () => {
    expect(isLegacyLedgerAdmin(["Admin"])).toBe(true);
    expect(isLegacyLedgerAdmin(["superadmin"])).toBe(true);
    expect(isLegacyLedgerAdmin(["Account"])).toBe(true);
  });

  it("refuses every other role", () => {
    expect(isLegacyLedgerAdmin(["Viewer"])).toBe(false);
    expect(isLegacyLedgerAdmin(["SalesMan"])).toBe(false);
    expect(isLegacyLedgerAdmin([])).toBe(false);
    expect(isLegacyLedgerAdmin(undefined)).toBe(false);
  });
});

describe("normalizeLegacyLedgerPreview", () => {
  it("reads a successful preview and the two-entry counts", () => {
    const preview = normalizeLegacyLedgerPreview({
      success: true,
      importSessionId: "abc123",
      batchRef: "LEGACY-1a2b3c",
      debitAccountCode: "1000",
      debitAccountName: "حساب مدين",
      creditAccountCode: "2000",
      creditAccountName: "حساب دائن",
      totalRows: 2,
      validRowCount: 2,
      ledgerEntryCount: 4,
      totalAmount: 350,
      rows: [
        {
          rowNumber: 2,
          date: "2020-03-17T00:00:00",
          description: "opening balance",
          depit: 100,
          credit: 0,
          amount: 100,
          debitOnFirstAccount: true,
        },
      ],
      errors: [],
    });

    expect(preview.success).toBe(true);
    expect(preview.importSessionId).toBe("abc123");
    expect(preview.ledgerEntryCount).toBe(4);
    expect(preview.rows[0]).toEqual({
      rowNumber: 2,
      date: "2020-03-17T00:00:00",
      description: "opening balance",
      depit: 100,
      credit: 0,
      amount: 100,
      debitOnFirstAccount: true,
    });
  });

  it("keeps the server's posting direction per Excel row", () => {
    const preview = normalizeLegacyLedgerPreview({
      success: true,
      rows: [
        { rowNumber: 2, depit: 300, credit: 0, debitOnFirstAccount: true },
        { rowNumber: 3, depit: 0, credit: 500, debitOnFirstAccount: false },
      ],
    });

    expect(preview.rows[0].debitOnFirstAccount).toBe(true);
    expect(preview.rows[1].debitOnFirstAccount).toBe(false);
  });

  it("derives the direction when an older API omits it", () => {
    const preview = normalizeLegacyLedgerPreview({
      success: true,
      Rows: [
        { RowNumber: 2, Depit: 300, Credit: 0 },
        { RowNumber: 3, Depit: 0, Credit: 500 },
      ],
    });

    expect(preview.rows[0].debitOnFirstAccount).toBe(true);
    expect(preview.rows[1].debitOnFirstAccount).toBe(false);
  });

  it("reads the acronym-cased names the Alfa API emits", () => {
    const preview = normalizeLegacyLedgerPreview({
      Success: false,
      BatchRef: "LEGACY-9z8y7x",
      ImportSessionId: null,
      TotalRows: 3,
      ValidRowCount: 0,
      LedgerEntryCount: 0,
      TotalAmount: 0,
      Rows: [],
      Errors: [{ RowNumber: 4, Reason: "Both Depit and Credit contain amounts." }],
    });

    expect(preview.success).toBe(false);
    expect(preview.batchRef).toBe("LEGACY-9z8y7x");
    expect(preview.errors[0].rowNumber).toBe(4);
    expect(preview.errors[0].reason).toContain("Both Depit and Credit");
  });

  it("survives an empty or malformed body", () => {
    expect(normalizeLegacyLedgerPreview(null).success).toBe(false);
    expect(normalizeLegacyLedgerPreview(undefined).errors).toEqual([]);
    expect(normalizeLegacyLedgerPreview({}).rows).toEqual([]);
  });
});

describe("normalizeLegacyLedgerCommitResult", () => {
  it("reads the journal range of a committed batch", () => {
    const result = normalizeLegacyLedgerCommitResult({
      batchRef: "LEGACY-1a2b3c",
      transType: "AJ",
      firstACCOrder: 5001,
      lastACCOrder: 5002,
      firstReceiptNO: "900",
      lastReceiptNO: "901",
      sourceRowCount: 2,
      ledgerEntryCount: 4,
      totalAmount: 350,
      importedAt: "2026-10-12T09:30:00Z",
    });

    expect(result.firstAccOrder).toBe(5001);
    expect(result.lastAccOrder).toBe(5002);
    expect(result.firstReceiptNo).toBe("900");
    expect(result.ledgerEntryCount).toBe(4);
    expect(result.totalAmount).toBe(350);
  });
});
