import type { SalesReceiptLine } from "@/types/sales-receipt";

export type SalesPaymentKindOption = {
  salesKindId: number;
  salesKindName: string | null;
  deleveryMandatory: boolean;
};

export type SalesPaymentMethodOption = {
  paymentMethodId: number;
  paymentName: string | null;
  affectsCash: boolean;
  active: boolean;
  salesKindId: number;
  /** SalesPayMethod.DeleveryRequair — payment method requires delivery on the invoice. */
  deleveryRequair: boolean;
};

export type SalesPaymentLine = {
  paymentMethodId: number;
  paymentName: string | null;
  amount: number;
  accountCode: string | null;
};

export type SalesPaymentContext = {
  sthId: number;
  billTyp: number;
  paymentStatus: string;
  totalBill: number | null;
  totalBillAfterDisc: number | null;
  totalBillNet: number | null;
  finalPayableAmount: number;
  pharmId: string | null;
  scId: number | null;
  existingPayments: SalesPaymentLine[];
  availablePaymentMethods: SalesPaymentMethodOption[];
};

export type FinalizeSalePaymentRequest = {
  sthId: number;
  salesKindId: number;
  payments: Array<{
    paymentMethodId: number;
    amount: number;
  }>;
  /** Employee code/password credential; the server resolves and verifies it. */
  employeeCode?: string | null;
  /** Customer.CustCode selected during finalization; validated server-side. */
  custId?: number | null;
  /** Blocks server-side finalization when no customer ends up on the header. */
  requireCustomer?: boolean;
};

export type FinalizeSalePaymentResponse = {
  sthId: number;
  billTyp: number;
  paymentStatus: string;
  finalSaleTotal: number;
  paymentTotal: number;
  paymentDetails: SalesPaymentLine[];
  /** True when the sale was already finalized; the lines are the persisted ones. */
  replay?: boolean;
};

/** One row of SalesPayment/pending: unfinalized invoice of the active pharmacy. */
export type PendingSaleListItem = {
  sthId: number;
  totalBill: number | null;
  salesmanName: string | null;
};

/** Read-only details from GET SalesPayment/{sthId}/details: header customer + item lines. */
export type SalesSaleDetails = {
  sthId: number;
  billTyp: number;
  custId: number | null;
  customerName: string | null;
  customerTel: string | null;
  lines: SalesReceiptLine[];
};
