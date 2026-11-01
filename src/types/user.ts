/** Matches Alfa.Models.UserAccountKind (JSON number). */
export const UserAccountKind = {
  Pharmacy: 0,
  MainBranch: 1,
} as const;

export type UserAccountKindValue =
  (typeof UserAccountKind)[keyof typeof UserAccountKind];

export type UserListItem = {
  id: string;
  userName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  emailConfirmed: boolean;
  lockoutEnabled: boolean;
  accountKind: UserAccountKindValue;
  homeParmId: number | null;
};

export type UserListPagedResult = {
  items: UserListItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
};

export type UserListQuery = {
  pageNumber: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortDesc?: boolean;
};

export type UpdateUserRequest = {
  userName?: string;
  email?: string;
  phoneNumber?: string;
  emailConfirmed?: boolean;
  isActive?: boolean;
  accountKind?: UserAccountKindValue;
  homeParmId?: number | null;
};

export type AdminCreateUserRequest = {
  email: string;
  password: string;
  userName?: string;
  accountKind?: UserAccountKindValue;
  homeParmId?: number | null;
};
