import { API_BASE_URL } from "@/lib/api-config";
import { timedFetch } from "@/lib/timed-fetch";
import type {
  UserEffectiveAccessReview,
  UserProvisionExcelValidateResult,
  UserProvisionRequest,
  UserProvisionResult,
  UserProvisioningWizardReferenceData,
} from "@/types/user-provisioning";

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

/** Paths are relative to `/api/alfa` — the Next proxy adds `/api/` on the Alfa server. */
function provisioningUrl(path: string): string {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE_URL}/${normalized}`;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

export async function provisionUser(
  request: UserProvisionRequest,
  token: string
): Promise<UserProvisionResult> {
  const response = await timedFetch(provisioningUrl("user-provisioning"), {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      ...request,
      pharmacyAssignments: request.pharmacyAssignments.map((p) => ({
        parmId: p.parmId,
        isDefault: p.isDefault,
      })),
      jobAssignments: request.jobAssignments,
      responsibilityProfiles: request.responsibilityProfiles,
      permissionOverrides: request.permissionOverrides,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | UserProvisionResult
      | { message?: string; errors?: string[]; success?: boolean; forbidden?: boolean }
      | null;
    if (body && typeof body === "object") {
      const errors = Array.isArray(body.errors) ? body.errors : [];
      const message =
        (typeof body.message === "string" && body.message.trim()) ||
        errors.join("; ") ||
        `Provision failed (${response.status}).`;
      return {
        success: false,
        message,
        errors,
        forbidden: response.status === 403 || body.forbidden === true,
        userId: ("userId" in body ? body.userId : undefined) ?? null,
      };
    }
    return {
      success: false,
      message: `Provision failed (${response.status}).`,
      errors: [],
    };
  }

  return (await response.json()) as UserProvisionResult;
}

function normalizeWizardReferenceData(
  raw: Record<string, unknown>
): UserProvisioningWizardReferenceData {
  const readList = (key: string, altKey: string) => {
    const value = raw[key] ?? raw[altKey];
    return Array.isArray(value) ? value : [];
  };

  return {
    pharmacies: readList("pharmacies", "Pharmacies").map((item) => {
      const p = item as Record<string, unknown>;
      return {
        parmId: readNumber(p, "parmId", "ParmId"),
        name: readString(p, "name", "Name"),
      };
    }),
    jobTitles: readList("jobTitles", "JobTitles").map((item) => {
      const p = item as Record<string, unknown>;
      return {
        jobTitleId: readNumber(p, "jobTitleId", "JobTitleId"),
        jobTitleCode: readString(p, "jobTitleCode", "JobTitleCode"),
        name: readString(p, "name", "Name"),
      };
    }),
    responsibilityProfiles: readList(
      "responsibilityProfiles",
      "ResponsibilityProfiles"
    ).map((item) => {
      const p = item as Record<string, unknown>;
      return {
        profileId: readNumber(p, "profileId", "ProfileId"),
        profileCode: readString(p, "profileCode", "ProfileCode"),
        name: readString(p, "name", "Name"),
        category: readString(p, "category", "Category"),
      };
    }),
    permissions: readList("permissions", "Permissions").map((item) => {
      const p = item as Record<string, unknown>;
      const description =
        readNullableString(p, "permissionDescription", "PermissionDescription");
      return {
        permissionId: readNumber(p, "permissionId", "PermissionId"),
        permissionCode: readString(p, "permissionCode", "PermissionCode"),
        permissionName: readString(p, "permissionName", "PermissionName"),
        permissionDescription: description,
        permissionType: readString(p, "permissionType", "PermissionType"),
        moduleCode: readString(p, "moduleCode", "ModuleCode"),
      };
    }),
    employInfoRecords: readList("employInfoRecords", "EmployInfoRecords").map(
      (item) => {
        const p = item as Record<string, unknown>;
        return {
          id: readNumber(p, "id", "Id"),
          name: readNullableString(p, "name", "Name"),
          code: readNullableString(p, "code", "Code"),
          active: readBoolean(p, "active", "Active"),
        };
      }
    ),
  };
}

export async function getUserProvisioningWizardReferenceData(
  token: string
): Promise<UserProvisioningWizardReferenceData> {
  const response = await timedFetch(provisioningUrl("user-provisioning/wizard-reference-data"), {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    const detail = body?.message?.trim();
    throw new Error(
      detail
        ? `${detail} (HTTP ${response.status})`
        : `Could not load wizard reference data (HTTP ${response.status}).`
    );
  }
  const data = (await response.json()) as Record<string, unknown>;
  return normalizeWizardReferenceData(data);
}

export async function getUserEffectiveAccess(
  userId: string,
  token: string,
  parmId?: number
): Promise<UserEffectiveAccessReview> {
  const query = parmId != null ? `?parmId=${parmId}` : "";
  const response = await timedFetch(
    provisioningUrl(`user-provisioning/effective-access/${encodeURIComponent(userId)}${query}`),
    { headers: authHeaders(token) }
  );
  if (!response.ok) {
    throw new Error(`Could not load effective access (${response.status}).`);
  }
  return (await response.json()) as UserEffectiveAccessReview;
}

export async function downloadUserProvisioningTemplate(token: string): Promise<Blob> {
  const response = await timedFetch(
    provisioningUrl("user-provisioning/excel/template"),
    { headers: authHeaders(token) }
  );
  if (!response.ok) {
    throw new Error(`Template download failed (${response.status}).`);
  }
  return response.blob();
}

export async function validateUserProvisioningExcel(
  file: File,
  token: string
): Promise<UserProvisionExcelValidateResult> {
  const form = new FormData();
  form.append("file", file);
  const response = await timedFetch(
    provisioningUrl("user-provisioning/excel/validate"),
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!response.ok) {
    throw new Error(`Excel validation failed (${response.status}).`);
  }
  return (await response.json()) as UserProvisionExcelValidateResult;
}

export async function commitUserProvisioningExcel(
  file: File,
  token: string
): Promise<unknown> {
  const form = new FormData();
  form.append("file", file);
  const response = await timedFetch(
    provisioningUrl("user-provisioning/excel/commit"),
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!response.ok) {
    throw new Error(`Excel commit failed (${response.status}).`);
  }
  return response.json();
}
