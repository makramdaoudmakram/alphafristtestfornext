export type CostCenterItem = {
  id: number;
  code: string | null;
  name: string | null;
};

export type CostCenterUpsertRequest = {
  code: string;
  name: string;
};

export type CostCenterCompoItem = {
  id: number;
  code: string | null;
  name: string | null;
};
