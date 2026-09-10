export interface ItemFormatItem {
  itfCode: number;
  itfNameAr: string;
  itfNameEn: string;
  groupId: number;
  groupName: string | null;
}

export interface CreateItemFormatRequest {
  itfNameAr: string;
  itfNameEn: string;
  groupId: number;
}

export type UpdateItemFormatRequest = CreateItemFormatRequest;
