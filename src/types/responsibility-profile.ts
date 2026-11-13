export type ResponsibilityProfileListItem = {
  profileId: number;
  profileCode: string;
  name: string;
  category: string;
  description: string | null;
  isActive: boolean;
  permissionCount: number;
  activeAssignedUserCount: number;
  createdAt: string;
  updatedAt: string | null;
};

export type ResponsibilityProfilePermissionItem = {
  permissionId: number;
  permissionCode: string;
  permissionName: string;
  permissionType: string;
  moduleCode: string;
};

export type ResponsibilityProfileAssignedUser = {
  assignmentId: number;
  userId: string;
  userEmail: string | null;
  isActive: boolean;
  grantedAt: string;
};

export type ResponsibilityProfileDetail = {
  profileId: number;
  profileCode: string;
  name: string;
  category: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  permissions: ResponsibilityProfilePermissionItem[];
  assignedUsers: ResponsibilityProfileAssignedUser[];
};

export type CreateResponsibilityProfileRequest = {
  profileCode: string;
  name: string;
  category: string;
  description?: string | null;
  permissionIds?: number[];
};

export type UpdateResponsibilityProfileRequest = {
  name: string;
  category: string;
  description?: string | null;
};

export type UserResponsibilityAssignmentItem = {
  assignmentId: number;
  userId: string;
  userEmail: string | null;
  profileId: number;
  profileCode: string;
  profileName: string;
  category: string;
  profileIsActive: boolean;
  permissionCount: number;
  isActive: boolean;
  grantedAt: string;
  updatedAt: string | null;
};
