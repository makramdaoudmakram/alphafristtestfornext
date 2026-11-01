import { apiFetch, ApiError } from "@/lib/api-client";
import type {
  CreatePharmacyJobAssignmentRequest,
  CreatePharmacyJobTitleRequest,
  PharmacyJobAssignmentItem,
  PharmacyJobTitleDetail,
  PharmacyJobTitleListItem,
  UpdatePharmacyJobTitleRequest,
} from "@/types/pharmacy-job-auth";

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

function normalizePermissionItem(raw: Record<string, unknown>) {
  return {
    permissionId: readNumber(raw, "permissionId", "PermissionId"),
    permissionCode: readString(raw, "permissionCode", "PermissionCode"),
    permissionName: readString(raw, "permissionName", "PermissionName"),
    permissionType: readString(raw, "permissionType", "PermissionType"),
    moduleCode: readString(raw, "moduleCode", "ModuleCode"),
  };
}

function normalizeJobTitleListItem(
  raw: Record<string, unknown>
): PharmacyJobTitleListItem {
  return {
    jobTitleId: readNumber(raw, "jobTitleId", "JobTitleId"),
    jobTitleCode: readString(raw, "jobTitleCode", "JobTitleCode"),
    name: readString(raw, "name", "Name"),
    description: readNullableString(raw, "description", "Description"),
    isActive: readBoolean(raw, "isActive", "IsActive"),
    permissionCount: readNumber(raw, "permissionCount", "PermissionCount"),
    createdAt: readString(raw, "createdAt", "CreatedAt"),
    updatedAt: readNullableString(raw, "updatedAt", "UpdatedAt"),
  };
}

function normalizeJobTitleDetail(raw: Record<string, unknown>): PharmacyJobTitleDetail {
  const permissionsRaw = raw.permissions ?? raw.Permissions;
  const permissions = Array.isArray(permissionsRaw)
    ? permissionsRaw.map((item) =>
        normalizePermissionItem(item as Record<string, unknown>)
      )
    : [];

  return {
    jobTitleId: readNumber(raw, "jobTitleId", "JobTitleId"),
    jobTitleCode: readString(raw, "jobTitleCode", "JobTitleCode"),
    name: readString(raw, "name", "Name"),
    description: readNullableString(raw, "description", "Description"),
    isActive: readBoolean(raw, "isActive", "IsActive"),
    createdAt: readString(raw, "createdAt", "CreatedAt"),
    updatedAt: readNullableString(raw, "updatedAt", "UpdatedAt"),
    permissions,
  };
}

function normalizeAssignment(raw: Record<string, unknown>): PharmacyJobAssignmentItem {
  return {
    assignmentId: readNumber(raw, "assignmentId", "AssignmentId"),
    userId: readString(raw, "userId", "UserId"),
    userEmail: readNullableString(raw, "userEmail", "UserEmail"),
    parmId: readNumber(raw, "parmId", "ParmId"),
    pharmacyName: readNullableString(raw, "pharmacyName", "PharmacyName"),
    jobTitleId: readNumber(raw, "jobTitleId", "JobTitleId"),
    jobTitleCode: readString(raw, "jobTitleCode", "JobTitleCode"),
    jobTitleName: readString(raw, "jobTitleName", "JobTitleName"),
    isActive: readBoolean(raw, "isActive", "IsActive"),
    grantedAt: readString(raw, "grantedAt", "GrantedAt"),
    updatedAt: readNullableString(raw, "updatedAt", "UpdatedAt"),
    grantedBy: readNullableString(raw, "grantedBy", "GrantedBy"),
  };
}

function parsePagedJobTitles(data: unknown): PharmacyJobTitleListItem[] {
  if (Array.isArray(data)) {
    return data.map((item) =>
      normalizeJobTitleListItem(item as Record<string, unknown>)
    );
  }
  if (data && typeof data === "object") {
    const items = (data as Record<string, unknown>).items ?? (data as Record<string, unknown>).Items;
    if (Array.isArray(items)) {
      return items.map((item) =>
        normalizeJobTitleListItem(item as Record<string, unknown>)
      );
    }
  }
  return [];
}

export async function getPharmacyJobTitles(token: string) {
  const pageSize = 100;
  let pageNumber = 1;
  const all: PharmacyJobTitleListItem[] = [];

  while (pageNumber < 100) {
    const data = await apiFetch<unknown>(
      `PharmacyJobTitle?pageNumber=${pageNumber}&pageSize=${pageSize}`,
      {},
      token
    );
    const batch = parsePagedJobTitles(data);
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < pageSize) break;
    pageNumber += 1;
  }

  return all;
}

export function getPharmacyJobTitleById(jobTitleId: number, token: string) {
  return apiFetch<Record<string, unknown>>(
    `PharmacyJobTitle/${jobTitleId}`,
    {},
    token
  ).then((data) => normalizeJobTitleDetail(data));
}

export function createPharmacyJobTitle(
  body: CreatePharmacyJobTitleRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    "PharmacyJobTitle",
    {
      method: "POST",
      body: JSON.stringify({
        jobTitleCode: body.jobTitleCode,
        name: body.name,
        description: body.description ?? null,
        permissionIds: body.permissionIds,
      }),
    },
    token
  ).then((data) => normalizeJobTitleDetail(data));
}

export function updatePharmacyJobTitle(
  jobTitleId: number,
  body: UpdatePharmacyJobTitleRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    `PharmacyJobTitle/${jobTitleId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        name: body.name,
        description: body.description ?? null,
        isActive: body.isActive ?? null,
        permissionIds: body.permissionIds,
      }),
    },
    token
  ).then((data) => normalizeJobTitleDetail(data));
}

export async function deactivatePharmacyJobTitle(jobTitleId: number, token: string) {
  await apiFetch<void>(`PharmacyJobTitle/${jobTitleId}`, { method: "DELETE" }, token);
}

export function getPharmacyJobAssignmentsByUser(userId: string, token: string) {
  return apiFetch<unknown>(
    `PharmacyJobAssignment/users/${encodeURIComponent(userId)}`,
    {},
    token
  ).then((data) =>
    Array.isArray(data)
      ? data.map((item) => normalizeAssignment(item as Record<string, unknown>))
      : []
  );
}

export function getPharmacyJobAssignmentsByPharmacy(parmId: number, token: string) {
  return apiFetch<unknown>(
    `PharmacyJobAssignment/pharmacies/${parmId}`,
    {},
    token
  ).then((data) =>
    Array.isArray(data)
      ? data.map((item) => normalizeAssignment(item as Record<string, unknown>))
      : []
  );
}

export function createPharmacyJobAssignment(
  body: CreatePharmacyJobAssignmentRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    "PharmacyJobAssignment",
    {
      method: "POST",
      body: JSON.stringify({
        userId: body.userId,
        parmId: body.parmId,
        jobTitleId: body.jobTitleId,
      }),
    },
    token
  ).then((data) => normalizeAssignment(data));
}

export function deactivatePharmacyJobAssignment(assignmentId: number, token: string) {
  return apiFetch<Record<string, unknown>>(
    `PharmacyJobAssignment/${assignmentId}`,
    { method: "DELETE" },
    token
  ).then((data) => normalizeAssignment(data));
}

export function reactivatePharmacyJobAssignment(assignmentId: number, token: string) {
  return apiFetch<Record<string, unknown>>(
    `PharmacyJobAssignment/${assignmentId}/reactivate`,
    { method: "POST" },
    token
  ).then((data) => normalizeAssignment(data));
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Request failed.";
}
