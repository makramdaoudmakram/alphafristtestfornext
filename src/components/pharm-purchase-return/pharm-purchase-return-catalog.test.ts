import { describe, expect, it } from "vitest";
import {
  formatCatalogResolutionError,
  getCanonicalItemCatalogCode,
  indexCatalogItem,
  validatePurchaseDetailUnits,
} from "@/lib/item-unit-options";
import type { ItemCatalogItem } from "@/types/item-catalog";

function catalogRow(overrides: Partial<ItemCatalogItem> = {}): ItemCatalogItem {
  return {
    id: 99,
    itemCatalogId: 99,
    itmCode: "PRIMARY",
    itmCode2: "34740",
    itmUnit1: 1,
    itmUnit2: null,
    itmUnit3: null,
    child: null,
    ...overrides,
  } as ItemCatalogItem;
}

describe("pharmacy purchase return catalog unit validation", () => {
  it("prefers Itm_Code as canonical detail code", () => {
    const row = catalogRow();
    expect(getCanonicalItemCatalogCode(row)).toBe("PRIMARY");
  });

  it("uses explicit resolution errors instead of generic unit-catalog text", () => {
    expect(formatCatalogResolutionError(0, "81848")).toContain(
      'could not resolve catalog item "81848"'
    );
  });

  it("recognizes items indexed with Itm_Code2 when the line uses that code", () => {
    const itemByCode = new Map<string, ItemCatalogItem>();
    indexCatalogItem(itemByCode, catalogRow(), []);

    expect(
      validatePurchaseDetailUnits(
        [{ itmId: "34740", unitId: 1 }],
        itemByCode,
        []
      )
    ).toBeNull();
  });

  it("fails when the item was only keyed by primary code and the line uses an unindexed alias", () => {
    const itemByCode = new Map<string, ItemCatalogItem>();
    const row = catalogRow();
    itemByCode.set("primary", row);

    expect(
      validatePurchaseDetailUnits(
        [{ itmId: "34740", unitId: 1 }],
        itemByCode,
        []
      )
    ).toContain("34740");
  });
});
