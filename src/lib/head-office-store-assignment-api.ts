import { apiFetch, ApiError } from "@/lib/api-client";
import type {
  HeadOfficeEligibleStore,
  HeadOfficeUserAssignment,
} from "@/types/head-office-store-assignment";

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
  }
  return false;
}

function normalizeEligibleStore(raw: Record<string, unknown>): HeadOfficeEligibleStore {
  return {
    storId: readNumber(raw, "storId", "StorId"),
    storEnName: readString(raw, "storEnName", "StorEnName") || null,
    storArName: readString(raw, "storArName", "StorArName") || null,
  };
}

function normalizeUserAssignment(raw: Record<string, unknown>): HeadOfficeUserAssignment {
  const jobRaw = (raw.jobAssignment ?? raw.JobAssignment) as
    | Record<string, unknown>
    | undefined
    | null;
  const storesRaw = raw.storeAssignments ?? raw.StoreAssignments;
  const approvedRaw = (raw.approvedJobTitle ?? raw.ApprovedJobTitle) as Record<string, unknown>;
  const permsRaw = raw.jobTitlePermissionCodes ?? raw.JobTitlePermissionCodes;

  return {
    userId: readString(raw, "userId", "UserId"),
    email: readString(raw, "email", "Email") || null,
    accountKind: readString(raw, "accountKind", "AccountKind"),
    isHeadOfficePrincipal: readBoolean(raw, "isHeadOfficePrincipal", "IsHeadOfficePrincipal"),
    headOfficeConfigurationValid: readBoolean(
      raw,
      "headOfficeConfigurationValid",
      "HeadOfficeConfigurationValid"
    ),
    headOfficeDenyReason: readString(raw, "headOfficeDenyReason", "HeadOfficeDenyReason") || null,
    configurationStatus: readString(raw, "configurationStatus", "ConfigurationStatus"),
    pharmacyScopeRowCount: readNumber(raw, "pharmacyScopeRowCount", "PharmacyScopeRowCount"),
    pharmacyJobRowCount: readNumber(raw, "pharmacyJobRowCount", "PharmacyJobRowCount"),
    activeScopeRowCount: readNumber(raw, "activeScopeRowCount", "ActiveScopeRowCount"),
    jobAssignment: jobRaw
      ? {
          assignmentId: readNumber(jobRaw, "assignmentId", "AssignmentId"),
          jobTitleId: readNumber(jobRaw, "jobTitleId", "JobTitleId"),
          jobTitleCode: readString(jobRaw, "jobTitleCode", "JobTitleCode"),
          jobTitleName: readString(jobRaw, "jobTitleName", "JobTitleName"),
          isActive: readBoolean(jobRaw, "isActive", "IsActive"),
          grantedAt: readString(jobRaw, "grantedAt", "GrantedAt"),
          grantedBy: readString(jobRaw, "grantedBy", "GrantedBy") || null,
        }
      : null,
    storeAssignments: Array.isArray(storesRaw)
      ? storesRaw.map((s) => {
          const row = s as Record<string, unknown>;
          return {
            assignmentId: readNumber(row, "assignmentId", "AssignmentId"),
            storId: readNumber(row, "storId", "StorId"),
            storEnName: readString(row, "storEnName", "StorEnName") || null,
            storArName: readString(row, "storArName", "StorArName") || null,
            isActive: readBoolean(row, "isActive", "IsActive"),
            grantedAt: readString(row, "grantedAt", "GrantedAt"),
            grantedBy: readString(row, "grantedBy", "GrantedBy") || null,
          };
        })
      : [],
    jobTitlePermissionCodes: Array.isArray(permsRaw)
      ? permsRaw.map((p) => String(p))
      : [],
    approvedJobTitle: {
      jobTitleId: readNumber(approvedRaw, "jobTitleId", "JobTitleId") || null,
      jobTitleCode: readString(approvedRaw, "jobTitleCode", "JobTitleCode"),
      jobTitleName: readString(approvedRaw, "jobTitleName", "JobTitleName") || null,
    },
  };
}

export function getApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return err instanceof Error ? err.message : "Request failed.";
}

export async function getHeadOfficeEligibleStores(token: string) {
  const data = await apiFetch<unknown>(
    "head-office-store-assignments/eligible-stores",
    {},
    token
  );
  const list = Array.isArray(data) ? data : [];
  return list.map((item) => normalizeEligibleStore(item as Record<string, unknown>));
}

export async function getHeadOfficeUserAssignment(userId: string, token: string) {
  const data = await apiFetch<unknown>(
    `head-office-store-assignments/users/${encodeURIComponent(userId)}`,
    {},
    token
  );
  return normalizeUserAssignment(data as Record<string, unknown>);
}

export async function setHeadOfficeJobTitle(
  userId: string,
  jobTitleId: number,
  token: string
) {
  return apiFetch<HeadOfficeUserAssignment>(
    `head-office-store-assignments/users/${encodeURIComponent(userId)}/job-title`,
  {
      method: "PUT",
      body: JSON.stringify({ jobTitleId }),
    },
    token
  );
}

export async function addHeadOfficeStore(
  userId: string,
  storId: number,
  token: string
) {
  return apiFetch(
    `head-office-store-assignments/users/${encodeURIComponent(userId)}/stores`,
    {
      method: "POST",
      body: JSON.stringify({ storId }),
    },
    token
  );
}

export async function updateHeadOfficeStoreAssignment(
  userId: string,
  assignmentId: number,
  isActive: boolean,
  token: string
) {
  return apiFetch(
    `head-office-store-assignments/users/${encodeURIComponent(userId)}/stores/${assignmentId}`,
    {
      method: "PUT",
      body: JSON.stringify({ isActive }),
    },
    token
  );
}

export async function removeHeadOfficeStoreAssignment(
  userId: string,
  assignmentId: number,
  token: string
) {
  return apiFetch(
    `head-office-store-assignments/users/${encodeURIComponent(userId)}/stores/${assignmentId}`,
    { method: "DELETE" },
    token
  );
}
