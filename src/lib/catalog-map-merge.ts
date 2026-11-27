import type { ItemCatalogItem } from "@/types/item-catalog";
import { indexCatalogItem } from "@/lib/item-unit-options";

export type CatalogMapCallback = (map: Map<string, ItemCatalogItem>) => void;

/** Merge a load/save catalog resolution map into page state (item codes indexed). */
export function applyCatalogMapToState(
  prev: Map<string, ItemCatalogItem>,
  next?: Map<string, ItemCatalogItem>
): Map<string, ItemCatalogItem> {
  if (!next || next.size === 0) return prev;
  const merged = new Map(prev);
  for (const item of next.values()) {
    indexCatalogItem(merged, item);
  }
  return merged;
}