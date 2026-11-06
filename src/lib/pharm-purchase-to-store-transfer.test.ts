import { describe, expect, it } from "vitest";
import {
  buildPharmPurchaseStoreReturnSendPayload,
  buildSendDetailsFromPharmPurchaseTransferLines,
  defaultTransferQty,
  type PurchaseTransferLineSelection,
  validatePharmacyStoreScopeForTransfer,
  validatePharmPurchaseStoreReturnBeforeSubmit,
  validatePharmPurchaseStoreReturnMovement,
  validateTransferLinesBeforeSubmit,
  validateTransferQuantity,
  resolvePharmacyStoreIdForReturnMovementValidation,
} from "@/lib/pharm-purchase-to-store-transfer";
import { PHARM_STORE_RETURN_MOV_PARENT_ID } from "@/lib/pharm-store-return-send";
import type { ItemCatalogItem } from "@/types/item-catalog";
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

const catalogItem: ItemCatalogItem = {
  id: 1,
  itmCode: "ITM-1",
  itmNameEn: "Item",
  itmNameAr: "",
  itmUnit1: 1,
  itmUnit2: null,
  itmUnit3: 3,
  itmUnit1Unit2: null,
  itmUnit1Unit3: 1,
  itmActive: true,
};

const catalogMap = new Map<string, ItemCatalogItem>([["ITM-1", catalogItem]]);

const movement: MovmentLookupItem = {
  id: 99,
  movChiledId: 7,
  movChiledName: "Pharm Return",
  movParientId: PHARM_STORE_RETURN_MOV_PARENT_ID,
  movStor: "10",
  movStor2: "999",
  movSingleStore: false,
  movAccountEntry1: null,
  movAccountEntry2: null,
  movAccountEntry3: null,
  movAccountEntry4: null,
};

describe("pharm-purchase-to-store-transfer", () => {
  it("defaults transfer quantity to available quantity", () => {
    expect(defaultTransferQty(7)).toBe(7);
  });

  it("allows partial transfer", () => {
    const row = line({ transferQty: 2 });
    expect(validateTransferQuantity(row.transferQty, row.candidate.availableQty)).toBeNull();
  });

  it("rejects quantity above available", () => {
    expect(validateTransferQuantity(8, 7)).toMatch(/cannot exceed/i);
  });

  it("rejects invalid stock id in send details", () => {
    const badLine = line({ candidate: candidate({ stockId: null }) });
    const details = buildSendDetailsFromPharmPurchaseTransferLines([badLine], catalogMap);
    const result = validatePharmPurchaseStoreReturnBeforeSubmit({
      movement,
      pharmacyStoreId: "10",
      lines: [badLine],
      sendDetails: details,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/stock/i);
  });

  it("rejects wrong pharmacy store scope", () => {
    const scopeError = validatePharmacyStoreScopeForTransfer("99", [line()]);
    expect(scopeError).toMatch(/store 10/);
  });

  it("requires pharm return movement matching pharmacy store", () => {
    const badMovement = { ...movement, movStor: "99" };
    expect(
      validatePharmPurchaseStoreReturnMovement(badMovement, "10", [line()])
    ).toMatch(/main store return movement/i);
  });

  it("uses purchase line source store for movement pharmacy check", () => {
    expect(resolvePharmacyStoreIdForReturnMovementValidation("1", [line()])).toBe("10");
    const movWithoutDest = { ...movement, movStor2: null };
    expect(
      validatePharmPurchaseStoreReturnMovement(movWithoutDest, "10", [line()])
    ).toMatch(/destination store is missing/i);
  });

  it("rejects movement whose source store does not match purchase batch store", () => {
    const row = line({ candidate: candidate({ sourceStoreId: "10" }) });
    const mismatchMovement = { ...movement, movStor: "11" };
    expect(
      validatePharmPurchaseStoreReturnMovement(mismatchMovement, undefined, [row])
    ).toMatch(/main store return movement for your pharmacy/);
  });

  it("builds send payload with stock id and destination movement", () => {
    const payload = buildPharmPurchaseStoreReturnSendPayload({
      movement,
      note: "test",
      lines: [line({ transferQty: 3 })],
      catalogByCode: catalogMap,
    });
    expect(payload.MovmentRowId).toBe(99);
    expect(payload.Details).toHaveLength(1);
    expect(payload.Details[0]?.StockId).toBe(50);
    expect(payload.Details[0]?.Qnty).toBe(3);
    expect(payload.Details[0]?.UnitId).toBe(1);
  });

  it("uses base availability on send detail rows", () => {
    const details = buildSendDetailsFromPharmPurchaseTransferLines([line()], catalogMap);
    expect(details[0]?.baseAvailableQty).toBe(7);
  });

  it("passes full-line validation before submit", () => {
    const details = buildSendDetailsFromPharmPurchaseTransferLines([line()], catalogMap);
    const result = validatePharmPurchaseStoreReturnBeforeSubmit({
      movement,
      pharmacyStoreId: "10",
      lines: [line()],
      sendDetails: details,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects zero included lines", () => {
    expect(
      validateTransferLinesBeforeSubmit([line({ included: false, transferQty: 0 })])
    ).toMatch(/Select at least one/i);
  });
});
