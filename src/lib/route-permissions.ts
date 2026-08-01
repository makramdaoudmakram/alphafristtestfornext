/** Maps dashboard routes to required page permissions */
export const ROUTE_PERMISSIONS: Record<string, string | null> = {
  "/dashboard": null,
  "/dashboard/permissions": "Permissions.Manage",
  "/dashboard/admin/permissions": "Permissions.Manage",
  "/dashboard/admin/roles": "Permissions.Manage",
  "/dashboard/admin/user-roles": "Permissions.Manage",
  "/dashboard/admin/user-permissions": "Permissions.Manage",
  "/dashboard/customers": "Customer.View",
  "/dashboard/units": "Unit.View",
  "/dashboard/item-formats": "ItemFormat.View",
  "/dashboard/item-origins": "ItemOrigin.View",
  "/dashboard/companies": "Company.View",
  "/dashboard/item-catalog": "ItemCatalog.View",
  "/dashboard/groups": "Group.View",
  "/dashboard/transactions/purchase": null,
  "/dashboard/item-transactions": null,
  "/dashboard/movement-setting": null,
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
  company: {
    view: "Company.View",
    create: "Company.Create",
    edit: "Company.Edit",
    delete: "Company.Delete",
  },
  itemCatalog: {
    view: "ItemCatalog.View",
    create: "ItemCatalog.Create",
    edit: "ItemCatalog.Edit",
    delete: "ItemCatalog.Delete",
  },
  group: {
    view: "Group.View",
    create: "Group.Create",
    edit: "Group.Edit",
    delete: "Group.Delete",
  },
  purchase: {
    /** Set when PurTransH RBAC is seeded on Alfa API */
    view: null as string | null,
  },
  movParient: {
    /** Set when MovParient RBAC is seeded on Alfa API */
    view: null as string | null,
    create: null as string | null,
    edit: null as string | null,
    delete: null as string | null,
  },
  movment: {
    view: null as string | null,
    create: null as string | null,
    edit: null as string | null,
    delete: null as string | null,
  },
  permissions: {
    manage: "Permissions.Manage",
  },
} as const;

export const NAV_LINKS = [
  { href: "/dashboard", label: "Overview", permission: null },
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
    label: "Item Formats",
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
    href: "/dashboard/item-catalog",
    label: "Item Catalog",
    permission: PERMISSIONS.itemCatalog.view,
  },
  {
    href: "/dashboard/groups",
    label: "Groups",
    permission: PERMISSIONS.group.view,
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
] as const;

export const PERMISSION_TYPES = ["Page", "Control", "Action"] as const;
