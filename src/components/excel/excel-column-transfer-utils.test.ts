import { describe, expect, it } from "vitest";
import type { ExcelEntityMetadata } from "@/types/excel";
import {
  buildAvailableColumns,
  buildDefaultSelectedColumns,
  buildDisplaySelectedColumns,
  getLockedMatchKeyColumns,
  usesAlternateKeyForUpdate,
} from "@/components/excel/excel-column-transfer-utils";

function itemCatalogMetadata(): ExcelEntityMetadata {
  return {
    entityName: "ItemCatalog",
    displayName: "Item Catalog",
    primaryKey: "Id",
    identityKey: true,
    alternateKey: "Itm_Code",
    updateMatchAlternateKey: true,
    excludedColumns: [],
    lookupColumns: [],
    useCreateMethod: true,
    useUpdateMethod: true,
    useDeleteMethod: true,
    properties: [
      {
        name: "Id",
        clrType: "Int32",
        isPrimaryKey: true,
        isForeignKey: false,
        isRequired: true,
        isNullable: false,
        isImportable: true,
        isDatabaseGenerated: true,
      },
      {
        name: "Itm_Code",
        clrType: "String",
        isPrimaryKey: false,
        isForeignKey: false,
        isRequired: false,
        isNullable: true,
        isImportable: true,
        isDatabaseGenerated: false,
      },
      {
        name: "Itm_DefSell_Price",
        clrType: "Single",
        isPrimaryKey: false,
        isForeignKey: false,
        isRequired: false,
        isNullable: true,
        isImportable: true,
        isDatabaseGenerated: false,
      },
      {
        name: "Itm_Active",
        clrType: "Boolean",
        isPrimaryKey: false,
        isForeignKey: false,
        isRequired: true,
        isNullable: false,
        isImportable: true,
        isDatabaseGenerated: false,
      },
      {
        name: "ItemCatalogId",
        clrType: "Int32",
        isPrimaryKey: false,
        isForeignKey: false,
        isRequired: true,
        isNullable: false,
        isImportable: true,
        isDatabaseGenerated: false,
      },
    ],
  };
}

describe("ItemCatalog Update column utils", () => {
  it("starts Update mode with no optional columns selected", () => {
    const metadata = itemCatalogMetadata();
    expect(buildDefaultSelectedColumns(metadata, "Update")).toEqual([]);
    expect(getLockedMatchKeyColumns(metadata, "Update")).toEqual(["Itm_Code"]);
  });

  it("hides Id and ItemCatalogId from Update template picker", () => {
    const metadata = itemCatalogMetadata();
    const available = buildAvailableColumns(metadata, "Update", []);
    expect(available).not.toContain("Id");
    expect(available).not.toContain("ItemCatalogId");
    expect(available).toContain("Itm_DefSell_Price");
  });

  it("does not duplicate primary key in export display list", () => {
    const metadata = itemCatalogMetadata();
    metadata.updateMatchAlternateKey = false;
    const selected = buildDefaultSelectedColumns(metadata, "Upsert");
    const display = buildDisplaySelectedColumns(metadata, "Upsert", selected);
    const idCount = display.filter((name) => name === "Id").length;
    expect(idCount).toBeLessThanOrEqual(1);
    expect(display[0]).toBe("Id");
  });

  it("allows selecting only Itm_DefSell_Price", () => {
    const metadata = itemCatalogMetadata();
    expect(usesAlternateKeyForUpdate(metadata)).toBe(true);
    const selected = ["Itm_DefSell_Price"];
    const available = buildAvailableColumns(metadata, "Update", selected);
    expect(available).not.toContain("Itm_DefSell_Price");
    expect(available).not.toContain("Itm_Code");
  });
});