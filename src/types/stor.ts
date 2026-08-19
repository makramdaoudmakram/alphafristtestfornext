export type StorItem = {
  id: number;
  storArName: string | null;
  storEnName: string | null;
  costCenterId: number;
  accountNo: string | null;
  costCenterName: string | null;
  accountName: string | null;
};

export type StorUpsertRequest = {
  storArName: string | null;
  storEnName: string | null;
  costCenterId: number;
  accountNo: string;
};

/** AccountChart parent for Stor Account No combobox (PARENTCode = 116). */
export const STOR_ACCOUNT_PARENT_CODE = "116";

export type StorAccountOption = {
  accCode: string;
  name: string;
};
