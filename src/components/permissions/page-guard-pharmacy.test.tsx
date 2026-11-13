/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageGuard } from "@/components/permissions/page-guard";

const mockState = vi.hoisted(() => ({
  pathname: "/dashboard/sales",
  pharmacyPageAccessApplies: true,
  enabledPageKeys: new Set<string>(["/dashboard/sales"]),
  operationalPermissions: [] as string[],
  globalPermissions: [] as string[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => mockState.pathname,
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/hooks/use-hydrated", () => ({
  useHydrated: () => true,
}));

vi.mock("@/lib/api-config", () => ({
  getAlfaApiHint: () => "http://localhost",
}));

vi.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    roles: [],
    permissions: mockState.globalPermissions,
    operationalPermissions: mockState.operationalPermissions,
    pharmacyPageAccessApplies: mockState.pharmacyPageAccessApplies,
    canAccessPage: (key: string | null) => {
      if (!mockState.pharmacyPageAccessApplies) return true;
      return key !== null && mockState.enabledPageKeys.has(key);
    },
    loading: false,
    ready: true,
    error: null,
    refresh: async () => {},
  }),
  canAccessPermission: (
    code: string,
    _roles: string[],
    permissions: string[],
    operationalPermissions?: string[]
  ) =>
    permissions.includes(code) ||
    (operationalPermissions?.includes(code) ?? false),
}));

function resetMocks() {
  mockState.pathname = "/dashboard/sales";
  mockState.pharmacyPageAccessApplies = true;
  mockState.enabledPageKeys = new Set(["/dashboard/sales"]);
  mockState.operationalPermissions = ["Sales.View"];
  mockState.globalPermissions = [];
}

describe("PageGuard Level 1", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("blocks when Level 1 page is disabled (explicit pageKey)", () => {
    render(
      <PageGuard permission={null} pageKey="/dashboard/stores">
        <p>secret</p>
      </PageGuard>
    );
    expect(screen.getByText("Access denied")).toBeTruthy();
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("allows when Level 1 passes with explicit pageKey", () => {
    render(
      <PageGuard permission="Sales.View" pageKey="/dashboard/sales">
        <p>content</p>
      </PageGuard>
    );
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("Test A — resolves pageKey from pathname for Sales without explicit pageKey", () => {
    mockState.pathname = "/dashboard/sales";
    mockState.enabledPageKeys = new Set(["/dashboard/sales"]);
    mockState.operationalPermissions = ["Sales.View"];

    render(
      <PageGuard permission="Sales.View">
        <p>sales workspace</p>
      </PageGuard>
    );
    expect(screen.getByText("sales workspace")).toBeTruthy();
  });

  it("Test B — resolves pageKey for Pharm Expenses without explicit pageKey", () => {
    mockState.pathname = "/dashboard/sales/pharm-expenses";
    mockState.enabledPageKeys = new Set(["/dashboard/sales/pharm-expenses"]);
    mockState.operationalPermissions = ["PharmExpenses.View"];

    render(
      <PageGuard permission="PharmExpenses.View">
        <p>pharm expenses</p>
      </PageGuard>
    );
    expect(screen.getByText("pharm expenses")).toBeTruthy();
  });

  it("Test C — denies when Level 1 page is disabled for resolved pathname", () => {
    mockState.pathname = "/dashboard/sales";
    mockState.enabledPageKeys = new Set();
    mockState.operationalPermissions = ["Sales.View"];

    render(
      <PageGuard permission="Sales.View">
        <p>should not show</p>
      </PageGuard>
    );
    expect(screen.getByText("Access denied")).toBeTruthy();
    expect(screen.queryByText("should not show")).toBeNull();
  });

  it("Test D — denies when Level 2 permission is missing", () => {
    mockState.pathname = "/dashboard/sales";
    mockState.enabledPageKeys = new Set(["/dashboard/sales"]);
    mockState.operationalPermissions = [];

    render(
      <PageGuard permission="Sales.View">
        <p>should not show</p>
      </PageGuard>
    );
    expect(screen.getByText("Access denied")).toBeTruthy();
    expect(screen.getByText(/Sales\.View/)).toBeTruthy();
    expect(screen.queryByText("should not show")).toBeNull();
  });

  it("Test E — explicit pageKey takes precedence over pathname", () => {
    mockState.pathname = "/dashboard/sales";
    mockState.enabledPageKeys = new Set(["/dashboard/sales"]);
    mockState.operationalPermissions = ["Sales.View"];

    render(
      <PageGuard permission={null} pageKey="/dashboard/stores">
        <p>should not show</p>
      </PageGuard>
    );
    expect(screen.getByText("Access denied")).toBeTruthy();
    expect(screen.queryByText("should not show")).toBeNull();
  });

  it("D — PharmPurchase.View passes inner guard when pathname is purchase", () => {
    mockState.pathname = "/dashboard/pharm/transactions/pharmacy-purchase";
    mockState.enabledPageKeys = new Set([
      "/dashboard/pharm/transactions/pharmacy-purchase",
    ]);
    mockState.operationalPermissions = ["PharmPurchase.View"];

    render(
      <PageGuard permission="PharmPurchase.View">
        <p>purchase</p>
      </PageGuard>
    );
    expect(screen.getByText("purchase")).toBeTruthy();
  });

  it("E — PharmPurchaseReturn.View passes inner guard when pathname is return", () => {
    mockState.pathname =
      "/dashboard/pharm/transactions/pharmacy-purchase-return";
    mockState.enabledPageKeys = new Set([
      "/dashboard/pharm/transactions/pharmacy-purchase-return",
    ]);
    mockState.operationalPermissions = ["PharmPurchaseReturn.View"];

    render(
      <PageGuard permission="PharmPurchaseReturn.View">
        <p>purchase return</p>
      </PageGuard>
    );
    expect(screen.getByText("purchase return")).toBeTruthy();
  });

  it("F — purchase guard denies without PharmPurchase.View", () => {
    mockState.pathname = "/dashboard/pharm/transactions/pharmacy-purchase";
    mockState.enabledPageKeys = new Set([
      "/dashboard/pharm/transactions/pharmacy-purchase",
    ]);
    mockState.operationalPermissions = [];

    render(
      <PageGuard permission="PharmPurchase.View">
        <p>hidden</p>
      </PageGuard>
    );
    expect(screen.getByText("Access denied")).toBeTruthy();
    expect(screen.queryByText("hidden")).toBeNull();
  });

  it("K — Level 1 skipped when pharmacyPageAccessApplies is false (admin bypass path)", () => {
    mockState.pathname = "/dashboard/not-in-registry";
    mockState.pharmacyPageAccessApplies = false;
    mockState.enabledPageKeys = new Set();
    mockState.operationalPermissions = ["Sales.View"];

    render(
      <PageGuard permission="Sales.View">
        <p>admin path</p>
      </PageGuard>
    );
    expect(screen.getByText("admin path")).toBeTruthy();
  });

  it("Test F — denies when pathname cannot be resolved and Level 1 applies", () => {
    mockState.pathname = "/dashboard/not-in-registry";
    mockState.enabledPageKeys = new Set(["/dashboard/sales"]);
    mockState.operationalPermissions = ["Sales.View"];

    render(
      <PageGuard permission="Sales.View">
        <p>should not show</p>
      </PageGuard>
    );
    expect(screen.getByText("Access denied")).toBeTruthy();
    expect(screen.queryByText("should not show")).toBeNull();
  });
});
