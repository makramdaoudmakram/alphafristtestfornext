import { DIAGNOSTICS_NAV_PERMISSION } from "@/lib/diagnostics/diagnostics-types";
import { LEGACY_LEDGER_NAV_PERMISSION } from "@/lib/legacy-ledger-api";
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
    title: "صيدليات",
    items: [
      {
        title: "لوحة الصيدلية",
        href: "/dashboard/pharmacy",
        permission: PERMISSIONS.sales.view,
      },
      {
        title: "المبيعات",
        href: "/dashboard/sales",
        permission: PERMISSIONS.sales.view,
      },
      {
        title: "المبيعات المعلقة",
        href: "/dashboard/sales/pending",
        permission: PERMISSIONS.sales.view,
      },
      {
        title: "طلبات التوصيل المعلقة",
        href: "/dashboard/sales/delivery",
        permission: PERMISSIONS.sales.view,
      },
      {
    title: "اغلاق الشفت",
    href: "/dashboard/shift",
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
        permission: PERMISSIONS.pharmExpenses.view,
      },
      {
        title: "كارت الصنف",
        href: "/dashboard/sales/item-card",
        permission: PERMISSIONS.itemCard.view,
      },
   
      {
        title: "مشتريات الفرع",
        href: "/dashboard/pharm/transactions/pharmacy-purchase",
        permission: PERMISSIONS.pharmPurchase.view,
      },
      {
        title: "مرتجع مشتريات الفرع",
        href: "/dashboard/pharm/transactions/pharmacy-purchase-return",
        permission: PERMISSIONS.pharmPurchaseReturn.view,
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
        title: "Accepted pharmacy orders",
        href: "/dashboard/pharm/transactions/accepted-pharmacy-orders",
        permission: PERMISSIONS.pharmReciveAcceptedOrders.view,
      },
     
      {
        title: "تحويل الصيدليات",
        href: "/dashboard/pharm/transactions/pharmacy-transfer",
        permission: PERMISSIONS.sales.view,
      },
      {
        title: "مرتجع الصيدلية للمخزن الرئيسي",
        href: "/dashboard/pharm/transactions/pharm-to-store-send",
        permission: PERMISSIONS.sales.view,
      },
        {
        title: "جرود",
        href: "/dashboard/transactions/inventory-adjustment",
        permission: PERMISSIONS.inventoryAdjustment.view,
      },

       {
        title: "تقرير تسويات المخزون",
        href: "/dashboard/stores/inventory-adjustment-report",
        permission: PERMISSIONS.inventoryAdjustmentReport.view,
      },
    ],
    groups: [
      {
        title: "Report",
        items: [
          {
            title: "Shift Print",
            href: "/dashboard/pharm/shift-print",
            permission: PERMISSIONS.sales.view,
          },
          {
            title: "تقرير فواتير المبيعات",
            href: "/dashboard/pharm/sales-invoice-report",
            permission: PERMISSIONS.sales.view,
          },
          {
            title: "تقرير تفاصيل المبيعات",
            href: "/dashboard/pharm/sales-details-report",
            permission: PERMISSIONS.salesDetailsReport.view,
          },
        ],
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
        title: "SQLite Server Verification",
        href: "/dashboard/audit/sqlite-verification",
        permission: DIAGNOSTICS_NAV_PERMISSION,
      },
      {
        title: "SQLite Data Explorer",
        href: "/dashboard/audit/sqlite-explorer",
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
            title: "صلاحيات الصيدليات",
            href: "/dashboard/admin/pharmacy-authorization",
            permission: PERMISSIONS.permissions.manage,
          },
          {
            title: "Head Office Stores",
            href: "/dashboard/admin/head-office-store-assignments",
            permission: PERMISSIONS.users.edit,
          },
          {
            title: "صلاحيات صفحات الصيدليات",
            href: "/dashboard/admin/pharmacy-page-access",
            permission: PERMISSIONS.pharmacyPageAccess.manage,
          },
          {
            title: "Responsibility Profiles",
            href: "/dashboard/admin/responsibility-profiles",
            permission: PERMISSIONS.responsibilityProfiles.manage,
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
            title: "تصنيف طرق الدفع",
            href: "/dashboard/sales-payment-classify",
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
            permission: PERMISSIONS.pharm.view,
          },
          {
            title: "الشركات",
            href: "/dashboard/companies",
            permission: PERMISSIONS.company.view,
          },
             {
        title: "العملاء",
        href: "/dashboard/sales/customers",
        permission: PERMISSIONS.customer.view,
      },
          {
            title: "شجره الحسابات",
            href: "/dashboard/accounts-chart",
            permission: PERMISSIONS.accountsChart.view,
          },
          {
            title: "التحصيلات",
            href: "/dashboard/collection-voucher",
            permission: PERMISSIONS.collectedVoucher.view,
          },
          {
            title: "المدفوعات",
            href: "/dashboard/payment-voucher",
            permission: PERMISSIONS.paymentVoucher.view,
          },
          {
            title: "الاذون المعلقه",
            href: "/dashboard/pending-vouchers",
          },
          {
            title: "Manual Journal",
            href: "/dashboard/manual-journal",
            permission: PERMISSIONS.generalLedger.createJournal,
          },
          {
            title: "Journal",
            href: "/dashboard/journal",
            permission: PERMISSIONS.generalLedger.view,
          },
          {
            title: "Ledger",
            href: "/dashboard/ledger",
            permission: PERMISSIONS.generalLedger.view,
          },
          {
            title: "استيراد الأرصدة القديمة",
            href: "/dashboard/ledger-import",
            permission: LEGACY_LEDGER_NAV_PERMISSION,
          },
          {
            title: "مراكز التكلفه",
            href: "/dashboard/cost-centers",
            permission: PERMISSIONS.costCenter.view,
          },
          {
            title: "بيانات الموظف",
            href: "/dashboard/employ-info",
            permission: PERMISSIONS.employInfo.view,
          },
          {
            title: "المخازن",
            href: "/dashboard/stores",
            permission: PERMISSIONS.stor.view,
          },
         
          {
            title: "الموردين",
            href: "/dashboard/vendors",
            permission: PERMISSIONS.vendor.view,
          },
          {
        title: "تعديل الفواتير المحفوظه",
        href: "/dashboard/transactions/purchase/reversal",
        permission: PERMISSIONS.purchase.view,
      },
        ],
  
  },
  {
    title: "المخازن ",
    items: [
      {
        title: "المشتريات",
        href: "/dashboard/transactions/purchase",
        permission: PERMISSIONS.purchase.view,
      },
    
      {
        title: "تسويه المشتريات",
        href: "/dashboard/transactions/purchase/invoice-draft",
        permission: PERMISSIONS.purchase.view,
      },
      {
        title: "مرتجع موردين",
        href: "/dashboard/transactions/return",
        permission: PERMISSIONS.purchaseReturn.view,
      },
      {
        title: "صادر صيدليات",
        href: "/dashboard/transactions/pharm-recive",
        permission: PERMISSIONS.movment.view,
      },
      {
        title: "الارصده",
        href: "/dashboard/inventory",
        permission: PERMISSIONS.stock.view,
      },
       {
        title: "كارت الصنف",
        href: "/dashboard/sales/item-card",
        permission: PERMISSIONS.itemCard.view,
      },
      {
        title: "ملخص مخزون المتجر",
        href: "/dashboard/inventory/store-summary",
      },
      {
        title: "تعديل الباتشات",
        href: "/dashboard/batch-management",
      },
      {
        title: "جرود",
        href: "/dashboard/transactions/inventory-adjustment",
        permission: PERMISSIONS.inventoryAdjustment.view,
      },
      {
        title: "تسويات الجرود",
        href: "/dashboard/transactions/inventory-adjustment/posting",
        permission: PERMISSIONS.inventoryAdjustment.view,
      },
       {
        title: "التحويل من الصيدليات",
        href: "/dashboard/pharm/transactions/pharm-to-store",
        permission: PERMISSIONS.sales.view,
      },
      {
        title: "متابعة المناديب والإحصائيات",
        href: "/dashboard/stores/delivery-monitoring",
        permission: PERMISSIONS.deliveryMonitoring.view,
      },
      {
        title: "تقرير تسويات المخزون",
        href: "/dashboard/stores/inventory-adjustment-report",
        permission: PERMISSIONS.inventoryAdjustmentReport.view,
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
  "/dashboard/sales/pending": "Pending Sales",
  "/dashboard/sales/delivery": "Pending Delivery Orders",
  "/dashboard/sales/pharm-expenses": "Pharm Expenses",
  "/dashboard/sales/item-card": "Item Card",
  "/dashboard/sales/customers": "Customers",
  "/dashboard/sales-test": "Sales Test",
  "/dashboard/admin/pharmacy-scope": "Pharmacy Scope",
  "/dashboard/admin/pharmacy-authorization": "صلاحيات الصيدليات",
  "/dashboard/admin/head-office-store-assignments": "Head Office Store Assignments",
  "/dashboard/admin/pharmacy-page-access": "Pharmacy Page Access",
  "/dashboard/admin/responsibility-profiles": "Responsibility Profiles",
  "/dashboard/diagnostics": "Diagnostics",
  "/dashboard/audit/sqlite-verification": "SQLite Server Verification",
  "/dashboard/audit/sqlite-explorer": "SQLite Data Explorer",
  "/dashboard/customers": "Customers",
  "/dashboard/item-formats": "Dosage Form",
  "/dashboard/item-origins": "Item Origins",
  "/dashboard/units": "Units",
  "/dashboard/companies": "Company",
  "/dashboard/pharm": "Pharm",
  "/dashboard/pharm/transactions/pharmacy-purchase": "Pharmacy Purchase",
  "/dashboard/pharm/transactions/pharmacy-purchase-return": "Pharmacy Purchase Return",
  "/dashboard/pharm/transactions/pharmacy-acceptance": "Pharmacy Acceptance",
  "/dashboard/pharm/transactions/stor-to-pharm": "Store-to-Pharm",
  "/dashboard/pharm/transactions/accepted-pharmacy-orders": "Accepted Pharmacy Orders",
  "/dashboard/pharm/transactions/pharm-to-store": "Pharm-to-Store",
  "/dashboard/pharm/transactions/pharm-to-store-send": "Pharmacy → Main Store Return",
  "/dashboard/pharm/transactions/pharmacy-transfer": "Pharmacy Transfer",
  "/dashboard/pharm/shift-print": "Shift Print",
  "/dashboard/pharm/sales-invoice-report": "Sales Invoice Report",
  "/dashboard/pharm/sales-details-report": "Sales Details Report",
  "/dashboard/accounts-chart": "Accounts Chart",
  "/dashboard/collection-voucher": "Collection Voucher",
  "/dashboard/payment-voucher": "Payment Voucher",
  "/dashboard/pending-vouchers": "Pending Vouchers",
  "/dashboard/manual-journal": "Manual Journal",
  "/dashboard/journal": "Journal",
  "/dashboard/ledger": "Ledger",
  "/dashboard/ledger-import": "Legacy Ledger Import",
  "/dashboard/cost-centers": "Cost Centers",
  "/dashboard/employ-info": "Employee Info",
  "/dashboard/stores": "Stores",
  "/dashboard/stores/delivery-monitoring": "Delivery Monitoring & Statistics",
  "/dashboard/stores/inventory-adjustment-report": "Inventory Adjustment Report",
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
  "/dashboard/inventory/store-summary": "Store stock summary",
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
  "/dashboard/sales-payment-classify": "Sales Payment Classification",
  "/dashboard/sales-kind-assignment": "Sales Kind Assignment",
  "/dashboard/sales-pay-method": "Sales Payment Method",
  "/dashboard/sales-payment-assiment": "Sales Payment Assignment",
  "/dashboard/sales-service": "Sales Service",
  "/dashboard/sales-service-assignment": "Sales Service Assignment",
};
