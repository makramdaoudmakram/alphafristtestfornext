export type VendorItem = {
  vendorId: number;
  vendorNameAr: string | null;
  vendorNameEn: string | null;
  address: string | null;
  tel: string | null;
  accountId: string | null;
  taxId: string | null;
  licenseId: string | null;
  paymentBankNo: string | null;
  responsibleName: string | null;
  maxValue: number | null;
  balance: number;
};

export type VendorCreateRequest = {
  vendorNameAr: string;
  vendorNameEn: string;
  address?: string;
  tel?: string;
  accountId?: string;
  taxId?: string;
  licenseId?: string;
  paymentBankNo?: string;
  responsibleName?: string;
  maxValue?: number | null;
};

export type VendorNextAccount = {
  parentAccountCode: string;
  nextAccountCode: string;
};
