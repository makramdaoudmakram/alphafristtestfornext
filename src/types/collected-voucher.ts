export type CollectedVoucherItem = {
  receiptNO: number;
  recRef: string | null;
  receiptDate: string | null;
  saveCode: string | null;
  amount: number | null;
  currency: string | null;
  rate: number | null;
  type: string | null;
  vSource: string | null;
  collectedCode: string | null;
  collectedName: string | null;
  description: string | null;
  addedUser: string | null;
  chequeNO: string | null;
  bankCode: string | null;
  dueDate: string | null;
  accountNO: string | null;
  totalString: string | null;
  costCenter: string | null;
  approved: boolean | null;
};

export type CollectedVoucherUpsertRequest = {
  recRef?: string | null;
  receiptDate?: string | null;
  saveCode?: string | null;
  amount?: number | null;
  currency?: string | null;
  rate?: number | null;
  type?: string | null;
  vSource?: string | null;
  collectedCode?: string | null;
  collectedName?: string | null;
  description?: string | null;
  addedUser?: string | null;
  chequeNO?: string | null;
  bankCode?: string | null;
  dueDate?: string | null;
  accountNO?: string | null;
  totalString?: string | null;
  costCenter?: string | null;
};

export type VoucherJournalLine = {
  type: string;
  acccountCode: string;
  accName?: string | null;
  description?: string | null;
  amount?: number | null;
  amountEGP?: number | null;
};

export type AccountSelectItem = {
  accCode: string;
  name: string;
};

export type AccountCurrencyItem = {
  code: string;
  rate: number | null;
};

export type VoucherLedgerLineRequest = {
  acccountCode: string;
  description?: string | null;
  currancy?: string | null;
  rate?: number | null;
  bankAccount?: string | null;
  chequeNO?: string | null;
  amount?: number | null;
  depit?: number | null;
  credit?: number | null;
  notes?: string | null;
  dueDate?: string | null;
  costCenter?: string | null;
};
