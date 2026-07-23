export type GroupItem = {
  id: number;
  gNameAr: string | null;
  gNameEn: string | null;
  gParent: number | null;
};

export type CreateGroupRequest = {
  gNameAr: string;
  gNameEn: string;
  gParent: number | null;
};

export type UpdateGroupRequest = CreateGroupRequest;
