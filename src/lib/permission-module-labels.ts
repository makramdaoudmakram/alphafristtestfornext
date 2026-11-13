/**
 * Optional Arabic group titles for RBAC module codes (catalog `ModuleCode` remains authoritative).
 * Arabic labels are taken from existing admin/sidebar copy where a clear match exists.
 */
export type PermissionModuleDisplay = {
  moduleCode: string;
  /** English label — defaults to `ModuleCode` from the catalog. */
  en: string;
  /** Arabic group title when defined in product UI. */
  ar?: string;
};

const MODULE_AR_BY_CODE: Partial<Record<string, string>> = {
  Stor: "المخازن",
  Parm: "الصيدليات",
  Pharm: "الصيدليات",
  PharmacyPageAccess: "صلاحيات صفحات الصيدليات",
  AccountsChart: "الحسابات",
  GeneralLedger: "الحسابات",
  PaymentVoucher: "الحسابات",
  CollectedVoucher: "الحسابات",
  Users: "المستخدمين والصلاحيات",
  Permissions: "المستخدمين والصلاحيات",
  ResponsibilityProfiles: "المستخدمين والصلاحيات",
  PharmacyScope: "المستخدمين والصلاحيات",
  Reporting: "التقارير",
  Audit: "Audit",
};

export function getPermissionModuleDisplay(moduleCode: string): PermissionModuleDisplay {
  const key = moduleCode?.trim() || "Other";
  return {
    moduleCode: key,
    en: key,
    ar: MODULE_AR_BY_CODE[key],
  };
}

export function formatPermissionModuleHeading(moduleCode: string): string {
  const display = getPermissionModuleDisplay(moduleCode);
  if (display.ar) {
    return `${display.ar} · ${display.en}`;
  }
  return display.en;
}
