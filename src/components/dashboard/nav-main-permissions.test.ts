import { describe, expect, it } from "vitest";
import {
  filterNavGroups,
  filterNavLinks,
  pharmacyNavSectionHasVisibleChildren,
  type NavLinkAccessOptions,
} from "@/components/dashboard/nav-main";
import { isAdminRole } from "@/components/permissions/permission-provider";
import {
  buildPharmacyPageEnabledMap,
  canAccessPage,
  resolvePageKeyFromPathname,
} from "@/lib/pharmacy-page-access";
import { resolveNavLinkPermission } from "@/lib/route-permissions";
import { SIDEBAR_NAV } from "@/lib/sidebar-config";

function makeCanAccess(options: {
  enabledPageKeys: ReadonlySet<string>;
  pharmacyPageAccessApplies: boolean;
  operationalPermissions: string[];
  globalPermissions?: string[];
  isHeadOfficePrincipal?: boolean;
  roles?: string[];
}) {
  const global = new Set(options.globalPermissions ?? []);
  const operational = new Set(options.operationalPermissions);
  const roles = options.roles ?? [];
  const enabledByPageKey = buildPharmacyPageEnabledMap(
    [...options.enabledPageKeys].map((pageKey) => ({
      pageKey,
      isEnabled: true,
    }))
  );

  return (
    permission: string | null | undefined,
    href: string,
    linkOptions?: NavLinkAccessOptions
  ) => {
    const pageKey = resolvePageKeyFromPathname(href);
    if (
      !canAccessPage(
        pageKey,
        options.pharmacyPageAccessApplies,
        enabledByPageKey
      )
    ) {
      return false;
    }

    if (linkOptions?.requireHeadOfficePrincipal) {
      const headOfficeNavAllowed =
        Boolean(options.isHeadOfficePrincipal) || isAdminRole(roles);
      if (!headOfficeNavAllowed) return false;
    }

    const routePerm = resolveNavLinkPermission(href, permission ?? undefined);
    if (routePerm === null) {
      return true;
    }
    if (Array.isArray(routePerm)) {
      return routePerm.some(
        (code) => global.has(code) || operational.has(code)
      );
    }
    return global.has(routePerm) || operational.has(routePerm);
  };
}

const allPharmacyOpsEnabled = new Set([
  "/dashboard/sales",
  "/dashboard/sales/pharm-expenses",
  "/dashboard/pharm/sales-details-report",
  "/dashboard/pharm/transactions/pharmacy-purchase",
  "/dashboard/pharm/transactions/pharmacy-purchase-return",
  "/dashboard/transactions/inventory-adjustment",
]);

function getPharmacyNav() {
  const item = SIDEBAR_NAV.find((entry) => entry.title === "صيدليات");
  if (!item) throw new Error("صيدليات nav section missing");
  return item;
}

describe("B1–B2 pharmacy sidebar navigation", () => {
  it("A — PharmExpenses.View without Sales.View shows expenses not sales", () => {
    const canAccess = makeCanAccess({
      enabledPageKeys: allPharmacyOpsEnabled,
      pharmacyPageAccessApplies: true,
      operationalPermissions: ["PharmExpenses.View"],
    });
    const section = getPharmacyNav();
    expect(pharmacyNavSectionHasVisibleChildren(section, canAccess)).toBe(true);

    const flat = filterNavLinks(section.items ?? [], canAccess);
    const hrefs = flat.map((l) => l.href);
    expect(hrefs).toContain("/dashboard/sales/pharm-expenses");
    expect(hrefs).not.toContain("/dashboard/sales");
  });

  it("B — SalesDetailsReport.View without Sales.View shows report subgroup link", () => {
    const canAccess = makeCanAccess({
      enabledPageKeys: allPharmacyOpsEnabled,
      pharmacyPageAccessApplies: true,
      operationalPermissions: ["SalesDetailsReport.View"],
    });
    const section = getPharmacyNav();
    const groups = filterNavGroups(section.groups ?? [], canAccess);
    expect(groups.some((g) => g.title === "Report")).toBe(true);
    const reportHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(reportHrefs).toContain("/dashboard/pharm/sales-details-report");
    expect(reportHrefs).not.toContain("/dashboard/sales");

    const flat = filterNavLinks(section.items ?? [], canAccess);
    const flatHrefs = flat.map((l) => l.href);
    expect(flatHrefs).not.toContain("/dashboard/sales");
  });

  it("C — no accessible children hides pharmacy parent", () => {
    const canAccess = makeCanAccess({
      enabledPageKeys: allPharmacyOpsEnabled,
      pharmacyPageAccessApplies: true,
      operationalPermissions: [],
    });
    const section = getPharmacyNav();
    expect(pharmacyNavSectionHasVisibleChildren(section, canAccess)).toBe(false);
    expect(filterNavGroups(section.groups ?? [], canAccess)).toHaveLength(0);
  });

  it("G — InventoryAdjustment.View without Stock.View shows جرود under صيدليات", () => {
    const canAccess = makeCanAccess({
      enabledPageKeys: allPharmacyOpsEnabled,
      pharmacyPageAccessApplies: true,
      operationalPermissions: ["InventoryAdjustment.View"],
    });
    const section = getPharmacyNav();
    const flat = filterNavLinks(section.items ?? [], canAccess);
    expect(flat.some((l) => l.href === "/dashboard/transactions/inventory-adjustment")).toBe(
      true
    );
  });

  it("H — Stock.View without InventoryAdjustment.View does not show صيدليات جرود", () => {
    const canAccess = makeCanAccess({
      enabledPageKeys: allPharmacyOpsEnabled,
      pharmacyPageAccessApplies: true,
      operationalPermissions: ["Stock.View"],
    });
    const section = getPharmacyNav();
    const flat = filterNavLinks(section.items ?? [], canAccess);
    expect(
      flat.some((l) => l.href === "/dashboard/transactions/inventory-adjustment")
    ).toBe(false);
  });

  it("J — Level 1 disabled hides Pharm Expenses link", () => {
    const enabled = new Set(allPharmacyOpsEnabled);
    enabled.delete("/dashboard/sales/pharm-expenses");
    const canAccess = makeCanAccess({
      enabledPageKeys: enabled,
      pharmacyPageAccessApplies: true,
      operationalPermissions: ["PharmExpenses.View"],
    });
    const section = getPharmacyNav();
    const flat = filterNavLinks(section.items ?? [], canAccess);
    expect(flat.some((l) => l.href === "/dashboard/sales/pharm-expenses")).toBe(
      false
    );
  });
});

describe("B3–B4 purchase sidebar entries", () => {
  it("D — PharmPurchase.View shows purchase link when Level 1 enabled", () => {
    const canAccess = makeCanAccess({
      enabledPageKeys: allPharmacyOpsEnabled,
      pharmacyPageAccessApplies: true,
      operationalPermissions: ["PharmPurchase.View"],
    });
    const section = getPharmacyNav();
    const flat = filterNavLinks(section.items ?? [], canAccess);
    expect(
      flat.some(
        (l) => l.href === "/dashboard/pharm/transactions/pharmacy-purchase"
      )
    ).toBe(true);
    expect(
      flat.some(
        (l) => l.href === "/dashboard/pharm/transactions/pharmacy-purchase-return"
      )
    ).toBe(false);
  });

  it("E — PharmPurchaseReturn.View shows return link when Level 1 enabled", () => {
    const canAccess = makeCanAccess({
      enabledPageKeys: allPharmacyOpsEnabled,
      pharmacyPageAccessApplies: true,
      operationalPermissions: ["PharmPurchaseReturn.View"],
    });
    const section = getPharmacyNav();
    const flat = filterNavLinks(section.items ?? [], canAccess);
    expect(
      flat.some(
        (l) => l.href === "/dashboard/pharm/transactions/pharmacy-purchase-return"
      )
    ).toBe(true);
    expect(
      flat.some(
        (l) => l.href === "/dashboard/pharm/transactions/pharmacy-purchase"
      )
    ).toBe(false);
  });

  it("hides Pharm-to-Store receive when only Movment.View (pharmacy operator)", () => {
    const enabledKeys = new Set([
      ...allPharmacyOpsEnabled,
      "/dashboard/pharm/transactions/pharm-to-store",
      "/dashboard/pharm/transactions/pharm-to-store-send",
    ]);
    const canAccess = makeCanAccess({
      enabledPageKeys: enabledKeys,
      pharmacyPageAccessApplies: true,
      operationalPermissions: ["Movment.View", "Sales.View"],
      isHeadOfficePrincipal: false,
    });
    const warehouse = SIDEBAR_NAV.find((e) => e.title === "المخازن ");
    expect(warehouse).toBeDefined();
    const flat = filterNavLinks(warehouse!.items ?? [], canAccess);
    expect(flat.some((l) => l.href === "/dashboard/pharm/transactions/pharm-to-store")).toBe(
      false
    );
    const pharmacy = getPharmacyNav();
    const pharmFlat = filterNavLinks(pharmacy.items ?? [], canAccess);
    expect(
      pharmFlat.some((l) => l.href === "/dashboard/pharm/transactions/pharm-to-store-send")
    ).toBe(true);
  });

  it("shows Pharm-to-Store receive for Head Office principal with Movment.View", () => {
    const enabledKeys = new Set([
      "/dashboard/pharm/transactions/pharm-to-store",
    ]);
    const canAccess = makeCanAccess({
      enabledPageKeys: enabledKeys,
      pharmacyPageAccessApplies: true,
      operationalPermissions: ["Movment.View"],
      isHeadOfficePrincipal: true,
    });
    const warehouse = SIDEBAR_NAV.find((e) => e.title === "المخازن ");
    const flat = filterNavLinks(warehouse!.items ?? [], canAccess);
    expect(flat.some((l) => l.href === "/dashboard/pharm/transactions/pharm-to-store")).toBe(
      true
    );
  });

  it("F — neither purchase permission hides purchase links", () => {
    const canAccess = makeCanAccess({
      enabledPageKeys: allPharmacyOpsEnabled,
      pharmacyPageAccessApplies: true,
      operationalPermissions: ["Sales.View"],
    });
    const section = getPharmacyNav();
    const flat = filterNavLinks(section.items ?? [], canAccess);
    expect(
      flat.some(
        (l) =>
          l.href === "/dashboard/pharm/transactions/pharmacy-purchase" ||
          l.href === "/dashboard/pharm/transactions/pharmacy-purchase-return"
      )
    ).toBe(false);
  });
});
