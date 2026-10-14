import { describe, expect, it } from "vitest";
import {
  checkInvoiceStockAllocation,
  createEmptySalesLine,
  isSellableSalesLine,
  sumLinesNet,
  validateSalesQuantities,
} from "@/lib/sales-workspace-calc";
import { salesItemSecondaryLabel } from "@/lib/sales-item-search-ux";
import type { SalesItemSearchHit, SalesWorkspaceLine } from "@/types/sales-workspace";

const units = (id: number) => (id === 1 ? "Box" : String(id));

function physicalLine(patch: Partial<SalesWorkspaceLine> = {}): SalesWorkspaceLine {
  return {
    ...createEmptySalesLine(),
    itemCatalogId: 701,
    itemCode: "ITM-701",
    itemName: "Physical item",
    stockId: 900,
    batchNo: "PHYSBATCH",
    availableQty: 10,
    unit1: 1,
    unit3: 1,
    unit1Unit3: 1,
    unitId: 1,
    quantity: 1,
    baseUnitSellPrice: 12,
    unitSellPrice: 12,
    ...patch,
  };
}

function serviceLine(patch: Partial<SalesWorkspaceLine> = {}): SalesWorkspaceLine {
  return physicalLine({
    itemCatalogId: 700,
    itemCode: "SVC-700",
    itemName: "Installation service",
    stockId: 0,
    batchNo: "",
    availableQty: 0,
    unitSellPrice: 50,
    baseUnitSellPrice: 50,
    isService: true,
    ...patch,
  });
}

describe("service sales lines", () => {
  it("counts as sellable without a stock row", () => {
    expect(isSellableSalesLine(serviceLine())).toBe(true);
    expect(isSellableSalesLine(physicalLine())).toBe(true);
    expect(isSellableSalesLine(physicalLine({ stockId: 0 }))).toBe(false);
    expect(isSellableSalesLine(createEmptySalesLine())).toBe(false);
  });

  it("contributes to invoice totals", () => {
    expect(sumLinesNet([serviceLine({ quantity: 2 })])).toBe(100);
    expect(sumLinesNet([physicalLine(), serviceLine({ quantity: 2 })])).toBe(112);
  });

  it("skips batch allocation without relaxing physical rules", () => {
    const lines = [physicalLine(), serviceLine({ quantity: 5 })];
    expect(
      checkInvoiceStockAllocation(lines, lines[1], units(1), lines[1].key).ok
    ).toBe(true);

    const pending = physicalLine({ stockId: 0 });
    const physicalCheck = checkInvoiceStockAllocation(
      [pending],
      pending,
      units(1),
      pending.key
    );
    expect(physicalCheck.ok).toBe(false);
    if (!physicalCheck.ok) {
      expect(physicalCheck.message).toBe("Select a stock batch first.");
    }
  });

  it("validates a mixed invoice and still blocks a missing batch", () => {
    const mixed = [physicalLine(), serviceLine({ quantity: 3 })];
    expect(validateSalesQuantities(mixed, units).ok).toBe(true);

    const serviceWithoutUnit = [serviceLine({ unitId: 0 })];
    const result = validateSalesQuantities(serviceWithoutUnit, units);
    expect(result.ok).toBe(false);
  });
});

describe("service item search hits", () => {
  const hit = (patch: Partial<SalesItemSearchHit>): SalesItemSearchHit => ({
    itemCatalogId: 700,
    itmCode: "SVC-700",
    itmNameAr: "خدمة",
    itmNameEn: "Installation service",
    defSellPrice: 50,
    defPharmPrice: 50,
    unit1: 1,
    unit2: null,
    unit3: 1,
    unit1Unit2: null,
    unit1Unit3: 1,
    itmMaxDiscPer: null,
    groupNameEn: "",
    groupNameAr: "",
    itmSrvc: true,
    stocks: [],
    ...patch,
  });

  it("labels a service hit as a service, not as out of stock", () => {
    expect(salesItemSecondaryLabel(hit({}), "CurrentPharmacy")).toContain("Service");
    expect(salesItemSecondaryLabel(hit({}), "CurrentPharmacy")).not.toContain("No stock");
    expect(
      salesItemSecondaryLabel(
        hit({ itmSrvc: false, itmCode: "ITM-701", itemCatalogId: 701 }),
        "CurrentPharmacy"
      )
    ).toContain("No stock");
  });
});
