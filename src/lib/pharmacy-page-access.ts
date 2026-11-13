/**
 * Level 1 pharmacy page keys — mirrors Alfa `PharmacyPageRegistry` (88 entries).
 */

export const PHARMACY_REGISTRY_PAGE_KEYS = [
  "/dashboard",
  "/dashboard/pharmacy",
  "/dashboard/sales",
  "/dashboard/sales/pending",
  "/dashboard/sales/delivery",
  "/dashboard/shift",
  "/dashboard/sales-return",
  "/dashboard/sales/pharm-expenses",
  "/dashboard/sales/item-card",
  "/dashboard/pharm/transactions/pharmacy-purchase",
  "/dashboard/pharm/transactions/pharmacy-purchase-return",
  "/dashboard/pharm/transactions/pharmacy-acceptance",
  "/dashboard/pharm/transactions/stor-to-pharm",
  "/dashboard/pharm/transactions/accepted-pharmacy-orders",
  "/dashboard/pharm/transactions/pharmacy-transfer",
  "/dashboard/pharm/transactions/pharm-to-store-send",
  "/dashboard/transactions/inventory-adjustment",
  "/dashboard/pharm/shift-print",
  "/dashboard/pharm/sales-invoice-report",
  "/dashboard/pharm/transactions/pharm-to-store",
  "/dashboard/stores/inventory-adjustment-report",
  "/dashboard/pharm/sales-details-report",
  "/dashboard/transactions/purchase",
  "/dashboard/transactions/purchase/invoice-draft",
  "/dashboard/transactions/purchase/import",
  "/dashboard/transactions/return",
  "/dashboard/transactions/pharm-recive",
  "/dashboard/transactions/pharm-recive/import",
  "/dashboard/inventory",
  "/dashboard/stock",
  "/dashboard/inventory/store-summary",
  "/dashboard/batch-management",
  "/dashboard/transactions/inventory-adjustment/posting",
  "/dashboard/stores/delivery-monitoring",
  "/dashboard/pharm",
  "/dashboard/companies",
  "/dashboard/sales/customers",
  "/dashboard/customers",
  "/dashboard/customers/:accountId",
  "/dashboard/accounts-chart",
  "/dashboard/collection-voucher",
  "/dashboard/payment-voucher",
  "/dashboard/pending-vouchers",
  "/dashboard/manual-journal",
  "/dashboard/journal",
  "/dashboard/ledger",
  "/dashboard/ledger-import",
  "/dashboard/cost-centers",
  "/dashboard/employ-info",
  "/dashboard/stores",
  "/dashboard/vendors",
  "/dashboard/vendors/:accountId",
  "/dashboard/transactions/purchase/reversal",
  "/dashboard/admin/users",
  "/dashboard/admin/users/create",
  "/dashboard/admin/permissions",
  "/dashboard/admin/roles",
  "/dashboard/admin/user-roles",
  "/dashboard/admin/user-permissions",
  "/dashboard/admin/pharmacy-scope",
  "/dashboard/admin/pharmacy-authorization",
  "/dashboard/permissions",
  "/dashboard/admin/pharmacy-page-access",
  "/dashboard/units",
  "/dashboard/item-formats",
  "/dashboard/item-origins",
  "/dashboard/item-catalog",
  "/dashboard/groups",
  "/dashboard/brands",
  "/dashboard/item-transactions",
  "/dashboard/movement-setting",
  "/dashboard/sales-movement-setting",
  "/dashboard/settings/sales-push-list",
  "/dashboard/sales-kind",
  "/dashboard/sales-payment-classify",
  "/dashboard/sales-kind-assignment",
  "/dashboard/sales-pay-method",
  "/dashboard/sales-payment-assiment",
  "/dashboard/sales-service",
  "/dashboard/sales-service-assignment",
  "/dashboard/audit",
  "/dashboard/diagnostics",
  "/dashboard/reporting/commit-documents",
  "/dashboard/audit/sqlite-verification",
  "/dashboard/audit/sqlite-explorer",
  "/dashboard/batch-traceability",
  "/dashboard/sales-test",
  "/dashboard/reporting/mongo-test",
] as const;

export type PharmacyRegistryPageKey =
  (typeof PHARMACY_REGISTRY_PAGE_KEYS)[number];

const registrySet = new Set<string>(PHARMACY_REGISTRY_PAGE_KEYS);

export function resolvePageKeyFromPathname(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, "") || "/dashboard";
  if (registrySet.has(normalized)) {
    return normalized;
  }
  const customerDetail = normalized.match(
    /^\/dashboard\/customers\/([^/]+)$/
  );
  if (customerDetail) {
    return "/dashboard/customers/:accountId";
  }
  const vendorDetail = normalized.match(/^\/dashboard\/vendors\/([^/]+)$/);
  if (vendorDetail) {
    return "/dashboard/vendors/:accountId";
  }
  return null;
}

export type PharmacyPageAccessRow = {
  pageKey: string;
  isEnabled: boolean;
};

export function buildPharmacyPageEnabledMap(
  pages: readonly PharmacyPageAccessRow[] | null | undefined
): ReadonlyMap<string, boolean> {
  const map = new Map<string, boolean>();
  if (!pages) return map;
  for (const row of pages) {
    map.set(row.pageKey, row.isEnabled);
  }
  return map;
}

/**
 * Level 1 only — when `pharmacyPageAccessApplies` is false (API authoritative), always allow.
 * Missing registry match or missing DB row → deny (fail closed).
 */
export function canAccessPage(
  pageKey: string | null,
  pharmacyPageAccessApplies: boolean,
  enabledByPageKey: ReadonlyMap<string, boolean>
): boolean {
  if (!pharmacyPageAccessApplies) return true;
  if (!pageKey || !registrySet.has(pageKey)) return false;
  return enabledByPageKey.get(pageKey) === true;
}
