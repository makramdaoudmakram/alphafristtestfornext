export type BrandItem = {
  id: number;
  brandNameAr: string | null;
  brandNameEn: string | null;
};

export type CreateBrandRequest = {
  brandNameAr: string;
  brandNameEn: string;
};

export type UpdateBrandRequest = CreateBrandRequest;
