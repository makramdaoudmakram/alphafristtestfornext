import type { UnitItem } from "@/types/unit";

export type UnitCacheRecord = UnitItem & {
  updatedAt: number;
  pendingSync?: boolean;
};
