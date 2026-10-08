import { describe, expect, it } from "vitest";
import {
  PHARM_STORE_RETURN_MOV_PARENT_ID,
  buildDetailRowFromStockSearch,
  isMovementValidForSend,
  toSendPayload,
  validateSendDocument,
} from "@/lib/pharm-store-return-send";
import type { MovmentLookupItem } from "@/types/movment";
import type { ReturnItemStockSearchItem } from "@/types/stock";
import type {
  PharmStoreReturnSendDetail,
  PharmStoreReturnSendUnitFields,
} from "@/types/pharm-store-return-send";

const BOX = 10;
const STRIP = 30;

function movement(overrides: Partial<MovmentLookupItem> = {}): MovmentLookupItem {
  return {
    id: 5001,
    movChiledId: 12,
    movChiledName: "Pharm Return store",
    movParientId: PHARM_STORE_RETURN_MOV_PARENT_ID,
    movStor: "5",
    movStor2: "1",
    movSingleStore: false,
    movAccountEntry1: null,
    movAccountEntry2: null,
    movAccountEntry3: null,
    movAccountEntry4: null,
    ...overrides,
  };
}

function unitFields(overrides: Partial<PharmStoreReturnSendUnitFields> = {}): PharmStoreReturnSendUnitFields {
  // Box (Unit1) = 3 Strips (Unit3 base); no Unit2 pack.
  return {
    itmUnit1: BOX,
    itmUnit2: null,
    itmUnit3: STRIP,
    itmUnit1Unit2: null,
    itmUnit1Unit3: 3,
    ...overrides,
  };
}

function detail(overrides: Partial<PharmStoreReturnSendDetail> = {}): PharmStoreReturnSendDetail {
  return {
    clientRowId: "row-1",
    stockId: 77,
    itmId: "A1",
    itmNameAr: "صنف",
    itmNameEn: "Item",
    batchNo: "B1",
    expDate: "2026-12-01",
    unitId: BOX,
    qnty: 1,
    baseAvailableQty: 100,
    itemCostPrice: 0,
    itmSellPrice: 0,
    unitFields: unitFields(),
    ...overrides,
  };
}

describe("isMovementValidForSend", () => {
  it("accepts a 1007 movement sourced from the current pharmacy to a store", () => {
    expect(isMovementValidForSend(movement(), "5")).toBe(true);
  });

  it("rejects a movement from another pharmacy", () => {
    expect(isMovementValidForSend(movement({ movStor: "9" }), "5")).toBe(false);
  });

  it("rejects an invalid parent", () => {
    expect(isMovementValidForSend(movement({ movParientId: 8 }), "5")).toBe(false);
  });

  it("rejects a movement with no destination store", () => {
    expect(isMovementValidForSend(movement({ movStor2: null }), "5")).toBe(false);
  });
});

describe("validateSendDocument — unit conversion (Box = 3 Strips)", () => {
  it("accepts 1 Box as base 3 within availability", () => {
    const result = validateSendDocument(movement(), [detail({ unitId: BOX, qnty: 1, baseAvailableQty: 3 })]);
    expect(result.ok).toBe(true);
  });

  it("accepts 1 and 2 Strips as base 1 and 2", () => {
    const rows = [
      detail({ clientRowId: "r1", unitId: STRIP, qnty: 1, baseAvailableQty: 5 }),
      detail({ clientRowId: "r2", unitId: STRIP, qnty: 2, baseAvailableQty: 5 }),
    ];
    expect(validateSendDocument(movement(), rows).ok).toBe(true);
  });

  it("rejects insufficient source stock (1 Box needs base 3, only 2 available)", () => {
    const result = validateSendDocument(movement(), [detail({ unitId: BOX, qnty: 1, baseAvailableQty: 2 })]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/available/);
  });

  it("rejects a quantity that does not convert to a whole base unit", () => {
    // 1 of a Unit2 pack where 1 Box(=3 base) / 2 packs = 1.5 base
    const result = validateSendDocument(
      movement(),
      [detail({ unitId: 20, unitFields: unitFields({ itmUnit2: 20, itmUnit1Unit2: 2 }), qnty: 1 })]
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/whole base/);
  });

  it("rejects a unit that is not valid for the item catalog", () => {
    const result = validateSendDocument(movement(), [detail({ unitId: 999 })]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/not valid/);
  });

  it("requires a movement and at least one item line", () => {
    expect(validateSendDocument(null, [detail()]).ok).toBe(false);
    expect(validateSendDocument(movement(), []).ok).toBe(false);
  });
});

describe("buildDetailRowFromStockSearch", () => {
  it("pins stockId, batch, expiry, prices and default unit from the catalog snapshot", () => {
    const item: ReturnItemStockSearchItem = {
      itemCatalogId: 42,
      itemCode: "A1",
      itemNameAr: "صنف",
      itemNameEn: "Item",
      itemName: "Item",
      storeId: 5,
      totalQuantity: 4,
      availableQty: 4,
      baseAvailableQty: 12,
      itmUnit1: BOX,
      itmUnit2: null,
      itmUnit3: STRIP,
      itmUnit1Unit2: null,
      itmUnit1Unit3: 3,
      salesPrice: 9.5,
      costPrice: 6,
      stockId: 77,
      expDate: "2026-12-01",
      batchNo: "B1",
    };
    const row = buildDetailRowFromStockSearch(item);
    expect(row.stockId).toBe(77);
    expect(row.itmId).toBe("A1");
    expect(row.batchNo).toBe("B1");
    expect(row.unitId).toBe(BOX);
    expect(row.unitFields.itmUnit1).toBe(BOX);
    expect(row.unitFields.itmUnit1Unit3).toBe(3);
    expect(row.baseAvailableQty).toBe(12);
    expect(row.itmSellPrice).toBe(9.5);
  });
});

describe("toSendPayload", () => {
  it("maps each line to StockId/ItmId/Qnty/UnitId and drops empty lines", () => {
    const payload = toSendPayload(5001, " hello ", [
      detail({ unitId: STRIP, qnty: 2 }),
      { ...detail({ clientRowId: "empty" }), itmId: "", stockId: null },
    ]);
    expect(payload.MovmentRowId).toBe(5001);
    expect(payload.Note).toBe("hello");
    expect(payload.Details).toEqual([
      { StockId: 77, ItmId: "A1", Qnty: 2, UnitId: STRIP },
    ]);
  });
});
