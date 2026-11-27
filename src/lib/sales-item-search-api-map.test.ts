import { describe, expect, it } from "vitest";
import {
  mapSalesItemSearchHitRow,
  readSalesItemSearchUnit,
  readSalesItemSearchUnit1Unit2,
  readSalesItemSearchUnit1Unit3,
} from "@/lib/api-client";

function salesGridHasConfiguredUnits(hit: {
  unit1: number | null;
  unit2: number | null;
  unit3: number | null;
}): boolean {
  return !!(hit.unit1 || hit.unit2 || hit.unit3);
}

describe("Sales item search API unit mapping", () => {
  const baseRow = {
    itemCatalogId: 101,
    itmCode: "ITM-1",
    itmNameAr: "صنف",
    itmNameEn: "Item",
  };

  it("maps lowercase Sales DTO unit1/2/3", () => {
    const hit = mapSalesItemSearchHitRow({
      ...baseRow,
      unit1: 5,
      unit2: 6,
      unit3: 7,
    });
    expect(hit.unit1).toBe(5);
    expect(hit.unit2).toBe(6);
    expect(hit.unit3).toBe(7);
  });

  it("maps PascalCase Unit1/2/3", () => {
    const hit = mapSalesItemSearchHitRow({
      ...baseRow,
      Unit1: 5,
      Unit2: 6,
      Unit3: 7,
    });
    expect(hit).toMatchObject({ unit1: 5, unit2: 6, unit3: 7 });
  });

  it("maps ItemCatalog-style unit aliases", () => {
    const hit = mapSalesItemSearchHitRow({
      ...baseRow,
      itm_Unit1: 11,
      Itm_Unit2: 12,
      ItmUnit3: 13,
    });
    expect(hit).toMatchObject({ unit1: 11, unit2: 12, unit3: 13 });
  });

  it("prefers Sales unit keys when multiple aliases are present", () => {
    const hit = mapSalesItemSearchHitRow({
      ...baseRow,
      unit1: 5,
      itm_Unit1: 99,
    });
    expect(hit.unit1).toBe(5);
  });

  it("maps unit1Unit2 and unit1Unit3 including catalog aliases", () => {
    expect(
      readSalesItemSearchUnit1Unit2({ unit1Unit2: 24, itm_Unit1Unit2: 99 })
    ).toBe(24);
    expect(
      readSalesItemSearchUnit1Unit2({ Itm_Unit1Unit2: 10 })
    ).toBe(10);
    expect(
      readSalesItemSearchUnit1Unit3({ unit1Unit3: 1000 })
    ).toBe(1000);
    expect(
      readSalesItemSearchUnit1Unit3({ itm_Unit1_Unit3: 48 })
    ).toBe(48);

    const hit = mapSalesItemSearchHitRow({
      ...baseRow,
      unit1: 1,
      Unit1Unit2: 12,
      ItmUnit1Unit3: 100,
    });
    expect(hit.unit1Unit2).toBe(12);
    expect(hit.unit1Unit3).toBe(100);
  });

  it("leaves units null when API omits them (readNullableNumber behavior)", () => {
    const hit = mapSalesItemSearchHitRow({ ...baseRow });
    expect(hit.unit1).toBeNull();
    expect(hit.unit2).toBeNull();
    expect(hit.unit3).toBeNull();
  });

  it("maps pharmacy item-stock header units the same as search hits", () => {
    const itemStock = {
      itemCatalogId: 101,
      unit1: 5,
      Unit2: 6,
      itm_Unit3: 7,
    };
    expect(readSalesItemSearchUnit(itemStock, 1)).toBe(5);
    expect(readSalesItemSearchUnit(itemStock, 2)).toBe(6);
    expect(readSalesItemSearchUnit(itemStock, 3)).toBe(7);
  });

  describe("Sales selection regression (grid unit guard)", () => {
    it("does not treat a mapped hit with valid unit IDs as having no units", () => {
      const hit = mapSalesItemSearchHitRow({
        ...baseRow,
        unit1: 5,
        unit2: null,
        unit3: null,
      });
      expect(salesGridHasConfiguredUnits(hit)).toBe(true);
    });

    it("still treats genuinely missing units as unconfigured", () => {
      const hit = mapSalesItemSearchHitRow({ ...baseRow });
      expect(salesGridHasConfiguredUnits(hit)).toBe(false);
    });
  });
});