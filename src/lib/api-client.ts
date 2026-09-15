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
  SalesMovementParent,
  SalesmovmentDetail,
  SalesmovmentUpsertRequest,
} from "@/types/sales-movment";
import type {
  CreateSalesPayMethodRequest,
  SalesPayMethodCompoItem,
  SalesPayMethodItem,
  UpdateSalesPayMethodRequest,
} from "@/types/sales-pay-method";
import type {
  CreateSalesServiceRequest,
  SalesServiceCompoItem,
  SalesServiceItem,
  UpdateSalesServiceRequest,
} from "@/types/sales-service";
import type {
  CreateSalesServiceAssignmentRequest,
  SalesServiceAssignmentCurrentPharmacyItem,
  SalesServiceAssignmentItem,
  UpdateSalesServiceAssignmentRequest,
} from "@/types/sales-service-assignment";
import type {
  CreateSalesPaymentAssimentRequest,
  SalesPaymentAssimentItem,
  UpdateSalesPaymentAssimentRequest,
} from "@/types/sales-payment-assiment";
import type { BrandItem, CreateBrandRequest, UpdateBrandRequest } from "@/types/brand";
import type {
  CreateEmployInfoRequest,
  EmployInfoCreateResult,
  EmployInfoItem,
  UpdateEmployInfoRequest,
} from "@/types/employ-info";
import type {
  InternationalBarcodeItem,
  InternationalBarcodeWriteRequest,
} from "@/types/international-barcode";
import type { VendorCodeItem, VendorCodeWriteRequest } from "@/types/vendor-code";
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
  AccountsChartItem,
  AccountsChartUpsertRequest,
} from "@/types/accounts-chart";
import type {
  CostCenterCompoItem,
  CostCenterItem,
  CostCenterUpsertRequest,
} from "@/types/cost-center";
import type {
  StorAccountOption,
  StorItem,
  StorUpsertRequest,
} from "@/types/stor";
import { STOR_ACCOUNT_PARENT_CODE } from "@/types/stor";
import type {
  AccountCurrencyItem,
  AccountSelectItem,
  CollectedVoucherItem,
  CollectedVoucherUpsertRequest,
  VoucherJournalLine,
  VoucherLedgerLineRequest,
} from "@/types/collected-voucher";
import type {
  VoucherAttachmentItem,
  VoucherAttachmentType,
} from "@/types/voucher-attachment";
import type {
  ItemCatalogItem,
  ItemCatalogPageQuery,
  ItemCatalogPagedResult,
  ItemCatalogUpsertRequest,
} from "@/types/item-catalog";
import type {
  UserListItem,
  UserListPagedResult,
  UserListQuery,
} from "@/types/user";
import type { PharmFormValues, PharmItem } from "@/types/pharm";
import type {
  ReturnItemStockSearchItem,
  StockBalanceItem,
  StockBarcodeLabel,
  StockBarcodeLookupResult,
  StockBatchItem,
  StockPagedResult,
  StockSearchFilters,
} from "@/types/stock";
import type {
  BatchTraceabilityCreatorSource,
  BatchTraceabilityResult,
  BatchTraceabilityTimelineEntry,
} from "@/types/batch-traceability";
import type {
  ExcelEntityMetadata,
  ExcelImportCommitResponse,
  ExcelImportError,
  ExcelImportJobStatus,
  ExcelImportMode,
  ExcelImportPreview,
  ExcelImportResult,
  ExcelPropertyMetadata,
  ExcelTemplateDownload,
  ExcelTemplateRequest,
} from "@/types/excel";
import type {
  PostedPurchaseInvoiceReversalItem,
  PostedPurchaseInvoiceReversalPage,
  PostedPurchaseInvoiceReversalQuery,
  PurchaseInvoiceDraftItem,
  PurchaseInvoiceDraftPage,
  PurchaseInvoiceDraftQuery,
  PurchaseInvoiceReverseResult,
  PurTransDExcelPreview,
  PurTransDExcelPreviewRow,
} from "@/types/purchase";
import { parseUnitCode } from "@/lib/unit-code";
import { hasSearchableCatalogQuery } from "@/lib/item-catalog-wildcard";
import {
  excelImportJobStatusFromApiValue,
  excelImportModeFromApiValue,
  excelImportModeToApiValue,
} from "@/types/excel";

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

function readNullableString(
  obj: Record<string, unknown>,
  ...keys: string[]
): string | null {
  const value = readString(obj, ...keys);
  return value ? value : null;
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

function coerceNullableBoolean(value: unknown): boolean | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes")
      return true;
    if (normalized === "false" || normalized === "0" || normalized === "no")
      return false;
    if (!normalized) return null;
  }
  return undefined;
}

function readNullableBoolean(
  obj: Record<string, unknown>,
  ...keys: string[]
): boolean | null {
  for (const key of keys) {
    let found = false;
    let value: unknown;
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      found = true;
      value = obj[key];
    } else {
      const match = Object.entries(obj).find(
        ([name]) => name.toLowerCase() === key.toLowerCase()
      );
      if (match) {
        found = true;
        value = match[1];
      }
    }
    if (!found) continue;
    const coerced = coerceNullableBoolean(value);
    if (coerced !== undefined) return coerced;
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
    uCode: readNumber(item, "uCode", "U_Code", "u_Code"),
    uNameAr: readString(item, "uNameAr", "U_Name_Ar", "u_Name_Ar"),
    uNameEn: readString(item, "uNameEn", "U_Name_En", "u_Name_En"),
  };
}

function normalizeItemFormatItem(item: Record<string, unknown>): ItemFormatItem {
  const group = item.group ?? item.Group;
  const groupRecord =
    group && typeof group === "object"
      ? (group as Record<string, unknown>)
      : null;
  const groupNameFromNav = groupRecord
    ? readString(groupRecord, "gNameEn", "GNameEn") ||
      readString(groupRecord, "gNameAr", "GNameAr")
    : "";

  return {
    itfCode: readNumber(item, "itfCode", "ItfCode"),
    itfNameAr: readString(item, "itfNameAr", "ItfNameAr", "itf_Name_Ar"),
    itfNameEn: readString(item, "itfNameEn", "ItfNameEn", "itf_Name_En"),
    groupId: readNumber(item, "groupId", "GroupId", "Group_Id", "group_Id"),
    groupName:
      readString(item, "groupName", "GroupName") || groupNameFromNav || null,
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
    movStor2: readString(item, "movStor2", "MovStor2") || null,
    movSingleStore: readBoolean(item, "movSingleStore", "MovSingleStore"),
    movAccountEntry1:
      readString(item, "movAccountEntry1", "MovAccountEntry1") || null,
    movAccountEntry2:
      readString(item, "movAccountEntry2", "MovAccountEntry2") || null,
    movAccountEntry3:
      readString(item, "movAccountEntry3", "MovAccountEntry3") || null,
    movAccountEntry4:
      readString(item, "movAccountEntry4", "MovAccountEntry4") || null,
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

/** ASP.NET camelCase serializes Itm_Unit1 as itm_Unit1 — include all variants. */
function readItemCatalogUnit(
  obj: Record<string, unknown>,
  unitIndex: 1 | 2 | 3
): number | null {
  return readNullableNumber(
    obj,
    `itmUnit${unitIndex}`,
    `itm_Unit${unitIndex}`,
    `Itm_Unit${unitIndex}`,
    `ItmUnit${unitIndex}`
  );
}

function normalizeGroupItem(item: Record<string, unknown>): GroupItem {
  return {
    id: readNumber(item, "id", "Id"),
    gNameAr: readString(item, "gNameAr", "GNameAr") || null,
    gNameEn: readString(item, "gNameEn", "GNameEn") || null,
  };
}

function normalizeAccountsChartItem(
  item: Record<string, unknown>
): AccountsChartItem {
  return {
    accCode: readString(item, "accCode", "ACCCode"),
    parentCode: readNullableString(item, "parentCode", "PARENTCode"),
    accName: readNullableString(item, "accName", "ACCName"),
    accAName: readNullableString(item, "accAName", "ACCAName"),
    currency: readNullableString(item, "currency", "Currency"),
    accKind: readBoolean(item, "accKind", "ACCKind"),
    accType: readBoolean(item, "accType", "ACCType"),
    receipt: readBoolean(item, "receipt", "Receipt"),
    payment: readBoolean(item, "payment", "Payment"),
  };
}

function normalizeCostCenterItem(item: Record<string, unknown>): CostCenterItem {
  return {
    id: readNumber(item, "id", "Id"),
    code: readNullableString(item, "code", "Code"),
    name: readNullableString(item, "name", "Name"),
  };
}

function normalizeCostCenterCompoItem(
  item: Record<string, unknown>
): CostCenterCompoItem {
  return {
    id: readNumber(item, "id", "Id"),
    code: readNullableString(item, "code", "Code"),
    name: readNullableString(item, "name", "Name"),
  };
}

function normalizeStorItem(item: Record<string, unknown>): StorItem {
  return {
    id: readNumber(item, "id", "Id"),
    storArName: readNullableString(
      item,
      "storArName",
      "StorArName",
      "Stor_ArName"
    ),
    storEnName: readNullableString(
      item,
      "storEnName",
      "StorEnName",
      "Stor_EnName"
    ),
    costCenterId: readNumber(item, "costCenterId", "CostCenterId"),
    accountNo: readNullableString(item, "accountNo", "AccountNo"),
    costCenterName: readNullableString(
      item,
      "costCenterName",
      "CostCenterName"
    ),
    accountName: readNullableString(item, "accountName", "AccountName"),
  };
}

function normalizeItemCatalogChild(
  item: Record<string, unknown> | null | undefined
) {
  if (!item) return null;

  return {
    itemCChId: readNumber(item, "item_C_ch_id", "Item_C_ch_id"),
    itemCatalogId: readNumber(item, "itemCatalogId", "ItemCatalogId"),
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
    itmHasExpire: readNullableBoolean(
      item,
      "itmHasExpire",
      "itm_Has_Expire",
      "Itm_Has_Expire",
      "ItmHasExpire",
      "hasExpire",
      "HasExpire"
    ),
    itmActive: readBoolean(item, "itmActive", "Itm_Active"),
    itmStopSell: readBoolean(item, "itmStopSell", "Itm_Stop_Sell"),
    itmSrvc: readBoolean(item, "itmSrvc", "Itm_Srvc"),
    itmStopPur: readBoolean(item, "itmStopPur", "Itm_StopPur"),
    itmPrintBarcode: readBoolean(item, "itmPrintBarcode", "Itm_PrintBarcode"),
    itmAllowDiscount: readBoolean(item, "itmAllowDiscount", "Itm_Allow_Discount"),
    itmFreez: readBoolean(item, "itmFreez", "ItmFreez"),
    stopTransfer: readBoolean(item, "stopTransfer", "StopTransfer"),
    brandId: readNullableNumber(item, "brandId", "BrandId", "Brand_Id"),
    brandName: readString(item, "brandName", "BrandName") || null,
    itmGroup: readNullableNumber(item, "itmGroup", "Itm_Group"),
    groupName: readString(item, "groupName", "GroupName") || null,
    itemForm: readNullableNumber(item, "itemForm", "item_Form"),
    itemFormName: readString(item, "itemFormatName", "ItemFormatName") || null,
    itmOrigin: readNullableNumber(item, "itmOrigin", "Itm_Origin"),
    itemOriginName: readString(item, "itemOriginName", "ItemOriginName") || null,
    itmNotes: readString(item, "itmNotes", "Itm_Notes") || null,
    itmMaxDiscPer: readNullableNumber(item, "itmMaxDiscPer", "Itm_MaxDisc_Per"),
    itmMaxDiscVal: readNullableNumber(item, "itmMaxDiscVal", "Itm_MaxDisc_Val"),
    itmUnit1: readItemCatalogUnit(item, 1),
    itmUnit2: readItemCatalogUnit(item, 2),
    itmUnit3: readItemCatalogUnit(item, 3),
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
      Itm_Active: data.catalog.itmActive,
      Itm_Stop_Sell: data.catalog.itmStopSell,
      Itm_Srvc: data.catalog.itmSrvc,
      Itm_StopPur: data.catalog.itmStopPur,
      Itm_PrintBarcode: data.catalog.itmPrintBarcode,
      Itm_Allow_Discount: data.catalog.itmAllowDiscount,
      ItmFreez: data.catalog.itmFreez,
      StopTransfer: data.catalog.stopTransfer,
      BrandId: data.catalog.brandId,
      Itm_Group: data.catalog.itmGroup,
      item_Form: data.catalog.itemForm,
      Itm_Origin: data.catalog.itmOrigin,
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

export async function registerWithAlfaApi(input: {
  email: string;
  password: string;
  userName?: string;
}): Promise<AuthResponse> {
  try {
    const response = await fetch(alfaUrl("Auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        userName: input.userName ?? null,
      }),
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

function normalizeUserListItem(raw: Record<string, unknown>): UserListItem {
  const id = readString(raw, "id", "Id", "userId", "UserId");
  const email = readString(raw, "email", "Email");
  const userName = readString(raw, "userName", "UserName") || email || id;
  const hasDetailFields =
    "phoneNumber" in raw ||
    "PhoneNumber" in raw ||
    "lockoutEnabled" in raw ||
    "LockoutEnabled" in raw ||
    "emailConfirmed" in raw ||
    "EmailConfirmed" in raw;

  return {
    id,
    userName,
    fullName: readString(raw, "fullName", "FullName") || userName,
    email,
    phoneNumber: readString(raw, "phoneNumber", "PhoneNumber"),
    isActive: hasDetailFields
      ? readBoolean(raw, "isActive", "IsActive")
      : true,
    emailConfirmed: hasDetailFields
      ? readBoolean(raw, "emailConfirmed", "EmailConfirmed")
      : false,
    lockoutEnabled: hasDetailFields
      ? readBoolean(raw, "lockoutEnabled", "LockoutEnabled")
      : false,
  };
}

function normalizeUserListPagedResult(
  raw: Record<string, unknown>
): UserListPagedResult {
  const itemsRaw = raw.items ?? raw.Items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((item) =>
        normalizeUserListItem(item as Record<string, unknown>)
      )
    : [];

  return {
    items,
    totalCount: readNumber(raw, "totalCount", "TotalCount"),
    pageNumber:
      readNumber(raw, "pageNumber", "PageNumber", "page", "Page") || 1,
    pageSize: readNumber(raw, "pageSize", "PageSize") || items.length,
  };
}

/** Server-paged AspNetUsers list for the Users admin page. */
export async function getUsersPage(token: string, query: UserListQuery) {
  const fullParams = new URLSearchParams();
  fullParams.set("pageNumber", String(query.pageNumber));
  fullParams.set("pageSize", String(query.pageSize));
  if (query.search?.trim()) fullParams.set("search", query.search.trim());
  if (query.sortBy) fullParams.set("sortBy", query.sortBy);
  if (query.sortDesc) fullParams.set("sortDesc", "true");

  const legacyParams = new URLSearchParams();
  legacyParams.set("pageNumber", String(query.pageNumber));
  legacyParams.set("pageSize", String(query.pageSize));

  const paths = [
    `Permissions/users/list?${fullParams.toString()}`,
    `Users?${fullParams.toString()}`,
    `Permissions/users?${legacyParams.toString()}`,
  ];

  let lastError: unknown;

  for (const path of paths) {
    try {
      const data = await apiFetch<Record<string, unknown>>(path, {}, token);
      let result = normalizeUserListPagedResult(data);

      if (path.startsWith("Permissions/users?") && query.search?.trim()) {
        const term = query.search.trim().toLowerCase();
        const filtered = result.items.filter(
          (user) =>
            user.userName.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term) ||
            user.fullName.toLowerCase().includes(term)
        );
        result = {
          ...result,
          items: filtered,
          totalCount: filtered.length,
        };
      }

      return result;
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && error.status === 404) {
        continue;
      }
      throw error;
    }
  }

  if (lastError instanceof ApiError) {
    throw lastError;
  }

  throw new ApiError(404, "Users list endpoint not found on the API.");
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
  uCode: number,
  data: UpdateUnitRequest,
  token: string
) {
  const code = parseUnitCode(uCode);
  if (code == null) {
    return Promise.reject(new ApiError(400, "Unit code is missing."));
  }

  return apiFetch<void>(
    `Unit/${code}`,
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

export function deleteUnit(uCode: number, token: string) {
  const code = parseUnitCode(uCode);
  if (code == null) {
    return Promise.reject(new ApiError(400, "Unit code is missing."));
  }

  return apiFetch<void>(`Unit/${code}`, { method: "DELETE" }, token);
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
        ItfNameAr: data.itfNameAr,
        ItfNameEn: data.itfNameEn,
        GroupId: data.groupId,
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
      GroupId: data.groupId,
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

function normalizeSalesPayMethodItem(
  item: Record<string, unknown>
): SalesPayMethodItem {
  return {
    id: readNumber(item, "id", "Id"),
    paymentName: readString(item, "paymentName", "PaymentName"),
    affectsCash: readBoolean(item, "affectsCash", "AffectsCash"),
    accountCode: readString(item, "accountCode", "AccountCode"),
    active: readBoolean(item, "active", "Active"),
  };
}

function normalizeSalesPayMethodCompoItem(
  item: Record<string, unknown>
): SalesPayMethodCompoItem {
  return {
    id: readNumber(item, "id", "Id"),
    paymentName: readString(item, "paymentName", "PaymentName"),
    active: readBoolean(item, "active", "Active"),
  };
}

export function getSalesPayMethods(token: string) {
  return fetchAllPaged("SalesPayMethod", token, normalizeSalesPayMethodItem);
}

export function getSalesPayMethodCompo(token: string, activeOnly?: boolean) {
  return fetchAllPaged(
    "SalesPayMethod/for-comp",
    token,
    normalizeSalesPayMethodCompoItem,
    activeOnly === undefined
      ? undefined
      : { activeOnly: activeOnly ? "true" : "false" }
  );
}

export function createSalesPayMethod(
  data: CreateSalesPayMethodRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    "SalesPayMethod",
    {
      method: "POST",
      body: JSON.stringify({
        PaymentName: data.paymentName,
        AffectsCash: data.affectsCash,
        AccountCode: data.accountCode || null,
        Active: data.active,
      }),
    },
    token
  ).then((item) => normalizeSalesPayMethodItem(item));
}

export function updateSalesPayMethod(
  id: number,
  data: UpdateSalesPayMethodRequest,
  token: string
) {
  return apiFetch<void>(
    `SalesPayMethod/${id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        PaymentName: data.paymentName,
        AffectsCash: data.affectsCash,
        AccountCode: data.accountCode || null,
        Active: data.active,
      }),
    },
    token
  );
}

export function deactivateSalesPayMethod(id: number, token: string) {
  return apiFetch<void>(`SalesPayMethod/${id}`, { method: "DELETE" }, token);
}

function normalizeSalesServiceItem(
  item: Record<string, unknown>
): SalesServiceItem {
  return {
    id: readNumber(item, "id", "Id"),
    serviceName: readString(item, "serviceName", "ServiceName"),
    serviceType: readString(item, "serviceType", "ServiceType"),
    cost: readNumber(item, "cost", "Cost"),
    active: readBoolean(item, "active", "Active"),
  };
}

function normalizeSalesServiceCompoItem(
  item: Record<string, unknown>
): SalesServiceCompoItem {
  return {
    id: readNumber(item, "id", "Id"),
    serviceName: readString(item, "serviceName", "ServiceName"),
    serviceType: readString(item, "serviceType", "ServiceType"),
    cost: readNumber(item, "cost", "Cost"),
    active: readBoolean(item, "active", "Active"),
  };
}

export function getSalesServices(token: string) {
  return fetchAllPaged("SalesService", token, normalizeSalesServiceItem);
}

export function getSalesServiceCompo(token: string, activeOnly?: boolean) {
  return fetchAllPaged(
    "SalesService/for-comp",
    token,
    normalizeSalesServiceCompoItem,
    activeOnly === undefined
      ? undefined
      : { activeOnly: activeOnly ? "true" : "false" }
  );
}

export function createSalesService(
  data: CreateSalesServiceRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    "SalesService",
    {
      method: "POST",
      body: JSON.stringify({
        ServiceName: data.serviceName,
        ServiceType: data.serviceType || null,
        Cost: data.cost,
        Active: data.active,
      }),
    },
    token
  ).then((item) => normalizeSalesServiceItem(item));
}

export function updateSalesService(
  id: number,
  data: UpdateSalesServiceRequest,
  token: string
) {
  return apiFetch<void>(
    `SalesService/${id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        ServiceName: data.serviceName,
        ServiceType: data.serviceType || null,
        Cost: data.cost,
        Active: data.active,
      }),
    },
    token
  );
}

export function deactivateSalesService(id: number, token: string) {
  return apiFetch<void>(`SalesService/${id}`, { method: "DELETE" }, token);
}

function normalizeSalesServiceAssignmentItem(
  item: Record<string, unknown>
): SalesServiceAssignmentItem {
  return {
    id: readNumber(item, "id", "Id"),
    pharmId: readNumber(item, "pharmId", "PharmId"),
    pharmName: readString(item, "pharmName", "PharmName"),
    salesServiceId: readNumber(item, "salesServiceId", "SalesServiceId"),
    serviceName: readString(item, "serviceName", "ServiceName"),
    serviceType: readString(item, "serviceType", "ServiceType"),
    cost: readNumber(item, "cost", "Cost"),
    active: readBoolean(item, "active", "Active"),
  };
}

function normalizeSalesServiceAssignmentCurrentPharmacyItem(
  item: Record<string, unknown>
): SalesServiceAssignmentCurrentPharmacyItem {
  return {
    id: readNumber(item, "id", "Id"),
    serviceName: readString(item, "serviceName", "ServiceName"),
    serviceType: readString(item, "serviceType", "ServiceType"),
    cost: readNumber(item, "cost", "Cost"),
  };
}

export function getSalesServiceAssignments(
  token: string,
  filters?: { pharmId?: number }
) {
  return fetchAllPaged(
    "SalesServiceAssignment",
    token,
    normalizeSalesServiceAssignmentItem,
    filters?.pharmId != null && filters.pharmId > 0
      ? { pharmId: String(filters.pharmId) }
      : undefined
  );
}

export function getSalesServicesForCurrentPharmacy(token: string) {
  return apiFetch<unknown>("SalesServiceAssignment/for-current-pharmacy", {}, token).then(
    (data) => {
      const list = Array.isArray(data) ? data : [];
      return list.map((row) =>
        normalizeSalesServiceAssignmentCurrentPharmacyItem(
          row as Record<string, unknown>
        )
      );
    }
  );
}

export function createSalesServiceAssignment(
  data: CreateSalesServiceAssignmentRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    "SalesServiceAssignment",
    {
      method: "POST",
      body: JSON.stringify({
        PharmId: data.pharmId,
        SalesServiceId: data.salesServiceId,
        Active: data.active,
      }),
    },
    token
  ).then((item) => normalizeSalesServiceAssignmentItem(item));
}

export function updateSalesServiceAssignment(
  id: number,
  data: UpdateSalesServiceAssignmentRequest,
  token: string
) {
  return apiFetch<void>(
    `SalesServiceAssignment/${id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        PharmId: data.pharmId,
        SalesServiceId: data.salesServiceId,
        Active: data.active,
      }),
    },
    token
  );
}

export function deactivateSalesServiceAssignment(id: number, token: string) {
  return apiFetch<void>(
    `SalesServiceAssignment/${id}`,
    { method: "DELETE" },
    token
  );
}

function normalizeSalesPaymentAssimentItem(
  item: Record<string, unknown>
): SalesPaymentAssimentItem {
  return {
    id: readNumber(item, "id", "Id"),
    pharmId: readString(item, "pharmId", "PharmId"),
    pharmName: readString(item, "pharmName", "PharmName"),
    spmId: readNumber(item, "spm_Id", "SPM_Id", "spmId", "sPM_Id"),
    paymentName: readString(item, "paymentName", "PaymentName"),
  };
}

export function getSalesPaymentAssimments(
  token: string,
  options?: { pharmId?: string }
) {
  return fetchAllPaged(
    "SalesPaymentAssiment",
    token,
    normalizeSalesPaymentAssimentItem,
    options?.pharmId ? { pharmId: options.pharmId } : undefined
  );
}

export function createSalesPaymentAssiment(
  data: CreateSalesPaymentAssimentRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    "SalesPaymentAssiment",
    {
      method: "POST",
      body: JSON.stringify({
        PharmId: data.pharmId,
        SPM_Id: data.spmId,
      }),
    },
    token
  ).then((item) => normalizeSalesPaymentAssimentItem(item));
}

export function updateSalesPaymentAssiment(
  id: number,
  data: UpdateSalesPaymentAssimentRequest,
  token: string
) {
  return apiFetch<void>(
    `SalesPaymentAssiment/${id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        PharmId: data.pharmId,
        SPM_Id: data.spmId,
      }),
    },
    token
  );
}

export function deleteSalesPaymentAssiment(id: number, token: string) {
  return apiFetch<void>(
    `SalesPaymentAssiment/${id}`,
    { method: "DELETE" },
    token
  );
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

function normalizeSalesmovmentDetail(
  item: Record<string, unknown>
): SalesmovmentDetail {
  return {
    id: readNumber(item, "id", "Id"),
    movId: readNullableNumber(item, "movId", "MovId"),
    movName: readNullableString(item, "movName", "MovName"),
    movParint: readNullableNumber(item, "movParint", "MovParint"),
    pharmId: readNullableNumber(item, "pharmId", "PharmId"),
    store1: readNullableNumber(item, "store1", "Store1"),
    store2: readNullableNumber(item, "store2", "Store2"),
    cashDebit: readNullableString(item, "cashDebit", "CashDebit"),
    creditCardDebit: readNullableString(item, "creditCardDebit", "CreditCardDebit"),
    creditCardMachinNo: readNullableString(
      item,
      "creditCardMachinNo",
      "CreditCardMachinNo"
    ),
    discountEmployeesDebit: readNullableString(
      item,
      "discountEmployeesDebit",
      "DiscountEmployeesDebit"
    ),
    discountMedicalDebit: readNullableString(
      item,
      "discountMedicalDebit",
      "DiscountMedicalDebit"
    ),
    medicinesSalesCredit: readNullableString(
      item,
      "medicinesSalesCredit",
      "MedicinesSalesCredit"
    ),
    accesSalesCredit: readNullableString(item, "accesSalesCredit", "AccesSalesCredit"),
    salesTaxCredit: readNullableString(item, "salesTaxCredit", "SalesTaxCredit"),
    salesCostDebit: readNullableString(item, "salesCostDebit", "SalesCostDebit"),
    accessCostDebit: readNullableString(item, "accessCostDebit", "AccessCostDebit"),
    pharmStorCredit: readNullableString(item, "pharmStorCredit", "PharmStorCredit"),
    extraordinaryPurchasesDebit: readNullableString(
      item,
      "extraordinaryPurchasesDebit",
      "ExtraordinaryPurchasesDebit"
    ),
    extraordinaryPurchasesCredit: readNullableString(
      item,
      "extraordinaryPurchasesCredit",
      "ExtraordinaryPurchasesCredit"
    ),
    expensesDebit: readNullableString(item, "expensesDebit", "ExpensesDebit"),
    expensesCredit: readNullableString(item, "expensesCredit", "ExpensesCredit"),
    transferDebit: readNullableString(item, "transferDebit", "TransferDebit"),
    transferCredit: readNullableString(item, "transferCredit", "TransferCredit"),
    postMedicalDebit: readNullableString(item, "postMedicalDebit", "PostMedicalDebit"),
    postEmployeesDebit: readNullableString(
      item,
      "postEmployeesDebit",
      "PostEmployeesDebit"
    ),
    excessDeficitdept: readNullableString(
      item,
      "excessDeficitdept",
      "ExcessDeficitdept"
    ),
    excessDeficitcredit: readNullableString(
      item,
      "excessDeficitcredit",
      "ExcessDeficitcredit"
    ),
    cashdiscount: readNullableString(item, "cashdiscount", "Cashdiscount"),
    otheraRevinue: readNullableString(item, "otheraRevinue", "OtheraRevinue"),
  };
}

function buildSalesmovmentPayload(data: SalesmovmentUpsertRequest) {
  return {
    MovId: data.movId,
    MovName: data.movName,
    MovParint: data.movParint,
    PharmId: data.pharmId,
    Store1: data.store1,
    Store2: data.store2,
    CashDebit: data.cashDebit,
    CreditCardDebit: data.creditCardDebit,
    CreditCardMachinNo: data.creditCardMachinNo,
    DiscountEmployeesDebit: data.discountEmployeesDebit,
    DiscountMedicalDebit: data.discountMedicalDebit,
    MedicinesSalesCredit: data.medicinesSalesCredit,
    AccesSalesCredit: data.accesSalesCredit,
    SalesTaxCredit: data.salesTaxCredit,
    SalesCostDebit: data.salesCostDebit,
    AccessCostDebit: data.accessCostDebit,
    PharmStorCredit: data.pharmStorCredit,
    ExtraordinaryPurchasesDebit: data.extraordinaryPurchasesDebit,
    ExtraordinaryPurchasesCredit: data.extraordinaryPurchasesCredit,
    ExpensesDebit: data.expensesDebit,
    ExpensesCredit: data.expensesCredit,
    TransferDebit: data.transferDebit,
    TransferCredit: data.transferCredit,
    PostMedicalDebit: data.postMedicalDebit,
    PostEmployeesDebit: data.postEmployeesDebit,
    ExcessDeficitdept: data.excessDeficitdept,
    ExcessDeficitcredit: data.excessDeficitcredit,
    Cashdiscount: data.cashdiscount,
    OtheraRevinue: data.otheraRevinue,
  };
}

export function getSalesmovmentByParent(
  movParint: SalesMovementParent,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    `Salesmovment/by-parent/${movParint}`,
    {},
    token
  ).then((item) => normalizeSalesmovmentDetail(item));
}

export function upsertSalesmovment(
  data: SalesmovmentUpsertRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    "Salesmovment",
    {
      method: "PUT",
      body: JSON.stringify(buildSalesmovmentPayload(data)),
    },
    token
  ).then((item) => normalizeSalesmovmentDetail(item));
}

export type MovValueNextResult = {
  success: boolean;
  value: number;
  message?: string | null;
};

/** Preview the next PthId for a movement (MaxValue + 1). Does not update MovValue. */
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

export function getBrands(token: string) {
  return fetchAllPaged("Brand", token, normalizeBrandItem);
}

export function createBrand(data: CreateBrandRequest, token: string) {
  return apiFetch<Record<string, unknown>>(
    "Brand",
    {
      method: "POST",
      body: JSON.stringify({
        BrandName_ar: data.brandNameAr,
        BrandName_En: data.brandNameEn,
      }),
    },
    token
  ).then((item) => normalizeBrandItem(item));
}

export function updateBrand(id: number, data: UpdateBrandRequest, token: string) {
  return apiFetch<void>(`Brand/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      BrandName_ar: data.brandNameAr,
      BrandName_En: data.brandNameEn,
    }),
  }, token);
}

export function deleteBrand(id: number, token: string) {
  return apiFetch<void>(`Brand/${id}`, { method: "DELETE" }, token);
}

function normalizeEmployInfoItem(item: Record<string, unknown>): EmployInfoItem {
  return {
    id: readNumber(item, "id", "Id"),
    name:
      readString(item, "name", "Name") ||
      readString(item, "empployName", "EmpployName") ||
      null,
    code:
      readString(item, "code", "Code") ||
      readString(item, "employCode", "EmployCode") ||
      null,
    pharm: readNumber(item, "pharm", "Pharm"),
    costCenterName:
      readString(item, "costCenterName", "CostCenterName") || null,
    employType: readNumber(item, "employType", "EmployType"),
    employTypeName:
      readString(item, "employTypeName", "EmployTypeName") || null,
    active: readBoolean(item, "active", "Active"),
    password:
      readString(item, "password", "Password") ||
      readString(item, "passwordPlain", "PasswordPlain") ||
      null,
  };
}

function employInfoRequestBody(
  data: CreateEmployInfoRequest | UpdateEmployInfoRequest
) {
  const body: Record<string, unknown> = {
    Name: data.name,
    Code: data.code,
    Pharm: data.pharm,
    EmployType: data.employType,
    Active: data.active,
  };

  if ("previewPassword" in data) {
    body.PreviewPassword = data.previewPassword ?? null;
  }

  return body;
}

function normalizeEmployInfoCreateResult(
  data: Record<string, unknown>
): EmployInfoCreateResult {
  const employeeRaw =
    (data.employee as Record<string, unknown> | undefined)
    ?? (data.Employee as Record<string, unknown> | undefined)
    ?? data;

  return {
    employee: normalizeEmployInfoItem(employeeRaw),
    generatedPassword:
      readString(data, "generatedPassword", "GeneratedPassword") || "",
  };
}

export function generateEmployInfoPassword(token: string) {
  return apiFetch<Record<string, unknown>>(
    "EmployInfo/generate-password",
    {},
    token
  ).then((data) => readString(data, "password", "Password"));
}

export function getEmployInfos(token: string) {
  return fetchAllPaged("EmployInfo", token, normalizeEmployInfoItem);
}

export function getEmployInfoById(id: number, token: string) {
  return apiFetch<Record<string, unknown>>(`EmployInfo/${id}`, {}, token).then(
    (item) => normalizeEmployInfoItem(item)
  );
}

export function createEmployInfo(data: CreateEmployInfoRequest, token: string) {
  return apiFetch<Record<string, unknown>>(
    "EmployInfo",
    {
      method: "POST",
      body: JSON.stringify(employInfoRequestBody(data)),
    },
    token
  ).then((item) => normalizeEmployInfoCreateResult(item));
}

export function updateEmployInfo(
  id: number,
  data: UpdateEmployInfoRequest,
  token: string
) {
  return apiFetch<void>(`EmployInfo/${id}`, {
    method: "PUT",
    body: JSON.stringify(employInfoRequestBody(data)),
  }, token);
}

export function deleteEmployInfo(id: number, token: string) {
  return apiFetch<void>(`EmployInfo/${id}`, { method: "DELETE" }, token);
}

function normalizeVendorCodeItem(item: Record<string, unknown>): VendorCodeItem {
  return {
    id: readNumber(item, "id", "Id"),
    itmId: readNumber(item, "itmId", "ItmId"),
    vendorId: readNumber(item, "vendorId", "VendorId"),
    itemCode: readString(item, "item_code", "itemCode", "Item_code") || null,
    vendorCode: readString(item, "vendorCode", "VendorCode") || null,
  };
}

export function getVendorCodesByItemId(itmId: number, token: string) {
  return apiFetch<unknown[]>(`VendorCode/item/${itmId}`, {}, token).then(
    (items) =>
      Array.isArray(items)
        ? items.map((item) =>
            normalizeVendorCodeItem(item as Record<string, unknown>)
          )
        : []
  );
}

export function createVendorCode(data: VendorCodeWriteRequest, token: string) {
  return apiFetch<Record<string, unknown>>(
    "VendorCode",
    {
      method: "POST",
      body: JSON.stringify({
        ItmId: data.itmId,
        VendorId: data.vendorId,
        item_code: data.itemCode ?? null,
        VendorCode: data.vendorCode,
      }),
    },
    token
  ).then((item) => normalizeVendorCodeItem(item));
}

export function updateVendorCode(
  id: number,
  data: VendorCodeWriteRequest,
  token: string
) {
  return apiFetch<void>(`VendorCode/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      ItmId: data.itmId,
      VendorId: data.vendorId,
      item_code: data.itemCode ?? null,
      VendorCode: data.vendorCode,
    }),
  }, token);
}

export function deleteVendorCode(id: number, token: string) {
  return apiFetch<void>(`VendorCode/${id}`, { method: "DELETE" }, token);
}

function normalizeInternationalBarcodeItem(
  item: Record<string, unknown>
): InternationalBarcodeItem {
  return {
    id: readNumber(item, "id", "Id"),
    itmId: readNumber(item, "itmId", "ItmId"),
    itemCode: readString(item, "item_code", "itemCode", "Item_code") || null,
    interBarcode:
      readString(item, "interBracode", "interBarcode", "InterBracode") || null,
  };
}

export function getInternationalBarcodesByItemId(itmId: number, token: string) {
  return apiFetch<unknown[]>(`InternationalBarcod/item/${itmId}`, {}, token).then(
    (items) =>
      Array.isArray(items)
        ? items.map((item) =>
            normalizeInternationalBarcodeItem(item as Record<string, unknown>)
          )
        : []
  );
}

export function createInternationalBarcode(
  data: InternationalBarcodeWriteRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    "InternationalBarcod",
    {
      method: "POST",
      body: JSON.stringify({
        ItmId: data.itmId,
        Item_code: data.itemCode ?? null,
        interBracode: data.interBarcode,
      }),
    },
    token
  ).then((item) => normalizeInternationalBarcodeItem(item));
}

export function updateInternationalBarcode(
  id: number,
  data: InternationalBarcodeWriteRequest,
  token: string
) {
  return apiFetch<void>(`InternationalBarcod/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      ItmId: data.itmId,
      Item_code: data.itemCode ?? null,
      interBracode: data.interBarcode,
    }),
  }, token);
}

export function deleteInternationalBarcode(id: number, token: string) {
  return apiFetch<void>(`InternationalBarcod/${id}`, { method: "DELETE" }, token);
}

function normalizeBrandItem(item: Record<string, unknown>): BrandItem {
  return {
    id: readNumber(item, "id", "Id"),
    brandNameAr: readString(item, "brandNameAr", "BrandName_ar") || null,
    brandNameEn: readString(item, "brandNameEn", "BrandName_En") || null,
  };
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

function normalizePharmItem(item: Record<string, unknown>): PharmItem {
  return {
    parmId: readNumber(item, "parmId", "ParmId"),
    parmArName: readString(item, "parmArName", "ParmArName"),
    parmEnName: readString(item, "parmEnName", "ParmEnName"),
    parmTel: readString(item, "parmTel", "ParmTel"),
    parmAdress: readString(item, "parmAdress", "ParmAdress"),
    parmStor: readString(item, "parmStor", "ParmStor"),
    parmBussReg: readString(item, "parmBussReg", "ParmBussReg"),
    parmTaxNo: readString(item, "parmTaxNo", "ParmTaxNo"),
    parmOwnerName: readString(item, "parmOwnerName", "ParmOwnerName"),
    parmOwnerAdress: readString(item, "parmOwnerAdress", "ParmOwnerAdress"),
    parmOwnerMob: readString(item, "parmOwnerMob", "ParmOwnerMob"),
    parmOwnerTel: readString(item, "parmOwnerTel", "ParmOwnerTel"),
    parmOwnerEMail: readString(item, "parmOwnerEMail", "ParmOwnerEMail"),
    parmMangerName: readString(item, "parmMangerName", "ParmMangerName"),
    parmMangerAdress: readString(item, "parmMangerAdress", "ParmMangerAdress"),
    parmMangerTel: readString(item, "parmMangerTel", "ParmMangerTel"),
    parmMangerMob: readString(item, "parmMangerMob", "ParmMangerMob"),
    parmOrder: readNumber(item, "parmOrder", "ParmOrder"),
    costCenter: readString(item, "costCenter", "CostCenter"),
    costCenterName: readString(item, "costCenterName", "CostCenterName"),
    storName: readString(item, "storName", "StorName"),
  };
}

function pharmFormToApiBody(values: PharmFormValues) {
  const order = Number.parseInt(values.parmOrder, 10);
  return {
    ParmArName: values.parmArName.trim() || null,
    ParmEnName: values.parmEnName.trim() || null,
    ParmTel: values.parmTel.trim() || null,
    ParmAdress: values.parmAdress.trim() || null,
    ParmStor: values.parmStor.trim() || null,
    ParmBussReg: values.parmBussReg.trim() || null,
    ParmTaxNo: values.parmTaxNo.trim() || null,
    ParmOwnerName: values.parmOwnerName.trim() || null,
    ParmOwnerAdress: values.parmOwnerAdress.trim() || null,
    ParmOwnerMob: values.parmOwnerMob.trim() || null,
    ParmOwnerTel: values.parmOwnerTel.trim() || null,
    ParmOwnerEMail: values.parmOwnerEMail.trim() || null,
    ParmMangerName: values.parmMangerName.trim() || null,
    ParmMangerAdress: values.parmMangerAdress.trim() || null,
    ParmMangerTel: values.parmMangerTel.trim() || null,
    ParmMangerMob: values.parmMangerMob.trim() || null,
    ParmOrder: Number.isFinite(order) ? order : 0,
    CostCenter: values.costCenter.trim() || null,
  };
}

export function getPharms(token: string) {
  return fetchAllPaged("Parm", token, normalizePharmItem, { sortBy: "order" });
}

export function createPharm(data: PharmFormValues, token: string) {
  return apiFetch<Record<string, unknown>>(
    "Parm",
    {
      method: "POST",
      body: JSON.stringify(pharmFormToApiBody(data)),
    },
    token
  ).then((item) => normalizePharmItem(item));
}

export function updatePharm(
  parmId: number,
  data: PharmFormValues,
  token: string
) {
  return apiFetch<void>(
    `Parm/${parmId}`,
    {
      method: "PUT",
      body: JSON.stringify(pharmFormToApiBody(data)),
    },
    token
  );
}

export function deletePharm(parmId: number, token: string) {
  return apiFetch<void>(`Parm/${parmId}`, { method: "DELETE" }, token);
}

function normalizeStockBatchItem(item: Record<string, unknown>): StockBatchItem {
  const qty = readNumber(item, "qty", "Qty");
  const transferQty = readNumber(item, "transferQty", "TransferQty");
  // Prefer API AvailableQty (SQL computed). Fallback only when the field is absent
  // from older payloads so consumers still see a coherent triad.
  const availableRaw = readNullableNumber(item, "availableQty", "AvailableQty");
  const availableQty =
    availableRaw != null && Number.isFinite(availableRaw)
      ? availableRaw
      : qty - transferQty;

  return {
    id: readNumber(item, "id", "Id"),
    batchNo: readString(item, "batchNo", "BatchNo"),
    itemCode: readString(item, "itemCode", "ItemCode"),
    itemNameAr: readNullableString(item, "itemNameAr", "ItemNameAr"),
    itemNameEn: readNullableString(item, "itemNameEn", "ItemNameEn"),
    storeId: readNumber(item, "storeId", "StoreId"),
    storeName: readNullableString(item, "storeName", "StoreName"),
    expDate: readNullableString(item, "expDate", "ExpDate"),
    qty,
    transferQty,
    availableQty,
    qtyUnit3: readNullableNumber(item, "qtyUnit3", "QtyUnit3"),
    purshPrice: readNumber(item, "purshPrice", "PurshPrice"),
    salesPrice: readNumber(item, "salesPrice", "SalesPrice"),
    costPrice: readNumber(item, "costPrice", "CostPrice"),
    allowPrintBarcode: readBoolean(
      item,
      "allowPrintBarcode",
      "AllowPrintBarcode"
    ),
    itemCatalogId: readNumber(item, "itemCatalogId", "ItemCatalogId"),
  };
}

function normalizeStockBalanceItem(item: Record<string, unknown>): StockBalanceItem {
  return {
    itemCode: readString(item, "itemCode", "ItemCode"),
    itemNameAr: readNullableString(item, "itemNameAr", "ItemNameAr"),
    itemNameEn: readNullableString(item, "itemNameEn", "ItemNameEn"),
    storeId: readNullableNumber(item, "storeId", "StoreId"),
    totalQty: readNumber(item, "totalQty", "TotalQty"),
    batchCount: readNumber(item, "batchCount", "BatchCount"),
  };
}

function normalizeReturnItemStockSearchItem(
  item: Record<string, unknown>
): ReturnItemStockSearchItem {
  return {
    itemCatalogId: readNumber(item, "itemCatalogId", "ItemCatalogId"),
    itemCode: readString(item, "itemCode", "ItemCode"),
    itemNameAr: readNullableString(item, "itemNameAr", "ItemNameAr"),
    itemNameEn: readNullableString(item, "itemNameEn", "ItemNameEn"),
    itemName: readString(item, "itemName", "ItemName"),
    storeId: readNumber(item, "storeId", "StoreId"),
    totalQuantity: readNumber(item, "totalQuantity", "TotalQuantity"),
    transferQty: readNumber(item, "transferQty", "TransferQty"),
    availableQty: readNumber(item, "availableQty", "AvailableQty"),
    salesPrice: readNumber(item, "salesPrice", "SalesPrice"),
    costPrice: readNumber(item, "costPrice", "CostPrice"),
    stockId: readNullableNumber(item, "stockId", "StockId"),
    expDate: readNullableString(item, "expDate", "ExpDate"),
    batchNo: readString(item, "batchNo", "BatchNo"),
  };
}

function normalizeStockPagedResult(data: unknown): StockPagedResult {
  if (Array.isArray(data)) {
    return {
      items: data.map((item) => normalizeStockBatchItem(item as Record<string, unknown>)),
      totalCount: data.length,
      pageNumber: 1,
      pageSize: data.length,
    };
  }

  const raw = (data ?? {}) as Record<string, unknown>;
  const items = parseArrayOrPaged(data, normalizeStockBatchItem);

  return {
    items,
    totalCount: readNumber(raw, "totalCount", "TotalCount") || items.length,
    pageNumber: readNumber(raw, "pageNumber", "PageNumber") || 1,
    pageSize: readNumber(raw, "pageSize", "PageSize") || items.length,
  };
}

export function searchStockBatches(token: string, filters: StockSearchFilters = {}) {
  const params = new URLSearchParams();
  if (filters.itemCode?.trim()) params.set("itemCode", filters.itemCode.trim());
  if (filters.itemName?.trim()) params.set("itemName", filters.itemName.trim());
  if (filters.storeId?.trim()) params.set("storeId", filters.storeId.trim());
  if (filters.batchNo?.trim()) params.set("batchNo", filters.batchNo.trim());
  if (filters.expFrom?.trim()) params.set("expFrom", filters.expFrom.trim());
  if (filters.expTo?.trim()) params.set("expTo", filters.expTo.trim());
  params.set("pageNumber", String(filters.pageNumber ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 100));

  const query = params.toString();
  return apiFetch<unknown>(`Stock${query ? `?${query}` : ""}`, {}, token).then(
    normalizeStockPagedResult
  );
}

function normalizeBatchTraceabilityTimelineEntry(
  raw: unknown
): BatchTraceabilityTimelineEntry {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    transactionType: readString(obj, "transactionType", "TransactionType"),
    detailId: readNumber(obj, "detailId", "DetailId"),
    lineNo: readNumber(obj, "lineNo", "LineNo"),
    headerId: readNumber(obj, "headerId", "HeaderId"),
    documentDisplayNo: readNullableString(
      obj,
      "documentDisplayNo",
      "DocumentDisplayNo"
    ),
    eventDate: readNullableString(obj, "eventDate", "EventDate"),
    userId: readNullableString(obj, "userId", "UserId"),
    userName: readNullableString(obj, "userName", "UserName"),
    storeId: readNullableString(obj, "storeId", "StoreId"),
    storeCode: readNullableString(obj, "storeCode", "StoreCode"),
    storeName: readNullableString(obj, "storeName", "StoreName"),
    quantityDelta: readNumber(obj, "quantityDelta", "QuantityDelta"),
    quantityAfter:
      obj.quantityAfter != null || obj.QuantityAfter != null
        ? readNumber(obj, "quantityAfter", "QuantityAfter")
        : null,
    documentLabel: readNullableString(obj, "documentLabel", "DocumentLabel"),
    deepLinkRoute: readNullableString(obj, "deepLinkRoute", "DeepLinkRoute"),
  };
}

function normalizeBatchTraceabilityResult(raw: unknown): BatchTraceabilityResult {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const batch = (obj.batch ?? obj.Batch ?? {}) as Record<string, unknown>;
  const creator = (obj.creator ?? obj.Creator ?? {}) as Record<string, unknown>;
  const currentStock = (obj.currentStock ??
    obj.CurrentStock ??
    {}) as Record<string, unknown>;
  const locationsRaw = currentStock.locations ?? currentStock.Locations ?? [];

  const sourceRaw = readString(creator, "source", "Source");
  const source: BatchTraceabilityCreatorSource =
    sourceRaw === "Purchase" || sourceRaw === "Audit" || sourceRaw === "Unknown"
      ? sourceRaw
      : "Unknown";

  return {
    batch: {
      batchNo: readString(batch, "batchNo", "BatchNo"),
      stockId: readNumber(batch, "stockId", "StockId"),
      itemId: readNumber(batch, "itemId", "ItemId"),
      itemCode: readNullableString(batch, "itemCode", "ItemCode"),
      itemNameAr: readNullableString(batch, "itemNameAr", "ItemNameAr"),
      itemNameEn: readNullableString(batch, "itemNameEn", "ItemNameEn"),
      storeId: readNumber(batch, "storeId", "StoreId"),
      storeName: readNullableString(batch, "storeName", "StoreName"),
      expDate: readNullableString(batch, "expDate", "ExpDate"),
      purchasePrice: readNumber(batch, "purchasePrice", "PurchasePrice"),
      salesPrice: readNumber(batch, "salesPrice", "SalesPrice"),
      costPrice: readNumber(batch, "costPrice", "CostPrice"),
      currentQty: readNumber(batch, "currentQty", "CurrentQty"),
    },
    creator: {
      userId: readNullableString(creator, "userId", "UserId"),
      userName: readNullableString(creator, "userName", "UserName"),
      createdAt: readNullableString(creator, "createdAt", "CreatedAt"),
      source,
    },
    currentStock: {
      locations: Array.isArray(locationsRaw)
        ? locationsRaw.map((row) => {
            const loc = (row ?? {}) as Record<string, unknown>;
            return {
              storeId: readNumber(loc, "storeId", "StoreId"),
              storeName: readNullableString(loc, "storeName", "StoreName"),
              qty: readNumber(loc, "qty", "Qty"),
            };
          })
        : [],
      totalCurrentQty: readNumber(
        currentStock,
        "totalCurrentQty",
        "TotalCurrentQty"
      ),
    },
    timeline: Array.isArray(obj.timeline ?? obj.Timeline)
      ? ((obj.timeline ?? obj.Timeline) as unknown[]).map(
          (entry) =>
            normalizeBatchTraceabilityTimelineEntry(
              (entry ?? {}) as Record<string, unknown>
            )
        )
      : [],
  };
}

export function getBatchTraceability(token: string, batchNo: string) {
  const encoded = encodeURIComponent(batchNo.trim());
  return apiFetch<unknown>(`BatchTraceability/${encoded}`, {}, token).then(
    normalizeBatchTraceabilityResult
  );
}

/** Inventory adjustment — returns batches or auto-creates a zero-qty batch on the server. */
export function searchStockBatchesForInventoryAdjustment(
  token: string,
  filters: { itemCode: string; storeId: string; pageSize?: number }
) {
  const params = new URLSearchParams();
  params.set("itemCode", filters.itemCode.trim());
  params.set("storeId", filters.storeId.trim());
  params.set("pageNumber", "1");
  params.set("pageSize", String(filters.pageSize ?? 100));

  return apiFetch<unknown>(
    `Stock/inventory-adjustment-batches?${params.toString()}`,
    {},
    token
  ).then(normalizeStockPagedResult);
}

export function listBatchManagement(
  token: string,
  filters: {
    itemCatalogId?: number;
    itemCode?: string;
    storeId?: number;
    batchNo?: string;
  } = {}
) {
  const params = new URLSearchParams();
  if (filters.itemCatalogId && filters.itemCatalogId > 0) {
    params.set("itemCatalogId", String(filters.itemCatalogId));
  }
  if (filters.storeId && filters.storeId > 0) {
    params.set("storeId", String(filters.storeId));
  }
  if (filters.batchNo?.trim()) {
    params.set("batchNo", filters.batchNo.trim());
  }

  const query = params.toString();
  return apiFetch<unknown>(
    `Stock/batch-management${query ? `?${query}` : ""}`,
    {},
    token
  )
    .then((data) => {
      const raw = (data ?? {}) as Record<string, unknown>;
      const itemsRaw = raw.items ?? raw.Items;
      if (Array.isArray(itemsRaw)) {
        return itemsRaw.map((item) =>
          normalizeBatchManagementRow(item as Record<string, unknown>)
        );
      }
      if (Array.isArray(data)) {
        return data.map((item) =>
          normalizeBatchManagementRow(item as Record<string, unknown>)
        );
      }
      return [];
    })
    .catch(async () => {
      const page = await searchStockBatches(token, {
        itemCode: filters.itemCode,
        storeId:
          filters.storeId && filters.storeId > 0
            ? String(filters.storeId)
            : undefined,
        pageNumber: 1,
        pageSize: 500,
      });
      return page.items.map((item) => ({
        id: item.id,
        itemCatalogId:
          item.itemCatalogId && item.itemCatalogId > 0
            ? item.itemCatalogId
            : filters.itemCatalogId ?? 0,
        itemCode: item.itemCode,
        itemNameAr: item.itemNameAr ?? "",
        itemNameEn: item.itemNameEn ?? "",
        batchNo: item.batchNo,
        storeId: item.storeId,
        storeName: item.storeName ?? "",
        storeNameAr: item.storeName ?? "",
        storeNameEn: item.storeName ?? "",
        expDate: item.expDate,
        salesPrice: item.salesPrice,
        costPrice: item.costPrice,
        qty: item.qty,
      }));
    });
}

export function saveBatchManagement(
  token: string,
  rows: Array<{
    id: number | null;
    rowIndex?: number;
    itemCatalogId: number;
    itemId?: number;
    storeId: number;
    expDate: string;
    salesPrice: number;
    costPrice: number;
  }>
) {
  return apiFetch<{ success?: boolean; Success?: boolean; message?: string; Message?: string }>(
    "Stock/batch-management/save",
    {
      method: "POST",
      body: JSON.stringify({
        rows: rows.map((row) => ({
          id: row.id,
          rowIndex: row.rowIndex,
          itemCatalogId: row.itemCatalogId,
          itemId: row.itemId ?? row.itemCatalogId,
          storeId: row.storeId,
          expDate: row.expDate,
          salesPrice: row.salesPrice,
          costPrice: row.costPrice,
        })),
      }),
    },
    token
  );
}

function readExpDateValue(item: Record<string, unknown>): string | null {
  const direct = readNullableString(item, "expDate", "ExpDate");
  if (direct) {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(direct);
    return match ? match[1] : direct;
  }

  const raw = item.expDate ?? item.ExpDate;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const year = Number(obj.year ?? obj.Year);
    const month = Number(obj.month ?? obj.Month);
    const day = Number(obj.day ?? obj.Day ?? 1);
    if (year > 0 && month > 0) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  return null;
}

function normalizeBatchManagementRow(item: Record<string, unknown>) {
  return {
    id: readNullableNumber(item, "id", "Id"),
    itemCatalogId: readNumber(
      item,
      "itemCatalogId",
      "ItemCatalogId",
      "itemId",
      "ItemId"
    ),
    itemCode: readString(item, "itemCode", "ItemCode"),
    itemNameAr: readString(item, "itemNameAr", "ItemNameAr"),
    itemNameEn: readString(item, "itemNameEn", "ItemNameEn"),
    batchNo: readString(item, "batchNo", "BatchNo"),
    storeId: readNumber(item, "storeId", "StoreId"),
    storeName: readString(item, "storeName", "StoreName"),
    storeNameAr: readString(item, "storeNameAr", "StoreNameAr"),
    storeNameEn: readString(item, "storeNameEn", "StoreNameEn"),
    expDate: readExpDateValue(item),
    salesPrice: readNumber(item, "salesPrice", "SalesPrice"),
    costPrice: readNumber(item, "costPrice", "CostPrice"),
    qty: readNumber(item, "qty", "Qty"),
  };
}

export function getStockBalanceByItem(
  itemCode: string,
  token: string,
  storeId?: string
) {
  const params = new URLSearchParams();
  if (storeId?.trim()) params.set("storeId", storeId.trim());
  const query = params.toString();

  return apiFetch<unknown>(
    `Stock/balance/${encodeURIComponent(itemCode)}${query ? `?${query}` : ""}`,
    {},
    token
  ).then((data) => {
    if (Array.isArray(data)) {
      return data.map((item) => normalizeStockBalanceItem(item as Record<string, unknown>));
    }
    return parseArrayOrPaged(data, normalizeStockBalanceItem);
  });
}

export function searchReturnItemsWithStock(
  token: string,
  search: string,
  storeId: string,
  options?: {
    take?: number;
    language?: "en" | "ar";
    signal?: AbortSignal;
  }
) {
  const params = new URLSearchParams();
  const q = search.trim();
  if (q) params.set("search", q);
  params.set("storeId", storeId.trim());
  if (options?.take != null && options.take > 0) {
    params.set("take", String(options.take));
  }
  if (options?.language === "en" || options?.language === "ar") {
    params.set("language", options.language);
  }

  return apiFetch<unknown>(
    `Stock/return-item-search?${params.toString()}`,
    { signal: options?.signal },
    token
  ).then((data) => {
    if (Array.isArray(data)) {
      return data.map((item) =>
        normalizeReturnItemStockSearchItem(item as Record<string, unknown>)
      );
    }
    return parseArrayOrPaged(data, normalizeReturnItemStockSearchItem);
  });
}

function normalizeStockBarcodeLabel(item: Record<string, unknown>): StockBarcodeLabel {
  const batchNo = readString(item, "batchNo", "BatchNo");
  const barcodeValue =
    readString(item, "barcodeValue", "BarcodeValue") || batchNo.trim();
  return {
    stockId: readNumber(item, "stockId", "StockId"),
    batchNo,
    barcodeValue,
    itemCode: readString(item, "itemCode", "ItemCode"),
    itemNameAr: readNullableString(item, "itemNameAr", "ItemNameAr"),
    itemNameEn: readNullableString(item, "itemNameEn", "ItemNameEn"),
    storeId: readNumber(item, "storeId", "StoreId"),
    expDate: readNullableString(item, "expDate", "ExpDate"),
    qty: readNumber(item, "qty", "Qty"),
    salesPrice: readNumber(item, "salesPrice", "SalesPrice"),
    allowPrintBarcode: readBoolean(
      item,
      "allowPrintBarcode",
      "AllowPrintBarcode"
    ),
  };
}

function normalizeStockBarcodeLookupResult(data: Record<string, unknown>): StockBarcodeLookupResult {
  const batchRaw = (data.batch ?? data.Batch) as Record<string, unknown>;
  return {
    normalizedBatchNo: readString(data, "normalizedBatchNo", "NormalizedBatchNo"),
    batch: normalizeStockBatchItem(batchRaw),
  };
}

export function getStockBatchByBatchNo(token: string, batchNo: string) {
  return apiFetch<unknown>(
    `Stock/batch/${encodeURIComponent(batchNo.trim())}`,
    {},
    token
  ).then((data) => normalizeStockBatchItem((data ?? {}) as Record<string, unknown>));
}

export function getStockBarcodeLabelById(token: string, stockId: number) {
  return apiFetch<unknown>(`Stock/${stockId}/barcode-label`, {}, token).then((data) =>
    normalizeStockBarcodeLabel((data ?? {}) as Record<string, unknown>)
  );
}

export function getPurchaseStockBarcodeLabels(token: string, purchaseId: number) {
  return apiFetch<unknown>(`PurTransH/${purchaseId}/stock-batches`, {}, token).then((data) => {
    if (!Array.isArray(data)) return [];
    return data.map((item) =>
      normalizeStockBarcodeLabel(item as Record<string, unknown>)
    );
  });
}

function normalizePostedPurchaseInvoiceReversalItem(
  raw: Record<string, unknown>
): PostedPurchaseInvoiceReversalItem {
  return {
    id: readNumber(raw, "id", "Id"),
    pthId: readNumber(raw, "pthId", "PthId"),
    vendorName: readString(raw, "vendorName", "VendorName"),
    venId: readString(raw, "venId", "VenId"),
    venBillNo: readString(raw, "venBillNo", "VenBillNo"),
    venBillDate: readNullableString(raw, "venBillDate", "VenBillDate"),
    insertTime: readNullableString(raw, "insertTime", "InsertTime"),
    userName: readString(raw, "userName", "UserName"),
    totalBill: readNullableNumber(raw, "totalBill", "TotalBill"),
    pthNetBill: readNullableNumber(raw, "pthNetBill", "PthNetBill"),
    quantity: readNullableNumber(raw, "quantity", "Quantity"),
  };
}

function normalizePostedPurchaseInvoiceReversalPage(
  raw: Record<string, unknown>
): PostedPurchaseInvoiceReversalPage {
  const itemsRaw = raw.items ?? raw.Items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((item) =>
        normalizePostedPurchaseInvoiceReversalItem(item as Record<string, unknown>)
      )
    : [];

  const pageNumber =
    readNumber(raw, "pageNumber", "PageNumber", "page", "Page") || 1;
  const pageSize = readNumber(raw, "pageSize", "PageSize") || items.length;
  const totalCount = readNumber(raw, "totalCount", "TotalCount");
  const totalPages =
    readNumber(raw, "totalPages", "TotalPages") ||
    (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0);

  return {
    items,
    totalCount,
    pageNumber,
    pageSize,
    totalPages,
  };
}

export async function getPostedPurchaseInvoicesForReversal(
  token: string,
  query: PostedPurchaseInvoiceReversalQuery
): Promise<PostedPurchaseInvoiceReversalPage> {
  const params = new URLSearchParams();
  params.set("pageNumber", String(query.pageNumber));
  params.set("pageSize", String(query.pageSize));
  if (query.vendorAccountId?.trim()) {
    params.set("vendorAccountId", query.vendorAccountId.trim());
  }
  if (query.vendorName?.trim()) {
    params.set("vendorName", query.vendorName.trim());
  }

  const data = await apiFetch<Record<string, unknown>>(
    `PurTransH/posted-for-reversal?${params.toString()}`,
    {},
    token
  );
  return normalizePostedPurchaseInvoiceReversalPage(data);
}

function normalizePurchaseInvoiceDraftItem(
  raw: Record<string, unknown>
): PurchaseInvoiceDraftItem {
  return {
    id: readNumber(raw, "id", "Id"),
    pthId: readNumber(raw, "pthId", "PthId"),
    vendorName: readString(raw, "vendorName", "VendorName"),
    venId: readString(raw, "venId", "VenId"),
    venBillNo: readString(raw, "venBillNo", "VenBillNo"),
    venBillDate: readNullableString(raw, "venBillDate", "VenBillDate"),
    phtDate: readNullableString(raw, "phtDate", "PhtDate"),
    insertTime: readNullableString(raw, "insertTime", "InsertTime"),
    userName: readString(raw, "userName", "UserName"),
    movementName: readString(raw, "movementName", "MovementName"),
    totalBill: readNullableNumber(raw, "totalBill", "TotalBill"),
    pthNetBill: readNullableNumber(raw, "pthNetBill", "PthNetBill"),
    quantity: readNullableNumber(raw, "quantity", "Quantity"),
    movStat: readNullableNumber(raw, "movStat", "MovStat"),
    status: readString(raw, "status", "Status") || "Draft",
  };
}

function normalizePurchaseInvoiceDraftPage(
  raw: Record<string, unknown>
): PurchaseInvoiceDraftPage {
  const itemsRaw = raw.items ?? raw.Items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((item) =>
        normalizePurchaseInvoiceDraftItem(item as Record<string, unknown>)
      )
    : [];

  const pageNumber =
    readNumber(raw, "pageNumber", "PageNumber", "page", "Page") || 1;
  const pageSize = readNumber(raw, "pageSize", "PageSize") || items.length;
  const totalCount = readNumber(raw, "totalCount", "TotalCount");
  const totalPages =
    readNumber(raw, "totalPages", "TotalPages") ||
    (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0);

  return {
    items,
    totalCount,
    pageNumber,
    pageSize,
    totalPages,
  };
}

export async function getPurchaseInvoiceDrafts(
  token: string,
  query: PurchaseInvoiceDraftQuery
): Promise<PurchaseInvoiceDraftPage> {
  const params = new URLSearchParams();
  params.set("pageNumber", String(query.pageNumber));
  params.set("pageSize", String(query.pageSize));
  if (query.vendorAccountId?.trim()) {
    params.set("vendorAccountId", query.vendorAccountId.trim());
  }
  if (query.vendorName?.trim()) {
    params.set("vendorName", query.vendorName.trim());
  }

  const data = await apiFetch<Record<string, unknown>>(
    `PurTransH/draft-invoices?${params.toString()}`,
    {},
    token
  );
  return normalizePurchaseInvoiceDraftPage(data);
}

export async function reversePostedPurchaseInvoice(
  token: string,
  id: number
): Promise<PurchaseInvoiceReverseResult> {
  const data = await apiFetch<Record<string, unknown>>(
    `PurTransH/${id}/reverse`,
    { method: "POST" },
    token
  );

  return {
    id: readNumber(data, "id", "Id"),
    pthId: readNumber(data, "pthId", "PthId"),
    movStat: readNullableNumber(data, "movStat", "MovStat"),
    pthNotice: readString(data, "pthNotice", "PthNotice"),
    reversedLedgerRows: readNumber(
      data,
      "reversedLedgerRows",
      "ReversedLedgerRows"
    ),
  };
}

export function lookupStockByBarcodeScan(token: string, scan: string) {
  return apiFetch<unknown>(
    "Stock/barcode/lookup",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scan }),
    },
    token
  ).then((data) => normalizeStockBarcodeLookupResult((data ?? {}) as Record<string, unknown>));
}

export type StockUnitConversionResult = {
  itemCode: string;
  unitId: number;
  unitName: string;
  quantity: number;
  conversionValue: number | null;
  quantityNet: number | null;
  priceQtyNet: number | null;
  errorMessage: string | null;
};

function normalizeStockUnitConversion(
  raw: Record<string, unknown>
): StockUnitConversionResult {
  return {
    itemCode: readString(raw, "itemCode", "ItemCode"),
    unitId: readNumber(raw, "unitId", "UnitId"),
    unitName: readString(raw, "unitName", "UnitName"),
    quantity: readNumber(raw, "quantity", "Quantity"),
    conversionValue: readNullableNumber(raw, "conversionValue", "ConversionValue"),
    quantityNet: readNullableNumber(raw, "quantityNet", "QuantityNet"),
    priceQtyNet: readNullableNumber(raw, "priceQtyNet", "PriceQtyNet"),
    errorMessage:
      readString(raw, "errorMessage", "ErrorMessage").trim() || null,
  };
}

/** Same GetUnitConversionInfo logic Stock uses. Read-only — does not write Stock. */
export function getUnitConversionInfo(
  token: string,
  itemCode: string,
  unitId: number,
  quantity: number
): Promise<StockUnitConversionResult> {
  const params = new URLSearchParams();
  params.set("itemCode", itemCode.trim());
  params.set("unitId", String(unitId));
  params.set("quantity", String(quantity));

  return apiFetch<Record<string, unknown>>(
    `UnitConversion/info?${params.toString()}`,
    {},
    token
  ).then((data) => normalizeStockUnitConversion(data));
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
    }),
  }, token);
}

export function deleteGroup(id: number, token: string) {
  return apiFetch<void>(`Group/${id}`, { method: "DELETE" }, token);
}

export function getAccountsCharts(token: string) {
  return fetchAllPaged("AccountsChart", token, normalizeAccountsChartItem, {
    sortBy: "accCode",
  });
}

export function createAccountsChart(
  data: AccountsChartUpsertRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    "AccountsChart",
    {
      method: "POST",
      body: JSON.stringify({
        ACCCode: data.accCode,
        PARENTCode: data.parentCode,
        ACCName: data.accName,
        ACCAName: data.accAName,
        Currency: data.currency,
        ACCKind: data.accKind,
        ACCType: data.accType,
        Receipt: data.receipt,
        Payment: data.payment,
      }),
    },
    token
  ).then((item) => normalizeAccountsChartItem(item));
}

export function updateAccountsChart(
  accCode: string,
  data: AccountsChartUpsertRequest,
  token: string
) {
  return apiFetch<void>(
    `AccountsChart/${encodeURIComponent(accCode)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        ACCCode: data.accCode,
        PARENTCode: data.parentCode,
        ACCName: data.accName,
        ACCAName: data.accAName,
        Currency: data.currency,
        ACCKind: data.accKind,
        ACCType: data.accType,
        Receipt: data.receipt,
        Payment: data.payment,
      }),
    },
    token
  );
}

export function deleteAccountsChart(accCode: string, token: string) {
  return apiFetch<void>(
    `AccountsChart/${encodeURIComponent(accCode)}`,
    { method: "DELETE" },
    token
  );
}

export function getCostCenters(token: string) {
  return fetchAllPaged("CostCenter", token, normalizeCostCenterItem, {
    sortBy: "code",
  });
}

export function getCostCentersForComp(token: string) {
  return fetchAllPaged(
    "CostCenter/for-comp",
    token,
    normalizeCostCenterCompoItem
  );
}

export function createCostCenter(
  data: CostCenterUpsertRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    "CostCenter",
    {
      method: "POST",
      body: JSON.stringify({
        Code: data.code,
        Name: data.name,
      }),
    },
    token
  ).then((item) => normalizeCostCenterItem(item));
}

export function updateCostCenter(
  id: number,
  data: CostCenterUpsertRequest,
  token: string
) {
  return apiFetch<void>(`CostCenter/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      Code: data.code,
      Name: data.name,
    }),
  }, token);
}

export function deleteCostCenter(id: number, token: string) {
  return apiFetch<void>(`CostCenter/${id}`, { method: "DELETE" }, token);
}

export function getStors(token: string) {
  return fetchAllPaged("Stor", token, normalizeStorItem, {
    sortBy: "id",
  });
}

/** AccountsChart rows for Stor Account No — API filters PARENTCode = 116. */
export async function getStorAccountOptions(
  token: string
): Promise<StorAccountOption[]> {
  return getAccountChildren(STOR_ACCOUNT_PARENT_CODE, token);
}

export function createStor(data: StorUpsertRequest, token: string) {
  return apiFetch<Record<string, unknown>>(
    "Stor",
    {
      method: "POST",
      body: JSON.stringify({
        StorArName: data.storArName,
        StorEnName: data.storEnName,
        CostCenterId: data.costCenterId,
        AccountNo: data.accountNo,
      }),
    },
    token
  ).then((item) => normalizeStorItem(item));
}

export function updateStor(id: number, data: StorUpsertRequest, token: string) {
  return apiFetch<void>(`Stor/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      StorArName: data.storArName,
      StorEnName: data.storEnName,
      CostCenterId: data.costCenterId,
      AccountNo: data.accountNo,
    }),
  }, token);
}

export function deleteStor(id: number, token: string) {
  return apiFetch<void>(`Stor/${id}`, { method: "DELETE" }, token);
}

function normalizeAccountCurrency(item: Record<string, unknown>): AccountCurrencyItem {
  return {
    code: readString(item, "code", "Code"),
    rate: readNullableNumber(item, "rate", "Rate"),
  };
}

function normalizeCollectedVoucher(item: Record<string, unknown>): CollectedVoucherItem {
  return {
    receiptNO: readNumber(item, "receiptNO", "ReceiptNO"),
    recRef: readNullableString(item, "recRef", "RecRef"),
    receiptDate: readNullableString(item, "receiptDate", "ReceiptDate"),
    saveCode: readNullableString(item, "saveCode", "SaveCode"),
    amount: readNullableNumber(item, "amount", "Amount"),
    currency: readNullableString(item, "currency", "Currency"),
    rate: readNullableNumber(item, "rate", "Rate"),
    type: readNullableString(item, "type", "Type"),
    vSource: readNullableString(item, "vSource", "VSource"),
    collectedCode: readNullableString(item, "collectedCode", "CollectedCode"),
    collectedName: readNullableString(item, "collectedName", "CollectedName"),
    description: readNullableString(item, "description", "Description"),
    addedUser: readNullableString(item, "addedUser", "AddedUser"),
    chequeNO: readNullableString(item, "chequeNO", "ChequeNO"),
    bankCode: readNullableString(item, "bankCode", "BankCode"),
    dueDate: readNullableString(item, "dueDate", "DueDate"),
    accountNO: readNullableString(item, "accountNO", "AccountNO"),
    totalString: readNullableString(item, "totalString", "TotalString"),
    costCenter: readNullableString(item, "costCenter", "CostCenter"),
    approved: readBoolean(item, "approved", "Approved"),
  };
}

function normalizeJournalLine(item: Record<string, unknown>): VoucherJournalLine {
  return {
    type: readString(item, "type", "Type") || "Debit",
    acccountCode: readString(item, "acccountCode", "ACCcountCode", "accCode", "ACCCode"),
    accName: readNullableString(item, "accName", "AccName"),
    description: readNullableString(item, "description", "Description"),
    amount: readNullableNumber(item, "amount", "Amount"),
    amountEGP: readNullableNumber(item, "amountEGP", "AmountEGP"),
  };
}

/** Shared chart cache for voucher ComboBox filters (old GetAccCode / PARENTCode queries). */
let voucherChartCache: AccountsChartItem[] | null = null;
let voucherChartToken: string | null = null;

export async function getVoucherAccountsChart(token: string): Promise<AccountsChartItem[]> {
  if (voucherChartCache && voucherChartToken === token) return voucherChartCache;
  voucherChartCache = await getAccountsCharts(token);
  voucherChartToken = token;
  return voucherChartCache;
}

export function invalidateVoucherAccountsChartCache() {
  voucherChartCache = null;
  voucherChartToken = null;
}

/** Bank parent ACCCode — dbo.GetAccCode('Bank') for this installation. */
export const COLLECTION_VOUCHER_BANK_PARENT = "111";

/** Safe parent ACCCode — dbo.GetAccCode('Safe') for this installation (Cash). */
export const COLLECTION_VOUCHER_SAFE_PARENT = "110";

/** Customer parent — dbo.GetAccCode('Customers') for this installation. */
export const COLLECTION_VOUCHER_CUSTOMER_PARENT = "114";

/** Supplier parent — dbo.GetAccCode('Suppliers') for this installation. */
export const COLLECTION_VOUCHER_SUPPLIER_PARENT = "2140";

/**
 * Collection Voucher Bank Name ComboBox.
 * Old / required:
 *   SELECT ACCCode, ACCAName FROM AccountsChart WHERE PARENTCode = '111'
 *
 * Server filters via AccountsChart?parentCode=111 — does NOT load all chart rows.
 */
export async function getCollectionVoucherBanks(
  token: string
): Promise<AccountSelectItem[]> {
  const rows = await fetchAllPaged(
    "AccountsChart",
    token,
    normalizeAccountsChartItem,
    {
      sortBy: "accCode",
      parentCode: COLLECTION_VOUCHER_BANK_PARENT,
    }
  );
  return rows.map((a) => ({
    accCode: a.accCode,
    // Old DataTextField = ACCAName
    name: (a.accAName ?? a.accName ?? a.accCode).trim() || a.accCode,
  }));
}

/**
 * Collection Voucher Cash Safe NO. ComboBox.
 *   SELECT ACCCode, ACCAName FROM AccountsChart WHERE PARENTCode = '110'
 * Server filters via AccountsChart?parentCode=110 — does NOT load all chart rows.
 */
export async function getCollectionVoucherSafes(
  token: string
): Promise<AccountSelectItem[]> {
  const rows = await fetchAllPaged(
    "AccountsChart",
    token,
    normalizeAccountsChartItem,
    {
      sortBy: "accCode",
      parentCode: COLLECTION_VOUCHER_SAFE_PARENT,
    }
  );
  return rows.map((a) => ({
    accCode: a.accCode,
    name: (a.accAName ?? a.accName ?? a.accCode).trim() || a.accCode,
  }));
}

/**
 * Old: WHERE PARENTCode IN (dbo.GetAccCode('Safe'|'Bank'))
 * Cash Safe = PARENTCode 110; Bank Name = PARENTCode 111.
 */
export async function getAccountsByGroup(groupName: string, token: string) {
  const normalized =
    groupName.trim().toLowerCase() === "safe"
      ? "Safe"
      : groupName.trim().toLowerCase() === "bank"
        ? "Bank"
        : groupName.trim();

  if (normalized === "Bank") {
    return getCollectionVoucherBanks(token);
  }
  if (normalized === "Safe") {
    return getCollectionVoucherSafes(token);
  }

  try {
    const data = await apiFetch<unknown>(
      `AccountsChart/by-group/${encodeURIComponent(normalized)}`,
      {},
      token
    );
    if (Array.isArray(data) && data.length > 0) {
      return data.map((x) => {
        const row = x as Record<string, unknown>;
        const accCode = readString(row, "accCode", "ACCCode");
        const name =
          readString(row, "name", "Name", "accaName", "ACCAName") || accCode;
        return { accCode, name };
      });
    }
  } catch {
    /* fall through */
  }

  const { GET_ACC_CODE_MAP, resolveGetAccCode } = await import(
    "@/lib/accounts-chart-voucher"
  );
  const mapped = GET_ACC_CODE_MAP[normalized]?.trim();
  if (mapped) {
    return getAccountChildren(mapped, token);
  }

  const chart = await getVoucherAccountsChart(token);
  const roots = resolveGetAccCode(chart, normalized);
  if (roots.length === 1) {
    return getAccountChildren(roots[0], token);
  }
  if (roots.length > 1) {
    const lists = await Promise.all(
      roots.map((r) => getAccountChildren(r, token))
    );
    return lists.flat();
  }
  return [];
}

/**
 * Account NO. / Safe Currency — direct children only:
 *   SELECT … FROM AccountsChart WHERE PARENTCode = @selectedBankOrSafe
 * Uses API parentCode filter only (no full-chart client filter).
 */
export async function getAccountChildren(parentCode: string, token: string) {
  if (!parentCode) return [];

  const rows = await fetchAllPaged(
    "AccountsChart",
    token,
    normalizeAccountsChartItem,
    { sortBy: "accCode", parentCode }
  );
  return rows.map((a) => ({
    accCode: a.accCode,
    name: (a.accAName ?? a.accName ?? a.accCode).trim() || a.accCode,
  }));
}

/**
 * Old: Select Rate, C.code From Currency C, AccountsChart A
 *      where C.code = A.Currency and A.ACCCode = @acc
 * Uses AccountsChart.Currency when Currency/GetRate API is not available.
 */
export async function getAccountCurrency(accCode: string, token: string) {
  try {
    const row = await apiFetch<Record<string, unknown>>(
      `AccountsChart/account-currency/${encodeURIComponent(accCode)}`,
      {},
      token
    );
    return normalizeAccountCurrency(row);
  } catch {
    const { currencyFromAccount } = await import("@/lib/accounts-chart-voucher");
    const accounts = await getVoucherAccountsChart(token);
    const cur = currencyFromAccount(accounts, accCode);
    return { code: cur.code, rate: cur.rate };
  }
}

/**
 * Old TreasuryIn journal account ComboBox:
 *   SELECT ACCCode, ACCCode + ' -' + ACCAName AS Name
 *   FROM ChartView WHERE Receipt = 1
 */
export async function getReceiptChartLeaves(
  token: string
): Promise<AccountSelectItem[]> {
  try {
    const data = await apiFetch<unknown>("AccountsChart/receipt-leaves", {}, token);
    if (Array.isArray(data)) {
      return data.map((x) => {
        const row = x as Record<string, unknown>;
        const accCode = readString(row, "accCode", "ACCCode");
        const name =
          readString(row, "name", "Name", "accaName", "ACCAName") || accCode;
        return { accCode, name };
      });
    }
  } catch {
    /* fall through to ChartView-equivalent client filter */
  }

  const chart = await getVoucherAccountsChart(token);
  const parentCodes = new Set(
    chart.map((a) => a.parentCode).filter((p): p is string => !!p)
  );
  return chart
    .filter((a) => a.receipt && !parentCodes.has(a.accCode))
    .map((a) => ({
      accCode: a.accCode,
      // Name only — UI formats "ACCCode - Name" for display (ACCCode is business code).
      name: (a.accAName ?? a.accName ?? a.accCode).trim() || a.accCode,
    }));
}

/** TreasuryOut journal ComboBox: ChartView WHERE Payment = 1 */
export async function getPaymentChartLeaves(
  token: string
): Promise<AccountSelectItem[]> {
  try {
    const data = await apiFetch<unknown>("AccountsChart/payment-leaves", {}, token);
    if (Array.isArray(data)) {
      return data.map((x) => {
        const row = x as Record<string, unknown>;
        const accCode = readString(row, "accCode", "ACCCode");
        const name =
          readString(row, "name", "Name", "accaName", "ACCAName") || accCode;
        return { accCode, name };
      });
    }
  } catch {
    /* fall through */
  }

  const chart = await getVoucherAccountsChart(token);
  const parentCodes = new Set(
    chart.map((a) => a.parentCode).filter((p): p is string => !!p)
  );
  return chart
    .filter((a) => a.payment && !parentCodes.has(a.accCode))
    .map((a) => ({
      accCode: a.accCode,
      name: (a.accAName ?? a.accName ?? a.accCode).trim() || a.accCode,
    }));
}

/**
 * TreasuryOut Cheque Account NO = Payable children (GetAccCode('Payable')).
 * Set NEXT_PUBLIC_GET_ACC_CODE_PAYABLE when the API DB has no GetAccCode UDF.
 */
export async function getPaymentPayableAccounts(token: string) {
  const parent =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_GET_ACC_CODE_PAYABLE?.trim()) ||
    "";
  if (parent) {
    return getAccountChildren(parent, token);
  }
  return getAccountsByGroup("Payable", token);
}

/**
 * Old TreasuryIn Customer/Supplier CTE under GetAccCode('Customers'|'Suppliers').
 * This site: Customers → parent 114, Suppliers → parent 2140 (leaf accounts only).
 */
export async function getAccountSources(sourceType: string, token: string) {
  const {
    selectSourceLeavesUnderRoots,
  } = await import("@/lib/accounts-chart-voucher");
  const isSupplier = sourceType.toLowerCase().startsWith("supp");
  const root = isSupplier
    ? COLLECTION_VOUCHER_SUPPLIER_PARENT
    : COLLECTION_VOUCHER_CUSTOMER_PARENT;
  const accounts = await getVoucherAccountsChart(token);
  return selectSourceLeavesUnderRoots(accounts, [root]);
}

export async function getCollectedVoucherLast(token: string) {
  try {
    return await apiFetch<Record<string, unknown>>(
      "CollectedVoucher/last",
      {},
      token
    ).then(normalizeCollectedVoucher);
  } catch {
    // Fallback: highest ReceiptNO (old Page_Load Max(ReceiptNO))
    const rows = await fetchAllPaged(
      "CollectedVoucher",
      token,
      normalizeCollectedVoucher,
      { sortBy: "receiptno", sortDesc: "true" }
    );
    if (!rows.length) throw new Error("No collection vouchers found");
    return rows[0];
  }
}

export function getCollectedVoucher(receiptNo: number, token: string) {
  return apiFetch<Record<string, unknown>>(
    `CollectedVoucher/${receiptNo}`,
    {},
    token
  ).then(normalizeCollectedVoucher);
}

export function getCollectedVoucherAdjacent(
  receiptNo: number,
  direction: string,
  token: string
) {
  return apiFetch<{ receiptNo?: number; ReceiptNo?: number }>(
    `CollectedVoucher/${receiptNo}/adjacent?direction=${encodeURIComponent(direction)}`,
    {},
    token
  ).then((r) => r.receiptNo ?? r.ReceiptNo ?? null);
}

export function getCollectedVoucherJournal(receiptNo: number, token: string) {
  return apiFetch<unknown>(`CollectedVoucher/${receiptNo}/journal`, {}, token).then(
    (data) =>
      Array.isArray(data)
        ? data.map((x) => normalizeJournalLine(x as Record<string, unknown>))
        : []
  );
}

export function searchCollectedVouchers(search: string, token: string) {
  return fetchAllPaged("CollectedVoucher", token, normalizeCollectedVoucher, {
    search,
    sortBy: "receiptno",
    sortDesc: "true",
  });
}

export function createCollectedVoucher(
  data: CollectedVoucherUpsertRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    "CollectedVoucher",
    {
      method: "POST",
      body: JSON.stringify({
        RecRef: data.recRef,
        ReceiptDate: data.receiptDate,
        SaveCode: data.saveCode,
        Amount: data.amount,
        Currency: data.currency,
        Rate: data.rate,
        Type: data.type,
        VSource: data.vSource,
        CollectedCode: data.collectedCode,
        CollectedName: data.collectedName,
        Description: data.description,
        AddedUser: data.addedUser,
        ChequeNO: data.chequeNO,
        BankCode: data.bankCode,
        DueDate: data.dueDate,
        AccountNO: data.accountNO,
        TotalString: data.totalString,
        CostCenter: data.costCenter,
      }),
    },
    token
  ).then(normalizeCollectedVoucher);
}

export function postCollectedVoucher(
  receiptNo: number,
  lines: VoucherLedgerLineRequest[],
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    `CollectedVoucher/${receiptNo}/post`,
    {
      method: "POST",
      body: JSON.stringify({
        Lines: lines.map((l) => ({
          ACCcountCode: l.acccountCode,
          Description: l.description,
          Currancy: l.currancy,
          Rate: l.rate,
          BankAccount: l.bankAccount,
          ChequeNO: l.chequeNO,
          Amount: l.amount,
          Depit: l.depit,
          Credit: l.credit,
          Notes: l.notes,
          DueDate: l.dueDate,
          CostCenter: l.costCenter,
        })),
      }),
    },
    token
  ).then(normalizeCollectedVoucher);
}

function normalizeVoucherAttachment(raw: Record<string, unknown>): VoucherAttachmentItem {
  return {
    id: readNumber(raw, "id", "Id"),
    voucherType: readString(raw, "voucherType", "VoucherType"),
    voucherId: readNumber(raw, "voucherId", "VoucherId"),
    originalFileName: readString(raw, "originalFileName", "OriginalFileName"),
    fileExtension: readString(raw, "fileExtension", "FileExtension"),
    contentType: readString(raw, "contentType", "ContentType"),
    fileSize: readNumber(raw, "fileSize", "FileSize"),
    uploadedAt: readString(raw, "uploadedAt", "UploadedAt"),
    uploadedBy: readNullableString(raw, "uploadedBy", "UploadedBy"),
  };
}

/** List attachments for Collect/Payment voucher (ReceiptNO) or Parm (ParmId). */
export async function getVoucherAttachments(
  voucherType: VoucherAttachmentType,
  voucherId: number,
  token: string
): Promise<VoucherAttachmentItem[]> {
  const data = await apiFetch<unknown>(
    `voucher-attachments/${encodeURIComponent(voucherType)}/${voucherId}`,
    {},
    token
  );
  if (!Array.isArray(data)) return [];
  return data.map((x) => normalizeVoucherAttachment(x as Record<string, unknown>));
}

/** Upload PDF/image to an existing saved voucher or Parm record. */
export async function uploadVoucherAttachment(
  voucherType: VoucherAttachmentType,
  voucherId: number,
  file: File,
  token: string
): Promise<VoucherAttachmentItem> {
  const formData = new FormData();
  formData.append("voucherType", voucherType);
  formData.append("voucherId", String(voucherId));
  formData.append("file", file);

  const response = await fetch(alfaUrl("voucher-attachments/upload"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (response.status === 401) {
    clearAuthToken();
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }

  const data = (await response.json()) as Record<string, unknown>;
  return normalizeVoucherAttachment(data);
}

export async function deleteVoucherAttachment(id: number, token: string) {
  return apiFetch<{ message?: string }>(
    `voucher-attachments/${id}`,
    { method: "DELETE" },
    token
  );
}

/** Authenticated blob download/view URL fetch. */
export async function downloadVoucherAttachmentBlob(
  id: number,
  token: string
): Promise<{ blob: Blob; fileName: string; contentType: string }> {
  const response = await fetch(alfaUrl(`voucher-attachments/${id}/download`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    clearAuthToken();
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(disposition);
  const fileName = match
    ? decodeURIComponent(match[1]!.replace(/"/g, "").trim())
    : `attachment-${id}`;
  const contentType =
    response.headers.get("Content-Type") ?? "application/octet-stream";
  const blob = await response.blob();
  return { blob, fileName, contentType };
}

/** Payment voucher by ReceiptNO. */
export function getPaymentVoucher(receiptNo: number, token: string) {
  return apiFetch<Record<string, unknown>>(
    `PaymentVoucher/${receiptNo}`,
    {},
    token
  ).then(normalizeCollectedVoucher);
}

export function searchPaymentVouchers(search: string, token: string) {
  return fetchAllPaged("PaymentVoucher", token, normalizeCollectedVoucher, {
    search,
    sortBy: "receiptno",
    sortDesc: "true",
  });
}

/** Web Forms PendingVoucher.aspx — PaymentVoucher where Approved = 0. */
export async function getPendingPaymentVouchers(token: string) {
  try {
    const data = await apiFetch<unknown>("PaymentVoucher/pending", {}, token);
    if (Array.isArray(data)) {
      return data.map((x) => {
        const row = x as Record<string, unknown>;
        return {
          receiptNO: readNumber(row, "receiptNO", "ReceiptNO"),
          receiptDate: readNullableString(row, "receiptDate", "ReceiptDate"),
          amount: readNullableNumber(row, "amount", "Amount"),
          currency: readNullableString(row, "currency", "Currency"),
          type: readNullableString(row, "type", "Type"),
          vSource: readNullableString(row, "vSource", "VSource"),
          partyName: readNullableString(
            row,
            "paidToName",
            "PaidToName",
            "collectedName",
            "CollectedName"
          ),
        };
      });
    }
  } catch (e) {
    // Running API may not have /pending yet — reuse existing approved filter.
    if (!(e instanceof ApiError) || e.status !== 404) throw e;
  }

  const rows = await fetchAllPaged(
    "PaymentVoucher",
    token,
    normalizeCollectedVoucher,
    { approved: "false", sortBy: "receiptno", sortDesc: "false" }
  );
  return rows.map((v) => ({
    receiptNO: v.receiptNO,
    receiptDate: v.receiptDate,
    amount: v.amount,
    currency: v.currency,
    type: v.type,
    vSource: v.vSource,
    partyName: v.collectedName,
  }));
}

/** Web Forms PendingVoucher.aspx — CollectedVoucher where Approved = 0. */
export async function getPendingCollectedVouchers(token: string) {
  try {
    const data = await apiFetch<unknown>("CollectedVoucher/pending", {}, token);
    if (Array.isArray(data)) {
      return data.map((x) => {
        const row = x as Record<string, unknown>;
        return {
          receiptNO: readNumber(row, "receiptNO", "ReceiptNO"),
          receiptDate: readNullableString(row, "receiptDate", "ReceiptDate"),
          amount: readNullableNumber(row, "amount", "Amount"),
          currency: readNullableString(row, "currency", "Currency"),
          type: readNullableString(row, "type", "Type"),
          vSource: readNullableString(row, "vSource", "VSource"),
          partyName: readNullableString(row, "collectedName", "CollectedName"),
        };
      });
    }
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 404) throw e;
  }

  const rows = await fetchAllPaged(
    "CollectedVoucher",
    token,
    normalizeCollectedVoucher,
    { approved: "false", sortBy: "receiptno", sortDesc: "false" }
  );
  return rows.map((v) => ({
    receiptNO: v.receiptNO,
    receiptDate: v.receiptDate,
    amount: v.amount,
    currency: v.currency,
    type: v.type,
    vSource: v.vSource,
    partyName: v.collectedName,
  }));
}

export async function getPaymentVoucherLast(token: string) {
  try {
    return await apiFetch<Record<string, unknown>>(
      "PaymentVoucher/last",
      {},
      token
    ).then(normalizeCollectedVoucher);
  } catch {
    const rows = await fetchAllPaged(
      "PaymentVoucher",
      token,
      normalizeCollectedVoucher,
      { sortBy: "receiptno", sortDesc: "true" }
    );
    if (!rows.length) throw new Error("No payment vouchers found");
    return rows[0]!;
  }
}

export function getPaymentVoucherAdjacent(
  receiptNo: number,
  direction: string,
  token: string
) {
  return apiFetch<{ receiptNo?: number; ReceiptNo?: number }>(
    `PaymentVoucher/${receiptNo}/adjacent?direction=${encodeURIComponent(direction)}`,
    {},
    token
  ).then((r) => r.receiptNo ?? r.ReceiptNo ?? null);
}

export function getPaymentVoucherJournal(receiptNo: number, token: string) {
  return apiFetch<unknown>(`PaymentVoucher/${receiptNo}/journal`, {}, token).then(
    (data) =>
      Array.isArray(data)
        ? data.map((x) => normalizeJournalLine(x as Record<string, unknown>))
        : []
  );
}

export function createPaymentVoucher(
  data: CollectedVoucherUpsertRequest,
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    "PaymentVoucher",
    {
      method: "POST",
      body: JSON.stringify({
        RecRef: data.recRef,
        ReceiptDate: data.receiptDate,
        SaveCode: data.saveCode,
        Amount: data.amount,
        Currency: data.currency,
        Rate: data.rate,
        Type: data.type,
        VSource: data.vSource,
        CollectedCode: data.collectedCode,
        CollectedName: data.collectedName,
        Description: data.description,
        AddedUser: data.addedUser,
        ChequeNO: data.chequeNO,
        BankCode: data.bankCode,
        DueDate: data.dueDate,
        AccountNO: data.accountNO,
        TotalString: data.totalString,
        CostCenter: data.costCenter,
      }),
    },
    token
  ).then(normalizeCollectedVoucher);
}

export function postPaymentVoucher(
  receiptNo: number,
  lines: VoucherLedgerLineRequest[],
  token: string
) {
  return apiFetch<Record<string, unknown>>(
    `PaymentVoucher/${receiptNo}/post`,
    {
      method: "POST",
      body: JSON.stringify({
        Lines: lines.map((l) => ({
          ACCcountCode: l.acccountCode,
          Description: l.description,
          Currancy: l.currancy,
          Rate: l.rate,
          BankAccount: l.bankAccount,
          ChequeNO: l.chequeNO,
          Amount: l.amount,
          Depit: l.depit,
          Credit: l.credit,
          Notes: l.notes,
          DueDate: l.dueDate,
          CostCenter: l.costCenter,
        })),
      }),
    },
    token
  ).then(normalizeCollectedVoucher);
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

/**
 * Inventory adjustment item name search — two or more spaces separate LIKE wildcards.
 * Server builds the pattern (e.g. "aug  lm" → %aug%lm%).
 * Falls back to the standard lookup endpoint when segment routes are unavailable.
 */
export async function lookupItemCatalogBySegment(
  token: string,
  search: string,
  field: "code" | "nameAr" | "nameEn",
  options?: {
    take?: number;
    signal?: AbortSignal;
    /** PurchDetail: two consecutive spaces → '%' without trimming. */
    doubleSpaceWildcard?: boolean;
  }
): Promise<ItemCatalogItem[]> {
  const doubleSpaceWildcard = options?.doubleSpaceWildcard === true;
  const term = doubleSpaceWildcard ? search : search.trim();
  if (doubleSpaceWildcard) {
    if (!hasSearchableCatalogQuery(term)) return [];
  } else if (!term) {
    return [];
  }

  const take = String(options?.take ?? 20);
  const params = new URLSearchParams();
  params.set("search", term);
  params.set("field", field);
  params.set("take", take);
  if (doubleSpaceWildcard) params.set("doubleSpaceWildcard", "true");

  const mapRows = (data: unknown): ItemCatalogItem[] => {
    if (!Array.isArray(data)) return [];
    return data.map((row) =>
      normalizeItemCatalogLookupItem(row as Record<string, unknown>)
    );
  };

  try {
    const data = await apiFetch<unknown>(
      `ItemCatalog/lookup-segment?${params.toString()}`,
      { signal: options?.signal },
      token
    );
    return mapRows(data);
  } catch (error) {
    if (options?.signal?.aborted) throw error;

    const segmentParams = new URLSearchParams(params);
    segmentParams.set("segment", "true");

    try {
      const data = await apiFetch<unknown>(
        `ItemCatalog/lookup?${segmentParams.toString()}`,
        { signal: options?.signal },
        token
      );
      return mapRows(data);
    } catch (innerError) {
      if (options?.signal?.aborted) throw innerError;
      return lookupItemCatalog(token, term, options);
    }
  }
}

const ITEM_CATALOG_BY_CODES_BATCH = 500;

/** Exact Itm_Code / Itm_Code2 lookup for many codes in a few HTTP requests. */
export async function getItemCatalogByCodes(
  token: string,
  codes: readonly string[],
  options?: {
    onProgress?: (done: number, total: number) => void;
  }
): Promise<ItemCatalogItem[]> {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of codes) {
    const code = raw.trim();
    if (!code) continue;
    const key = code.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(code);
  }

  if (unique.length === 0) return [];

  const items: ItemCatalogItem[] = [];
  const total = unique.length;
  options?.onProgress?.(0, total);

  for (let offset = 0; offset < unique.length; offset += ITEM_CATALOG_BY_CODES_BATCH) {
    const batch = unique.slice(offset, offset + ITEM_CATALOG_BY_CODES_BATCH);
    const data = await apiFetch<unknown>(
      "ItemCatalog/by-codes",
      {
        method: "POST",
        body: JSON.stringify({ codes: batch }),
      },
      token
    );

    const rows = Array.isArray(data)
      ? data
      : data && typeof data === "object"
        ? ((data as Record<string, unknown>).items ??
            (data as Record<string, unknown>).Items ??
            [])
        : [];

    if (Array.isArray(rows)) {
      for (const row of rows) {
        items.push(normalizeItemCatalogItem(row as Record<string, unknown>));
      }
    }

    options?.onProgress?.(Math.min(offset + batch.length, total), total);
  }

  return items;
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
    itmActive: true,
    itmStopSell: false,
    itmSrvc: false,
    itmStopPur: false,
    itmPrintBarcode: false,
    itmAllowDiscount: false,
    itmFreez: false,
    stopTransfer: false,
    brandId: null,
    brandName: null,
    itmGroup: null,
    groupName: null,
    itemForm: null,
    itemFormName: null,
    itmOrigin: null,
    itemOriginName: null,
    itmNotes: null,
    itmMaxDiscPer: null,
    itmMaxDiscVal: null,
    itmUnit1: readItemCatalogUnit(item, 1),
    itmUnit2: readItemCatalogUnit(item, 2),
    itmUnit3: readItemCatalogUnit(item, 3),
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

function normalizeExcelPropertyMetadata(
  raw: Record<string, unknown>
): ExcelPropertyMetadata {
  return {
    name: readString(raw, "name", "Name"),
    clrType: readString(raw, "clrType", "ClrType"),
    isPrimaryKey: readBoolean(raw, "isPrimaryKey", "IsPrimaryKey"),
    isForeignKey: readBoolean(raw, "isForeignKey", "IsForeignKey"),
    isRequired: readBoolean(raw, "isRequired", "IsRequired"),
    isNullable: readBoolean(raw, "isNullable", "IsNullable"),
    isImportable: readBoolean(raw, "isImportable", "IsImportable"),
    isDatabaseGenerated: readBoolean(
      raw,
      "isDatabaseGenerated",
      "IsDatabaseGenerated"
    ),
    maxLength: readNumber(raw, "maxLength", "MaxLength") || null,
    foreignKeyPrincipalEntity:
      readString(raw, "foreignKeyPrincipalEntity", "ForeignKeyPrincipalEntity") ||
      null,
  };
}

function normalizeExcelEntityMetadata(
  raw: Record<string, unknown>
): ExcelEntityMetadata {
  const propertiesRaw = raw.properties ?? raw.Properties;
  const properties = Array.isArray(propertiesRaw)
    ? propertiesRaw.map((item) =>
        normalizeExcelPropertyMetadata(item as Record<string, unknown>)
      )
    : [];

  const excludedRaw = raw.excludedColumns ?? raw.ExcludedColumns;
  const lookupRaw = raw.lookupColumns ?? raw.LookupColumns;

  return {
    entityName: readString(raw, "entityName", "EntityName"),
    displayName: readString(raw, "displayName", "DisplayName"),
    primaryKey: readString(raw, "primaryKey", "PrimaryKey"),
    identityKey: readBoolean(raw, "identityKey", "IdentityKey"),
    alternateKey:
      readString(raw, "alternateKey", "AlternateKey") || null,
    excludedColumns: Array.isArray(excludedRaw)
      ? excludedRaw.map((item) => String(item))
      : [],
    lookupColumns: Array.isArray(lookupRaw)
      ? lookupRaw.map((item) => String(item))
      : [],
    useCreateMethod: readBoolean(raw, "useCreateMethod", "UseCreateMethod"),
    useUpdateMethod: readBoolean(raw, "useUpdateMethod", "UseUpdateMethod"),
    useDeleteMethod: readBoolean(raw, "useDeleteMethod", "UseDeleteMethod"),
    properties,
  };
}

function parseDownloadFileName(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  const starMatch = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (starMatch?.[1]) {
    return decodeURIComponent(starMatch[1].replace(/(^"|"$)/g, ""));
  }

  const match = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return match?.[1] ?? null;
}

export function getExcelEntityMetadata(entityName: string, token: string) {
  return apiFetch<Record<string, unknown>>(
    `Excel/metadata/${encodeURIComponent(entityName)}`,
    {},
    token
  ).then((item) => normalizeExcelEntityMetadata(item));
}

export async function downloadExcelTemplate(
  entityName: string,
  request: ExcelTemplateRequest,
  token: string
): Promise<ExcelTemplateDownload> {
  const response = await fetch(
    alfaUrl(`Excel/template/${encodeURIComponent(entityName)}`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        Mode: excelImportModeToApiValue(request.mode),
        SelectedColumns: request.selectedColumns,
      }),
    }
  );

  if (response.status === 401) {
    clearAuthToken();
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }

  const blob = await response.blob();
  const fileName =
    parseDownloadFileName(response.headers.get("Content-Disposition")) ??
    `${entityName}-template.xlsx`;

  return { blob, fileName };
}

export async function downloadPurTransDExcelTemplate(
  token: string
): Promise<ExcelTemplateDownload> {
  const response = await fetch(alfaUrl("PurTransH/excel-template"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    clearAuthToken();
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }

  const blob = await response.blob();
  const fileName =
    parseDownloadFileName(response.headers.get("Content-Disposition")) ??
    "PurTransD-template.xlsx";

  return { blob, fileName };
}

function normalizePurTransDExcelPreviewRow(
  raw: Record<string, unknown>
): PurTransDExcelPreviewRow {
  return {
    excelRowNumber: readNumber(raw, "excelRowNumber", "ExcelRowNumber"),
    itmId: readString(raw, "itmId", "ItmId"),
    itmNameAr: readString(raw, "itmNameAr", "ItmNameAr"),
    itmNameEn: readString(raw, "itmNameEn", "ItmNameEn"),
    qnty: readString(raw, "qnty", "Qnty"),
    bonus: readString(raw, "bonus", "Bonus"),
    unitId: readString(raw, "unitId", "UnitId"),
    itmPurPrice: readString(raw, "itmPurPrice", "ItmPurPrice"),
    itmSell: readString(raw, "itmSell", "ItmSell"),
    itmTaxPrice: readString(raw, "itmTaxPrice", "ItmTaxPrice"),
    itmExtraDis: readString(raw, "itmExtraDis", "ItmExtraDis"),
    itmDisPer: readString(raw, "itmDisPer", "ItmDisPer"),
    itmDisMon: readString(raw, "itmDisMon", "ItmDisMon"),
    expDate: readString(raw, "expDate", "ExpDate"),
    stoId: readString(raw, "stoId", "StoId"),
  };
}

export async function previewPurTransDExcel(
  token: string,
  file: File,
  options?: {
    onUploadProgress?: (percent: number) => void;
    onReading?: () => void;
  }
): Promise<PurTransDExcelPreview> {
  const form = new FormData();
  form.append("file", file);

  const raw = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/purchase/excel-preview");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      options?.onUploadProgress?.(
        Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)))
      );
    };
    xhr.upload.onload = () => {
      options?.onUploadProgress?.(100);
      options?.onReading?.();
    };

    xhr.onload = () => {
      if (xhr.status === 401) {
        clearAuthToken();
      }

      let body: Record<string, unknown> = {};
      if (xhr.responseText) {
        try {
          body = JSON.parse(xhr.responseText) as Record<string, unknown>;
        } catch {
          reject(
            new ApiError(
              xhr.status,
              xhr.responseText.slice(0, 200) || xhr.statusText
            )
          );
          return;
        }
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        if (xhr.status === 405) {
          reject(
            new ApiError(
              405,
              "Read Excel is not available on this Next.js server. Restart npm run dev so /api/purchase/excel-preview is loaded."
            )
          );
          return;
        }
        reject(
          new ApiError(
            xhr.status,
            String(body.message ?? body.Message ?? xhr.statusText)
          )
        );
        return;
      }

      resolve(body);
    };

    xhr.onerror = () => {
      reject(new ApiError(0, "The Excel file could not be read."));
    };

    xhr.send(form);
  });

  const rowsRaw = raw.rows ?? raw.Rows;
  const rows = Array.isArray(rowsRaw)
    ? rowsRaw.map((item) =>
        normalizePurTransDExcelPreviewRow(item as Record<string, unknown>)
      )
    : [];

  return {
    fileName: readString(raw, "fileName", "FileName"),
    sheetName: readString(raw, "sheetName", "SheetName"),
    rowCount: readNumber(raw, "rowCount", "RowCount") || rows.length,
    rows,
  };
}

function normalizeExcelImportError(
  raw: Record<string, unknown>
): ExcelImportError {
  return {
    rowNumber: readNumber(raw, "rowNumber", "RowNumber"),
    columnName: readString(raw, "columnName", "ColumnName") || null,
    errorCode: readString(raw, "errorCode", "ErrorCode"),
    message: readString(raw, "message", "Message"),
  };
}

function normalizeExcelImportPreview(
  raw: Record<string, unknown> | undefined
): ExcelImportPreview {
  const preview = raw ?? {};
  return {
    totalRows: readNumber(preview, "totalRows", "TotalRows"),
    insertCount: readNumber(preview, "insertCount", "InsertCount"),
    updateCount: readNumber(preview, "updateCount", "UpdateCount"),
    deleteCount: readNumber(preview, "deleteCount", "DeleteCount"),
    validRowCount: readNumber(preview, "validRowCount", "ValidRowCount"),
    errorCount: readNumber(preview, "errorCount", "ErrorCount"),
  };
}

function normalizeExcelImportResult(raw: Record<string, unknown>): ExcelImportResult {
  const errorsRaw = raw.errors ?? raw.Errors;
  const errors = Array.isArray(errorsRaw)
    ? errorsRaw.map((item) =>
        normalizeExcelImportError(item as Record<string, unknown>)
      )
    : [];

  const modeValue = readNumber(raw, "mode", "Mode");

  return {
    success: readBoolean(raw, "success", "Success"),
    isPreview: readBoolean(raw, "isPreview", "IsPreview"),
    entityName: readString(raw, "entityName", "EntityName"),
    mode: excelImportModeFromApiValue(modeValue),
    importSessionId:
      readString(raw, "importSessionId", "ImportSessionId") || null,
    preview: normalizeExcelImportPreview(
      (raw.preview ?? raw.Preview) as Record<string, unknown> | undefined
    ),
    inserted: readNumber(raw, "inserted", "Inserted"),
    updated: readNumber(raw, "updated", "Updated"),
    deleted: readNumber(raw, "deleted", "Deleted"),
    totalProcessed: readNumber(raw, "totalProcessed", "TotalProcessed"),
    errors,
  };
}

export async function previewExcelImport(
  entityName: string,
  file: File,
  mode: ExcelImportMode,
  token: string
): Promise<ExcelImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", String(excelImportModeToApiValue(mode)));

  const response = await fetch(
    alfaUrl(`Excel/import/${encodeURIComponent(entityName)}/preview`),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (response.status === 401) {
    clearAuthToken();
  }

  const data = await parseJsonBody(response);
  const result = normalizeExcelImportResult(data);

  if (!response.ok && errorsOnlyMessage(data)) {
    throw new ApiError(response.status, readString(data, "message", "Message"));
  }

  return result;
}

function normalizeExcelImportJobStatus(
  raw: Record<string, unknown>
): ExcelImportJobStatus {
  const resultRaw = raw.result ?? raw.Result;
  const statusValue = readNumber(raw, "status", "Status");

  return {
    importJobId: readString(raw, "importJobId", "ImportJobId"),
    entityName: readString(raw, "entityName", "EntityName"),
    status: excelImportJobStatusFromApiValue(statusValue),
    progressPercent: readNumber(raw, "progressPercent", "ProgressPercent"),
    processedRows: readNumber(raw, "processedRows", "ProcessedRows"),
    totalRows: readNumber(raw, "totalRows", "TotalRows"),
    message: readString(raw, "message", "Message") || null,
    result:
      resultRaw && typeof resultRaw === "object"
        ? normalizeExcelImportResult(resultRaw as Record<string, unknown>)
        : null,
  };
}

function normalizeExcelImportCommitResponse(
  raw: Record<string, unknown>
): ExcelImportCommitResponse {
  if (readBoolean(raw, "isAsync", "IsAsync")) {
    return {
      isAsync: true,
      importJobId: readString(raw, "importJobId", "ImportJobId"),
    };
  }

  const resultRaw = raw.result ?? raw.Result;
  if (resultRaw && typeof resultRaw === "object") {
    return {
      isAsync: false,
      result: normalizeExcelImportResult(resultRaw as Record<string, unknown>),
    };
  }

  return {
    isAsync: false,
    result: normalizeExcelImportResult(raw),
  };
}

export async function commitExcelImport(
  entityName: string,
  importSessionId: string,
  token: string
): Promise<ExcelImportCommitResponse> {
  const response = await fetch(
    alfaUrl(`Excel/import/${encodeURIComponent(entityName)}/commit`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ImportSessionId: importSessionId }),
    }
  );

  if (response.status === 401) {
    clearAuthToken();
  }

  const data = await parseJsonBody(response);
  const commitResponse = normalizeExcelImportCommitResponse(data);

  if (!response.ok) {
    if (!commitResponse.isAsync && commitResponse.result.errors.length > 0) {
      return commitResponse;
    }

    if (errorsOnlyMessage(data)) {
      throw new ApiError(response.status, readString(data, "message", "Message"));
    }
  }

  return commitResponse;
}

export async function getExcelImportJobStatus(
  entityName: string,
  importJobId: string,
  token: string
): Promise<ExcelImportJobStatus> {
  const response = await fetch(
    alfaUrl(
      `Excel/import/${encodeURIComponent(entityName)}/jobs/${encodeURIComponent(importJobId)}`
    ),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (response.status === 401) {
    clearAuthToken();
  }

  const data = await parseJsonBody(response);

  if (!response.ok) {
    throw new ApiError(response.status, readString(data, "message", "Message"));
  }

  return normalizeExcelImportJobStatus(data);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitForExcelImportJob(
  entityName: string,
  importJobId: string,
  token: string,
  onProgress?: (status: ExcelImportJobStatus) => void,
  pollIntervalMs = 800
): Promise<ExcelImportResult> {
  while (true) {
    const status = await getExcelImportJobStatus(entityName, importJobId, token);
    onProgress?.(status);

    if (status.status === "Completed" || status.status === "Failed") {
      if (!status.result) {
        throw new ApiError(
          500,
          status.message || "Import job finished without a result payload."
        );
      }

      return status.result;
    }

    await delay(pollIntervalMs);
  }
}

function errorsOnlyMessage(data: Record<string, unknown>): boolean {
  const errors = data.errors ?? data.Errors;
  return !Array.isArray(errors) || errors.length === 0;
}

function mapSalesPaymentMethodOption(
  item: Record<string, unknown>
): import("@/types/sales-payment").SalesPaymentMethodOption {
  return {
    paymentMethodId: readNumber(item, "paymentMethodId", "PaymentMethodId"),
    paymentName: readNullableString(item, "paymentName", "PaymentName"),
    affectsCash: readBoolean(item, "affectsCash", "AffectsCash"),
    active: readBoolean(item, "active", "Active"),
  };
}

function mapSalesPaymentLine(
  item: Record<string, unknown>
): import("@/types/sales-payment").SalesPaymentLine {
  return {
    paymentMethodId: readNumber(item, "paymentMethodId", "PaymentMethodId"),
    paymentName: readNullableString(item, "paymentName", "PaymentName"),
    amount: readNumber(item, "amount", "Amount"),
    accountCode: readNullableString(item, "accountCode", "AccountCode"),
  };
}

function mapSalesPaymentContext(
  data: Record<string, unknown>
): import("@/types/sales-payment").SalesPaymentContext {
  const existingRaw = data.existingPayments ?? data.ExistingPayments;
  const methodsRaw = data.availablePaymentMethods ?? data.AvailablePaymentMethods;
  return {
    sthId: readNumber(data, "sth_Id", "Sth_Id", "sthId", "SthId"),
    billTyp: readNumber(data, "billTyp", "BillTyp"),
    paymentStatus: readString(data, "paymentStatus", "PaymentStatus"),
    totalBill: (() => {
      const v = data.totalBill ?? data.TotalBill;
      return v == null || v === "" ? null : Number(v);
    })(),
    totalBillAfterDisc: (() => {
      const v = data.totalBillAfterDisc ?? data.TotalBillAfterDisc;
      return v == null || v === "" ? null : Number(v);
    })(),
    totalBillNet: (() => {
      const v = data.totalBillNet ?? data.TotalBillNet;
      return v == null || v === "" ? null : Number(v);
    })(),
    finalPayableAmount: readNumber(data, "finalPayableAmount", "FinalPayableAmount"),
    pharmId: readNullableString(data, "pharmId", "PharmId"),
    scId: (() => {
      const v = data.sc_Id ?? data.Sc_Id ?? data.scId ?? data.ScId;
      return v == null || v === "" ? null : Number(v);
    })(),
    existingPayments: Array.isArray(existingRaw)
      ? existingRaw.map((row) => mapSalesPaymentLine(row as Record<string, unknown>))
      : [],
    availablePaymentMethods: Array.isArray(methodsRaw)
      ? methodsRaw.map((row) =>
          mapSalesPaymentMethodOption(row as Record<string, unknown>)
        )
      : [],
  };
}

export async function getSalePaymentMethods(token: string) {
  const data = await apiFetch<unknown>("SalesPayment/methods", {}, token);
  const list = Array.isArray(data) ? data : [];
  return list.map((row) =>
    mapSalesPaymentMethodOption(row as Record<string, unknown>)
  );
}

export async function getSalesServerTime(token: string): Promise<{
  utcNow: string;
  egyptLocalDisplay: string;
  timeZoneId: string;
} | null> {
  try {
    const data = await apiFetch<Record<string, unknown>>(
      "Sales/server-time",
      {},
      token
    );
    return {
      utcNow: readString(data, "utcNow", "UtcNow"),
      egyptLocalDisplay: readString(data, "egyptLocalDisplay", "EgyptLocalDisplay"),
      timeZoneId: readString(data, "timeZoneId", "TimeZoneId"),
    };
  } catch {
    // Soft-fail: missing/restarted API must not block Sales UI.
    return null;
  }
}

export async function searchSalesItems(
  token: string,
  params: {
    searchType:
      | "ArabicName"
      | "EnglishName"
      | "Barcode"
      | "ItemCode"
      | "General";
    stockScope: import("@/types/sales-workspace").SalesStockScope;
    search: string;
    take?: number;
  }
) {
  const q = new URLSearchParams({
    searchType: params.searchType,
    stockScope: params.stockScope,
    search: params.search,
    take: String(params.take ?? 40),
  });
  const data = await apiFetch<Record<string, unknown>>(
    `SalesItemSearch?${q.toString()}`,
    {},
    token
  );
  const itemsRaw = data.items ?? data.Items;
  const items = Array.isArray(itemsRaw) ? itemsRaw : [];
  return {
    parmId: readNumber(data, "parmId", "ParmId"),
    pharmacyName: readString(data, "pharmacyName", "PharmacyName"),
    storId: readNumber(data, "storId", "StorId"),
    items: items.map((row) => {
      const r = row as Record<string, unknown>;
      const stocksRaw = r.stocks ?? r.Stocks;
      const stocks = Array.isArray(stocksRaw) ? stocksRaw : [];
      return {
        itemCatalogId: readNumber(r, "itemCatalogId", "ItemCatalogId"),
        itmCode: readString(r, "itmCode", "ItmCode"),
        itmNameAr: readString(r, "itmNameAr", "ItmNameAr"),
        itmNameEn: readString(r, "itmNameEn", "ItmNameEn"),
        defSellPrice: readNullableNumber(r, "defSellPrice", "DefSellPrice"),
        defPharmPrice: readNullableNumber(r, "defPharmPrice", "DefPharmPrice"),
        unit1: readNullableNumber(r, "unit1", "Unit1"),
        unit2: readNullableNumber(r, "unit2", "Unit2"),
        unit3: readNullableNumber(r, "unit3", "Unit3"),
        unit1Unit2: readNullableNumber(r, "unit1Unit2", "Unit1Unit2"),
        unit1Unit3: readNullableNumber(r, "unit1Unit3", "Unit1Unit3"),
        stocks: stocks.map((s) => {
          const st = s as Record<string, unknown>;
          return {
            stockId: readNumber(st, "stockId", "StockId"),
            batchNo: readString(st, "batchNo", "BatchNo"),
            expDate: readNullableString(st, "expDate", "ExpDate"),
            availableQty: readNumber(st, "availableQty", "AvailableQty"),
            salesPrice: readNumber(st, "salesPrice", "SalesPrice"),
            storId: readNumber(st, "storId", "StorId"),
            storName: readNullableString(st, "storName", "StorName"),
            parmId: readNullableNumber(st, "parmId", "ParmId"),
            pharmacyName: readNullableString(st, "pharmacyName", "PharmacyName"),
          };
        }),
      } satisfies import("@/types/sales-workspace").SalesItemSearchHit;
    }),
  };
}

export async function createSale(
  token: string,
  request: import("@/types/sales-workspace").CreateSaleRequest
) {
  const data = await apiFetch<Record<string, unknown>>(
    "Sales",
    {
      method: "POST",
      body: JSON.stringify({
        EmpId: request.empId,
        CustId: request.custId,
        CustomerName: request.customerName,
        CustomerTel: request.customerTel,
        CustomerAddress: request.customerAddress,
        GlobalDiscountMode: request.globalDiscountMode,
        GlobalDiscountPercent: request.globalDiscountPercent,
        GlobalDiscountValue: request.globalDiscountValue,
        SalesServiceId: request.salesServiceId,
        DeliveryCodeOrPassword: request.deliveryCodeOrPassword,
        Lines: request.lines.map((l) => ({
          ItemCatalogId: l.itemCatalogId,
          StockId: l.stockId,
          Quantity: l.quantity,
          UnitId: l.unitId,
          UnitSellPrice: l.unitSellPrice,
          DiscountMode: l.discountMode,
          DiscountPercent: l.discountPercent,
          DiscountValue: l.discountValue,
        })),
        Payments: request.payments?.map((p) => ({
          PaymentMethodId: p.paymentMethodId,
          Amount: p.amount,
        })),
      }),
    },
    token
  );

  return {
    sthId: readNumber(data, "sth_Id", "Sth_Id", "sthId"),
    headerId: readNumber(data, "headerId", "HeaderId"),
    billTyp: readNumber(data, "billTyp", "BillTyp"),
    totalBill: readNumber(data, "totalBill", "TotalBill"),
    totalBillAfterDisc: readNumber(data, "totalBillAfterDisc", "TotalBillAfterDisc"),
    totalBillNet: readNumber(data, "totalBillNet", "TotalBillNet"),
    serviceCost: readNumber(data, "serviceCost", "ServiceCost"),
    payable: readNumber(data, "payable", "Payable"),
    secInsertDateUtc: readString(data, "secInsertDateUtc", "SecInsertDateUtc"),
    egyptLocalDisplay: readString(data, "egyptLocalDisplay", "EgyptLocalDisplay"),
  } satisfies import("@/types/sales-workspace").CreateSaleResponse;
}

export async function lookupSalesManByCode(token: string, code: string) {
  const params = new URLSearchParams({
    code: code.trim(),
    employType: "1",
  });
  try {
    const data = await apiFetch<Record<string, unknown>>(
      `EmployInfo/lookup-by-code?${params.toString()}`,
      {},
      token
    );
    return {
      id: readNumber(data, "id", "Id"),
      code: readNullableString(data, "code", "Code"),
      name: readNullableString(data, "name", "Name"),
      employType: readNumber(data, "employType", "EmployType"),
    };
  } catch (err) {
    // Match Pharmacy Transfer: 404 = not found
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function lookupSalesManByPassword(token: string, password: string) {
  try {
    const data = await apiFetch<Record<string, unknown>>(
      "EmployInfo/lookup-by-password",
      {
        method: "POST",
        // Same body shape as Pharmacy Transfer employee password lookup
        body: JSON.stringify({ password: password.trim() }),
      },
      token
    );
    return {
      id: readNumber(data, "id", "Id"),
      code: readNullableString(data, "code", "Code"),
      name: readNullableString(data, "name", "Name"),
      employType: readNumber(data, "employType", "EmployType"),
    };
  } catch (err) {
    // Match Pharmacy Transfer: 404 = not found
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getSaleDeliveryServices(token: string) {
  const data = await apiFetch<unknown>("SalesDelivery/services", {}, token);
  const list = Array.isArray(data) ? data : [];
  return list.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      salesServiceId: readNumber(r, "salesServiceId", "SalesServiceId"),
      serviceName: readString(r, "serviceName", "ServiceName"),
      serviceType: readString(r, "serviceType", "ServiceType"),
      cost: readNumber(r, "cost", "Cost"),
      requiresDeliveryEmployee: readBoolean(
        r,
        "requiresDeliveryEmployee",
        "RequiresDeliveryEmployee"
      ),
    };
  });
}

export async function getSalePaymentContext(token: string, sthId: number) {
  const data = await apiFetch<Record<string, unknown>>(
    `SalesPayment/${sthId}`,
    {},
    token
  );
  return mapSalesPaymentContext(data);
}

export async function finalizeSalePayment(
  token: string,
  request: import("@/types/sales-payment").FinalizeSalePaymentRequest
) {
  const data = await apiFetch<Record<string, unknown>>(
    "SalesPayment/finalize",
    {
      method: "POST",
      body: JSON.stringify({
        Sth_Id: request.sthId,
        Payments: request.payments.map((p) => ({
          PaymentMethodId: p.paymentMethodId,
          Amount: p.amount,
        })),
      }),
    },
    token
  );

  const detailsRaw = data.paymentDetails ?? data.PaymentDetails;
  return {
    sthId: readNumber(data, "sth_Id", "Sth_Id", "sthId", "SthId"),
    billTyp: readNumber(data, "billTyp", "BillTyp"),
    paymentStatus: readString(data, "paymentStatus", "PaymentStatus"),
    finalSaleTotal: readNumber(data, "finalSaleTotal", "FinalSaleTotal"),
    paymentTotal: readNumber(data, "paymentTotal", "PaymentTotal"),
    paymentDetails: Array.isArray(detailsRaw)
      ? detailsRaw.map((row) => mapSalesPaymentLine(row as Record<string, unknown>))
      : [],
  } satisfies import("@/types/sales-payment").FinalizeSalePaymentResponse;
}

function mapSalesServiceOption(
  item: Record<string, unknown>
): import("@/types/sales-delivery").SalesServiceOption {
  return {
    salesServiceId: readNumber(item, "salesServiceId", "SalesServiceId"),
    serviceName: readString(item, "serviceName", "ServiceName"),
    serviceType: readString(item, "serviceType", "ServiceType"),
    cost: readNumber(item, "cost", "Cost"),
    requiresDeliveryEmployee: readBoolean(
      item,
      "requiresDeliveryEmployee",
      "RequiresDeliveryEmployee"
    ),
  };
}

function mapSalesDeliveryInfo(
  item: Record<string, unknown> | null | undefined
): import("@/types/sales-delivery").SalesDeliveryInfo | null {
  if (!item) return null;
  const idRaw = item.id ?? item.Id;
  return {
    id: idRaw == null || idRaw === "" ? null : Number(idRaw),
    sthId: readNumber(item, "sth_Id", "Sth_Id", "sthId", "SthId"),
    custId: (() => {
      const v = item.cust_Id ?? item.Cust_Id ?? item.custId ?? item.CustId;
      return v == null || v === "" ? null : Number(v);
    })(),
    customerName: readNullableString(item, "customerName", "CustomerName"),
    tel: readNullableString(item, "tel", "Tel"),
    address: readNullableString(item, "address", "Address"),
    salesServiceId: (() => {
      const v = item.salesServiceId ?? item.SalesServiceId;
      return v == null || v === "" ? null : Number(v);
    })(),
    serviceName: readNullableString(item, "serviceName", "ServiceName"),
    serviceType: readNullableString(item, "serviceType", "ServiceType"),
    serviceCost: (() => {
      const v = item.serviceCost ?? item.ServiceCost;
      return v == null || v === "" ? null : Number(v);
    })(),
    delivEmpId: (() => {
      const v = item.delivEmpId ?? item.DelivEmpId;
      return v == null || v === "" ? null : Number(v);
    })(),
    deliveryEmployeeName: readNullableString(
      item,
      "deliveryEmployeeName",
      "DeliveryEmployeeName"
    ),
    requiresDeliveryEmployee: readBoolean(
      item,
      "requiresDeliveryEmployee",
      "RequiresDeliveryEmployee"
    ),
  };
}

export async function getSaleDeliveryContext(token: string, sthId: number) {
  const data = await apiFetch<Record<string, unknown>>(
    `SalesDelivery/${sthId}`,
    {},
    token
  );
  const deliveryRaw = data.delivery ?? data.Delivery;
  const servicesRaw = data.availableServices ?? data.AvailableServices;
  return {
    sthId: readNumber(data, "sth_Id", "Sth_Id", "sthId", "SthId"),
    pharmId: readNullableString(data, "pharmId", "PharmId"),
    billTyp: readNumber(data, "billTyp", "BillTyp"),
    delivery: mapSalesDeliveryInfo(
      deliveryRaw && typeof deliveryRaw === "object"
        ? (deliveryRaw as Record<string, unknown>)
        : null
    ),
    availableServices: Array.isArray(servicesRaw)
      ? servicesRaw.map((row) =>
          mapSalesServiceOption(row as Record<string, unknown>)
        )
      : [],
  } satisfies import("@/types/sales-delivery").SalesDeliveryContext;
}

export async function searchSaleDeliveryEmployees(
  token: string,
  search: string,
  take = 20
) {
  const q = new URLSearchParams({
    search: search.trim(),
    take: String(take),
  });
  const data = await apiFetch<unknown>(
    `SalesDelivery/employees?${q.toString()}`,
    {},
    token
  );
  const list = Array.isArray(data) ? data : [];
  return list.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      employInfoId: readNumber(r, "employInfoId", "EmployInfoId"),
      delivEmpId: readNumber(r, "delivEmpId", "DelivEmpId"),
      code: readNullableString(r, "code", "Code"),
      name: readNullableString(r, "name", "Name"),
    } satisfies import("@/types/sales-delivery").SalesDeliveryEmployee;
  });
}

export async function resolveSaleDeliveryEmployee(
  token: string,
  codeOrPassword: string
) {
  const data = await apiFetch<Record<string, unknown>>(
    "SalesDelivery/resolve-employee",
    {
      method: "POST",
      body: JSON.stringify({ CodeOrPassword: codeOrPassword }),
    },
    token
  );
  return {
    employInfoId: readNumber(data, "employInfoId", "EmployInfoId"),
    delivEmpId: readNumber(data, "delivEmpId", "DelivEmpId"),
    code: readNullableString(data, "code", "Code"),
    name: readNullableString(data, "name", "Name"),
  } satisfies import("@/types/sales-delivery").SalesDeliveryEmployee;
}

export async function upsertSaleDelivery(
  token: string,
  request: import("@/types/sales-delivery").UpsertSalesDeliveryRequest
) {
  const data = await apiFetch<Record<string, unknown>>(
    "SalesDelivery",
    {
      method: "PUT",
      body: JSON.stringify({
        Sth_Id: request.sthId,
        Cust_Id: request.custId,
        CustomerName: request.customerName,
        Tel: request.tel,
        Address: request.address,
        SalesServiceId: request.salesServiceId,
        DeliveryCodeOrPassword: request.deliveryCodeOrPassword,
      }),
    },
    token
  );
  return mapSalesDeliveryInfo(data)!;
}

function mapShiftStatus(data: Record<string, unknown>): import("@/types/shift").ShiftStatus {
  const parmRaw = data.parmId ?? data.ParmId;
  const scRaw = data.sc_Id ?? data.Sc_Id ?? data.scId ?? data.ScId;
  const balanceRaw = data.openingBalance ?? data.OpeningBalance;
  const moveRaw =
    data.move_Id ?? data.Move_Id ?? data.moveId ?? data.MovId ?? data.movId;
  return {
    parmId: parmRaw == null || parmRaw === "" ? null : Number(parmRaw),
    pharmacyName: readNullableString(data, "pharmacyName", "PharmacyName"),
    hasOpenShift: readBoolean(data, "hasOpenShift", "HasOpenShift"),
    status: readString(data, "status", "Status"),
    scId: scRaw == null || scRaw === "" ? null : Number(scRaw),
    openedAt: readNullableString(data, "openedAt", "OpenedAt"),
    openingBalance:
      balanceRaw == null || balanceRaw === "" ? null : Number(balanceRaw),
    openedBy: readNullableString(data, "openedBy", "OpenedBy"),
    cashier: readNullableString(data, "cashier", "Cashier"),
    notes: readNullableString(data, "notes", "Notes"),
    moveId: moveRaw == null || moveRaw === "" ? null : Number(moveRaw),
    movName: readNullableString(data, "movName", "MovName"),
  };
}

function mapShiftMovementOption(
  data: Record<string, unknown>
): import("@/types/shift").ShiftMovementOption {
  return {
    id: readNumber(data, "id", "Id"),
    movId: readNumber(data, "movId", "MovId"),
    movName: readNullableString(data, "movName", "MovName"),
    movParint: readNullableNumber(data, "movParint", "MovParint"),
  };
}

export async function getCurrentOpenShift(token: string) {
  const data = await apiFetch<Record<string, unknown>>("Shift/current", {}, token);
  return mapShiftStatus(data);
}

/**
 * Prefer Shift/movements. If that endpoint is missing (older API), fall back to
 * Salesmovment/by-parent for Sale (1) and Return Sale (2).
 */
export async function getShiftMovements(token: string) {
  try {
    const data = await apiFetch<unknown>("Shift/movements", {}, token);
    if (Array.isArray(data)) {
      return data.map((row) =>
        mapShiftMovementOption(row as Record<string, unknown>)
      );
    }
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }
  }

  const [sale, ret] = await Promise.all([
    getSalesmovmentByParent(1, token),
    getSalesmovmentByParent(2, token),
  ]);

  const options: import("@/types/shift").ShiftMovementOption[] = [];
  for (const row of [sale, ret]) {
    if (row.movId != null && row.movId > 0) {
      options.push({
        id: row.id,
        movId: row.movId,
        movName: row.movName,
        movParint: row.movParint,
      });
    }
  }

  const seen = new Set<number>();
  return options.filter((row) => {
    if (seen.has(row.movId)) return false;
    seen.add(row.movId);
    return true;
  });
}

export async function openShift(
  token: string,
  request: import("@/types/shift").OpenShiftRequest
) {
  const data = await apiFetch<Record<string, unknown>>(
    "Shift/open",
    {
      method: "POST",
      body: JSON.stringify({
        OpeningBalance: request.openingBalance ?? 0,
        Notes: request.notes,
        MovId: request.movId,
      }),
    },
    token
  );
  return mapShiftStatus(data);
}

/** Persist missing sales items (SalesNotExistItem) for the current open shift. */
export async function createSalesNotExistItems(
  token: string,
  request: import("@/types/sales-not-exist-item").CreateSalesNotExistItemsRequest
) {
  const data = await apiFetch<Record<string, unknown>>(
    "SalesNotExistItem",
    {
      method: "POST",
      body: JSON.stringify({
        ItemCatalogIds: request.itemCatalogIds,
        CustId: request.custId ?? null,
      }),
    },
    token
  );
  return {
    savedCount: readNumber(data, "savedCount", "SavedCount"),
    shId: readNumber(data, "shId", "Sh_Id", "ShId"),
    movId: readNumber(data, "movId", "MovId"),
    pharmId: readString(data, "pharmId", "PharmId"),
  } satisfies import("@/types/sales-not-exist-item").CreateSalesNotExistItemsResponse;
}
