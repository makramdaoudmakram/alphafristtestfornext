import { apiFetch, ApiError } from "@/lib/api-client";
import type {
  CreateResponsibilityProfileRequest,
  ResponsibilityProfileDetail,
  ResponsibilityProfileListItem,
  UpdateResponsibilityProfileRequest,
  UserResponsibilityAssignmentItem,
} from "@/types/responsibility-profile";

function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = obj[key] ?? obj[key.charAt(0).toUpperCase() + key.slice(1)];
    if (value != null && String(value).trim() !== "") return String(value);
  }
  return "";
}

function readNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = obj[key] ?? obj[key.charAt(0).toUpperCase() + key.slice(1)];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value !== "") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function readBoolean(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = obj[key] ?? obj[key.charAt(0).toUpperCase() + key.slice(1)];
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1" || value === "true") return true;
    if (value === 0 || value === "0" || value === "false") return false;
  }
  return false;
}

function readNullableString(
  obj: Record<string, unknown>,
  ...keys: string[]
): string | null {
  const value = readString(obj, ...keys);
  return value ? value : null;
}

function normalizeListItem(raw: Record<string, unknown>): ResponsibilityProfileListItem {
  return {
    profileId: readNumber(raw, "profileId", "ProfileId"),
    profileCode: readString(raw, "profileCode", "ProfileCode"),
    name: readString(raw, "name", "Name"),
    category: readString(raw, "category", "Category"),
    description: readNullableString(raw, "description", "Description"),
    isActive: readBoolean(raw, "isActive", "IsActive"),
    permissionCount: readNumber(raw, "permissionCount", "PermissionCount"),
    activeAssignedUserCount: readNumber(
      raw,
      "activeAssignedUserCount",
      "ActiveAssignedUserCount"
    ),
    createdAt: readString(raw, "createdAt", "CreatedAt"),
    updatedAt: readNullableString(raw, "updatedAt", "UpdatedAt"),
  };
}

function normalizeDetail(raw: Record<string, unknown>): ResponsibilityProfileDetail {
  const permissionsRaw = raw.permissions ?? raw.Permissions;
  const assignedRaw = raw.assignedUsers ?? raw.AssignedUsers;
  return {
    profileId: readNumber(raw, "profileId", "ProfileId"),
    profileCode: readString(raw, "profileCode", "ProfileCode"),
    name: readString(raw, "name", "Name"),
    category: readString(raw, "category", "Category"),
    description: readNullableString(raw, "description", "Description"),
    isActive: readBoolean(raw, "isActive", "IsActive"),
    createdAt: readString(raw, "createdAt", "CreatedAt"),
    createdBy: readNullableString(raw, "createdBy", "CreatedBy"),
    updatedAt: readNullableString(raw, "updatedAt", "UpdatedAt"),
    updatedBy: readNullableString(raw, "updatedBy", "UpdatedBy"),
    permissions: Array.isArray(permissionsRaw)
      ? permissionsRaw.map((item) => {
          const p = item as Record<string, unknown>;
          return {
            permissionId: readNumber(p, "permissionId", "PermissionId"),
            permissionCode: readString(p, "permissionCode", "PermissionCode"),
            permissionName: readString(p, "permissionName", "PermissionName"),
            permissionType: readString(p, "permissionType", "PermissionType"),
            moduleCode: readString(p, "moduleCode", "ModuleCode"),
          };
        })
      : [],
    assignedUsers: Array.isArray(assignedRaw)
      ? assignedRaw.map((item) => {
          const u = item as Record<string, unknown>;
          return {
            assignmentId: readNumber(u, "assignmentId", "AssignmentId"),
            userId: readString(u, "userId", "UserId"),
            userEmail: readNullableString(u, "userEmail", "UserEmail"),
            isActive: readBoolean(u, "isActive", "IsActive"),
            grantedAt: readString(u, "grantedAt", "GrantedAt"),
          };
        })
      : [],
  };
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Request failed";
}

export async function getResponsibilityProfiles(
  token: string,
  params?: {
    search?: string;
    category?: string;
    isActive?: boolean;
    pageNumber?: number;
    pageSize?: number;
  }
): Promise<ResponsibilityProfileListItem[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.category) query.set("category", params.category);
  if (params?.isActive != null) query.set("isActive", String(params.isActive));
  if (params?.pageNumber != null) query.set("pageNumber", String(params.pageNumber));
  if (params?.pageSize != null) query.set("pageSize", String(params.pageSize));

  const suffix = query.toString() ? `?${query}` : "";
  const data = await apiFetch<unknown>(
    `ResponsibilityProfile${suffix}`,
    {},
    token
  );
  return parsePagedProfiles(data);
}

function parsePagedProfiles(data: unknown): ResponsibilityProfileListItem[] {
  if (Array.isArray(data)) {
    return data.map((item) =>
      normalizeListItem(item as Record<string, unknown>)
    );
  }
  if (data && typeof data === "object") {
    const items =
      (data as Record<string, unknown>).items ??
      (data as Record<string, unknown>).Items;
    if (Array.isArray(items)) {
      return items.map((item) =>
        normalizeListItem(item as Record<string, unknown>)
      );
    }
  }
  return [];
}

export async function getResponsibilityProfileById(
  profileId: number,
  token: string
): Promise<ResponsibilityProfileDetail> {
  const data = await apiFetch<Record<string, unknown>>(
    `ResponsibilityProfile/${profileId}`,
    {},
    token
  );
  return normalizeDetail(data);
}

export async function createResponsibilityProfile(
  body: CreateResponsibilityProfileRequest,
  token: string
): Promise<ResponsibilityProfileDetail> {
  const data = await apiFetch<Record<string, unknown>>(
    "ResponsibilityProfile",
    { method: "POST", body: JSON.stringify(body) },
    token
  );
  return normalizeDetail(data);
}

export async function updateResponsibilityProfile(
  profileId: number,
  body: UpdateResponsibilityProfileRequest,
  token: string
): Promise<ResponsibilityProfileDetail> {
  const data = await apiFetch<Record<string, unknown>>(
    `ResponsibilityProfile/${profileId}`,
    { method: "PUT", body: JSON.stringify(body) },
    token
  );
  return normalizeDetail(data);
}

export async function replaceResponsibilityProfilePermissions(
  profileId: number,
  permissionIds: number[],
  token: string
): Promise<ResponsibilityProfileDetail> {
  const data = await apiFetch<Record<string, unknown>>(
    `ResponsibilityProfile/${profileId}/permissions`,
    { method: "PUT", body: JSON.stringify({ permissionIds }) },
    token
  );
  return normalizeDetail(data);
}

export async function activateResponsibilityProfile(
  profileId: number,
  token: string
): Promise<void> {
  await apiFetch(
    `ResponsibilityProfile/${profileId}/activate`,
    { method: "PUT" },
    token
  );
}

export async function deactivateResponsibilityProfile(
  profileId: number,
  token: string
): Promise<void> {
  await apiFetch(
    `ResponsibilityProfile/${profileId}/deactivate`,
    { method: "PUT" },
    token
  );
}

export async function deleteResponsibilityProfile(
  profileId: number,
  token: string
): Promise<void> {
  await apiFetch(
    `ResponsibilityProfile/${profileId}`,
    { method: "DELETE" },
    token
  );
}

function normalizeUserAssignment(
  raw: Record<string, unknown>
): UserResponsibilityAssignmentItem {
  return {
    assignmentId: readNumber(raw, "assignmentId", "AssignmentId"),
    userId: readString(raw, "userId", "UserId"),
    userEmail: readNullableString(raw, "userEmail", "UserEmail"),
    profileId: readNumber(raw, "profileId", "ProfileId"),
    profileCode: readString(raw, "profileCode", "ProfileCode"),
    profileName: readString(raw, "profileName", "ProfileName"),
    category: readString(raw, "category", "Category"),
    profileIsActive: readBoolean(raw, "profileIsActive", "ProfileIsActive"),
    permissionCount: readNumber(raw, "permissionCount", "PermissionCount"),
    isActive: readBoolean(raw, "isActive", "IsActive"),
    grantedAt: readString(raw, "grantedAt", "GrantedAt"),
    updatedAt: readNullableString(raw, "updatedAt", "UpdatedAt"),
  };
}

export async function getUserResponsibilityAssignments(
  userId: string,
  token: string
): Promise<UserResponsibilityAssignmentItem[]> {
  const data = await apiFetch<unknown>(
    `ResponsibilityProfile/users/${encodeURIComponent(userId)}/assignments`,
    {},
    token
  );
  if (!Array.isArray(data)) return [];
  return data.map((row) =>
    normalizeUserAssignment(row as Record<string, unknown>)
  );
}

export async function assignUserResponsibilityProfile(
  userId: string,
  profileId: number,
  token: string
): Promise<UserResponsibilityAssignmentItem> {
  const data = await apiFetch<Record<string, unknown>>(
    `ResponsibilityProfile/users/${encodeURIComponent(userId)}/assignments`,
    { method: "POST", body: JSON.stringify({ profileId }) },
    token
  );
  return normalizeUserAssignment(data);
}

export async function removeUserResponsibilityAssignment(
  userId: string,
  assignmentId: number,
  token: string
): Promise<void> {
  await apiFetch(
    `ResponsibilityProfile/users/${encodeURIComponent(userId)}/assignments/${assignmentId}`,
    { method: "DELETE" },
    token
  );
}

export async function activateUserResponsibilityAssignment(
  userId: string,
  assignmentId: number,
  token: string
): Promise<UserResponsibilityAssignmentItem> {
  const data = await apiFetch<Record<string, unknown>>(
    `ResponsibilityProfile/users/${encodeURIComponent(userId)}/assignments/${assignmentId}/activate`,
    { method: "PUT" },
    token
  );
  return normalizeUserAssignment(data);
}

export async function deactivateUserResponsibilityAssignment(
  userId: string,
  assignmentId: number,
  token: string
): Promise<UserResponsibilityAssignmentItem> {
  const data = await apiFetch<Record<string, unknown>>(
    `ResponsibilityProfile/users/${encodeURIComponent(userId)}/assignments/${assignmentId}/deactivate`,
    { method: "PUT" },
    token
  );
  return normalizeUserAssignment(data);
}
