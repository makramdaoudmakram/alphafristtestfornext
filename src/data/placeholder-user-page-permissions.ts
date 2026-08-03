import {
  createEmptyActions,
  type PermissionModuleGroups,
} from "@/types/user-page-permissions";

/** Placeholder until User-Permissions API binding. */
export const PLACEHOLDER_USER_PAGE_PERMISSIONS: PermissionModuleGroups = [
  {
    module: "Purchase",
    permissions: [
      {
        id: 11001,
        name: "Purchase Invoice",
        actions: createEmptyActions({
          insert: true,
          update: true,
          save: true,
          validate: false,
          sendToReview: false,
        }),
      },
      {
        id: 11002,
        name: "Purchase Return",
        actions: createEmptyActions({ insert: true, delete: true }),
      },
      {
        id: 11003,
        name: "Purchase Order",
        actions: createEmptyActions(),
      },
      {
        id: 11004,
        name: "Vendor Payment",
        actions: createEmptyActions({ select: true, save: true }),
      },
      {
        id: 11005,
        name: "Vendor",
        actions: createEmptyActions({ insert: true, update: true, delete: true }),
      },
      {
        id: 11006,
        name: "Vendor Category",
        actions: createEmptyActions(),
      },
      {
        id: 11007,
        name: "Purchase Report",
        actions: createEmptyActions({ select: true }),
      },
    ],
  },
  {
    module: "Sales",
    permissions: [
      {
        id: 12001,
        name: "Sales Invoice",
        actions: createEmptyActions({
          insert: true,
          update: true,
          save: true,
          validate: true,
        }),
      },
      {
        id: 12002,
        name: "Sales Return",
        actions: createEmptyActions({ insert: true, delete: true }),
      },
      {
        id: 12003,
        name: "Sales Quotation",
        actions: createEmptyActions(),
      },
      {
        id: 12004,
        name: "Customer Receipt",
        actions: createEmptyActions({ save: true }),
      },
      {
        id: 12005,
        name: "Customer",
        actions: createEmptyActions({ insert: true, update: true, select: true }),
      },
      {
        id: 12006,
        name: "Customer Group",
        actions: createEmptyActions(),
      },
      {
        id: 12007,
        name: "Sales Report",
        actions: createEmptyActions({ select: true }),
      },
    ],
  },
  {
    module: "Inventory",
    permissions: [
      {
        id: 13001,
        name: "Items",
        actions: createEmptyActions({ insert: true, update: true, delete: true }),
      },
      {
        id: 13002,
        name: "Item Catalog",
        actions: createEmptyActions({ insert: true, update: true, save: true }),
      },
      {
        id: 13003,
        name: "Stock Adjustment",
        actions: createEmptyActions({ insert: true, validate: true }),
      },
      {
        id: 13004,
        name: "Warehouse",
        actions: createEmptyActions(),
      },
      {
        id: 13005,
        name: "Stock Transfer",
        actions: createEmptyActions({ sendToReview: true }),
      },
      {
        id: 13006,
        name: "Inventory Report",
        actions: createEmptyActions({ select: true }),
      },
    ],
  },
  {
    module: "Product Setting",
    permissions: [
      { id: 14001, name: "Units", actions: createEmptyActions() },
      { id: 14002, name: "Item Formats", actions: createEmptyActions() },
      { id: 14003, name: "Item Origins", actions: createEmptyActions() },
      {
        id: 14004,
        name: "Groups",
        actions: createEmptyActions({ insert: true, update: true }),
      },
    ],
  },
  {
    module: "Transactions",
    permissions: [
      { id: 15001, name: "Move Parient", actions: createEmptyActions() },
      { id: 15002, name: "Movement Setting", actions: createEmptyActions() },
      { id: 15003, name: "Transaction Log", actions: createEmptyActions({ select: true }) },
    ],
  },
  {
    module: "Account Setting",
    permissions: [
      {
        id: 16001,
        name: "Company",
        actions: createEmptyActions({ insert: true, update: true, save: true }),
      },
      { id: 16002, name: "Pharm", actions: createEmptyActions() },
      { id: 16003, name: "Branch", actions: createEmptyActions() },
      { id: 16004, name: "Fiscal Year", actions: createEmptyActions() },
    ],
  },
  {
    module: "Permission Setting",
    permissions: [
      { id: 17001, name: "Users", actions: createEmptyActions({ insert: true }) },
      { id: 17002, name: "Create Permission", actions: createEmptyActions() },
      { id: 17003, name: "Create Role", actions: createEmptyActions() },
      { id: 17004, name: "Assign User Roles", actions: createEmptyActions() },
      { id: 17005, name: "User Permissions", actions: createEmptyActions({ update: true }) },
      { id: 17006, name: "Role Permissions", actions: createEmptyActions() },
    ],
  },
  {
    module: "Reports",
    permissions: [
      {
        id: 18001,
        name: "Dashboard Overview",
        actions: createEmptyActions({ select: true }),
      },
      { id: 18002, name: "Financial Report", actions: createEmptyActions() },
      { id: 18003, name: "Audit Log", actions: createEmptyActions({ select: true }) },
    ],
  },
];

export function clonePermissionModules(
  modules: PermissionModuleGroups
): PermissionModuleGroups {
  return modules.map((group) => ({
    module: group.module,
    permissions: group.permissions.map((item) => ({
      ...item,
      actions: { ...item.actions },
    })),
  }));
}
