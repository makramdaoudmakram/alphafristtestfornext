import { API_BASE_URL, getAlfaApiHint } from "./api-config";
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
  CreateMovParientRequest,
  MovParientItem,
  UpdateMovParientRequest,
} from "@/types/mov-parient";
import type {
  MovmentItem,
  MovmentLookupItem,
  MovmentUpsertRequest,
} from "@/types/movment";
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
  ItemCatalogPageQuery,
  ItemCatalogPagedResult,
  ItemCatalogUpsertRequest,
} from "@/types/item-catalog";

function readString(
  obj: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string") return value;
    if (value != null && typeof value !== "object") return String(value);
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
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1" || normalized === "yes")
        return true;
      if (normalized === "false" || normalized === "0" || normalized === "no")
        return false;
    }
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

function normalizeMovParientItem(item: Record<string, unknown>): MovParientItem {
  return {
    movParientId: readNumber(item, "movParientId", "MovParientId"),
    movParientAname: readString(
      item,
      "movParientAname",
      "MovParientAname",
      "mov_Parient_Aname"
    ),
    movParientEname: readString(
      item,
      "movParientEname",
      "MovParientEname",
      "mov_Parient_Ename"
    ),
  };
}

function normalizeMovmentItem(item: Record<string, unknown>): MovmentItem {
  return {
    id: readNumber(item, "id", "Id"),
    movChiledId: readNullableNumber(item, "movChiledId", "MovChiledId"),
    movChiledName: readString(item, "movChiledName", "MovChiledName") || null,
    movParientId: readNullableNumber(item, "movParientId", "MovParientId"),
    movSingleStore: readBoolean(item, "movSingleStore", "MovSingleStore"),
    movStor: readString(item, "movStor", "MovStor") || null,
    movStor2: readString(item, "movStor2", "MovStor2") || null,
    movAccountEntry1:
      readString(item, "movAccountEntry1", "MovAccountEntry1") || null,
    movAccountEntry2:
      readString(item, "movAccountEntry2", "MovAccountEntry2") || null,
    movAccountEntry3:
      readString(item, "movAccountEntry3", "MovAccountEntry3") || null,
    movAccountEntry4:
      readString(item, "movAccountEntry4", "MovAccountEntry4") || null,
    movAccountEntry5:
      readString(item, "movAccountEntry5", "MovAccountEntry5") || null,
    movAccountEntry6:
      readString(item, "movAccountEntry6", "MovAccountEntry6") || null,
    movAccountEntry7:
      readString(item, "movAccountEntry7", "MovAccountEntry7") || null,
    movAccountEntry8:
      readString(item, "movAccountEntry8", "MovAccountEntry8") || null,
    movClint1: readString(item, "movClint1", "MovClint1") || null,
    movClint2: readString(item, "movClint2", "MovClint2") || null,
    movStockEffict: readNullableNumber(item, "movStockEffict", "MovStockEffict"),
    movPage: readString(item, "movPage", "MovPage") || null,
    movActive: readBoolean(item, "movActive", "MovActive"),
  };
}

function buildMovmentPayload(data: MovmentUpsertRequest) {
  return {
    MovChiledId: data.movChiledId,
    MovChiledName: data.movChiledName,
    MovParientId: data.movParientId,
    MovSingleStore: data.movSingleStore,
    MovStor: data.movStor,
    MovStor2: data.movStor2,
    MovAccountEntry1: data.movAccountEntry1,
    MovAccountEntry2: data.movAccountEntry2,
    MovAccountEntry3: data.movAccountEntry3,
    MovAccountEntry4: data.movAccountEntry4,
    MovAccountEntry5: data.movAccountEntry5,
    MovAccountEntry6: data.movAccountEntry6,
    MovAccountEntry7: data.movAccountEntry7,
    MovAccountEntry8: data.movAccountEntry8,
    MovClint1: data.movClint1,
    MovClint2: data.movClint2,
    MovStockEffict: data.movStockEffict,
    MovPage: data.movPage,
    MovActive: !!data.movActive,
  };
}

function normalizeMovmentLookupItem(
  item: Record<string, unknown>
): MovmentLookupItem {
  return {
    id: readNumber(item, "id", "Id"),
    movChiledId: readNullableNumber(item, "movChiledId", "MovChiledId"),
    movChiledName: readString(item, "movChiledName", "MovChiledName") || null,
    movParientId: readNullableNumber(item, "movParientId", "MovParientId"),
    movStor: readString(item, "movStor", "MovStor") || null,
    movSingleStore: readBoolean(item, "movSingleStore", "MovSingleStore"),
    movAccountEntry1:
      readString(item, "movAccountEntry1", "MovAccountEntry1") || null,
    movAccountEntry2:
      readString(item, "movAccountEntry2", "MovAccountEntry2") || null,
    movAccountEntry3:
      readString(item, "movAccountEntry3", "MovAccountEntry3") || null,
  };
}

function parseArrayOrPaged<T>(
  data: unknown,
  normalize: (item: Record<string, unknown>) => T
): T[] {
  if (Array.isArray(data)) {
    return data.map((item) => normalize(item as Record<string, unknown>));
  }
  if (data && typeof data === "object") {
    const raw = data as Record<string, unknown>;
    const itemsRaw = raw.items ?? raw.Items;
    if (Array.isArray(itemsRaw)) {
      return itemsRaw.map((item) =>
        normalize(item as Record<string, unknown>)
      );
    }
  }
  return [];
}

async function fetchAllPaged<T>(
  path: string,
  token: string,
  normalize: (item: Record<string, unknown>) => T,
  extraQuery?: Record<string, string | number | undefined>
): Promise<T[]> {
  const pageSize = 100;
  let pageNumber = 1;
  const all: T[] = [];

  while (pageNumber < 500) {
    const params = new URLSearchParams();
    params.set("pageNumber", String(pageNumber));
    params.set("pageSize", String(pageSize));
    if (extraQuery) {
      for (const [key, value] of Object.entries(extraQuery)) {
        if (value !== undefined && value !== "") params.set(key, String(value));
      }
    }

    const data = await apiFetch<unknown>(`${path}?${params.toString()}`, {}, token);

    if (Array.isArray(data)) {
      return data.map((item) => normalize(item as Record<string, unknown>));
    }

    const batch = parseArrayOrPaged(data, normalize);
    if (batch.length === 0) break;

    all.push(...batch);

    const totalCount =
      data && typeof data === "object"
        ? readNumber(data as Record<string, unknown>, "totalCount", "TotalCount")
        : 0;

    if (totalCount > 0 && all.length >= totalCount) break;
    if (batch.length < pageSize) break;

    pageNumber += 1;
  }

  return all;
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

function readItemCatalogId(item: Record<string, unknown>): number {
  const id = readNumber(item, "id", "Id");
  if (id > 0) return id;
  const catalogId = readNumber(item, "itemCatalogId", "ItemCatalogId");
  return catalogId > 0 ? catalogId : 0;
}

function normalizeItemCatalogItem(item: Record<string, unknown>): ItemCatalogItem {
  const child = item.child ?? item.Child;

  return {
    id: readItemCatalogId(item),
    itemCatalogId: readNumber(item, "itemCatalogId", "ItemCatalogId"),
    itmCode:
      readString(item, "itmCode", "itm_Code", "Itm_Code", "ItmCode") || null,
    itmCode2:
      readString(item, "itmCode2", "itm_Code2", "Itm_Code2", "ItmCode2") ||
      null,
    itmIntCode:
      readString(item, "itmIntCode", "itm_Int_Code", "Itm_Int_Code", "ItmIntCode") ||
      null,
    itmNameAr:
      readString(item, "itmNameAr", "itm_Name_Ar", "Itm_Name_Ar", "ItmNameAr") ||
      null,
    itmNameEn:
      readString(item, "itmNameEn", "itm_Name_En", "Itm_Name_En", "ItmNameEn") ||
      null,
    itmDefSellPrice: readNullableNumber(
      item,
      "itmDefSellPrice",
      "itm_DefSell_Price",
      "Itm_DefSell_Price",
      "ItmDefSellPrice"
    ),
    itmDefTax: readNullableNumber(item, "itmDefTax", "itm_Def_Tax", "Itm_Def_Tax"),
    itmDefPharmPrice: readNullableNumber(
      item,
      "itmDefPharmPrice",
      "itm_DefPharm_Price",
      "Itm_DefPharm_Price",
      "ItmDefPharmPrice"
    ),
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
      if (response.status === 405 || text.includes("405") && text.includes("IIS")) {
        return "Update failed: IIS blocked PUT/DELETE on the API server. Redeploy the latest web.config to apipharm.aghapy-company.com and disable WebDAV in IIS.";
      }

      if (text.includes("<!DOCTYPE html") || text.includes("<html")) {
        return `HTTP ${response.status} — the API server returned an HTML error page instead of JSON. Check IIS configuration for PUT/DELETE.`;
      }

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

  if (response.status === 405) {
    return "HTTP 405 Method Not Allowed — IIS blocked the update request. Redeploy web.config on the API server.";
  }

  if (response.status === 502) {
    return `Cannot reach Alfa API. Ensure it is running at ${getAlfaApiHint()}`;
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
          `Cannot reach Alfa API. Ensure it is running at ${getAlfaApiHint()}`,
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
          `Cannot reach Alfa API. Ensure it is running at ${getAlfaApiHint()}`,
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
  return fetchAllPaged("Permissions/roles", token, normalizeRoleSummary);
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
  return fetchAllPaged("Permissions/list", token, normalizePermissionListItem);
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
  return fetchAllPaged("Permissions/users", token, normalizeUserSummary);
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
  return fetchAllPaged("Unit", token, normalizeUnitItem);
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
  return fetchAllPaged("ItemFormat", token, normalizeItemFormatItem);
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
  return fetchAllPaged("ItemOrigin", token, normalizeItemOriginItem);
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

export function getMovParients(token: string) {
  return fetchAllPaged("MovParient", token, normalizeMovParientItem);
}

export function createMovParient(data: CreateMovParientRequest, token: string) {
  return apiFetch<Record<string, unknown>>(
    "MovParient",
    {
      method: "POST",
      body: JSON.stringify({
        MovParientAname: data.movParientAname,
        MovParientEname: data.movParientEname,
      }),
    },
    token
  ).then((item) => normalizeMovParientItem(item));
}

export function updateMovParient(
  movParientId: number,
  data: UpdateMovParientRequest,
  token: string
) {
  return apiFetch<void>(`MovParient/${movParientId}`, {
    method: "PUT",
    body: JSON.stringify({
      MovParientAname: data.movParientAname,
      MovParientEname: data.movParientEname,
    }),
  }, token);
}

export function deleteMovParient(movParientId: number, token: string) {
  return apiFetch<void>(`MovParient/${movParientId}`, { method: "DELETE" }, token);
}

export function getMovments(token: string, movParientId?: number) {
  return fetchAllPaged(
    "Movment",
    token,
    normalizeMovmentItem,
    movParientId != null ? { movParientId } : undefined
  );
}

/** Active movements for a parent — transaction-page lookup. */
export function lookupMovments(
  token: string,
  parentId: number,
  search?: string,
  options?: { pageNumber?: number; pageSize?: number; signal?: AbortSignal }
): Promise<MovmentLookupItem[]> {
  const params = new URLSearchParams();
  params.set("parentId", String(parentId));
  if (search?.trim()) params.set("search", search.trim());
  params.set("pageNumber", String(options?.pageNumber ?? 1));
  params.set("pageSize", String(options?.pageSize ?? 50));

  return apiFetch<unknown>(
    `Movment/lookup?${params.toString()}`,
    { signal: options?.signal },
    token
  ).then((data) => parseArrayOrPaged(data, normalizeMovmentLookupItem));
}

/** Full movement row — used to load store/account fields for purchase header. */
export function getMovmentById(
  id: number,
  token: string,
  options?: { signal?: AbortSignal }
): Promise<MovmentItem> {
  return apiFetch<Record<string, unknown>>(
    `Movment/${id}`,
    { signal: options?.signal },
    token
  ).then((item) => normalizeMovmentItem(item));
}

export function createMovment(data: MovmentUpsertRequest, token: string) {
  return apiFetch<Record<string, unknown>>(
    "Movment",
    {
      method: "POST",
      body: JSON.stringify(buildMovmentPayload(data)),
    },
    token
  ).then((item) => normalizeMovmentItem(item));
}

export function updateMovment(
  id: number,
  data: MovmentUpsertRequest,
  token: string
) {
  return apiFetch<void>(`Movment/${id}`, {
    method: "PUT",
    body: JSON.stringify(buildMovmentPayload(data)),
  }, token);
}

export function deleteMovment(id: number, token: string) {
  return apiFetch<void>(`Movment/${id}`, { method: "DELETE" }, token);
}

export type MovValueNextResult = {
  success: boolean;
  value: number;
  message?: string | null;
};

/** Atomically get the next sequence value for a movement id (Movdid). */
export function getNextMovValue(
  movId: number,
  token: string,
  options?: { signal?: AbortSignal }
): Promise<MovValueNextResult> {
  return apiFetch<Record<string, unknown>>(
    `MovValue/GetNextValue/${movId}`,
    { method: "POST", signal: options?.signal },
    token
  ).then((data) => {
    const success = Boolean(data.success ?? data.Success);
    const value = Number(data.value ?? data.Value ?? 0);
    const message =
      (data.message as string | undefined) ??
      (data.Message as string | undefined) ??
      null;
    return { success, value, message };
  });
}

export function getCompanies(token: string) {
  return fetchAllPaged("Company", token, normalizeCompanyItem);
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
  return fetchAllPaged("Group", token, normalizeGroupItem);
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
  return apiFetch<unknown>("ItemCatalog", {}, token).then(parseItemCatalogListResponse);
}

/** Loads every catalog row (paged API) for autocomplete on large datasets. */
export async function fetchAllItemCatalogItems(
  token: string
): Promise<ItemCatalogItem[]> {
  // API MaxPageSize is 100 — page through until all rows are loaded.
  const pageSize = 100;
  let page = 1;
  let totalCount = 0;
  const all: ItemCatalogItem[] = [];

  while (page < 500) {
    const batch = await getItemCatalogPage(token, {
      page,
      pageSize,
      sortBy: "itmCode",
      sortDesc: false,
    });
    if (page === 1) totalCount = batch.totalCount;
    all.push(...batch.items);
    if (all.length >= totalCount || batch.items.length === 0) break;
    page += 1;
  }

  return all;
}

function parseItemCatalogListResponse(data: unknown): ItemCatalogItem[] {
  if (Array.isArray(data)) {
    return data.map((item) =>
      normalizeItemCatalogItem(item as Record<string, unknown>)
    );
  }
  if (data && typeof data === "object") {
    return normalizeItemCatalogPagedResult(
      data as Record<string, unknown>
    ).items;
  }
  return [];
}

function normalizeItemCatalogPagedResult(
  raw: Record<string, unknown>
): ItemCatalogPagedResult {
  const itemsRaw = raw.items ?? raw.Items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((item) =>
        normalizeItemCatalogItem(item as Record<string, unknown>)
      )
    : [];

  return {
    items,
    totalCount: readNumber(raw, "totalCount", "TotalCount"),
    page: readNumber(raw, "page", "Page") || 1,
    pageSize: readNumber(raw, "pageSize", "PageSize") || items.length,
  };
}

export function getItemCatalogPage(
  token: string,
  query: ItemCatalogPageQuery
) {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDesc) params.set("sortDesc", "true");
  if (query.search?.trim()) params.set("search", query.search.trim());

  return apiFetch<Record<string, unknown>>(
    `ItemCatalog?${params.toString()}`,
    {},
    token
  ).then((data) => normalizeItemCatalogPagedResult(data));
}

/**
 * Full-table item autocomplete lookup (server-side Contains on code + Ar/En names).
 * Returns top matches only — does not use the paginated admin list page.
 */
export function lookupItemCatalog(
  token: string,
  search: string,
  options?: { take?: number; signal?: AbortSignal }
): Promise<ItemCatalogItem[]> {
  const term = search.trim();
  if (!term) return Promise.resolve([]);

  const params = new URLSearchParams();
  params.set("search", term);
  params.set("take", String(options?.take ?? 20));

  return apiFetch<unknown>(
    `ItemCatalog/lookup?${params.toString()}`,
    { signal: options?.signal },
    token
  ).then((data) => {
    if (!Array.isArray(data)) return [];
    return data.map((row) =>
      normalizeItemCatalogLookupItem(row as Record<string, unknown>)
    );
  });
}

/** Map lightweight lookup DTO onto ItemCatalogItem (prices needed for line apply). */
function normalizeItemCatalogLookupItem(
  item: Record<string, unknown>
): ItemCatalogItem {
  return {
    id: readItemCatalogId(item),
    itemCatalogId: readNumber(item, "id", "Id", "itemCatalogId", "ItemCatalogId"),
    itmCode:
      readString(item, "itmCode", "itm_Code", "Itm_Code", "ItmCode") || null,
    itmCode2: null,
    itmIntCode: null,
    itmNameAr:
      readString(item, "itmNameAr", "itm_Name_Ar", "Itm_Name_Ar", "ItmNameAr") ||
      null,
    itmNameEn:
      readString(item, "itmNameEn", "itm_Name_En", "Itm_Name_En", "ItmNameEn") ||
      null,
    itmDefSellPrice: readNullableNumber(
      item,
      "itmDefSellPrice",
      "itm_DefSell_Price",
      "Itm_DefSell_Price",
      "ItmDefSellPrice"
    ),
    itmDefTax: null,
    itmDefPharmPrice: readNullableNumber(
      item,
      "itmDefPharmPrice",
      "itm_DefPharm_Price",
      "Itm_DefPharm_Price",
      "ItmDefPharmPrice"
    ),
    itmHasExpire: null,
    itmIsmedicine: false,
    itmActive: true,
    itmStopSell: false,
    itmSrvc: false,
    itmStopPur: false,
    itmPrintBarcode: false,
    itmAllowDiscount: false,
    itmFreez: false,
    comId: null,
    itmOrigin: null,
    itmGroup: null,
    itemForm: null,
    itmNotes: null,
    itmMaxDiscPer: null,
    itmMaxDiscVal: null,
    itmUnit1: null,
    itmUnit2: null,
    itmUnit3: null,
    itmUnit1Unit2: null,
    itmUnit1Unit3: null,
    child: null,
  };
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
