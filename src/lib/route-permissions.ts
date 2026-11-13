/** `false` = registered dashboard route is unknown → deny (fail closed). */
export type RouteViewPermission = string | string[] | null | false;

/** Maps dashboard routes to required page permissions */
export const ROUTE_PERMISSIONS: Record<string, RouteViewPermission> = {
  "/dashboard": null,
  "/dashboard/audit": "Permissions.Manage",
  "/dashboard/permissions": "Permissions.Manage",
  "/dashboard/admin/permissions": "Permissions.Manage",
  "/dashboard/admin/roles": "Permissions.Manage",
  "/dashboard/admin/user-roles": "Permissions.Manage",
  "/dashboard/admin/user-permissions": "Permissions.Manage",
  "/dashboard/admin/pharmacy-authorization": "Permissions.Manage",
  "/dashboard/admin/head-office-store-assignments": "Users.Edit",
  "/dashboard/admin/users": "Users.View",
  "/dashboard/admin/users/create": "Users.Create",
  "/dashboard/customers": "Customer.View",
  "/dashboard/units": "Unit.View",
  "/dashboard/item-formats": "ItemFormat.View",
  "/dashboard/item-origins": "ItemOrigin.View",
  "/dashboard/companies": "Company.View",
  "/dashboard/pharm": "Pharm.View",
  "/dashboard/pharmacy": "Sales.View",
  "/dashboard/accounts-chart": "AccountsChart.View",
  "/dashboard/collection-voucher": "CollectedVoucher.View",
  "/dashboard/payment-voucher": "PaymentVoucher.View",
  "/dashboard/pending-vouchers": ["CollectedVoucher.View", "PaymentVoucher.View"],
  "/dashboard/manual-journal": "GeneralLedger.CreateJournal",
  "/dashboard/journal": "GeneralLedger.View",
  "/dashboard/ledger": "GeneralLedger.View",
  "/dashboard/cost-centers": "CostCenter.View",
  "/dashboard/stores": "Stor.View",
  "/dashboard/vendors": "Vendor.View",
  "/dashboard/sales-kind": "SalesKind.View",
  "/dashboard/sales-payment-classify": "SalesPaymentClassify.View",
  "/dashboard/sales-kind-assignment": "SalesKindAssignment.View",
  "/dashboard/sales-pay-method": "SalesPayMethod.View",
  "/dashboard/sales-service": "SalesService.View",
  "/dashboard/sales-service-assignment": "SalesServiceAssignment.View",
  "/dashboard/sales-payment-assiment": "SalesPaymentAssiment.View",
  "/dashboard/stock": "Stock.View",
  "/dashboard/inventory": "Stock.View",
  "/dashboard/inventory/store-summary": [
    "StoreStockSummary.View",
    "Stock.View",
  ],
  "/dashboard/stores/delivery-monitoring": "DeliveryMonitoring.View",
  "/dashboard/stores/inventory-adjustment-report": "InventoryAdjustmentReport.View",
  "/dashboard/batch-management": ["BatchManagement.View", "Stock.View"],
  "/dashboard/batch-traceability": "BatchTraceability.View",
  "/dashboard/transactions/inventory-adjustment": "InventoryAdjustment.View",
  "/dashboard/transactions/inventory-adjustment/posting": "InventoryAdjustment.View",
  "/dashboard/item-catalog": "ItemCatalog.View",
  "/dashboard/groups": "Group.View",
  "/dashboard/brands": "Brand.View",
  "/dashboard/employ-info": "EmployInfo.View",
  "/dashboard/transactions/purchase": "Purchase.View",
  "/dashboard/pharm/transactions/pharmacy-purchase": "PharmPurchase.View",
  "/dashboard/pharm/transactions/pharmacy-purchase-return": "PharmPurchaseReturn.View",
  "/dashboard/sales/pending": "Sales.View",
  "/dashboard/sales/delivery": "Sales.View",
  "/dashboard/pharm/shift-print": "Sales.View",
  "/dashboard/pharm/sales-invoice-report": "Sales.View",
  "/dashboard/admin/pharmacy-scope": "PharmacyScope.Manage",
  "/dashboard/admin/pharmacy-page-access": "PharmacyPageAccess.Manage",
  "/dashboard/admin/responsibility-profiles": "ResponsibilityProfiles.Manage",
  "/dashboard/transactions/pharm-recive": "Movment.View",
  "/dashboard/transactions/pharm-recive/import": "Movment.View",
  "/dashboard/transactions/purchase/import": "Purchase.View",
  "/dashboard/ledger-import": "LegacyLedger.Import",
  "/dashboard/diagnostics": null,
  "/dashboard/reporting/commit-documents": null,
  "/dashboard/audit/sqlite-verification": null,
  "/dashboard/audit/sqlite-explorer": null,
  "/dashboard/sales-test": "Sales.View",
  "/dashboard/reporting/mongo-test": null,
  "/dashboard/customers/:accountId": "Customer.View",
  "/dashboard/vendors/:accountId": "Vendor.View",
  "/dashboard/pharm/transactions/pharmacy-acceptance": "Sales.View",
  "/dashboard/pharm/transactions/stor-to-pharm": "Sales.View",
  "/dashboard/pharm/transactions/accepted-pharmacy-orders": "PharmReciveAcceptedOrders.View",
  "/dashboard/pharm/transactions/pharm-to-store": "Sales.View",
  "/dashboard/pharm/transactions/pharm-to-store-send": "Sales.View",
  "/dashboard/pharm/transactions/pharmacy-transfer": "Sales.View",
  "/dashboard/transactions/purchase/reversal": "Purchase.View",
  "/dashboard/transactions/purchase/invoice-draft": "Purchase.View",
  "/dashboard/transactions/return": "PurchaseReturn.View",
  "/dashboard/item-transactions": "MovParient.View",
  "/dashboard/movement-setting": "Movment.View",
  "/dashboard/sales-movement-setting": "Salesmovment.View",
  "/dashboard/settings/sales-push-list": "SalesPushList.View",
  "/dashboard/sales": "Sales.View",
  "/dashboard/sales-return": "Sales.View",
  "/dashboard/sales/pharm-expenses": "PharmExpenses.View",
  "/dashboard/sales/item-card": "ItemCard.View",
  "/dashboard/sales/customers": "Customer.View",
  "/dashboard/shift": "Sales.View",
  "/dashboard/pharm/sales-details-report": "SalesDetailsReport.View",
};

export const PERMISSIONS = {
  customer: {
    view: "Customer.View",
    create: "Customer.Create",
    edit: "Customer.Edit",
    delete: "Customer.Delete",
    export: "Customer.Export",
    page: "CustomerPage",
    saveButton: "CustomerPage.SaveButton",
    deleteButton: "CustomerPage.DeleteButton",
  },
  itemFormat: {
    view: "ItemFormat.View",
    create: "ItemFormat.Create",
    edit: "ItemFormat.Edit",
    delete: "ItemFormat.Delete",
  },
  unit: {
    view: "Unit.View",
    create: "Unit.Create",
    edit: "Unit.Edit",
    delete: "Unit.Delete",
  },
  itemOrigin: {
    view: "ItemOrigin.View",
    create: "ItemOrigin.Create",
    edit: "ItemOrigin.Edit",
    delete: "ItemOrigin.Delete",
  },
  vendor: {
    view: "Vendor.View",
    create: "Vendor.Create",
    edit: "Vendor.Edit",
    delete: "Vendor.Delete",
  },
  costCenter: {
    view: "CostCenter.View",
    create: "CostCenter.Create",
    edit: "CostCenter.Edit",
    delete: "CostCenter.Delete",
  },
  company: {
    view: "Company.View",
    create: "Company.Create",
    edit: "Company.Edit",
    delete: "Company.Delete",
    import: "Company.Import",
    export: "Company.Export",
  },
  pharm: {
    view: "Pharm.View",
    create: "Pharm.Create",
    edit: "Pharm.Edit",
    delete: "Pharm.Delete",
  },
  stock: {
    view: "Stock.View",
  },
  batchManagement: {
    view: "BatchManagement.View",
  },
  storeStockSummary: {
    view: "StoreStockSummary.View",
  },
  stor: {
    view: "Stor.View",
    create: "Stor.Create",
    edit: "Stor.Edit",
    delete: "Stor.Delete",
  },
  inventoryAdjustment: {
    view: "InventoryAdjustment.View",
    create: "InventoryAdjustment.Create",
    edit: "InventoryAdjustment.Edit",
    delete: "InventoryAdjustment.Delete",
    post: "InventoryAdjustment.Post",
  },
  batchTraceability: {
    view: "BatchTraceability.View",
  },
  itemCatalog: {
    view: "ItemCatalog.View",
    create: "ItemCatalog.Create",
    edit: "ItemCatalog.Edit",
    delete: "ItemCatalog.Delete",
    import: "ItemCatalog.Import",
    export: "ItemCatalog.Export",
  },
  group: {
    view: "Group.View",
    create: "Group.Create",
    edit: "Group.Edit",
    delete: "Group.Delete",
  },
  brand: {
    view: "Brand.View",
    create: "Brand.Create",
    edit: "Brand.Edit",
    delete: "Brand.Delete",
  },
  salesPayMethod: {
    view: "SalesPayMethod.View",
    create: "SalesPayMethod.Create",
    edit: "SalesPayMethod.Edit",
    delete: "SalesPayMethod.Delete",
  },
  salesService: {
    view: "SalesService.View",
    create: "SalesService.Create",
    edit: "SalesService.Edit",
    delete: "SalesService.Delete",
  },
  salesServiceAssignment: {
    view: "SalesServiceAssignment.View",
    create: "SalesServiceAssignment.Create",
    edit: "SalesServiceAssignment.Edit",
    delete: "SalesServiceAssignment.Delete",
  },
  salesKind: {
    view: "SalesKind.View",
  },
  salesPaymentClassify: {
    view: "SalesPaymentClassify.View",
  },
  salesPushList: {
    view: "SalesPushList.View",
  },
  salesKindAssignment: {
    view: "SalesKindAssignment.View",
    create: "SalesKindAssignment.Create",
    edit: "SalesKindAssignment.Edit",
    delete: "SalesKindAssignment.Delete",
  },
  salesPaymentAssiment: {
    view: "SalesPaymentAssiment.View",
    create: "SalesPaymentAssiment.Create",
    edit: "SalesPaymentAssiment.Edit",
    delete: "SalesPaymentAssiment.Delete",
  },
  employInfo: {
    view: "EmployInfo.View",
    create: "EmployInfo.Create",
    edit: "EmployInfo.Edit",
    delete: "EmployInfo.Delete",
  },
  itemCard: {
    view: "ItemCard.View",
  },
  pharmExpenses: {
    view: "PharmExpenses.View",
    create: "PharmExpenses.Create",
  },
  accountsChart: {
    view: "AccountsChart.View",
  },
  collectedVoucher: {
    view: "CollectedVoucher.View",
  },
  paymentVoucher: {
    view: "PaymentVoucher.View",
  },
  generalLedger: {
    view: "GeneralLedger.View",
    createJournal: "GeneralLedger.CreateJournal",
  },
  purchase: {
    view: "Purchase.View",
  },
  purchaseReturn: {
    view: "PurchaseReturn.View",
  },
  movParient: {
    view: "MovParient.View",
    create: null as string | null,
    edit: null as string | null,
    delete: null as string | null,
  },
  movment: {
    view: "Movment.View",
    create: null as string | null,
    edit: null as string | null,
    delete: null as string | null,
  },
  salesMovment: {
    view: null as string | null,
    edit: null as string | null,
  },
  permissions: {
    manage: "Permissions.Manage",
  },
  responsibilityProfiles: {
    manage: "ResponsibilityProfiles.Manage",
  },
  pharmacyScope: {
    manage: "PharmacyScope.Manage",
  },
  sales: {
    view: "Sales.View",
  },
  salesReturn: {
    view: "Sales.View",
    create: "SalesReturn.Create",
  },
  salesDetailsReport: {
    view: "SalesDetailsReport.View",
    historySearch: "SalesDetailsReport.HistorySearch",
  },
  deliveryMonitoring: {
    view: "DeliveryMonitoring.View",
  },
  inventoryAdjustmentReport: {
    view: "InventoryAdjustmentReport.View",
  },
  pharmReciveAcceptedOrders: {
    view: "PharmReciveAcceptedOrders.View",
  },
  users: {
    view: "Users.View",
    create: "Users.Create",
    edit: "Users.Edit",
    delete: "Users.Delete",
  },
  pharmPurchase: {
    view: "PharmPurchase.View",
  },
  pharmPurchaseReturn: {
    view: "PharmPurchaseReturn.View",
  },
  pharmacyPageAccess: {
    manage: "PharmacyPageAccess.Manage",
  },
} as const;

import { resolveCentralRoutePermission } from "@/lib/authorization/registry-state";

/** Resolve Level 2 permission for a dashboard path (exact or dynamic customer/vendor detail). */
export function getRoutePermissionForPath(pathname: string): RouteViewPermission {
  const fromRegistry = resolveCentralRoutePermission(pathname);
  if (fromRegistry !== undefined) {
    return fromRegistry;
  }

  const normalized = pathname.replace(/\/$/, "") || "/dashboard";
  if (normalized in ROUTE_PERMISSIONS) {
    return ROUTE_PERMISSIONS[normalized as keyof typeof ROUTE_PERMISSIONS];
  }
  if (/^\/dashboard\/customers\/[^/]+$/.test(normalized)) {
    return ROUTE_PERMISSIONS["/dashboard/customers/:accountId"] ?? null;
  }
  if (/^\/dashboard\/vendors\/[^/]+$/.test(normalized)) {
    return ROUTE_PERMISSIONS["/dashboard/vendors/:accountId"] ?? null;
  }
  if (normalized.startsWith("/dashboard")) {
    return false;
  }
  return null;
}

export function resolveNavLinkPermission(
  href: string,
  explicit?: string | null
): RouteViewPermission {
  if (explicit) {
    return explicit;
  }
  return getRoutePermissionForPath(href);
}

export const NAV_LINKS = [
  { href: "/dashboard", label: "Overview", permission: null },
  {
    href: "/dashboard/audit",
    label: "System Audit Center",
    permission: PERMISSIONS.permissions.manage,
  },
  {
    href: "/dashboard/admin/permissions",
    label: "Create Permissions",
    permission: PERMISSIONS.permissions.manage,
  },
  {
    href: "/dashboard/admin/roles",
    label: "Create Roles",
    permission: PERMISSIONS.permissions.manage,
  },
  {
    href: "/dashboard/admin/users",
    label: "Users",
    permission: PERMISSIONS.users.view,
  },
  {
    href: "/dashboard/admin/user-roles",
    label: "Assign User Roles",
    permission: PERMISSIONS.permissions.manage,
  },
  {
    href: "/dashboard/permissions",
    label: "Role Permissions",
    permission: PERMISSIONS.permissions.manage,
  },
  {
    href: "/dashboard/vendors",
    label: "Vendors",
    permission: null,
  },
  {
    href: "/dashboard/sales-kind",
    label: "Sales Kind",
    permission: null,
  },
  {
    href: "/dashboard/sales-payment-classify",
    label: "Sales Payment Classification",
    permission: null,
  },
  {
    href: "/dashboard/sales-kind-assignment",
    label: "Sales Kind Assignment",
    permission: PERMISSIONS.salesKindAssignment.view,
  },
  {
    href: "/dashboard/sales-pay-method",
    label: "Sales Payment Method",
    permission: PERMISSIONS.salesPayMethod.view,
  },
  {
    href: "/dashboard/sales-service",
    label: "Sales Service",
    permission: PERMISSIONS.salesService.view,
  },
  {
    href: "/dashboard/sales-service-assignment",
    label: "Sales Service Assignment",
    permission: PERMISSIONS.salesServiceAssignment.view,
  },
  {
    href: "/dashboard/sales-payment-assiment",
    label: "Sales Payment Assignment",
    permission: PERMISSIONS.salesPaymentAssiment.view,
  },
  {
    href: "/dashboard/customers",
    label: "Customers",
    permission: PERMISSIONS.customer.view,
  },
  {
    href: "/dashboard/units",
    label: "Units",
    permission: PERMISSIONS.unit.view,
  },
  {
    href: "/dashboard/item-formats",
    label: "Dosage Form",
    permission: PERMISSIONS.itemFormat.view,
  },
  {
    href: "/dashboard/item-origins",
    label: "Item Origins",
    permission: PERMISSIONS.itemOrigin.view,
  },
  {
    href: "/dashboard/companies",
    label: "Company",
    permission: PERMISSIONS.company.view,
  },
  {
    href: "/dashboard/pharm",
    label: "Pharm",
    permission: PERMISSIONS.pharm.view,
  },
  {
    href: "/dashboard/item-catalog",
    label: "Master Data",
    permission: PERMISSIONS.itemCatalog.view,
  },
  {
    href: "/dashboard/groups",
    label: "Groups",
    permission: PERMISSIONS.group.view,
  },
  {
    href: "/dashboard/brands",
    label: "Brands",
    permission: PERMISSIONS.brand.view,
  },
  {
    href: "/dashboard/item-transactions",
    label: "Move Parient",
    permission: PERMISSIONS.movParient.view,
  },
  {
    href: "/dashboard/movement-setting",
    label: "Movement Setting",
    permission: PERMISSIONS.movment.view,
  },
  {
    href: "/dashboard/sales-movement-setting",
    label: "Sales Movement",
    permission: PERMISSIONS.salesMovment.view,
  },
] as const;

export const PERMISSION_TYPES = ["Page", "Control", "Action"] as const;
