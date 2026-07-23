import { API_BASE_URL } from "./api-config";
import type { AuthResponse } from "@/types/auth";
import type {
  CreatePermissionRequest,
  CreateRoleRequest,
  PermissionListItem,
  RolePermissions,
  RoleSummary,
  UserPermissionAssignment,
  UserPermissionItem,
  UserPermissionsDetail,
  UserRoles,
  UserSummary,
} from "@/types/permissions";
import type { CreateUnitRequest, UnitItem, UpdateUnitRequest } from "@/types/unit";
import type {
  CreateItemFormatRequest,
  ItemFormatItem,
  UpdateItemFormatRequest,
} from "@/types/item-format";
import type {
  CreateItemOriginRequest,
  ItemOriginItem,
  UpdateItemOriginRequest,
} from "@/types/item-origin";
import type {
  CompanyItem,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from "@/types/company";
import type {
  CreateGroupRequest,
  GroupItem,
  UpdateGroupRequest,
} from "@/types/group";
import type {
  ItemCatalogItem,
  ItemCatalogUpsertRequest,
} from "@/types/item-catalog";

function readString(
  obj: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string") return value;
  }
  return "";
}

function readNumber(
  obj: Record<string, unknown>,
  ...keys: string[]
): number {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value !== "") return Number(value);
  }
  return 0;
}

function readBoolean(
  obj: Record<string, unknown>,
  ...keys: string[]
): boolean {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "boolean") return value;
  }
  return false;
}

function normalizePermissionListItem(
  item: Record<string, unknown>
): PermissionListItem {
  return {
    permissionId: readNumber(item, "permissionId", "PermissionId"),
    permissionCode: readString(item, "permissionCode", "PermissionCode"),
    permissionName: readString(item, "permissionName", "PermissionName"),
    permissionDescription:
      readString(item, "permissionDescription", "PermissionDescription") ||
      null,
    permissionType: readString(item, "permissionType", "PermissionType"),
    moduleCode: readString(item, "moduleCode", "ModuleCode"),
    isActive: readBoolean(item, "isActive", "IsActive"),
  };
}

function normalizeUserSummary(item: Record<string, unknown>): UserSummary {
  const roles = item.roles ?? item.Roles;
  return {
    userId: readString(item, "userId", "UserId"),
    email: readString(item, "email", "Email"),
    roles: Array.isArray(roles) ? roles.map(String) : [],
    extraPermissionCount: readNumber(
      item,
      "extraPermissionCount",
      "ExtraPermissionCount"
    ),
  };
}

function normalizeUserRoles(data: Record<string, unknown>): UserRoles {
  const roleIds = data.roleIds ?? data.RoleIds;
  return {
    userId: readString(data, "userId", "UserId"),
    email: readString(data, "email", "Email"),
    roleIds: Array.isArray(roleIds)
      ? roleIds.map((id) => Number(id))
      : [],
  };
}

function readNullableBoolean(
  obj: Record<string, unknown>,
  ...keys: string[]
): boolean | null {
  for (const key of keys) {
    if (!(key in obj)) continue;
    const value = obj[key];
    if (value === null || value === undefined) return null;
    if (typeof value === "boolean") return value;
  }
  return null;
}

function normalizeUserPermissionItem(
  item: Record<string, unknown>
): UserPermissionItem {
  return {
    permissionId: readNumber(item, "permissionId", "PermissionId"),
    permissionCode: readString(item, "permissionCode", "PermissionCode"),
    permissionName: readString(item, "permissionName", "PermissionName"),
    permissionType: readString(item, "permissionType", "PermissionType"),
    moduleCode: readString(item, "moduleCode", "ModuleCode"),
    fromRole: readBoolean(item, "fromRole", "FromRole"),
    userOverride: readNullableBoolean(item, "userOverride", "UserOverride"),
  };
}

function normalizeUserPermissionsDetail(
  data: Record<string, unknown>
): UserPermissionsDetail {
  const roles = data.roles ?? data.Roles;
  const permissions = data.permissions ?? data.Permissions;
  return {
    userId: readString(data, "userId", "UserId"),
    email: readString(data, "email", "Email"),
    roles: Array.isArray(roles) ? roles.map(String) : [],
    permissions: Array.isArray(permissions)
      ? permissions.map((item) =>
          normalizeUserPermissionItem(item as Record<string, unknown>)
        )
      : [],
  };
}

function normalizeRoleSummary(item: Record<string, unknown>): RoleSummary {
  return {
    roleId: readNumber(item, "roleId", "RoleId"),
    roleCode: readString(item, "roleCode", "RoleCode"),
    roleName: readString(item, "roleName", "RoleName"),
    roleDescription:
      readString(item, "roleDescription", "RoleDescription") || null,
  };
}

function normalizeUnitItem(item: Record<string, unknown>): UnitItem {
  return {
    uCode: readString(item, "uCode", "U_Code", "u_Code"),
    uNameAr: readString(item, "uNameAr", "U_Name_Ar", "u_Name_Ar"),
    uNameEn: readString(item, "uNameEn", "U_Name_En", "u_Name_En"),
  };
}

function normalizeItemFormatItem(item: Record<string, unknown>): ItemFormatItem {
  return {
    itfCode: readNumber(item, "itfCode", "ItfCode"),
    itfNameAr: readString(item, "itfNameAr", "ItfNameAr", "itf_Name_Ar"),
    itfNameEn: readString(item, "itfNameEn", "ItfNameEn", "itf_Name_En"),
  };
}

function normalizeItemOriginItem(item: Record<string, unknown>): ItemOriginItem {
  return {
    ioId: readNumber(item, "ioId", "IoId"),
    ioTextAr: readString(item, "ioTextAr", "IoTextAr", "io_Text_Ar"),
  };
}

function readNullableNumber(
  obj: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    if (!(key in obj)) continue;
    const value = obj[key];
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return value;
    if (typeof value === "string" && value !== "") return Number(value);
  }
  return null;
}

function normalizeGroupItem(item: Record<string, unknown>): GroupItem {
  return {
    id: readNumber(item, "id", "Id"),
    gNameAr: readString(item, "gNameAr", "GNameAr") || null,
    gNameEn: readString(item, "gNameEn", "GNameEn") || null,
    gParent: readNullableNumber(item, "gParent", "GParent"),
  };
}

function normalizeItemCatalogChild(
  item: Record<string, unknown> | null | undefined
) {
  if (!item) return null;

  return {
    itemCChId: readNumber(item, "item_C_ch_id", "Item_C_ch_id"),
    itemCatalogId: readNumber(item, "itemCatalogId", "ItemCatalogId"),
    itmComCode: readString(item, "itmComCode", "ItmComCode") || null,
    itmLocation: readString(item, "itmLocation", "ItmLocation") || null,
    itmRequestLimit: readNullableNumber(item, "itmRequestLimit", "ItmRequestLimit"),
    itmMaxLimit: readNullableNumber(item, "itmMaxLimit", "ItmMaxLimit"),
    itmMinLimit: readNullableNumber(item, "itmMinLimit", "ItmMinLimit"),
    itmDefaultLimit: readNullableNumber(item, "itmDefaultLimit", "ItmDefaultLimit"),
    itmPurchaseUnit: readNullableNumber(item, "itmPurchaseUnit", "Itm_Purchase_Unit"),
    itmSellUnit: readNullableNumber(item, "itmSellUnit", "Itm_Sell_Unit"),
    itmScientificN1: readString(item, "itmScientificN1", "ItmScientificN1") || null,
    itmScientificN2: readString(item, "itmScientificN2", "ItmScientificN2") || null,
    itmG1: readNullableNumber(item, "itmG1", "ItmG1"),
    itmG2: readNullableNumber(item, "itmG2", "ItmG2"),
    itmG3: readNullableNumber(item, "itmG3", "ItmG3"),
    itmScientificGroupId: readNullableNumber(
      item,
      "itmScientificGroupId",
      "ItmScientificGroupId"
    ),
    itmUsageMannerId: readNullableNumber(item, "itmUsageMannerId", "ItmUsageMannerId"),
    itmIsShortage: readNullableNumber(item, "itmIsShortage", "ItmIsShortage"),
    itmMidUnitDif: readNullableNumber(item, "itmMidUnitDif", "ItmMidUnitDif"),
    itmSmallUnitDif: readNullableNumber(item, "itmSmallUnitDif", "ItmSmallUnitDif"),
    itmFracQty: readNullableNumber(item, "itmFracQty", "ItmFracQty"),
    itmFavourite: readNullableNumber(item, "itmFavourite", "ItmFavourite"),
    ucpCode: readString(item, "ucpCode", "UcpCode") || null,
    itmSalesDisc: readNullableNumber(item, "itmSalesDisc", "ItmSalesDisc"),
    itmNopurreturn: readNullableNumber(item, "itmNopurreturn", "ItmNopurreturn"),
    itmSellNostock: readNullableNumber(item, "itmSellNostock", "ItmSellNostock"),
    itmGId: readNullableNumber(item, "itmGId", "ItmGId"),
  };
}

function normalizeItemCatalogItem(item: Record<string, unknown>): ItemCatalogItem {
  const child = item.child ?? item.Child;

  return {
    id: readNumber(item, "id", "Id"),
    itemCatalogId: readNumber(item, "itemCatalogId", "ItemCatalogId"),
    itmCode: readString(item, "itmCode", "Itm_Code", "ItmCode") || null,
    itmCode2: readString(item, "itmCode2", "Itm_Code2", "ItmCode2") || null,
    itmIntCode: readString(item, "itmIntCode", "Itm_Int_Code", "ItmIntCode") || null,
    itmNameAr: readString(item, "itmNameAr", "Itm_Name_Ar", "ItmNameAr") || null,
    itmNameEn: readString(item, "itmNameEn", "Itm_Name_En", "ItmNameEn") || null,
    itmDefSellPrice: readNullableNumber(item, "itmDefSellPrice", "Itm_DefSell_Price"),
    itmDefTax: readNullableNumber(item, "itmDefTax", "Itm_Def_Tax"),
    itmDefPharmPrice: readNullableNumber(item, "itmDefPharmPrice", "Itm_DefPharm_Price"),
    itmHasExpire: readNullableBoolean(item, "itmHasExpire", "Itm_Has_Expire"),
    itmIsmedicine: readBoolean(item, "itmIsmedicine", "Itm_Ismedicine"),
    itmActive: readBoolean(item, "itmActive", "Itm_Active"),
    itmStopSell: readBoolean(item, "itmStopSell", "Itm_Stop_Sell"),
    itmSrvc: readBoolean(item, "itmSrvc", "Itm_Srvc"),
    itmStopPur: readBoolean(item, "itmStopPur", "Itm_StopPur"),
    itmPrintBarcode: readBoolean(item, "itmPrintBarcode", "Itm_PrintBarcode"),
    itmAllowDiscount: readBoolean(item, "itmAllowDiscount", "Itm_Allow_Discount"),
    itmFreez: readBoolean(item, "itmFreez", "ItmFreez"),
    comId: readNullableNumber(item, "comId", "Com_Id"),
    itmOrigin: readNullableNumber(item, "itmOrigin", "Itm_Origin"),
    itmGroup: readNullableNumber(item, "itmGroup", "Itm_Group"),
    itemForm: readNullableNumber(item, "itemForm", "item_Form"),
    itmNotes: readString(item, "itmNotes", "Itm_Notes") || null,
    itmMaxDiscPer: readNullableNumber(item, "itmMaxDiscPer", "Itm_MaxDisc_Per"),
    itmMaxDiscVal: readNullableNumber(item, "itmMaxDiscVal", "Itm_MaxDisc_Val"),
    itmUnit1: readNullableNumber(item, "itmUnit1", "Itm_Unit1"),
    itmUnit2: readNullableNumber(item, "itmUnit2", "Itm_Unit2"),
    itmUnit3: readNullableNumber(item, "itmUnit3", "Itm_Unit3"),
    itmUnit1Unit2: readNullableNumber(item, "itmUnit1Unit2", "Itm_Unit1Unit2"),
    itmUnit1Unit3: readNullableNumber(item, "itmUnit1Unit3", "Itm_Unit1_Unit3"),
    child: normalizeItemCatalogChild(
      child as Record<string, unknown> | null | undefined
    ),
  };
}

function buildItemCatalogPayload(data: ItemCatalogUpsertRequest) {
  return {
    Catalog: {
      Itm_Code: data.catalog.itmCode,
      Itm_Code2: data.catalog.itmCode2,
      Itm_Int_Code: data.catalog.itmIntCode,
      Itm_Name_Ar: data.catalog.itmNameAr,
      Itm_Name_En: data.catalog.itmNameEn,
      Itm_DefSell_Price: data.catalog.itmDefSellPrice,
      Itm_Def_Tax: data.catalog.itmDefTax,
      Itm_DefPharm_Price: data.catalog.itmDefPharmPrice,
      Itm_Has_Expire: data.catalog.itmHasExpire,
      Itm_Ismedicine: data.catalog.itmIsmedicine,
      Itm_Active: data.catalog.itmActive,
      Itm_Stop_Sell: data.catalog.itmStopSell,
      Itm_Srvc: data.catalog.itmSrvc,
      Itm_StopPur: data.catalog.itmStopPur,
      Itm_PrintBarcode: data.catalog.itmPrintBarcode,
      Itm_Allow_Discount: data.catalog.itmAllowDiscount,
      ItmFreez: data.catalog.itmFreez,
      Com_Id: data.catalog.comId,
      Itm_Origin: data.catalog.itmOrigin,
      Itm_Group: data.catalog.itmGroup,
      item_Form: data.catalog.itemForm,
      Itm_Notes: data.catalog.itmNotes,
      Itm_MaxDisc_Per: data.catalog.itmMaxDiscPer,
      Itm_MaxDisc_Val: data.catalog.itmMaxDiscVal,
      Itm_Unit1: data.catalog.itmUnit1,
      Itm_Unit2: data.catalog.itmUnit2,
      Itm_Unit3: data.catalog.itmUnit3,
      Itm_Unit1Unit2: data.catalog.itmUnit1Unit2,
      Itm_Unit1_Unit3: data.catalog.itmUnit1Unit3,
    },
    Child: data.child
      ? {
          ItmComCode: data.child.itmComCode,
          ItmLocation: data.child.itmLocation,
          ItmRequestLimit: data.child.itmRequestLimit,
          ItmMaxLimit: data.child.itmMaxLimit,
          ItmMinLimit: data.child.itmMinLimit,
          ItmDefaultLimit: data.child.itmDefaultLimit,
          Itm_Purchase_Unit: data.child.itmPurchaseUnit,
          Itm_Sell_Unit: data.child.itmSellUnit,
          ItmScientificN1: data.child.itmScientificN1,
          ItmScientificN2: data.child.itmScientificN2,
          ItmG1: data.child.itmG1,
          ItmG2: data.child.itmG2,
          ItmG3: data.child.itmG3,
          ItmScientificGroupId: data.child.itmScientificGroupId,
          ItmUsageMannerId: data.child.itmUsageMannerId,
          ItmIsShortage: data.child.itmIsShortage,
          ItmMidUnitDif: data.child.itmMidUnitDif,
          ItmSmallUnitDif: data.child.itmSmallUnitDif,
          ItmFracQty: data.child.itmFracQty,
          ItmFavourite: data.child.itmFavourite,
          UcpCode: data.child.ucpCode,
          ItmSalesDisc: data.child.itmSalesDisc,
          ItmNopurreturn: data.child.itmNopurreturn,
          ItmSellNostock: data.child.itmSellNostock,
          ItmGId: data.child.itmGId,
        }
      : null,
  };
}

function normalizeCompanyItem(item: Record<string, unknown>): CompanyItem {
  return {
    comId: readNumber(item, "comId", "ComId"),
    comCode: readString(item, "comCode", "ComCode"),
    comNameAr: readString(item, "comNameAr", "ComNameAr"),
    comNameEn: readString(item, "comNameEn", "ComNameEn"),
    comTel: readString(item, "comTel", "ComTel"),
    comAddress: readString(item, "comAddress", "ComAddress"),
    comActive: readBoolean(item, "comActive", "ComActive"),
  };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function normalizeAuthResponse(data: Record<string, unknown>): AuthResponse {
  return {
    isSuccess: Boolean(data.isSuccess ?? data.IsSuccess),
    message: String(data.message ?? data.Message ?? "Request failed"),
    token: (data.token ?? data.Token ?? null) as string | null,
    userId: (data.userId ?? data.UserId ?? null) as string | null,
  };
}

async function parseJsonBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new ApiError(
      response.status,
      text.slice(0, 200) || response.statusText
    );
  }
}

async function parseError(response: Response): Promise<string> {
  const text = await response.text();
  let body: Record<string, unknown> = {};

  if (text) {
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return text.slice(0, 200) || `HTTP ${response.status} ${response.statusText}`;
    }
  }

  const detail =
    body.message ??
    body.Message ??
    body.title ??
    body.detail ??
    body.error;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (response.status === 401) {
    return "Unauthorized — your session expired. Please sign out and sign in again.";
  }

  if (response.status === 502) {
    return "Cannot reach Alfa API. Ensure it is running at https://localhost:7211";
  }

  if (text.trim()) {
    return text.slice(0, 200);
  }

  return `HTTP ${response.status} ${response.statusText || "Request failed"}`;
}

/** Paths are relative to /api/alfa — proxy adds /api/ on the Alfa server */
function alfaUrl(path: string): string {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE_URL}/${normalized}`;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(alfaUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthToken();
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function clearAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("alfa_token");
  }
}

export async function loginWithAlfaApi(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const response = await fetch(alfaUrl("Auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        twoFactorCode: null,
        twoFactorRecoveryCode: null,
      }),
    });

    const data = await parseJsonBody(response);
    const result = normalizeAuthResponse(data);

    if (!response.ok) {
      return {
        ...result,
        isSuccess: false,
        message: result.message || "Invalid email or password",
      };
    }

    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      return { isSuccess: false, message: error.message };
    }
    if (error instanceof TypeError) {
      return {
        isSuccess: false,
        message:
          "Cannot reach Alfa API. Ensure it is running at https://localhost:7211",
      };
    }
    throw error;
  }
}

export async function registerWithAlfaApi(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const response = await fetch(alfaUrl("Auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await parseJsonBody(response);
    const result = normalizeAuthResponse(data);

    if (!response.ok) {
      return {
        ...result,
        isSuccess: false,
        message: result.message || "Registration failed",
      };
    }

    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      return { isSuccess: false, message: error.message };
    }
    if (error instanceof TypeError) {
      return {
        isSuccess: false,
        message:
          "Cannot reach Alfa API. Ensure it is running at https://localhost:7211",
      };
    }
    throw error;
  }
}

export function getMyPermissions(token: string) {
  return apiFetch<Record<string, unknown>>("Permissions/me", {}, token).then(
    (data) => ({
      userId: String(data.userId ?? data.UserId ?? ""),
      roles: (data.roles ?? data.Roles ?? []) as string[],
      permissions: (data.permissions ?? data.Permissions ?? []) as string[],
    })
  );
}

export function getRoles(token: string) {
  return apiFetch<Record<string, unknown>[]>("Permissions/roles", {}, token).then(
    (items) => items.map((item) => normalizeRoleSummary(item))
  );
}

export function getRolePermissions(roleId: number, token: string) {
  return apiFetch<RolePermissions>(`Permissions/roles/${roleId}`, {}, token);
}

export function updateRolePermissions(
  roleId: number,
  permissionIds: number[],
  token: string
) {
  return apiFetch<void>(
    `Permissions/roles/${roleId}`,
    {
      method: "PUT",
      body: JSON.stringify({ permissionIds }),
    },
    token
  );
}

export function getPermissionsList(token: string) {
  return apiFetch<Record<string, unknown>[]>("Permissions/list", {}, token).then(
    (items) => items.map((item) => normalizePermissionListItem(item))
  );
}

export function createPermission(
  data: CreatePermissionRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    "Permissions",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    token
  ).then((item) => normalizePermissionListItem(item));
}

export function updatePermission(
  permissionId: number,
  data: CreatePermissionRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    `Permissions/${permissionId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    token
  ).then((item) => normalizePermissionListItem(item));
}

export function deletePermission(permissionId: number, token: string) {
  return apiFetch<void>(`Permissions/${permissionId}`, { method: "DELETE" }, token);
}

export function createRole(data: CreateRoleRequest, token: string) {
  return apiFetch<Record<string, unknown>>(
    "Permissions/roles",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    token
  ).then((item) => normalizeRoleSummary(item));
}

export function updateRole(
  roleId: number,
  data: CreateRoleRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    `Permissions/roles/${roleId}/details`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    token
  ).then((item) => normalizeRoleSummary(item));
}

export function deleteRole(roleId: number, token: string) {
  return apiFetch<void>(
    `Permissions/roles/${roleId}`,
    { method: "DELETE" },
    token
  );
}

export function getUsers(token: string) {
  return apiFetch<Record<string, unknown>[]>("Permissions/users", {}, token).then(
    (items) => items.map((item) => normalizeUserSummary(item))
  );
}

export function getUserRoles(userId: string, token: string) {
  return apiFetch<Record<string, unknown>>(
    `Permissions/users/${userId}`,
    {},
    token
  ).then((data) => normalizeUserRoles(data));
}

export function assignUserRoles(
  userId: string,
  roleIds: number[],
  token: string
) {
  return apiFetch<void>(
    `Permissions/users/${userId}/roles`,
    {
      method: "PUT",
      body: JSON.stringify({ roleIds }),
    },
    token
  );
}

export function clearUserRoles(userId: string, token: string) {
  return apiFetch<void>(
    `Permissions/users/${userId}/roles`,
    { method: "DELETE" },
    token
  );
}

export function getUserPermissions(userId: string, token: string) {
  return apiFetch<Record<string, unknown>>(
    `Permissions/users/${userId}/permissions`,
    {},
    token
  ).then((data) => normalizeUserPermissionsDetail(data));
}

export function updateUserPermissions(
  userId: string,
  assignments: UserPermissionAssignment[],
  token: string
) {
  return apiFetch<void>(
    `Permissions/users/${userId}/permissions`,
    {
      method: "PUT",
      body: JSON.stringify({ assignments }),
    },
    token
  );
}

export function clearUserPermissions(userId: string, token: string) {
  return apiFetch<void>(
    `Permissions/users/${userId}/permissions`,
    { method: "DELETE" },
    token
  );
}

export function getUnits(token: string) {
  return apiFetch<Record<string, unknown>[]>("Unit", {}, token).then((items) =>
    items.map((item) => normalizeUnitItem(item))
  );
}

export function createUnit(data: CreateUnitRequest, token: string) {
  return apiFetch<Record<string, unknown>>(
    "Unit",
    {
      method: "POST",
      body: JSON.stringify({
        U_Code: data.uCode,
        U_Name_Ar: data.uNameAr,
        U_Name_En: data.uNameEn,
      }),
    },
    token
  ).then((item) => normalizeUnitItem(item));
}

export function updateUnit(
  uCode: string,
  data: UpdateUnitRequest,
  token: string
) {
  const code = uCode.trim();
  if (!code) {
    return Promise.reject(new ApiError(400, "Unit code is missing."));
  }

  return apiFetch<void>(
    `Unit/${encodeURIComponent(code)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        U_Name_Ar: data.uNameAr,
        U_Name_En: data.uNameEn,
      }),
    },
    token
  );
}

export function deleteUnit(uCode: string, token: string) {
  const code = uCode.trim();
  if (!code) {
    return Promise.reject(new ApiError(400, "Unit code is missing."));
  }

  return apiFetch<void>(
    `Unit/${encodeURIComponent(code)}`,
    { method: "DELETE" },
    token
  );
}

export function getItemFormats(token: string) {
  return apiFetch<Record<string, unknown>[]>("ItemFormat", {}, token).then(
    (items) => items.map((item) => normalizeItemFormatItem(item))
  );
}

export function createItemFormat(data: CreateItemFormatRequest, token: string) {
  return apiFetch<Record<string, unknown>>(
    "ItemFormat",
    {
      method: "POST",
      body: JSON.stringify({
        ItfCode: 0,
        ItfNameAr: data.itfNameAr,
        ItfNameEn: data.itfNameEn,
      }),
    },
    token
  ).then((item) => normalizeItemFormatItem(item));
}

export function updateItemFormat(
  itfCode: number,
  data: UpdateItemFormatRequest,
  token: string
) {
  return apiFetch<void>(`ItemFormat/${itfCode}`, {
    method: "PUT",
    body: JSON.stringify({
      ItfNameAr: data.itfNameAr,
      ItfNameEn: data.itfNameEn,
    }),
  }, token);
}

export function deleteItemFormat(itfCode: number, token: string) {
  return apiFetch<void>(`ItemFormat/${itfCode}`, { method: "DELETE" }, token);
}

export function getItemOrigins(token: string) {
  return apiFetch<Record<string, unknown>[]>("ItemOrigin", {}, token).then(
    (items) => items.map((item) => normalizeItemOriginItem(item))
  );
}

export function createItemOrigin(data: CreateItemOriginRequest, token: string) {
  return apiFetch<Record<string, unknown>>(
    "ItemOrigin",
    {
      method: "POST",
      body: JSON.stringify({
        IoId: 0,
        IoTextAr: data.ioTextAr,
      }),
    },
    token
  ).then((item) => normalizeItemOriginItem(item));
}

export function updateItemOrigin(
  ioId: number,
  data: UpdateItemOriginRequest,
  token: string
) {
  return apiFetch<void>(`ItemOrigin/${ioId}`, {
    method: "PUT",
    body: JSON.stringify({
      IoTextAr: data.ioTextAr,
    }),
  }, token);
}

export function deleteItemOrigin(ioId: number, token: string) {
  return apiFetch<void>(`ItemOrigin/${ioId}`, { method: "DELETE" }, token);
}

export function getCompanies(token: string) {
  return apiFetch<Record<string, unknown>[]>("Company", {}, token).then(
    (items) => items.map((item) => normalizeCompanyItem(item))
  );
}

export function createCompany(data: CreateCompanyRequest, token: string) {
  return apiFetch<Record<string, unknown>>(
    "Company",
    {
      method: "POST",
      body: JSON.stringify({
        ComId: 0,
        ComCode: data.comCode,
        ComNameAr: data.comNameAr,
        ComNameEn: data.comNameEn,
        ComTel: data.comTel,
        ComAddress: data.comAddress,
        ComActive: data.comActive,
      }),
    },
    token
  ).then((item) => normalizeCompanyItem(item));
}

export function updateCompany(
  comId: number,
  data: UpdateCompanyRequest,
  token: string
) {
  return apiFetch<void>(`Company/${comId}`, {
    method: "PUT",
    body: JSON.stringify({
      ComCode: data.comCode,
      ComNameAr: data.comNameAr,
      ComNameEn: data.comNameEn,
      ComTel: data.comTel,
      ComAddress: data.comAddress,
      ComActive: data.comActive,
    }),
  }, token);
}

export function deleteCompany(comId: number, token: string) {
  return apiFetch<void>(`Company/${comId}`, { method: "DELETE" }, token);
}

export function getGroups(token: string) {
  return apiFetch<Record<string, unknown>[]>("Group", {}, token).then((items) =>
    items.map((item) => normalizeGroupItem(item))
  );
}

export function createGroup(data: CreateGroupRequest, token: string) {
  return apiFetch<Record<string, unknown>>(
    "Group",
    {
      method: "POST",
      body: JSON.stringify({
        GNameAr: data.gNameAr,
        GNameEn: data.gNameEn,
        GParent: data.gParent,
      }),
    },
    token
  ).then((item) => normalizeGroupItem(item));
}

export function updateGroup(id: number, data: UpdateGroupRequest, token: string) {
  return apiFetch<void>(`Group/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      GNameAr: data.gNameAr,
      GNameEn: data.gNameEn,
      GParent: data.gParent,
    }),
  }, token);
}

export function deleteGroup(id: number, token: string) {
  return apiFetch<void>(`Group/${id}`, { method: "DELETE" }, token);
}

export function getItemCatalogs(token: string) {
  return apiFetch<Record<string, unknown>[]>("ItemCatalog", {}, token).then(
    (items) => items.map((item) => normalizeItemCatalogItem(item))
  );
}

export function getItemCatalog(id: number, token: string) {
  return apiFetch<Record<string, unknown>>(`ItemCatalog/${id}`, {}, token).then(
    (item) => normalizeItemCatalogItem(item)
  );
}

export function createItemCatalog(data: ItemCatalogUpsertRequest, token: string) {
  return apiFetch<Record<string, unknown>>(
    "ItemCatalog",
    {
      method: "POST",
      body: JSON.stringify(buildItemCatalogPayload(data)),
    },
    token
  ).then((item) => normalizeItemCatalogItem(item));
}

export function updateItemCatalog(
  id: number,
  data: ItemCatalogUpsertRequest,
  token: string
) {
  return apiFetch<void>(`ItemCatalog/${id}`, {
    method: "PUT",
    body: JSON.stringify(buildItemCatalogPayload(data)),
  }, token);
}

export function deleteItemCatalog(id: number, token: string) {
  return apiFetch<void>(`ItemCatalog/${id}`, { method: "DELETE" }, token);
}
