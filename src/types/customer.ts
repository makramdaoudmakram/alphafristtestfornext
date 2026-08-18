export type CustomerItem = {
  custCode: number;
  custNameAr: string | null;
  custNameEn: string | null;
  custBirthDate: string | null;
  custGender: string | null;
  custJob: string | null;
  custMobile: string | null;
  custTel: string | null;
  custAddress: string | null;
  custType: number | null;
  custActive: boolean;
  custActiveDate: string | null;
  custStopDate: string | null;
  custMaxCredit: number | null;
  custDiscountPerc: number | null;
  custPayment: number;
  cLocalItemsDisc: number | null;
  cImportedItemsDisc: number | null;
  custNotes: string | null;
  pharmCode: string | null;
  custContractcompany: string | null;
  custContractcompanydiscount: string | null;
  accountId: string | null;
  balance: number;
};

export type CustomerCreateRequest = {
  custNameAr: string;
  custNameEn: string;
  custBirthDate?: string | null;
  custGender?: string | null;
  custJob?: string | null;
  custMobile?: string | null;
  custTel?: string | null;
  custAddress?: string | null;
  custType?: number | null;
  custActive?: boolean | null;
  custActiveDate?: string | null;
  custStopDate?: string | null;
  custMaxCredit?: number | null;
  custDiscountPerc?: number | null;
  custPayment?: number | null;
  cLocalItemsDisc?: number | null;
  cImportedItemsDisc?: number | null;
  custNotes?: string | null;
  pharmCode?: string | null;
  custContractcompany?: string | null;
  custContractcompanydiscount?: string | null;
  accountId?: string | null;
};

export type CustomerNextAccount = {
  parentAccountCode: string;
  nextAccountCode: string;
};
