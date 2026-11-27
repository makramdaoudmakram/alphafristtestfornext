import { describe, expect, it } from "vitest";
import { buildRowUnitComboboxOptions } from "@/lib/item-unit-options";
import type { UnitItem } from "@/types/unit";

describe("buildRowUnitComboboxOptions", () => {
  it("lists item unit ids even when the master Unit table has no matching row", () => {
  const units: UnitItem[] = [{ uCode: 1, uNameAr: "علبة", uNameEn: "Box" }];
    const options = buildRowUnitComboboxOptions(
      units,
      { itmUnit1: 1, itmUnit2: 30, itmUnit3: null },
      true
    );
    expect(options.map((o) => o.value)).toEqual(["1", "30"]);
    expect(options[1].label).toBe("30");
  });
});