import type { SalesPaymentKindOption } from "@/types/sales-payment";
import type { CustomerItem } from "@/types/customer";
import type { SalesWorkspaceTab } from "@/types/sales-workspace";

/** Walk-in Cash customer (dbo.Customer.CustCode). */
export const DEFAULT_CASH_CUSTOMER_ID = 1;

const REGULAR_SALES_KIND_NAME = /^regular$/i;

export function pickRegularSalesKindId(
  kinds: readonly SalesPaymentKindOption[]
): number | null {
  const hit = kinds.find((k) =>
    REGULAR_SALES_KIND_NAME.test((k.salesKindName ?? "").trim())
  );
  return hit != null && hit.salesKindId > 0 ? hit.salesKindId : null;
}

export function salesTabFieldsFromCustomer(
  customer: CustomerItem
): Pick<
  SalesWorkspaceTab,
  | "customerId"
  | "customerCode"
  | "customerSearch"
  | "customerName"
  | "customerTel"
  | "customerAddress"
> {
  const name = customer.custNameEn || customer.custNameAr || "";
  return {
    customerId: customer.custCode,
    customerCode: String(customer.custCode),
    customerSearch: `${customer.custCode} — ${name}`,
    customerName: name,
    customerTel: customer.custMobile || customer.custTel || "",
    customerAddress: customer.custAddress || "",
  };
}

/** Defaults for a new unsaved invoice tab only. */
export function applyNewSalesInvoiceDefaults(
  tab: SalesWorkspaceTab,
  kinds: readonly SalesPaymentKindOption[],
  cashCustomer: CustomerItem | null
): SalesWorkspaceTab {
  if (tab.saved || (tab.sthId != null && tab.sthId > 0)) return tab;

  let next = tab;
  const regularKindId = pickRegularSalesKindId(kinds);
  if (
    regularKindId != null &&
    (next.salesKindId == null || next.salesKindId <= 0)
  ) {
    next = { ...next, salesKindId: regularKindId, payments: {} };
  }

  if (
    cashCustomer != null &&
    cashCustomer.custCode === DEFAULT_CASH_CUSTOMER_ID &&
    (next.customerId == null || next.customerId <= 0)
  ) {
    next = { ...next, ...salesTabFieldsFromCustomer(cashCustomer) };
  }

  return next;
}
