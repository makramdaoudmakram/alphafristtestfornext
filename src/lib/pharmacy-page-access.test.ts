import { describe, expect, it } from "vitest";
import {
  buildPharmacyPageEnabledMap,
  canAccessPage,
  resolvePageKeyFromPathname,
  PHARMACY_REGISTRY_PAGE_KEYS,
} from "@/lib/pharmacy-page-access";

describe("pharmacy-page-access", () => {
  it("registry contains expected page key count", () => {
    expect(PHARMACY_REGISTRY_PAGE_KEYS.length).toBe(91);
  });

  it("resolves dynamic customer detail path", () => {
    expect(resolvePageKeyFromPathname("/dashboard/customers/42")).toBe(
      "/dashboard/customers/:accountId"
    );
  });

  it("denies unknown paths for pharmacy accounts", () => {
    const map = buildPharmacyPageEnabledMap([]);
    expect(canAccessPage("/dashboard/unknown", true, map)).toBe(false);
  });

  it("allows enabled page when applies", () => {
    const map = buildPharmacyPageEnabledMap([
      { pageKey: "/dashboard/sales", isEnabled: true },
    ]);
    expect(canAccessPage("/dashboard/sales", true, map)).toBe(true);
  });

  it("allows my-commission when API returns enabled for pharmacy users", () => {
    const map = buildPharmacyPageEnabledMap([
      { pageKey: "/dashboard/pharm/my-commission", isEnabled: true },
    ]);
    expect(canAccessPage("/dashboard/pharm/my-commission", true, map)).toBe(true);
  });

  it("denies disabled page when applies", () => {
    const map = buildPharmacyPageEnabledMap([
      { pageKey: "/dashboard/sales", isEnabled: false },
    ]);
    expect(canAccessPage("/dashboard/sales", true, map)).toBe(false);
  });

  it("skips Level 1 when API says not applicable", () => {
    const map = buildPharmacyPageEnabledMap([]);
    expect(canAccessPage("/dashboard/sales", false, map)).toBe(true);
  });
});
