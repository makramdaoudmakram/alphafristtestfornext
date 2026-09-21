import { PERMISSIONS } from "@/lib/route-permissions";

export type NavLinkItem = {
  title: string;
  href: string;
  permission?: string | null;
};

export type NavGroupItem = {
  title: string;
  permission?: string | null;
  items: NavLinkItem[];
};

export type NavItem = {
  title: string;
  href?: string;
  permission?: string | null;
  /** Flat links directly under this parent */
  items?: NavLinkItem[];
  /** Grouped links (e.g. Permission Setting, Product Setting) */
  groups?: NavGroupItem[];
};

/** Top-level sidebar navigation */
export const SIDEBAR_NAV: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    permission: null,
  },
  {
    title: "Shift Management",
    href: "/dashboard/shift",
    permission: PERMISSIONS.sales.view,
  },
  {
    title: "Sales",
    permission: PERMISSIONS.sales.view,
    items: [
      {
        title: "Sales",
        href: "/dashboard/sales",
        permission: PERMISSIONS.sales.view,
      },
      {
        title: "Pharm Expenses",
        href: "/dashboard/sales/pharm-expenses",
        permission: PERMISSIONS.sales.view,
      },
    ],
  },
  {
    title: "System Audit Center",
    href: "/dashboard/audit",
    permission: PERMISSIONS.permissions.manage,
  },
  {
    title: "Settings",
    groups: [
      {
        title: "Permission Setting",
        items: [
          {
            title: "Users",
            href: "/dashboard/admin/users",
          },
          {
            title: "Create Permission",
            href: "/dashboard/admin/permissions",
          },
          {
            title: "Create Role",
            href: "/dashboard/admin/roles",
          },
          {
            title: "Assign User Roles",
            href: "/dashboard/admin/user-roles",
          },
          {
            title: "User Permissions",
            href: "/dashboard/admin/user-permissions",
          },
          {
            title: "Pharmacy Scope",
            href: "/dashboard/admin/pharmacy-scope",
          },
          {
            title: "Role Permissions",
            href: "/dashboard/permissions",
          },
        ],
      },
      {
        title: "Product Setting",
        items: [
          {
            title: "Units",
            href: "/dashboard/units",
            permission: PERMISSIONS.unit.view,
          },
          {
            title: "Dosage Form",
            href: "/dashboard/item-formats",
            permission: PERMISSIONS.itemFormat.view,
          },
          {
            title: "Item Origins",
            href: "/dashboard/item-origins",
            permission: PERMISSIONS.itemOrigin.view,
          },
          {
            title: "Item Catalog",
            href: "/dashboard/item-catalog",
            permission: PERMISSIONS.itemCatalog.view,
          },
          {
            title: "Groups",
            href: "/dashboard/groups",
            permission: PERMISSIONS.group.view,
          },
          {
            title: "Brands",
            href: "/dashboard/brands",
            permission: PERMISSIONS.brand.view,
          },
        ],
      },
      {
        title: "TransSetting",
        items: [
          {
            title: "Move Parient",
            href: "/dashboard/item-transactions",
            permission: PERMISSIONS.movParient.view,
          },
          {
            title: "Movement Setting",
            href: "/dashboard/movement-setting",
            permission: PERMISSIONS.movment.view,
          },
          {
            title: "Sales Movement",
            href: "/dashboard/sales-movement-setting",
            permission: PERMISSIONS.salesMovment.view,
          },
          {
            title: "Sales Push List",
            href: "/dashboard/settings/sales-push-list",
          },
        ],
      },
      {
        title: "Account Setting",
        items: [
          {
            title: "Pharm",
            href: "/dashboard/pharm",
          },
          {
            title: "Company",
            href: "/dashboard/companies",
            permission: PERMISSIONS.company.view,
          },
          {
            title: "Accounts Chart",
            href: "/dashboard/accounts-chart",
          },
          {
            title: "Collection Voucher",
            href: "/dashboard/collection-voucher",
          },
          {
            title: "Payment Voucher",
            href: "/dashboard/payment-voucher",
          },
          {
            title: "Pending Vouchers",
            href: "/dashboard/pending-vouchers",
          },
          {
            title: "Manual Journal",
            href: "/dashboard/manual-journal",
          },
          {
            title: "Journal",
            href: "/dashboard/journal",
          },
          {
            title: "Ledger",
            href: "/dashboard/ledger",
          },
          {
            title: "Cost Centers",
            href: "/dashboard/cost-centers",
          },
          {
            title: "Employee Info",
            href: "/dashboard/employ-info",
          },
          {
            title: "Stores",
            href: "/dashboard/stores",
          },
          {
            title: "Customers",
            href: "/dashboard/customers",
            permission: PERMISSIONS.customer.view,
          },
          {
            title: "Vendors",
            href: "/dashboard/vendors",
          },
          {
            title: "Sales Kind",
            href: "/dashboard/sales-kind",
          },
          {
            title: "Sales Kind Assignment",
            href: "/dashboard/sales-kind-assignment",
            permission: PERMISSIONS.salesKindAssignment.view,
          },
          {
            title: "Sales Payment Method",
            href: "/dashboard/sales-pay-method",
            permission: PERMISSIONS.salesPayMethod.view,
          },
          {
            title: "Sales Payment Assignment",
            href: "/dashboard/sales-payment-assiment",
            permission: PERMISSIONS.salesPaymentAssiment.view,
          },
          {
            title: "Sales Service",
            href: "/dashboard/sales-service",
            permission: PERMISSIONS.salesService.view,
          },
          {
            title: "Sales Service Assignment",
            href: "/dashboard/sales-service-assignment",
            permission: PERMISSIONS.salesServiceAssignment.view,
          },
        ],
      },
    ],
  },
  {
    title: "Store Management",
    groups: [
      {
        title: "Pharmacy",
        items: [
          {
            title: "Pharmacy Purchase",
            href: "/dashboard/pharm/transactions/pharmacy-purchase",
            permission: PERMISSIONS.sales.view,
          },
          {
            title: "Pharmacy Acceptance",
            href: "/dashboard/pharm/transactions/pharmacy-acceptance",
            permission: PERMISSIONS.sales.view,
          },
          {
            title: "Store-to-Pharm",
            href: "/dashboard/pharm/transactions/stor-to-pharm",
            permission: PERMISSIONS.sales.view,
          },
          {
            title: "Pharmacy Transfer",
            href: "/dashboard/pharm/transactions/pharmacy-transfer",
            permission: PERMISSIONS.sales.view,
          },
        ],
      },
    ],
    items: [
      {
        title: "Purchase",
        href: "/dashboard/transactions/purchase",
        permission: null,
      },
      {
        title: "MongoDB Test",
        href: "/dashboard/reporting/mongo-test",
        permission: null,
      },
      {
        title: "Purchase Invoice Reversal",
        href: "/dashboard/transactions/purchase/reversal",
        permission: null,
      },
      {
        title: "Invoice Draft",
        href: "/dashboard/transactions/purchase/invoice-draft",
        permission: null,
      },
      {
        title: "Return",
        href: "/dashboard/transactions/return",
        permission: null,
      },
      {
        title: "Pharmacy Receiving",
        href: "/dashboard/transactions/pharm-recive",
        permission: null,
      },
      {
        title: "Inventory",
        href: "/dashboard/inventory",
        permission: PERMISSIONS.stock.view,
      },
      {
        title: "Batch Management",
        href: "/dashboard/batch-management",
        permission: PERMISSIONS.stock.view,
      },
      {
        title: "Batch Traceability",
        href: "/dashboard/batch-traceability",
        permission: PERMISSIONS.batchTraceability.view,
      },
      {
        title: "Inventory Adjustment",
        href: "/dashboard/transactions/inventory-adjustment",
        permission: PERMISSIONS.stock.view,
      },
      {
        title: "Inventory Adjustment Posting",
        href: "/dashboard/transactions/inventory-adjustment/posting",
        permission: PERMISSIONS.stock.view,
      },
    ],
  },
];

export const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/audit": "System Audit Center",
  "/dashboard/admin/permissions": "Create Permission",
  "/dashboard/admin/roles": "Create Role",
  "/dashboard/admin/users": "Users",
  "/dashboard/admin/user-roles": "Assign User Roles",
  "/dashboard/admin/user-permissions": "User Permissions",
  "/dashboard/permissions": "Role Permissions",
  "/dashboard/shift": "Shift Management",
  "/dashboard/sales": "Sales",
  "/dashboard/sales/pharm-expenses": "Pharm Expenses",
  "/dashboard/sales-test": "Sales Test",
  "/dashboard/admin/pharmacy-scope": "Pharmacy Scope",
  "/dashboard/customers": "Customers",
  "/dashboard/item-formats": "Dosage Form",
  "/dashboard/item-origins": "Item Origins",
  "/dashboard/units": "Units",
  "/dashboard/companies": "Company",
  "/dashboard/pharm": "Pharm",
  "/dashboard/pharm/transactions/pharmacy-purchase": "Pharmacy Purchase",
  "/dashboard/pharm/transactions/pharmacy-acceptance": "Pharmacy Acceptance",
  "/dashboard/pharm/transactions/stor-to-pharm": "Store-to-Pharm",
  "/dashboard/pharm/transactions/pharmacy-transfer": "Pharmacy Transfer",
  "/dashboard/accounts-chart": "Accounts Chart",
  "/dashboard/collection-voucher": "Collection Voucher",
  "/dashboard/payment-voucher": "Payment Voucher",
  "/dashboard/pending-vouchers": "Pending Vouchers",
  "/dashboard/manual-journal": "Manual Journal",
  "/dashboard/journal": "Journal",
  "/dashboard/ledger": "Ledger",
  "/dashboard/cost-centers": "Cost Centers",
  "/dashboard/employ-info": "Employee Info",
  "/dashboard/stores": "Stores",
  "/dashboard/vendors": "Vendors",
  "/dashboard/item-catalog": "Item Catalog",
  "/dashboard/groups": "Groups",
  "/dashboard/brands": "Brands",
  "/dashboard/transactions/purchase": "Purchase",
  "/dashboard/reporting/mongo-test": "MongoDB Test",
  "/dashboard/transactions/purchase/reversal": "Purchase Invoice Reversal",
  "/dashboard/transactions/purchase/invoice-draft": "Invoice Draft",
  "/dashboard/transactions/return": "Return",
  "/dashboard/transactions/pharm-recive": "Pharmacy Receiving",
  "/dashboard/transactions/pharm-recive/import": "Pharmacy Receiving Excel Import",
  "/dashboard/transactions/purchase/import": "Import Purchase Excel",
  "/dashboard/inventory": "Inventory",
  "/dashboard/batch-management": "Batch Management",
  "/dashboard/batch-traceability": "Batch Traceability",
  "/dashboard/stock": "Inventory",
  "/dashboard/transactions/inventory-adjustment": "Inventory Adjustment",
  "/dashboard/transactions/inventory-adjustment/posting":
    "Inventory Adjustment Posting",
  "/dashboard/item-transactions": "Move Parient",
  "/dashboard/movement-setting": "Movement Setting",
  "/dashboard/sales-movement-setting": "Sales Movement",
  "/dashboard/settings/sales-push-list": "SalesPushList",
  "/dashboard/sales-kind": "Sales Kind",
  "/dashboard/sales-kind-assignment": "Sales Kind Assignment",
  "/dashboard/sales-pay-method": "Sales Payment Method",
  "/dashboard/sales-payment-assiment": "Sales Payment Assignment",
  "/dashboard/sales-service": "Sales Service",
  "/dashboard/sales-service-assignment": "Sales Service Assignment",
};
