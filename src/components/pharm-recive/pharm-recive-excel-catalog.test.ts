import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { UnitItem } from "@/types/unit";

// ensureCatalogItemsForItmCodes resolves missing codes via getItemCatalogByCodes.
vi.mock("@/lib/api-client", () => ({
  getItemCatalogByCodes: vi.fn(async (_token: string, codes: string[]) =>
    codes.map((code) => ({
      id: 1,
      itemCatalogId: 1,
      itmCode: code,
      itmCode2: null,
      itmNameAr: "ع",
      itmNameEn: "En",
      itmUnit1: 10,
      itmUnit2: 20,
      itmUnit3: 30,
      itmUnit1Unit2: 4,
      itmUnit1Unit3: 12,
      itmDefSellPrice: 0,
      itmDefPharmPrice: 0,
      child: null,
    }))
  ),
  getItemCatalog: vi.fn(),
  getItemCatalogPage: vi.fn(async () => ({ items: [], totalCount: 0, page: 1, pageSize: 25 })),
  lookupItemCatalog: vi.fn(async () => []),
}));

import {
  buildRowUnitComboboxOptions,
  ensureCatalogItemsForItmCodes,
  findCatalogItemByCode,
} from "@/lib/item-unit-options";
import { mapPharmReciveExcelRowToDetail } from "@/lib/pharm-recive-excel-import";

const units: UnitItem[] = [
  { uCode: 10 } as UnitItem,
  { uCode: 20 } as UnitItem,
  { uCode: 30 } as UnitItem,
];

describe("Excel import catalog seeding fixes Unit combobox", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads catalog for imported itmId and exposes its Unit1/2/3 options", async () => {
    const imported = [{ itmId: "AUG100" }];
    const map = await ensureCatalogItemsForItmCodes(
      imported,
      new Map<string, ItemCatalogItem>(),
      [],
      "token"
    );

    // Item is resolvable by its (lowercased) code.
    const item = findCatalogItemByCode("AUG100", map);
    expect(item).not.toBeNull();
    expect(item?.itmUnit3).toBe(30);

    // Combobox now yields options (was empty because catalog entry was missing).
    const options = buildRowUnitComboboxOptions(units, item, true);
    expect(options.map((o) => o.value).sort()).toEqual(["10", "20", "30"]);
  });

  it("preserves the Excel-resolved unitId and qnty (Strip case)", () => {
    const itemByCode = new Map<string, ItemCatalogItem>([
      [
        "aug100",
        {
          id: 1,
          itemCatalogId: 1,
          itmCode: "AUG100",
          itmUnit1: 10,
          itmUnit2: 20,
          itmUnit3: 30,
          itmUnit1Unit2: 4,
          itmUnit1Unit3: 12,
          child: null,
        } as unknown as ItemCatalogItem,
      ],
    ]);

    const detail = mapPharmReciveExcelRowToDetail(
      {
        excelRowNumber: 1,
        itmId: "AUG100",
        itmNameAr: "",
        itmNameEn: "",
        qnty: "1",
        unitId: 30, // resolved by Complete Task as a Strip
        batchNo: "B1",
        expDate: "2025-01-01",
        isValid: true,
        errors: [],
      },
      itemByCode
    );

    expect(detail.unitId).toBe(30);
    expect(detail.qnty).toBe(1);

    // The resolved Strip unit appears among the combobox options.
    const options = buildRowUnitComboboxOptions(
      units,
      findCatalogItemByCode("AUG100", itemByCode),
      true
    );
    expect(options.some((o) => o.value === "30")).toBe(true);
  });
});
