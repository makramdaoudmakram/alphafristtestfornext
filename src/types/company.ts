export interface CompanyItem {
  comId: number;
  comCode: string;
  comNameAr: string;
  comNameEn: string;
  comTel: string;
  comAddress: string;
  comActive: boolean;
}

export interface CreateCompanyRequest {
  comCode: string;
  comNameAr: string;
  comNameEn: string;
  comTel: string;
  comAddress: string;
  comActive: boolean;
}

export type UpdateCompanyRequest = CreateCompanyRequest;
