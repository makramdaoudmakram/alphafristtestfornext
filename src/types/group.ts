export type GroupItem = {
  id: number;
  gNameAr: string | null;
  gNameEn: string | null;
};

export type CreateGroupRequest = {
  gNameAr: string;
  gNameEn: string;
};

export type UpdateGroupRequest = CreateGroupRequest;
