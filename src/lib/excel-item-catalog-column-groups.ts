/** Logical groupings for Item Catalog Excel template column picker (property names). */

export type ItemCatalogColumnGroup = {
  id: string;
  label: string;
  columns: string[];
};

export const ITEM_CATALOG_COLUMN_GROUPS: ItemCatalogColumnGroup[] = [
  {
    id: "basic",
    label: "Basic Item Information",
    columns: [
      "Itm_Code2",
      "Itm_Int_Code",
      "Itm_Name_Ar",
      "Itm_Name_En",
      "Itm_Notes",
    ],
  },
  {
    id: "prices",
    label: "Prices",
    columns: [
      "Itm_DefSell_Price",
      "Itm_DefPharm_Price",
      "Itm_Def_Tax",
      "Itm_MaxDisc_Per",
      "Itm_MaxDisc_Val",
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    columns: [
      "Itm_Unit1",
      "Itm_Unit2",
      "Itm_Unit3",
      "Itm_Unit1Unit2",
      "Itm_Unit1_Unit3",
    ],
  },
  {
    id: "expiry",
    label: "Expiry and Batch",
    columns: ["Itm_Has_Expire"],
  },
  {
    id: "classification",
    label: "Classification",
    columns: ["BrandId", "Itm_Origin", "Itm_Group", "item_Form"],
  },
  {
    id: "flags",
    label: "Other Fields",
    columns: [
      "Itm_Active",
      "Itm_Stop_Sell",
      "Itm_Srvc",
      "Itm_StopPur",
      "Itm_PrintBarcode",
      "Itm_Allow_Discount",
      "ItmFreez",
    ],
  },
];

const GROUP_ORDER = new Map(
  ITEM_CATALOG_COLUMN_GROUPS.flatMap((group, groupIndex) =>
    group.columns.map((column, columnIndex) => [
      column.toLowerCase(),
      groupIndex * 100 + columnIndex,
    ] as const)
  )
);

export function itemCatalogColumnSortKey(columnName: string): number {
  const key = columnName.toLowerCase();
  return GROUP_ORDER.get(key) ?? 10_000;
}

export function groupLabelForColumn(columnName: string): string | null {
  const key = columnName.toLowerCase();
  for (const group of ITEM_CATALOG_COLUMN_GROUPS) {
    if (group.columns.some((c) => c.toLowerCase() === key)) {
      return group.label;
    }
  }
  return null;
}