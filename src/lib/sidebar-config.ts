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
    title: "Sales Test",
    href: "/dashboard/sales-test",
    permission: PERMISSIONS.sales.view,
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
            title: "Item Formats",
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
        ],
      },
    ],
  },
  {
    title: "Transaction",
    items: [
      {
        title: "Purchase",
        href: "/dashboard/transactions/purchase",
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
  "/dashboard/sales-test": "Sales Test",
  "/dashboard/admin/pharmacy-scope": "Pharmacy Scope",
  "/dashboard/customers": "Customers",
  "/dashboard/item-formats": "Item Formats",
  "/dashboard/item-origins": "Item Origins",
  "/dashboard/units": "Units",
  "/dashboard/companies": "Company",
  "/dashboard/pharm": "Pharm",
  "/dashboard/accounts-chart": "Accounts Chart",
  "/dashboard/collection-voucher": "Collection Voucher",
  "/dashboard/payment-voucher": "Payment Voucher",
  "/dashboard/pending-vouchers": "Pending Vouchers",
  "/dashboard/manual-journal": "Manual Journal",
  "/dashboard/journal": "Journal",
  "/dashboard/ledger": "Ledger",
  "/dashboard/cost-centers": "Cost Centers",
  "/dashboard/stores": "Stores",
  "/dashboard/vendors": "Vendors",
  "/dashboard/item-catalog": "Item Catalog",
  "/dashboard/groups": "Groups",
  "/dashboard/transactions/purchase": "Purchase",
  "/dashboard/transactions/purchase/reversal": "Purchase Invoice Reversal",
  "/dashboard/transactions/purchase/invoice-draft": "Invoice Draft",
  "/dashboard/transactions/return": "Return",
  "/dashboard/transactions/pharm-recive": "Pharmacy Receiving",
  "/dashboard/transactions/pharm-recive/import": "Pharmacy Receiving Excel Import",
  "/dashboard/transactions/purchase/import": "Import Purchase Excel",
  "/dashboard/inventory": "Inventory",
  "/dashboard/batch-management": "Batch Management",
  "/dashboard/stock": "Inventory",
  "/dashboard/transactions/inventory-adjustment": "Inventory Adjustment",
  "/dashboard/transactions/inventory-adjustment/posting":
    "Inventory Adjustment Posting",
  "/dashboard/item-transactions": "Move Parient",
  "/dashboard/movement-setting": "Movement Setting",
};
