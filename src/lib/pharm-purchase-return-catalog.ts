import type { ItemCatalogItem } from "@/types/item-catalog";
import {
  ensureCatalogItemsForDetails,
  ensureCatalogItemsForItmCodes,
  findUnresolvedCatalogCodesForUnitValidation,
  formatCatalogResolutionError,
} from "@/lib/item-unit-options";

/** Save-time catalog map for pharmacy purchase return (unit validation). */
export async function resolveCatalogMapForPharmPurchaseReturnSave(
  details: ReadonlyArray<{ itmId: string; unitId: number | null }>,
  itemByCode: Map<string, ItemCatalogItem>,
  catalogItems: readonly ItemCatalogItem[] | undefined,
  token: string
): Promise<{ map: Map<string, ItemCatalogItem>; error: string | null }> {
  let map = await ensureCatalogItemsForItmCodes(
    details,
    itemByCode,
    catalogItems,
    token
  );
  map = await ensureCatalogItemsForDetails(
    details,
    map,
    catalogItems,
    token
  );

  const unresolved = findUnresolvedCatalogCodesForUnitValidation(
    details,
    map,
    catalogItems
  );
  if (unresolved.length > 0) {
    const first = unresolved[0]!;
    return {
      map,
      error: formatCatalogResolutionError(first.lineIndex, first.code),
    };
  }

  return { map, error: null };
}
