import { DIAGNOSTICS_NAV_PERMISSION } from "@/lib/diagnostics/diagnostics-types";
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
    title: "صيدليات",
    permission: PERMISSIONS.sales.view,
    items: [
      {
        title: "المبيعات",
        href: "/dashboard/sales",
        permission: PERMISSIONS.sales.view,
      },
      {
        title: "مرتجع المبيعات",
        href: "/dashboard/sales-return",
        permission: PERMISSIONS.sales.view,
      },
      {
        title: "المصاريف",
        href: "/dashboard/sales/pharm-expenses",
        permission: PERMISSIONS.sales.view,
      },
      {
        title: "كارت الصنف",
        href: "/dashboard/sales/item-card",
        permission: PERMISSIONS.sales.view,
      },
      {
        title: "العملاء",
        href: "/dashboard/sales/customers",
        permission: PERMISSIONS.customer.view,
      },
      {
        title: "مشتريات الفرع",
        href: "/dashboard/pharm/transactions/pharmacy-purchase",
        permission: PERMISSIONS.sales.view,
      },
      {
        title: "التحويلات من الصيدليات",
        href: "/dashboard/pharm/transactions/pharmacy-acceptance",
        permission: PERMISSIONS.sales.view,
      },
      {
        title: "التحويلات من المخزن",
        href: "/dashboard/pharm/transactions/stor-to-pharm",
        permission: PERMISSIONS.sales.view,
      },
     
      {
        title: "تحويل الصيدليات",
        href: "/dashboard/pharm/transactions/pharmacy-transfer",
        permission: PERMISSIONS.sales.view,
      },
    ],
  },
  {
    title: "Audit",
    items: [
      {
        title: "System Audit Center",
        href: "/dashboard/audit",
        permission: PERMISSIONS.permissions.manage,
      },
      {
        title: "Diagnostics",
        href: "/dashboard/diagnostics",
        permission: DIAGNOSTICS_NAV_PERMISSION,
      },
      {
        title: "Commit Documents",
        href: "/dashboard/reporting/commit-documents",
        permission: DIAGNOSTICS_NAV_PERMISSION,
      },
      {
        title: "Batch Traceability",
        href: "/dashboard/batch-traceability",
        permission: PERMISSIONS.batchTraceability.view,
      },
    ],
  },
  {
    title: "الاعدادات",
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
        title: "البيانات الرئيسية",
        items: [
          {
            title: "الوحدات",
            href: "/dashboard/units",
            permission: PERMISSIONS.unit.view,
          },
          {
            title: "شكل الجرعة",
            href: "/dashboard/item-formats",
            permission: PERMISSIONS.itemFormat.view,
          },
          {
            title: "Item Origins",
            href: "/dashboard/item-origins",
            permission: PERMISSIONS.itemOrigin.view,
          },
          {
            title: "Master Data",
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
        title: "اعداد الحركات",
        items: [
          {
            title: "نوع العمليات",
            href: "/dashboard/item-transactions",
            permission: PERMISSIONS.movParient.view,
          },
          {
            title: "تحديد حركات المخزون",
            href: "/dashboard/movement-setting",
            permission: PERMISSIONS.movment.view,
          },
          {
            title: "حركات المبيعات ",
            href: "/dashboard/sales-movement-setting",
            permission: PERMISSIONS.salesMovment.view,
          },
          {
            title: "بوش ليست",
            href: "/dashboard/settings/sales-push-list",
          },
          {
            title: "نوع البيع",
            href: "/dashboard/sales-kind",
          },
          {
            title: "تخصيص نوع البيع",
            href: "/dashboard/sales-kind-assignment",
            permission: PERMISSIONS.salesKindAssignment.view,
          },
          {
            title: "طرق الدفع للمبيعات",
            href: "/dashboard/sales-pay-method",
            permission: PERMISSIONS.salesPayMethod.view,
          },
          {
            title: "تخصيص طرق الدفع",
            href: "/dashboard/sales-payment-assiment",
            permission: PERMISSIONS.salesPaymentAssiment.view,
          },
          {
            title: "خدمات الصيدليات",
            href: "/dashboard/sales-service",
            permission: PERMISSIONS.salesService.view,
          },
          {
            title: "خدمات الصيدليات تخصيص ",
            href: "/dashboard/sales-service-assignment",
            permission: PERMISSIONS.salesServiceAssignment.view,
          },
        ],
      },
  
    ],
  },
   {
    title: "الحسابات",
  
   
        items: [
          {
            title: "الصيدليات",
            href: "/dashboard/pharm",
          },
          {
            title: "الشركات",
            href: "/dashboard/companies",
            permission: PERMISSIONS.company.view,
          },
          {
            title: "شجره الحسابات",
            href: "/dashboard/accounts-chart",
          },
          {
            title: "التحصيلات",
            href: "/dashboard/collection-voucher",
          },
          {
            title: "المدفوعات",
            href: "/dashboard/payment-voucher",
          },
          {
            title: "الاذون المعلقه",
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
            title: "مراكز التكلفه",
            href: "/dashboard/cost-centers",
          },
          {
            title: "بيانات الموظف",
            href: "/dashboard/employ-info",
          },
          {
            title: "المخازن",
            href: "/dashboard/stores",
          },
         
          {
            title: "الموردين",
            href: "/dashboard/vendors",
          },
            {
        title: "تعديل الفواتير المحفوظه",
        href: "/dashboard/transactions/purchase/reversal",
        permission: null,
      },
        ],
  
  },
  {
    title: "المخازن ",
    items: [
      {
        title: "المشتريات",
        href: "/dashboard/transactions/purchase",
        permission: null,
      },
    
      {
        title: "تسويه المشتريات",
        href: "/dashboard/transactions/purchase/invoice-draft",
        permission: null,
      },
      {
        title: "مرتجع موردين",
        href: "/dashboard/transactions/return",
        permission: null,
      },
      {
        title: "صادر صيدليات",
        href: "/dashboard/transactions/pharm-recive",
        permission: null,
      },
      {
        title: "الارصده",
        href: "/dashboard/inventory",
        permission: PERMISSIONS.stock.view,
      },
      {
        title: "تعديل الباتشات",
        href: "/dashboard/batch-management",
        permission: PERMISSIONS.stock.view,
      },
      {
        title: "جرود",
        href: "/dashboard/transactions/inventory-adjustment",
        permission: PERMISSIONS.stock.view,
      },
      {
        title: "تسويات الجرود",
        href: "/dashboard/transactions/inventory-adjustment/posting",
        permission: PERMISSIONS.stock.view,
      },
       {
        title: "التحويل من الصيدليات",
        href: "/dashboard/pharm/transactions/pharm-to-store",
        permission: PERMISSIONS.sales.view,
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
  "/dashboard/sales/item-card": "Item Card",
  "/dashboard/sales/customers": "Customers",
  "/dashboard/sales-test": "Sales Test",
  "/dashboard/admin/pharmacy-scope": "Pharmacy Scope",
  "/dashboard/diagnostics": "Diagnostics",
  "/dashboard/customers": "Customers",
  "/dashboard/item-formats": "Dosage Form",
  "/dashboard/item-origins": "Item Origins",
  "/dashboard/units": "Units",
  "/dashboard/companies": "Company",
  "/dashboard/pharm": "Pharm",
  "/dashboard/pharm/transactions/pharmacy-purchase": "Pharmacy Purchase",
  "/dashboard/pharm/transactions/pharmacy-acceptance": "Pharmacy Acceptance",
  "/dashboard/pharm/transactions/stor-to-pharm": "Store-to-Pharm",
  "/dashboard/pharm/transactions/pharm-to-store": "Pharm-to-Store",
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
  "/dashboard/item-catalog": "Master Data",
  "/dashboard/groups": "Groups",
  "/dashboard/brands": "Brands",
  "/dashboard/transactions/purchase": "Purchase",
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
