import { getMovmentById, lookupMovments } from "@/lib/api-client";
import type { MovmentItem, MovmentLookupItem } from "@/types/movment";
import type { PharmReciveHeader } from "@/types/pharm-recive";

export const PHARM_RECIVE_MOV_PARENT_ID = 8;

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
    movAccountEntry4: item.movAccountEntry4 ?? null,
  };
}

export async function resolveMovementForPharmReciveHeader(
  token: string,
  parentId: number,
  header: Pick<PharmReciveHeader, "movId" | "movmentRowId" | "accountDept" | "accountCREDIT">
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
    const dept = header.accountDept?.trim();
    if (dept) {
      const byAccount = candidates.find(
        (row) => row.movAccountEntry2?.trim() === dept
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
