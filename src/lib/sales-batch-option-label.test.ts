import { describe, expect, it } from "vitest";
import { formatSalesBatchOptionLabel } from "@/lib/sales-batch-option-label";
import type { UnitItem } from "@/types/unit";

const units: UnitItem[] = [
  { uCode: 1, uNameEn: "Box", uNameAr: "علبة" },
];

describe("formatSalesBatchOptionLabel", () => {
  it("formats batch, converted qty with unit, and MM/YYYY expiry", () => {
    const label = formatSalesBatchOptionLabel(
      {
        batchNo: "000236",
        availableQty: 56.6,
        expDate: "2026-01-01",
        unitId: 1,
        unit1: 1,
        unit2: null,
        unit3: 3,
        unit1Unit2: null,
        unit1Unit3: 10,
      },
      units
    );
    expect(label).toBe("000236 -- 5.66 Box -- 01/2026");
  });

  it("omits pharmacy and uses placeholder when expiry is missing", () => {
    const label = formatSalesBatchOptionLabel(
      {
        batchNo: "B1",
        availableQty: 3,
        expDate: null,
        unitId: 1,
        unit1: 1,
        unit2: null,
        unit3: 3,
        unit1Unit2: null,
        unit1Unit3: 1,
      },
      units
    );
    expect(label).toBe("B1 -- 3 Box -- —");
    expect(label).not.toMatch(/pharm/i);
  });
});
