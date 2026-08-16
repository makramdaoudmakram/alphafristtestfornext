export type AccountsChartItem = {
  accCode: string;
  parentCode: string | null;
  accName: string | null;
  accAName: string | null;
  currency: string | null;
  accKind: boolean | null;
  accType: boolean | null;
  receipt: boolean | null;
  payment: boolean | null;
};

export type AccountsChartUpsertRequest = {
  accCode: string;
  parentCode: string | null;
  accName: string | null;
  accAName: string | null;
  currency: string | null;
  accKind: boolean;
  accType: boolean;
  receipt: boolean;
  payment: boolean;
};
