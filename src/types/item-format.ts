export interface ItemFormatItem {
  itfCode: number;
  itfNameAr: string;
  itfNameEn: string;
}

export interface CreateItemFormatRequest {
  itfNameAr: string;
  itfNameEn: string;
}

export type UpdateItemFormatRequest = CreateItemFormatRequest;
