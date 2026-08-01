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
    title: "Settings",
    groups: [
      {
        title: "Permission Setting",
        items: [
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
            title: "Company",
            href: "/dashboard/companies",
            permission: PERMISSIONS.company.view,
          },
        ],
      },
    ],
  },
  {
    title: "Customers",
    href: "/dashboard/customers",
    permission: PERMISSIONS.customer.view,
  },
  {
    title: "Transaction",
    items: [
      {
        title: "Purchase",
        href: "/dashboard/transactions/purchase",
        permission: null,
      },
    ],
  },
];

export const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/admin/permissions": "Create Permission",
  "/dashboard/admin/roles": "Create Role",
  "/dashboard/admin/user-roles": "Assign User Roles",
  "/dashboard/admin/user-permissions": "User Permissions",
  "/dashboard/permissions": "Role Permissions",
  "/dashboard/customers": "Customers",
  "/dashboard/item-formats": "Item Formats",
  "/dashboard/item-origins": "Item Origins",
  "/dashboard/units": "Units",
  "/dashboard/companies": "Company",
  "/dashboard/item-catalog": "Item Catalog",
  "/dashboard/groups": "Groups",
  "/dashboard/transactions/purchase": "Purchase",
  "/dashboard/item-transactions": "Move Parient",
  "/dashboard/movement-setting": "Movement Setting",
};
