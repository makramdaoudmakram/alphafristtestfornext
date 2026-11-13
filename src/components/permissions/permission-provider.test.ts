import { describe, expect, it } from "vitest";
import { canAccessPermission } from "@/components/permissions/permission-provider";
import { PERMISSIONS } from "@/lib/route-permissions";

describe("canAccessPermission with pharmacy-scoped permissions", () => {
  it("allows operational permission from merged permissions list", () => {
    const allowed = canAccessPermission(
      PERMISSIONS.itemCard.view,
      [],
      [PERMISSIONS.itemCard.view]
    );
    expect(allowed).toBe(true);
  });

  it("denies operational permission when not in effective list", () => {
    const allowed = canAccessPermission(PERMISSIONS.itemCard.view, [], []);
    expect(allowed).toBe(false);
  });

  it("preserves Admin role bypass", () => {
    const allowed = canAccessPermission(
      PERMISSIONS.itemCard.view,
      ["Admin"],
      []
    );
    expect(allowed).toBe(true);
  });

  it("preserves SuperAdmin role bypass for UI navigation", () => {
    const allowed = canAccessPermission(
      PERMISSIONS.pharmacyPageAccess.manage,
      ["SuperAdmin"],
      []
    );
    expect(allowed).toBe(true);
  });

  it("preserves global Identity permissions without operational grants", () => {
    const allowed = canAccessPermission(
      PERMISSIONS.sales.view,
      [],
      [PERMISSIONS.sales.view]
    );
    expect(allowed).toBe(true);
  });
});
