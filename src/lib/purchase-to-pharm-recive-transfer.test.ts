import { describe, expect, it } from "vitest";
import {
  buildPharmReciveTransferPayload,
  defaultTransferQty,
  type PurchaseTransferLineSelection,
  validateMovementSourceStoreForTransfer,
  validateSharedStockBaseAvailability,
  validateTransferLinesBeforeSubmit,
  validateTransferQuantity,
} from "@/lib/purchase-to-pharm-recive-transfer";
import type { PurchaseTransferCandidate } from "@/types/purchase";
import type { MovmentLookupItem } from "@/types/movment";

function candidate(partial: Partial<PurchaseTransferCandidate> = {}): PurchaseTransferCandidate {
  return {
    purchaseDetailId: 1,
    itemId: "ITM-1",
    itemNameEn: "Item",
    itemNameAr: null,
    stockId: 50,
    batchNo: "B1",
    expDate: "2026-05-01",
    sourceStoreId: "10",
    unitId: 1,
    purchaseQty: 12,
    availableQty: 7,
    baseAvailableQty: 7,
    itmPurPrice: 1,
    itmSellPrice: 2,
    itemCostPrice: 1.5,
    itmUnit1Unit3: 1,
    transferable: true,
    statusReason: null,
    ...partial,
  };
}

function line(
  partial: Partial<PurchaseTransferLineSelection> = {}
): PurchaseTransferLineSelection {
  const base = candidate(partial.candidate);
  return {
    candidate: base,
    transferQty: defaultTransferQty(base.availableQty),
    included: true,
    ...partial,
  };
}

const movement: MovmentLookupItem = {
  id: 1,
  movChiledId: 7,
  movChiledName: "Transfer",
  movParientId: 8,
  movStor: "10",
  movStor2: "3",
  movSingleStore: false,
  movAccountEntry1: "CR",
  movAccountEntry2: "DR",
  movAccountEntry3: null,
  movAccountEntry4: null,
};

describe("purchase-to-pharm-recive-transfer", () => {
  it("defaults transfer quantity to available quantity", () => {
    expect(defaultTransferQty(7)).toBe(7);
    expect(defaultTransferQty(0)).toBe(0);
  });

  it("preserves stock id, batch, expiry, store, and unit on candidate mapping fields used in payload", () => {
    const row = line();
    expect(row.candidate.stockId).toBe(50);
    expect(row.candidate.batchNo).toBe("B1");
    expect(row.candidate.expDate).toBe("2026-05-01");
    expect(row.candidate.sourceStoreId).toBe("10");
    expect(row.candidate.unitId).toBe(1);
  });

  it("allows reducing transfer quantity", () => {
    const row = line({ transferQty: 3 });
    expect(validateTransferQuantity(row.transferQty, row.candidate.availableQty)).toBeNull();
  });

  it("rejects zero, negative, and excessive quantities", () => {
    expect(validateTransferQuantity(0, 5)).toMatch(/greater than zero/i);
    expect(validateTransferQuantity(-1, 5)).toMatch(/greater than zero/i);
    expect(validateTransferQuantity(6, 5)).toMatch(/exceed/i);
  });

  it("rejects movement source store mismatch", () => {
    const rows = [line()];
    const wrongStore: MovmentLookupItem = { ...movement, movStor: "99" };
    const message = validateMovementSourceStoreForTransfer(wrongStore, rows);
    expect(message).toMatch(/does not match/i);
  });

  it("builds PharmRecive upsert payload for pending create (no movFlag override)", () => {
    const rows = [line({ transferQty: 4 })];
    const payload = buildPharmReciveTransferPayload({
      movement,
      movDate: "2026-11-04",
      fathId: 500,
      lines: rows,
    });

    expect(payload.header.movFlag).toBeNull();
    expect(payload.header.movStor).toBe("10");
    expect(payload.header.movDis).toBe("3");
    expect(payload.header.fathId).toBe(500);
    const detail = payload.details[0];
    expect(detail?.itmId).toBe("ITM-1");
    expect(detail?.batchNo).toBe("B1");
    expect(detail?.expDate).toBe("2026-05-01");
    expect(detail?.qnty).toBe(4);
    expect(detail?.unitId).toBe(1);
    expect(detail?.itmStock).toBe(50);
  });
});

describe("shared StockId base availability", () => {
  const sharedStockId = 500;
  const sharedBase = 100;

  it("allows combined quantities within shared base availability (same unit)", () => {
    const rows = [
      line({
        candidate: candidate({
          purchaseDetailId: 1,
          stockId: sharedStockId,
          itemNameEn: "Item A",
          availableQty: 100,
          baseAvailableQty: sharedBase,
          unitId: 1,
        }),
        transferQty: 40,
      }),
      line({
        candidate: candidate({
          purchaseDetailId: 2,
          stockId: sharedStockId,
          itemNameEn: "Item B",
          availableQty: 100,
          baseAvailableQty: sharedBase,
          unitId: 1,
        }),
        transferQty: 50,
      }),
    ];
    expect(validateSharedStockBaseAvailability(rows)).toBeNull();
    expect(validateTransferLinesBeforeSubmit(rows)).toBeNull();
  });

  it("rejects combined quantities exceeding shared base availability", () => {
    const rows = [
      line({
        candidate: candidate({
          purchaseDetailId: 1,
          stockId: sharedStockId,
          itemNameEn: "Alpha",
          availableQty: 100,
          baseAvailableQty: sharedBase,
        }),
        transferQty: 60,
      }),
      line({
        candidate: candidate({
          purchaseDetailId: 2,
          stockId: sharedStockId,
          itemNameEn: "Beta",
          availableQty: 100,
          baseAvailableQty: sharedBase,
        }),
        transferQty: 50,
      }),
    ];
    const message = validateSharedStockBaseAvailability(rows);
    expect(message).toMatch(/exceeds available stock/i);
    expect(message).toMatch(/Alpha/);
    expect(message).toMatch(/Beta/);
    expect(validateTransferLinesBeforeSubmit(rows)).toBe(message);
  });

  it("converts different units on the same StockId before summing base quantities", () => {
    const rows = [
      line({
        candidate: candidate({
          purchaseDetailId: 1,
          stockId: sharedStockId,
          itemNameEn: "Box line",
          availableQty: 10,
          baseAvailableQty: sharedBase,
          unitId: 1,
          itmUnit1Unit3: 10,
        }),
        transferQty: 5,
      }),
      line({
        candidate: candidate({
          purchaseDetailId: 2,
          stockId: sharedStockId,
          itemNameEn: "Strip line",
          availableQty: 100,
          baseAvailableQty: sharedBase,
          unitId: 3,
          itmUnit1Unit3: 10,
        }),
        transferQty: 50,
      }),
    ];
    expect(validateSharedStockBaseAvailability(rows)).toBeNull();

    const over = [
      { ...rows[0]!, transferQty: 6 },
      rows[1]!,
    ];
    expect(validateSharedStockBaseAvailability(over)).toMatch(/exceeds available stock/i);
  });

  it("ignores unselected lines when summing by StockId", () => {
    const rows = [
      line({
        candidate: candidate({
          purchaseDetailId: 1,
          stockId: sharedStockId,
          availableQty: 100,
          baseAvailableQty: sharedBase,
        }),
        transferQty: 90,
        included: true,
      }),
      line({
        candidate: candidate({
          purchaseDetailId: 2,
          stockId: sharedStockId,
          availableQty: 100,
          baseAvailableQty: sharedBase,
        }),
        transferQty: 90,
        included: false,
      }),
    ];
    expect(validateSharedStockBaseAvailability(rows)).toBeNull();
  });

  it("keeps different StockIds independent", () => {
    const rows = [
      line({
        candidate: candidate({
          purchaseDetailId: 1,
          stockId: 501,
          availableQty: 50,
          baseAvailableQty: 50,
        }),
        transferQty: 50,
      }),
      line({
        candidate: candidate({
          purchaseDetailId: 2,
          stockId: 502,
          availableQty: 50,
          baseAvailableQty: 50,
        }),
        transferQty: 50,
      }),
    ];
    expect(validateSharedStockBaseAvailability(rows)).toBeNull();
  });
});
