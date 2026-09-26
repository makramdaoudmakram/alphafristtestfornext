import { apiFetch } from "@/lib/api-client";
import type {
  ActivePharmacyResponse,
  ScopeTestResponse,
  UserPharmaciesResponse,
  UserPharmacyAssignment,
  ValidatePharmacyResponse,
} from "@/types/pharmacy-scope";

function normalizePharmacyScopeItem(item: Record<string, unknown>) {
  return {
    parmId: String(item.parmId ?? item.ParmId ?? ""),
    name: String(item.name ?? item.Name ?? ""),
    isDefault: Boolean(item.isDefault ?? item.IsDefault ?? false),
  };
}

function normalizeScopeTestPharmacy(item: Record<string, unknown>) {
  return {
    parmId: String(item.parmId ?? item.ParmId ?? ""),
    name: String(item.name ?? item.Name ?? ""),
  };
}

export function getScopePharmacies(token: string) {
  return apiFetch<Record<string, unknown>>("Scope/pharmacies", {}, token).then(
    (data) =>
      ({
        activePharmacyId: (data.activePharmacyId ?? data.ActivePharmacyId ?? null) as
          | string
          | null,
        pharmacies: (
          (data.pharmacies ?? data.Pharmacies ?? []) as Record<string, unknown>[]
        ).map(normalizePharmacyScopeItem),
      }) satisfies UserPharmaciesResponse
  );
}

export function getActivePharmacy(token: string) {
  return apiFetch<Record<string, unknown>>(
    "Scope/active-pharmacy",
    {},
    token
  ).then(
    (data) =>
      ({
        parmId: (data.parmId ?? data.ParmId ?? null) as string | null,
        name: (data.name ?? data.Name ?? null) as string | null,
        storageId: (data.storageId ?? data.StorageId ?? null) as string | null,
        storageName: (data.storageName ?? data.StorageName ?? null) as string | null,
      }) satisfies ActivePharmacyResponse
  );
}

export function setActivePharmacy(parmId: string, token: string) {
  return apiFetch<Record<string, unknown>>(
    "Scope/active-pharmacy",
    {
      method: "POST",
      body: JSON.stringify({ parmId }),
    },
    token
  ).then(
    (data) =>
      ({
        parmId: (data.parmId ?? data.ParmId ?? null) as string | null,
        name: (data.name ?? data.Name ?? null) as string | null,
        storageId: (data.storageId ?? data.StorageId ?? null) as string | null,
        storageName: (data.storageName ?? data.StorageName ?? null) as string | null,
      }) satisfies ActivePharmacyResponse
  );
}

export function getScopeTest(token: string) {
  return apiFetch<Record<string, unknown>>("Scope/test", {}, token).then(
    (data) =>
      ({
        authenticated: Boolean(data.authenticated ?? data.Authenticated ?? false),
        userId: String(data.userId ?? data.UserId ?? ""),
        userName: String(data.userName ?? data.UserName ?? ""),
        roles: (data.roles ?? data.Roles ?? []) as string[],
        salesViewPermission: Boolean(
          data.salesViewPermission ?? data.SalesViewPermission ?? false
        ),
        authorizedPharmacies: (
          (data.authorizedPharmacies ??
            data.AuthorizedPharmacies ??
            []) as Record<string, unknown>[]
        ).map(normalizeScopeTestPharmacy),
        activePharmacy: data.activePharmacy ?? data.ActivePharmacy
          ? normalizeScopeTestPharmacy(
              (data.activePharmacy ?? data.ActivePharmacy) as Record<
                string,
                unknown
              >
            )
          : null,
        activePharmacyAuthorized: Boolean(
          data.activePharmacyAuthorized ?? data.ActivePharmacyAuthorized ?? false
        ),
        scopeValid: Boolean(data.scopeValid ?? data.ScopeValid ?? false),
      }) satisfies ScopeTestResponse
  );
}

export function validatePharmacyScope(parmId: string, token: string) {
  return apiFetch<Record<string, unknown>>(
    "Scope/validate-pharmacy",
    {
      method: "POST",
      body: JSON.stringify({ parmId }),
    },
    token
  ).then(
    (data) =>
      ({
        allowed: Boolean(data.allowed ?? data.Allowed ?? false),
        message: (data.message ?? data.Message ?? null) as string | null,
      }) satisfies ValidatePharmacyResponse
  );
}

export function getUserPharmacyAssignments(userId: string, token: string) {
  return apiFetch<Record<string, unknown>[]>(
    `Scope/users/${encodeURIComponent(userId)}/pharmacies`,
    {},
    token
  ).then((items) =>
    items.map(
      (item) =>
        ({
          userPharmacyId: Number(item.userPharmacyId ?? item.UserPharmacyId ?? 0),
          parmId: String(item.parmId ?? item.ParmId ?? ""),
          name: String(item.name ?? item.Name ?? ""),
          isDefault: Boolean(item.isDefault ?? item.IsDefault ?? false),
          isActive: Boolean(item.isActive ?? item.IsActive ?? false),
          grantedAt: String(item.grantedAt ?? item.GrantedAt ?? ""),
          grantedBy: (item.grantedBy ?? item.GrantedBy ?? null) as string | null,
        }) satisfies UserPharmacyAssignment
    )
  );
}

export function assignUserPharmacy(
  userId: string,
  parmId: string,
  isDefault: boolean,
  token: string
) {
  return apiFetch<UserPharmacyAssignment[]>(
    `Scope/users/${encodeURIComponent(userId)}/pharmacies`,
    {
      method: "POST",
      body: JSON.stringify({ parmId, isDefault }),
    },
    token
  );
}

export function removeUserPharmacyAssignment(
  userId: string,
  userPharmacyId: number,
  token: string
) {
  return apiFetch<void>(
    `Scope/users/${encodeURIComponent(userId)}/pharmacies/${userPharmacyId}`,
    { method: "DELETE" },
    token
  );
}
