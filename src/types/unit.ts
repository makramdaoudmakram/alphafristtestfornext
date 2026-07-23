export interface UnitItem {
  uCode: string;
  uNameAr: string;
  uNameEn: string;
}

export interface CreateUnitRequest {
  uCode: string;
  uNameAr: string;
  uNameEn: string;
}

export type UpdateUnitRequest = Omit<CreateUnitRequest, "uCode">;
