import { describe, expect, it } from "vitest";
import {
  getRoutePermissionForPath,
  PERMISSIONS,
} from "@/lib/route-permissions";

describe("route view permissions", () => {
  it("maps audited accounts routes to catalog View codes", () => {
    expect(getRoutePermissionForPath("/dashboard/accounts-chart")).toBe(
      "AccountsChart.View"
    );
    expect(getRoutePermissionForPath("/dashboard/collection-voucher")).toBe(
      "CollectedVoucher.View"
    );
    expect(getRoutePermissionForPath("/dashboard/pending-vouchers")).toEqual([
      "CollectedVoucher.View",
      "PaymentVoucher.View",
    ]);
    expect(getRoutePermissionForPath("/dashboard/transactions/purchase")).toBe(
      "Purchase.View"
    );
    expect(getRoutePermissionForPath("/dashboard/batch-traceability")).toBe(
      "BatchTraceability.View"
    );
    expect(getRoutePermissionForPath("/dashboard/batch-management")).toEqual([
      "BatchManagement.View",
      "Stock.View",
    ]);
    expect(getRoutePermissionForPath("/dashboard/inventory/store-summary")).toEqual([
      "StoreStockSummary.View",
      "Stock.View",
    ]);
  });

  it("maps vendor and cost center routes to new View permissions", () => {
    expect(getRoutePermissionForPath("/dashboard/vendors")).toBe(
      PERMISSIONS.vendor.view
    );
    expect(getRoutePermissionForPath("/dashboard/vendors/2140001")).toBe(
      PERMISSIONS.vendor.view
    );
    expect(getRoutePermissionForPath("/dashboard/cost-centers")).toBe(
      PERMISSIONS.costCenter.view
    );
  });
});
