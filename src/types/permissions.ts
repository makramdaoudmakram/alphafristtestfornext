export interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: string[];
}

export interface RoleSummary {
  roleId: number;
  roleCode: string;
  roleName: string;
  roleDescription?: string | null;
}

export interface PermissionItem {
  permissionId: number;
  permissionCode: string;
  permissionName: string;
  permissionType: string;
  moduleCode: string;
  isAssigned: boolean;
}

export interface RolePermissions {
  roleId: number;
  roleCode: string;
  roleName: string;
  permissions: PermissionItem[];
}

export interface PermissionListItem {
  permissionId: number;
  permissionCode: string;
  permissionName: string;
  permissionDescription?: string | null;
  permissionType: string;
  moduleCode: string;
  isActive: boolean;
}

export interface CreatePermissionRequest {
  permissionCode: string;
  permissionName: string;
  permissionDescription?: string;
  permissionType: string;
  moduleCode: string;
}

export type UpdatePermissionRequest = CreatePermissionRequest;

export interface CreateRoleRequest {
  roleCode: string;
  roleName: string;
  roleDescription?: string;
}

export type UpdateRoleRequest = CreateRoleRequest;

export interface UserSummary {
  userId: string;
  email: string;
  roles: string[];
  extraPermissionCount: number;
}

export interface UserRoles {
  userId: string;
  email: string;
  roleIds: number[];
}

export type UserPermissionOverride = "inherit" | "grant" | "deny";

export interface UserPermissionItem {
  permissionId: number;
  permissionCode: string;
  permissionName: string;
  permissionType: string;
  moduleCode: string;
  fromRole: boolean;
  userOverride: boolean | null;
}

export interface UserPermissionsDetail {
  userId: string;
  email: string;
  roles: string[];
  permissions: UserPermissionItem[];
}

export interface UserPermissionAssignment {
  permissionId: number;
  isAllowed: boolean | null;
}
