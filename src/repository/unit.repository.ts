import {
  createUnit,
  deleteUnit,
  getUnits,
  updateUnit,
} from "@/lib/api-client";
import type {
  CreateUnitRequest,
  UnitItem,
  UpdateUnitRequest,
} from "@/types/unit";

export const unitRepository = {
  getAll(token: string): Promise<UnitItem[]> {
    return getUnits(token);
  },

  create(data: CreateUnitRequest, token: string): Promise<UnitItem> {
    return createUnit(data, token);
  },

  update(
    uCode: string,
    data: UpdateUnitRequest,
    token: string
  ): Promise<void> {
    return updateUnit(uCode, data, token);
  },

  delete(uCode: string, token: string): Promise<void> {
    return deleteUnit(uCode, token);
  },
};
