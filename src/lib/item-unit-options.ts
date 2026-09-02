import type { ItemCatalogItem } from "@/types/item-catalog";
import type { UnitItem } from "@/types/unit";
import type { ComboboxOption } from "@/components/ui/searchable-combobox";
import {
  fetchAllItemCatalogItems,
  getItemCatalog,
  getItemCatalogByCodes,
  getItemCatalogPage,
  lookupItemCatalog,
} from "@/lib/api-client";

/** Minimal shape for item unit fields (reusable across transaction grids). */
export type ItemUnitFields = {
  itmUnit1?: number | null;
  itmUnit2?: number | null;
  itmUnit3?: number | null;
};

function normalizeUnitId(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const id = Math.trunc(value);
  return id > 0 ? id : null;
}

/**
 * Returns valid, deduplicated unit ids from ItemCatalog.Itm_Unit1/2/3.
 * Skips null, undefined, zero, and negative values.
 */
/** Default purchase unit is always ItemCatalog.Itm_Unit1. */
export function getItemDefaultUnitId(
  item: ItemUnitFields | null | undefined
): number | null {
  return normalizeUnitId(item?.itmUnit1);
}

export function getItemUnitIds(
  item: ItemUnitFields | null | undefined
): number[] {
  if (!item) return [];

  const seen = new Set<number>();
  const result: number[] = [];

  for (const raw of [item.itmUnit1, item.itmUnit2, item.itmUnit3]) {
    const id = normalizeUnitId(raw);
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
}

export function isUnitIdValidForItem(
  item: ItemUnitFields | null | undefined,
  unitId: number | null | undefined
): boolean {
  const normalized = normalizeUnitId(unitId);
  if (normalized == null) return false;
  return getItemUnitIds(item).includes(normalized);
}

/** Keeps unitId when still valid for the item; otherwise returns null. */
export function resolveUnitIdForItem(
  item: ItemUnitFields | null | undefined,
  unitId: number | null | undefined
): number | null {
  return isUnitIdValidForItem(item, unitId) ? normalizeUnitId(unitId) : null;
}

function codesMatch(
  itemCode: string | null | undefined,
  code: string
): boolean {
  return (itemCode?.trim().toLowerCase() ?? "") === code.trim().toLowerCase();
}

async function enrichCatalogItemIfNeeded(
  item: ItemCatalogItem,
  token: string
): Promise<ItemCatalogItem> {
  if (getItemUnitIds(item).length > 0 || item.id <= 0) return item;
  try {
    return await getItemCatalog(item.id, token);
  } catch {
    return item;
  }
}

/** Resolve one catalog row by item code (cache → paged search → lookup → full fetch). */
export async function resolveCatalogItemByCode(
  token: string,
  code: string,
  itemByCode: Map<string, ItemCatalogItem>,
  catalogItems?: readonly ItemCatalogItem[]
): Promise<ItemCatalogItem | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const cached = findCatalogItemByCode(trimmed, itemByCode, catalogItems);
  if (cached) return cached;

  const page = await getItemCatalogPage(token, {
    page: 1,
    pageSize: 25,
    search: trimmed,
    sortBy: "itmCode",
    sortDesc: false,
  });

  let match =
    page.items.find((item) => codesMatch(item.itmCode, trimmed)) ??
    page.items.find((item) => codesMatch(item.itmCode2, trimmed)) ??
    null;

  if (match) return enrichCatalogItemIfNeeded(match, token);

  const lookup = await lookupItemCatalog(token, trimmed, { take: 50 });
  match =
    lookup.find((item) => codesMatch(item.itmCode, trimmed)) ??
    lookup.find((item) => codesMatch(item.itmCode2, trimmed)) ??
    null;

  if (match) return enrichCatalogItemIfNeeded(match, token);

  return null;
}

export function findCatalogItemByCode(
  code: string | null | undefined,
  itemByCode: Map<string, ItemCatalogItem>,
  catalogItems?: readonly ItemCatalogItem[]
): ItemCatalogItem | null {
  const key = code?.trim().toLowerCase();
  if (!key) return null;

  const cached = itemByCode.get(key);
  if (cached) return cached;

  return (
    catalogItems?.find(
      (item) =>
        item.itmCode?.trim().toLowerCase() === key ||
        item.itmCode2?.trim().toLowerCase() === key
    ) ?? null
  );
}

export function indexCatalogItem(
  map: Map<string, ItemCatalogItem>,
  item: ItemCatalogItem,
  catalogItems?: readonly ItemCatalogItem[]
): void {
  const merged = mergeCatalogItemWithCache(item, map, catalogItems);
  const code = merged.itmCode?.trim().toLowerCase();
  if (code) map.set(code, merged);
  const code2 = merged.itmCode2?.trim().toLowerCase();
  if (code2) map.set(code2, merged);
}

export function formatUnitOptionLabel(
  unitId: number,
  unit?: Pick<UnitItem, "uNameAr" | "uNameEn"> | null
): string {
  const name = unit?.uNameAr?.trim() || unit?.uNameEn?.trim();
  return name ? `${unitId} - ${name}` : String(unitId);
}

export function buildItemUnitComboboxOptions(
  item: ItemUnitFields | null | undefined,
  unitByCode?: ReadonlyMap<number, Pick<UnitItem, "uNameAr" | "uNameEn">>
): ComboboxOption[] {
  return getItemUnitIds(item).map((unitId) => ({
    value: String(unitId),
    label: formatUnitOptionLabel(unitId, unitByCode?.get(unitId)),
  }));
}

/**
 * Row unit combobox options:
 * - No item selected → all units from the Unit table.
 * - Item selected → only units whose U_Code is Itm_Unit1, Itm_Unit2, or Itm_Unit3.
 * - Item selected but no valid unit ids → empty list.
 */
export function buildRowUnitComboboxOptions(
  allUnits: readonly UnitItem[],
  item: ItemUnitFields | null | undefined,
  itemSelected: boolean
): ComboboxOption[] {
  if (!itemSelected) {
    return allUnits.map((unit) => ({
      value: String(unit.uCode),
      label: formatUnitOptionLabel(unit.uCode, unit),
    }));
  }

  const allowedIds = getItemUnitIds(item);
  return allUnits
    .filter((unit) => allowedIds.includes(unit.uCode))
    .map((unit) => ({
      value: String(unit.uCode),
      label: formatUnitOptionLabel(unit.uCode, unit),
    }));
}

/** Prefer catalog row with unit fields when lookup payload is incomplete. */
export function mergeCatalogItemWithCache(
  item: ItemCatalogItem,
  itemByCode: Map<string, ItemCatalogItem>,
  catalogItems?: readonly ItemCatalogItem[]
): ItemCatalogItem {
  const code = item.itmCode?.trim().toLowerCase();
  if (!code) return item;

  const cached = itemByCode.get(code);
  const fromList = catalogItems?.find(
    (row) => row.itmCode?.trim().toLowerCase() === code
  );
  const fuller = cached ?? fromList;

  if (!fuller) return item;

  return {
    ...fuller,
    ...item,
    itmUnit1: item.itmUnit1 ?? fuller.itmUnit1,
    itmUnit2: item.itmUnit2 ?? fuller.itmUnit2,
    itmUnit3: item.itmUnit3 ?? fuller.itmUnit3,
  };
}

export function validatePurchaseDetailUnits(
  details: ReadonlyArray<{ itmId: string; unitId: number | null }>,
  itemByCode: Map<string, ItemCatalogItem>,
  catalogItems?: readonly ItemCatalogItem[]
): string | null {
  for (const [index, row] of details.entries()) {
    const code = row.itmId?.trim();
    if (!code) continue;

    if (row.unitId == null || row.unitId <= 0) continue;

    const item = findCatalogItemByCode(code, itemByCode, catalogItems);
    if (!item) {
      return `Line ${index + 1}: item "${code}" was not found in the catalog for unit validation. Select the item from the autocomplete list, or wait for the catalog to finish loading.`;
    }

    if (!isUnitIdValidForItem(item, row.unitId)) {
      return `Line ${index + 1}: unit ${row.unitId} is not valid for item "${code}".`;
    }
  }

  return null;
}

/** Resolve missing catalog rows before save-time unit validation. */
export async function ensureCatalogItemsForDetails(
  details: ReadonlyArray<{ itmId: string; unitId: number | null }>,
  itemByCode: Map<string, ItemCatalogItem>,
  catalogItems: readonly ItemCatalogItem[] | undefined,
  token: string
): Promise<Map<string, ItemCatalogItem>> {
  const map = new Map(itemByCode);

  for (const row of details) {
    const code = row.itmId?.trim();
    if (!code) continue;
    if (row.unitId == null || row.unitId <= 0) continue;
    if (findCatalogItemByCode(code, map, catalogItems)) continue;

    const resolved = await resolveCatalogItemByCode(
      token,
      code,
      map,
      catalogItems
    );
    if (!resolved) continue;
    indexCatalogItem(map, resolved, catalogItems);
  }

  return map;
}

/** Resolve catalog rows for all detail item codes (load/search/navigation). */
export async function ensureCatalogItemsForItmCodes(
  details: ReadonlyArray<{ itmId: string }>,
  itemByCode: Map<string, ItemCatalogItem>,
  catalogItems: readonly ItemCatalogItem[] | undefined,
  token: string,
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, ItemCatalogItem>> {
  const map = new Map(itemByCode);
  const uniqueCodes: string[] = [];
  const seen = new Set<string>();

  for (const row of details) {
    const code = row.itmId?.trim();
    if (!code) continue;
    const key = code.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueCodes.push(code);
  }

  const total = uniqueCodes.length;
  onProgress?.(0, total);

  const missing = uniqueCodes.filter(
    (code) => !findCatalogItemByCode(code, map, catalogItems)
  );

  if (missing.length > 0) {
    try {
      const items = await getItemCatalogByCodes(token, missing, {
        onProgress: (done, _batchTotal) => {
          onProgress?.(Math.min(done, total), total);
        },
      });
      for (const item of items) {
        indexCatalogItem(map, item, catalogItems);
      }
    } catch {
      try {
        const all = await fetchAllItemCatalogItems(token);
        for (const item of all) {
          indexCatalogItem(map, item, catalogItems);
        }
      } catch {
        for (let index = 0; index < missing.length; index += 1) {
          const code = missing[index];
          if (!code) continue;
          const resolved = await resolveCatalogItemByCode(
            token,
            code,
            map,
            catalogItems
          );
          if (resolved) indexCatalogItem(map, resolved, catalogItems);
          onProgress?.(index + 1, total);
        }
      }
    }
  }

  onProgress?.(total, total);
  return map;
}

/** @deprecated Use getItemUnitIds — alias for prompt compatibility. */
export const getItemUnitOptions = getItemUnitIds;
