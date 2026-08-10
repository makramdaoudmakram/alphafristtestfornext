export interface UnitItem {
  uCode: number;
  uNameAr: string;
  uNameEn: string;
}

export interface CreateUnitRequest {
  uCode: number;
  uNameAr: string;
  uNameEn: string;
}

export type UnitListItem = UnitItem & { pendingSync?: boolean };

export type UpdateUnitRequest = Omit<CreateUnitRequest, "uCode">;
