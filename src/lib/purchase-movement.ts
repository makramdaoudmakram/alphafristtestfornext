import { getMovmentById, lookupMovments } from "@/lib/api-client";
import type { MovmentItem, MovmentLookupItem } from "@/types/movment";
import type { PurchaseHeader } from "@/types/purchase";

export function toMovmentLookupItem(
  item: MovmentItem | MovmentLookupItem
): MovmentLookupItem {
  return {
    id: item.id,
    movChiledId: item.movChiledId,
    movChiledName: item.movChiledName,
    movParientId: item.movParientId,
    movStor: item.movStor,
    movStor2: item.movStor2 ?? null,
    movSingleStore: item.movSingleStore,
    movAccountEntry1: item.movAccountEntry1,
    movAccountEntry2: item.movAccountEntry2,
    movAccountEntry3: item.movAccountEntry3,
  };
}

/** Resolve Movment lookup row for a saved purchase header (MovId = MovChiledId in DB). */
export async function resolveMovementForPurchaseHeader(
  token: string,
  parentId: number,
  header: Pick<
    PurchaseHeader,
    "movId" | "movmentRowId" | "movAccount" | "movAccountsec" | "venId"
  >
): Promise<MovmentLookupItem | null> {
  if (header.movmentRowId != null && header.movmentRowId > 0) {
    try {
      const full = await getMovmentById(header.movmentRowId, token);
      return toMovmentLookupItem(full);
    } catch {
      // Fall back to MovId lookup below.
    }
  }

  if (header.movId == null) return null;

  const items = await lookupMovments(token, parentId, "", { pageSize: 200 });
  const candidates = items.filter((row) => row.movChiledId === header.movId);
  if (candidates.length === 0) return null;

  let match = candidates[0]!;
  if (candidates.length > 1) {
    const entry1 = header.movAccountsec?.trim() || header.venId?.trim();
    if (entry1) {
      const byAccount = candidates.find(
        (row) => row.movAccountEntry1?.trim() === entry1
      );
      if (byAccount) match = byAccount;
    }
  }

  try {
    const full = await getMovmentById(match.id, token);
    return toMovmentLookupItem(full);
  } catch {
    return match;
  }
}
