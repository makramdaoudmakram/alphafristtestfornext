import { describe, expect, it } from "vitest";
import {
  areDeliveryRequirementsMet,
  createEmptySalesLine,
  createEmptyTab,
  deliveryItemTotal,
  deliveryTierCost,
  isDeliveryServiceType,
  pickDeliveryService,
  payableAmount,
} from "@/lib/sales-workspace-calc";
import type { SalesWorkspaceLine, SalesWorkspaceTab } from "@/types/sales-workspace";

type ServiceOption = {
  salesServiceId: number;
  serviceType: string;
  cost: number;
};

const services: ServiceOption[] = [
  { salesServiceId: 91, serviceType: "Delivery", cost: 30 },
  { salesServiceId: 92, serviceType: "Delivery", cost: 15 },
  { salesServiceId: 93, serviceType: "Delivery", cost: 0 },
  { salesServiceId: 94, serviceType: "Counter", cost: 30 },
];

function line(patch: Partial<SalesWorkspaceLine> = {}): SalesWorkspaceLine {
  return {
    ...createEmptySalesLine(),
    itemCatalogId: 1,
    stockId: 10,
    quantity: 1,
    unitSellPrice: 100,
    unitId: 1,
    ...patch,
  };
}

function tab(patch: Partial<SalesWorkspaceTab> = {}): SalesWorkspaceTab {
  return { ...createEmptyTab(1, "2026-10-14 10:00:00"), ...patch };
}

describe("deliveryTierCost", () => {
  it("maps order boundaries to service costs", () => {
    expect(deliveryTierCost(0)).toBe(30);
    expect(deliveryTierCost(200)).toBe(30);
    expect(deliveryTierCost(200.01)).toBe(15);
    expect(deliveryTierCost(300)).toBe(15);
    expect(deliveryTierCost(300.01)).toBe(0);
  });
});

describe("pickDeliveryService", () => {
  it("selects the 30 / 15 / 0 tier service by cost, never by id", () => {
    expect(pickDeliveryService(services, 150)?.salesServiceId).toBe(91);
    expect(pickDeliveryService(services, 250)?.salesServiceId).toBe(92);
    expect(pickDeliveryService(services, 400)?.salesServiceId).toBe(93);
  });

  it("ignores non-Delivery service types", () => {
    expect(pickDeliveryService([services[3]], 150)).toBeNull();
  });

  it("returns null when no service matches the required tier", () => {
    expect(pickDeliveryService([services[1]], 150)).toBeNull();
  });
});

describe("deliveryItemTotal", () => {
  it("is the discounted goods total with the service cost excluded", () => {
    const t = tab({
      lines: [line({ unitSellPrice: 250 }), line({ unitSellPrice: 100 })],
      globalDiscountMode: "V",
      globalDiscountValue: 100,
      deliveryEnabled: true,
      serviceCost: 30,
    });
    expect(deliveryItemTotal(t)).toBe(250);
    expect(deliveryTierCost(deliveryItemTotal(t))).toBe(15);
    // Tiering on the payable would be circular (it already contains the service cost).
    expect(payableAmount(t)).toBe(280);
  });
});

describe("isDeliveryServiceType", () => {
  it("matches the backend Trim + OrdinalIgnoreCase rule", () => {
    expect(isDeliveryServiceType("Delivery")).toBe(true);
    expect(isDeliveryServiceType("delivery")).toBe(true);
    expect(isDeliveryServiceType("DELIVERY")).toBe(true);
    expect(isDeliveryServiceType(" Delivery ")).toBe(true);
    expect(isDeliveryServiceType("Counter")).toBe(false);
  });

  it("pickDeliveryService tolerates case/whitespace in ServiceType", () => {
    const rows: ServiceOption[] = [
      { salesServiceId: 7, serviceType: "delivery ", cost: 30 },
      { salesServiceId: 8, serviceType: "DELIVERY", cost: 15 },
    ];
    expect(pickDeliveryService(rows, 150)?.salesServiceId).toBe(7);
    expect(pickDeliveryService(rows, 250)?.salesServiceId).toBe(8);
  });
});

describe("areDeliveryRequirementsMet (Save gate)", () => {
  const base = {
    deliveryRequired: true,
    deliveryMandatory: false,
    customerId: null as number | null,
    deliveryEmployeeId: 5 as number | null,
    selectedSalesServiceId: 91 as number | null,
    autoDeliveryService: { salesServiceId: 91 },
  };

  it("1: delivery-required method, no delivery code selected → gate closed", () => {
    expect(
      areDeliveryRequirementsMet({ ...base, deliveryEmployeeId: null })
    ).toBe(false);
  });

  it("2: delivery code selected, no delivery service chosen → gate closed", () => {
    expect(
      areDeliveryRequirementsMet({ ...base, selectedSalesServiceId: null })
    ).toBe(false);
  });

  it("3: valid code + correct calculated tier service → gate open", () => {
    expect(areDeliveryRequirementsMet(base)).toBe(true);
  });

  it("4: wrong tier service (different cost picked) → gate closed", () => {
    // The service that matches the invoice tier is 91; the user picked 92.
    expect(
      areDeliveryRequirementsMet({ ...base, selectedSalesServiceId: 92 })
    ).toBe(false);
    // And when the pharmacy has no tier-cost service at all → gate closed.
    expect(
      areDeliveryRequirementsMet({ ...base, autoDeliveryService: null })
    ).toBe(false);
  });

  it("5: non-delivery payment method → existing save behavior preserved", () => {
    expect(
      areDeliveryRequirementsMet({
        ...base,
        deliveryRequired: false,
        deliveryEmployeeId: null,
        selectedSalesServiceId: null,
        autoDeliveryService: null,
      })
    ).toBe(true);
  });

  it("6: switching to a delivery-required method updates the gate", () => {
    // Same selections; the gate flips purely with deliveryRequired.
    expect(
      areDeliveryRequirementsMet({ ...base, deliveryRequired: false })
    ).toBe(true);
    expect(
      areDeliveryRequirementsMet({
        ...base,
        deliveryRequired: true,
        deliveryEmployeeId: null,
      })
    ).toBe(false);
    expect(areDeliveryRequirementsMet(base)).toBe(true);
  });

  it("6b: DeliveryMandatory still forces a customer, toggle-off does not", () => {
    expect(areDeliveryRequirementsMet({ ...base, deliveryMandatory: true })).toBe(false);
    expect(
      areDeliveryRequirementsMet({ ...base, deliveryMandatory: true, customerId: 42 })
    ).toBe(true);
  });

  it("payment-method-required delivery: no customer demanded, but code + tier cost are", () => {
    const viaMethod = { ...base, deliveryMandatory: true, customerId: 42 };
    // Switching from a Regular kind to a delivery-required method keeps
    // deliveryMandatory false: a walk-in sale (no customer) must still save.
    const methodOnly = { ...viaMethod, deliveryMandatory: false, customerId: null };
    expect(areDeliveryRequirementsMet(methodOnly)).toBe(true);
    // Missing the delivery code → Save stays disabled.
    expect(
      areDeliveryRequirementsMet({ ...methodOnly, deliveryEmployeeId: null })
    ).toBe(false);
    // Missing/mismatching the calculated delivery cost → Save stays disabled.
    expect(
      areDeliveryRequirementsMet({ ...methodOnly, selectedSalesServiceId: null })
    ).toBe(false);
    expect(
      areDeliveryRequirementsMet({
        ...methodOnly,
        selectedSalesServiceId: 92,
        autoDeliveryService: { salesServiceId: 91 },
      })
    ).toBe(false);
  });

  it("DeliveryMandatory kind with everything except the customer → gate closed", () => {
    expect(
      areDeliveryRequirementsMet({
        ...base,
        deliveryMandatory: true,
        customerId: null,
      })
    ).toBe(false);
    expect(
      areDeliveryRequirementsMet({
        ...base,
        deliveryMandatory: true,
        customerId: 7,
      })
    ).toBe(true);
  });

  it("7: invoice total crossing tier boundaries re-targets the required service", () => {
    const t = tab({
      lines: [line({ unitSellPrice: 150 })],
      deliveryEnabled: true,
      deliveryEmployeeId: 5,
    });
    // 150 → tier cost 30 → service 91.
    const auto1 = pickDeliveryService(services, deliveryItemTotal(t));
    expect(areDeliveryRequirementsMet({
      deliveryRequired: true,
      deliveryMandatory: false,
      customerId: t.customerId,
      deliveryEmployeeId: t.deliveryEmployeeId,
      selectedSalesServiceId: auto1?.salesServiceId ?? null,
      autoDeliveryService: auto1,
    })).toBe(true);

    // Grow the invoice past 300 → tier cost 0 → service 93; the stale 91 selection is rejected.
    const t2 = tab({
      lines: [line({ unitSellPrice: 150 }), line({ unitSellPrice: 200 })],
      deliveryEnabled: true,
      deliveryEmployeeId: 5,
      salesServiceId: 91,
    });
    const auto2 = pickDeliveryService(services, deliveryItemTotal(t2));
    expect(auto2?.salesServiceId).toBe(93);
    expect(areDeliveryRequirementsMet({
      deliveryRequired: true,
      deliveryMandatory: false,
      customerId: t2.customerId,
      deliveryEmployeeId: t2.deliveryEmployeeId,
      selectedSalesServiceId: t2.salesServiceId,
      autoDeliveryService: auto2,
    })).toBe(false);
    expect(areDeliveryRequirementsMet({
      deliveryRequired: true,
      deliveryMandatory: false,
      customerId: t2.customerId,
      deliveryEmployeeId: t2.deliveryEmployeeId,
      selectedSalesServiceId: auto2?.salesServiceId ?? null,
      autoDeliveryService: auto2,
    })).toBe(true);
    expect(deliveryTierCost(350)).toBe(0);
  });
});
