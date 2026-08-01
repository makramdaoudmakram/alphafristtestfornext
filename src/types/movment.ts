export interface MovmentItem {
  id: number;
  movChiledId: number | null;
  movChiledName: string | null;
  movParientId: number | null;
  movSingleStore: boolean;
  movStor: string | null;
  movStor2: string | null;
  movAccountEntry1: string | null;
  movAccountEntry2: string | null;
  movAccountEntry3: string | null;
  movAccountEntry4: string | null;
  movAccountEntry5: string | null;
  movAccountEntry6: string | null;
  movAccountEntry7: string | null;
  movAccountEntry8: string | null;
  movClint1: string | null;
  movClint2: string | null;
  movStockEffict: number | null;
  movPage: string | null;
  movActive: boolean;
}

/** Lightweight movement row from GET /api/Movment/lookup */
export interface MovmentLookupItem {
  id: number;
  movChiledId: number | null;
  movChiledName: string | null;
  movParientId: number | null;
  movStor: string | null;
  movSingleStore: boolean;
  movAccountEntry1: string | null;
  movAccountEntry2: string | null;
  movAccountEntry3: string | null;
}

export type MovmentUpsertRequest = Omit<MovmentItem, "id">;
