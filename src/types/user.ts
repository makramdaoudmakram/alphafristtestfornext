export type UserListItem = {
  id: string;
  userName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  emailConfirmed: boolean;
  lockoutEnabled: boolean;
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
