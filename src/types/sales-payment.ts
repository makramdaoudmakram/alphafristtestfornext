export type SalesPaymentMethodOption = {
  paymentMethodId: number;
  paymentName: string | null;
  affectsCash: boolean;
  active: boolean;
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
  payments: Array<{
    paymentMethodId: number;
    amount: number;
  }>;
};

export type FinalizeSalePaymentResponse = {
  sthId: number;
  billTyp: number;
  paymentStatus: string;
  finalSaleTotal: number;
  paymentTotal: number;
  paymentDetails: SalesPaymentLine[];
};
