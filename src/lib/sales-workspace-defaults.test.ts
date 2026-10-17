import { describe, expect, it } from "vitest";
import {
  applyNewSalesInvoiceDefaults,
  DEFAULT_CASH_CUSTOMER_ID,
  pickRegularSalesKindId,
  salesTabFieldsFromCustomer,
} from "@/lib/sales-workspace-defaults";
import { createEmptyTab } from "@/lib/sales-workspace-calc";
import type { CustomerItem } from "@/types/customer";

const kinds = [
  { salesKindId: 2, salesKindName: "Delivery", deleveryMandatory: true },
  { salesKindId: 5, salesKindName: "Regular", deleveryMandatory: false },
];

const cashCustomer: CustomerItem = {
  custCode: 1,
  custNameEn: "Cash",
  custNameAr: "نقدي",
  custBirthDate: null,
  custGender: null,
  custJob: null,
  custMobile: null,
  custTel: null,
  custAddress: null,
  custType: null,
  custActive: true,
  custActiveDate: null,
  custStopDate: null,
  custMaxCredit: null,
  custDiscountPerc: null,
  custPayment: 0,
  cLocalItemsDisc: null,
  cImportedItemsDisc: null,
  custNotes: null,
  pharmCode: null,
  custContractcompany: null,
  custContractcompanydiscount: null,
  accountId: null,
  balance: 0,
};

describe("sales-workspace-defaults", () => {
  it("picks Regular by name", () => {
    expect(pickRegularSalesKindId(kinds)).toBe(5);
  });

  it("applies Regular and Cash on new tabs only", () => {
    const tab = createEmptyTab(1, "01/01/2026");
    const next = applyNewSalesInvoiceDefaults(tab, kinds, cashCustomer);
    expect(next.salesKindId).toBe(5);
    expect(next.customerId).toBe(DEFAULT_CASH_CUSTOMER_ID);
    expect(next.customerSearch).toBe(
      salesTabFieldsFromCustomer(cashCustomer).customerSearch
    );
  });

  it("does not overwrite saved invoice tabs", () => {
    const tab = {
      ...createEmptyTab(1, "01/01/2026"),
      saved: true,
      salesKindId: 2,
      customerId: 99,
    };
    const next = applyNewSalesInvoiceDefaults(tab, kinds, cashCustomer);
    expect(next.salesKindId).toBe(2);
    expect(next.customerId).toBe(99);
  });
});
