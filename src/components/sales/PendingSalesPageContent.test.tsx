import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PendingSalesPageContent } from "@/components/sales/PendingSalesPageContent";
import {
  ApiError,
  finalizeSalePayment,
  getPendingSales,
  getSaleDeliveryContext,
  getSalePaymentContext,
  getSalePaymentKinds,
  getSalePaymentMethods,
  getSalesReceipt,
  getSalesSaleDetails,
  lookupSalesManByPassword,
  upsertSaleDelivery,
} from "@/lib/api-client";
import type { PendingSaleListItem } from "@/types/sales-payment";
import type { SalesReceipt } from "@/types/sales-receipt";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { accessToken: "token-1" } }),
}));

vi.mock("@/components/permissions/page-guard", () => ({
  PageGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/sales/SalesCustomerAutocomplete", () => ({
  SalesCustomerAutocomplete: ({
    value,
    onQueryChange,
    onCustomerSelected,
  }: {
    value: string;
    onQueryChange: (text: string) => void;
    onCustomerSelected: (customer: Record<string, unknown>) => void;
  }) => (
    <div>
      <input
        aria-label="Customer picker"
        value={value}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() =>
          onCustomerSelected({
            custCode: 42,
            custNameAr: "عميل",
            custNameEn: "Client",
            custMobile: "0100",
            custAddress: "Nasr City",
          })
        }
      >
        Pick customer 42
      </button>
    </div>
  ),
}));

vi.mock("@/lib/api-client", () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string
    ) {
      super(message);
      this.name = "ApiError";
    }
  },
  finalizeSalePayment: vi.fn(),
  getPendingSales: vi.fn(),
  getSaleDeliveryContext: vi.fn(),
  getSalePaymentContext: vi.fn(),
  getSalePaymentKinds: vi.fn(),
  getSalePaymentMethods: vi.fn(),
  getSalesReceipt: vi.fn(),
  getSalesSaleDetails: vi.fn(),
  lookupSalesManByPassword: vi.fn(),
  resolveSaleDeliveryEmployee: vi.fn(),
  upsertSaleDelivery: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

import { toast } from "sonner";

const pendingRows: PendingSaleListItem[] = [
  { sthId: 602, totalBill: 80.5, salesmanName: null },
  { sthId: 601, totalBill: 150, salesmanName: "مروه صابر" },
];

function paymentContext(overrides: Record<string, unknown> = {}) {
  return {
    sthId: 601,
    billTyp: 0,
    paymentStatus: "Unpaid / Pending Payment",
    totalBill: 150,
    totalBillAfterDisc: 150,
    totalBillNet: 150,
    finalPayableAmount: 150,
    pharmId: "1",
    scId: 9,
    existingPayments: [],
    availablePaymentMethods: [],
    ...overrides,
  };
}

const deliveryContext = {
  sthId: 601,
  pharmId: "1",
  billTyp: 0,
  delivery: null,
  availableServices: [],
};

function saleDetailsFixture(overrides: Record<string, unknown> = {}) {
  return {
    sthId: 601,
    billTyp: 0,
    custId: 42,
    customerName: "عميل",
    customerTel: "0100",
    lines: [
      {
        lineNo: 1,
        itemName: "دواء",
        itemCode: "ITM-5",
        quantity: 2,
        unitName: "علبة",
        unitPrice: 50,
        lineDiscount: 10,
        lineNet: 90,
      },
      {
        lineNo: 2,
        itemName: "دواء",
        itemCode: "ITM-5",
        quantity: 1,
        unitName: "شريط",
        unitPrice: 30,
        lineDiscount: 0,
        lineNet: 30,
      },
    ],
    ...overrides,
  };
}

const counterKind = {
  salesKindId: 1,
  salesKindName: "Counter",
  deleveryMandatory: false,
};
const cashMethod = {
  paymentMethodId: 10,
  paymentName: "Cash",
  affectsCash: true,
  active: true,
  salesKindId: 1,
  deleveryRequair: false,
};

const deliveryService30 = {
  salesServiceId: 5,
  serviceName: "Toki",
  serviceType: "Delivery",
  cost: 30,
  requiresDeliveryEmployee: false,
};

const deliveryService40 = {
  salesServiceId: 6,
  serviceName: "Express",
  serviceType: "Delivery",
  cost: 40,
  requiresDeliveryEmployee: false,
};

function savedDeliveryCtx(cost: number, service: typeof deliveryService30) {
  return {
    sthId: 601,
    pharmId: "1",
    billTyp: 0,
    delivery: {
      id: 77,
      sthId: 601,
      custId: 42,
      customerName: "عميل",
      tel: "0100",
      address: "Nasr City",
      salesServiceId: service.salesServiceId,
      serviceName: service.serviceName,
      serviceType: service.serviceType,
      serviceCost: cost,
      delivEmpId: null,
      deliveryEmployeeName: null,
      requiresDeliveryEmployee: false,
    },
    availableServices: [deliveryService30, deliveryService40],
  };
}

const finalizeResult = {
  sthId: 601,
  billTyp: 1,
  paymentStatus: "Paid / Payment Finalized",
  finalSaleTotal: 150,
  paymentTotal: 150,
  paymentDetails: [
    { paymentMethodId: 10, paymentName: "Cash", amount: 150, accountCode: "ACC" },
  ],
  replay: false,
};

function receiptFixture(overrides: Partial<SalesReceipt> = {}): SalesReceipt {
  return {
    sthId: 601,
    billTyp: 1,
    paymentStatus: "Paid / Payment Finalized",
    invoiceDate: "2026-10-15 11:30:00",
    pharmacyName: "صيدلية 1",
    pharmacyTel: null,
    pharmacyAddress: null,
    customerName: null,
    customerTel: null,
    totalBill: 150,
    totalDiscount: null,
    serviceCost: null,
    finalPayableAmount: 150,
    paidAmount: 150,
    remainingAmount: 0,
    changeAmount: 0,
    payments: [],
    lines: [],
    ...overrides,
  };
}

function mockDefaultApi() {
  vi.mocked(getPendingSales).mockResolvedValue(pendingRows);
  vi.mocked(getSalePaymentContext).mockResolvedValue(
    paymentContext() as Awaited<ReturnType<typeof getSalePaymentContext>>
  );
  vi.mocked(getSaleDeliveryContext).mockResolvedValue(
    deliveryContext as Awaited<ReturnType<typeof getSaleDeliveryContext>>
  );
  vi.mocked(getSalePaymentKinds).mockResolvedValue([
    counterKind,
  ] as Awaited<ReturnType<typeof getSalePaymentKinds>>);
  vi.mocked(getSalePaymentMethods).mockResolvedValue([
    cashMethod,
  ] as Awaited<ReturnType<typeof getSalePaymentMethods>>);
  vi.mocked(getSalesSaleDetails).mockResolvedValue(
    saleDetailsFixture() as Awaited<ReturnType<typeof getSalesSaleDetails>>
  );
  vi.mocked(lookupSalesManByPassword).mockResolvedValue({
    id: 8,
    code: null,
    name: "مروه صابر",
    employType: 1,
  });
  vi.mocked(finalizeSalePayment).mockResolvedValue(
    finalizeResult as Awaited<ReturnType<typeof finalizeSalePayment>>
  );
  vi.mocked(getSalesReceipt).mockResolvedValue(receiptFixture());
}

async function selectInvoiceRow(sthId = 601) {
  await waitFor(() => expect(screen.getByText(String(sthId))).toBeInTheDocument());
  fireEvent.click(screen.getByText(String(sthId)));
  await waitFor(() =>
    expect(screen.getByText("Sale Total (payable): 150.00")).toBeInTheDocument()
  );
}

async function fillMatchingPayment() {
  fireEvent.change(screen.getByLabelText("Sales Kind"), {
    target: { value: "1" },
  });
  await waitFor(() => expect(getSalePaymentMethods).toHaveBeenCalledWith("token-1", 1));
  const input = await screen.findByDisplayValue("0");
  fireEvent.change(input, { target: { value: "150" } });
}

async function verifyFinalizingEmployee(code = "c3d4") {
  fireEvent.change(screen.getByLabelText(/Finalizing Employee/i), {
    target: { value: code },
  });
  fireEvent.click(screen.getByRole("button", { name: "Verify" }));
  await waitFor(() =>
    expect(lookupSalesManByPassword).toHaveBeenCalledWith("token-1", code)
  );
}

async function completeFinalizableState() {
  await selectInvoiceRow();
  await fillMatchingPayment();
  await verifyFinalizingEmployee();
}

describe("PendingSalesPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "print").mockImplementation(() => {});
    mockDefaultApi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("lists only the pending rows returned by the scoped API", async () => {
    render(<PendingSalesPageContent />);
    await waitFor(() => expect(getPendingSales).toHaveBeenCalledWith("token-1"));

    expect(await screen.findByText("601")).toBeInTheDocument();
    expect(screen.getByText("150.00")).toBeInTheDocument();
    expect(screen.getByText("مروه صابر")).toBeInTheDocument();
    expect(screen.getByText("602")).toBeInTheDocument();
    expect(screen.getByText("80.50")).toBeInTheDocument();
  });

  it("shows the empty state when there are no pending invoices", async () => {
    vi.mocked(getPendingSales).mockResolvedValue([]);
    render(<PendingSalesPageContent />);
    expect(await screen.findByText(/No pending invoices/i)).toBeInTheDocument();
  });

  it("shows an error banner when the list call fails", async () => {
    vi.mocked(getPendingSales).mockRejectedValue(new Error("boom"));
    render(<PendingSalesPageContent />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Failed to load pending invoices.");
  });

  it("asks for a selection when no invoice is selected", async () => {
    render(<PendingSalesPageContent />);
    expect(
      await screen.findAllByText("Select a pending invoice to complete payment.")
    ).not.toHaveLength(0);
  });

  it("loads the selected invoice payment data without creating anything", async () => {
    render(<PendingSalesPageContent />);
    await selectInvoiceRow();

    expect(getSalePaymentContext).toHaveBeenCalledWith("token-1", 601);
    expect(getSalesSaleDetails).toHaveBeenCalledWith("token-1", 601);
    // Delivery data is lazy: nothing requested until a delivery-requiring action happens.
    expect(getSaleDeliveryContext).not.toHaveBeenCalled();
    expect(finalizeSalePayment).not.toHaveBeenCalled();
    expect(screen.getByText("Invoice No: 601")).toBeInTheDocument();
  });

  it("shows the item lines with the Arabic sales unit names under the summary", async () => {
    render(<PendingSalesPageContent />);
    await selectInvoiceRow();

    expect(await screen.findByText("علبة")).toBeInTheDocument();
    expect(screen.getByText("شريط")).toBeInTheDocument();
    expect(screen.getAllByText("ITM-5")).toHaveLength(2);
    expect(screen.getAllByText("دواء")).toHaveLength(2);
    // Qty/Price/Disc/Net match the receipt projection values.
    expect(screen.getByText("90.00")).toBeInTheDocument();
  });

  it("loads delivery data lazily when delivery is requested, once per invoice", async () => {
    render(<PendingSalesPageContent />);
    await selectInvoiceRow();
    expect(getSaleDeliveryContext).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Require delivery" }));
    await waitFor(() =>
      expect(getSaleDeliveryContext).toHaveBeenCalledWith("token-1", 601)
    );

    // Toggling off and on again must not re-fetch the same invoice's context.
    fireEvent.click(screen.getByRole("button", { name: "Delivery required" }));
    fireEvent.click(screen.getByRole("button", { name: "Require delivery" }));
    await new Promise((r) => setTimeout(r, 0));
    expect(getSaleDeliveryContext).toHaveBeenCalledTimes(1);
  });

  it("loads the delivery context when a delivery-requiring payment method is used", async () => {
    vi.mocked(getSalePaymentMethods).mockResolvedValue([
      { ...cashMethod, deleveryRequair: true },
    ] as Awaited<ReturnType<typeof getSalePaymentMethods>>);
    render(<PendingSalesPageContent />);
    await selectInvoiceRow();
    expect(getSaleDeliveryContext).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Sales Kind"), { target: { value: "1" } });
    await waitFor(() => expect(getSalePaymentMethods).toHaveBeenCalled());
    const amount = await screen.findByDisplayValue("0");
    fireEvent.change(amount, { target: { value: "150" } });

    await waitFor(() =>
      expect(getSaleDeliveryContext).toHaveBeenCalledWith("token-1", 601)
    );
  });

  it("Finalize pays the selected existing invoice and refreshes the list", async () => {
    render(<PendingSalesPageContent />);
    await completeFinalizableState();

    fireEvent.click(screen.getByRole("button", { name: "Finalize" }));

    await waitFor(() =>
      expect(finalizeSalePayment).toHaveBeenCalledWith("token-1", {
        sthId: 601,
        salesKindId: 1,
        payments: [{ paymentMethodId: 10, amount: 150 }],
        employeeCode: "c3d4",
        custId: 42,
        requireCustomer: true,
      })
    );
    await waitFor(() => expect(getPendingSales).toHaveBeenCalledTimes(2));
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Sale 601 paid")
    );
    // Panel resets for the next invoice; printing skipped for plain Finalize.
    expect(
      await screen.findAllByText("Select a pending invoice to complete payment.")
    ).not.toHaveLength(0);
    expect(getSalesReceipt).not.toHaveBeenCalled();
  });

  it("Finalize & Print only prints after a successful finalization", async () => {
    render(<PendingSalesPageContent />);
    await completeFinalizableState();

    fireEvent.click(screen.getByRole("button", { name: "Finalize & Print" }));

    await waitFor(() => expect(finalizeSalePayment).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getSalesReceipt).toHaveBeenCalledWith("token-1", 601));
    expect(document.getElementById("sales-receipt-print-root")).not.toBeNull();
  });

  it("a failed finalization keeps the invoice in the list and preserves entered amounts", async () => {
    vi.mocked(finalizeSalePayment).mockRejectedValue(new ApiError(400, "shift closed"));
    render(<PendingSalesPageContent />);
    await selectInvoiceRow();
    await fillMatchingPayment();
    await verifyFinalizingEmployee();
    vi.mocked(toast.success).mockClear(); // ignore the employee-verification toast

    fireEvent.click(screen.getByRole("button", { name: "Finalize" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("shift closed")
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByText("601")).toBeInTheDocument();
    expect(
      ((await screen.findByDisplayValue("150")) as HTMLInputElement).value
    ).toBe("150");
    // No list refresh happens on failure: the row stays authoritative.
    expect(getPendingSales).toHaveBeenCalledTimes(1);
  });

  it("a replay finalization reports no new payment and still refreshes", async () => {
    vi.mocked(finalizeSalePayment).mockResolvedValue({
      ...finalizeResult,
      replay: true,
    } as Awaited<ReturnType<typeof finalizeSalePayment>>);
    render(<PendingSalesPageContent />);
    await completeFinalizableState();

    fireEvent.click(screen.getByRole("button", { name: "Finalize" }));

    await waitFor(() =>
      expect(toast.message).toHaveBeenCalledWith(
        expect.stringContaining("already finalized")
      )
    );
    expect(finalizeSalePayment).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getPendingSales).toHaveBeenCalledTimes(2));
  });

  it("selecting an invoice finalized elsewhere removes it from the pending list", async () => {
    vi.mocked(getSalePaymentContext).mockResolvedValue(
      paymentContext({ billTyp: 1, paymentStatus: "Paid / Payment Finalized" }) as Awaited<
        ReturnType<typeof getSalePaymentContext>
      >
    );
    render(<PendingSalesPageContent />);
    await waitFor(() => expect(screen.getByText("601")).toBeInTheDocument());
    fireEvent.click(screen.getByText("601"));

    await waitFor(() =>
      expect(toast.message).toHaveBeenCalledWith(expect.stringContaining("already finalized"))
    );
    expect(screen.queryByText("601")).not.toBeInTheDocument();
    expect(finalizeSalePayment).not.toHaveBeenCalled();
  });

  it("blocks finalize until the delivery required by the sales kind is saved", async () => {
    vi.mocked(getSalePaymentKinds).mockResolvedValue([
      { salesKindId: 2, salesKindName: "Delivery", deleveryMandatory: true },
    ] as Awaited<ReturnType<typeof getSalePaymentKinds>>);
    render(<PendingSalesPageContent />);
    await selectInvoiceRow();

    fireEvent.change(screen.getByLabelText("Sales Kind"), { target: { value: "2" } });
    await waitFor(() => expect(getSalePaymentMethods).toHaveBeenCalled());
    const amount = await screen.findByDisplayValue("0");
    fireEvent.change(amount, { target: { value: "150" } });

    expect(
      await screen.findByText(/Save the delivery service for this invoice/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Finalize & Print" })).toBeDisabled();
    expect(finalizeSalePayment).not.toHaveBeenCalled();
  });

  it("blocks finalize until a customer is selected when the invoice has none", async () => {
    vi.mocked(getSalesSaleDetails).mockResolvedValue(
      saleDetailsFixture({ custId: null, customerName: null, customerTel: null }) as Awaited<
        ReturnType<typeof getSalesSaleDetails>
      >
    );
    render(<PendingSalesPageContent />);
    await selectInvoiceRow();
    await fillMatchingPayment();
    await verifyFinalizingEmployee();

    expect(screen.getByText("Customer is required before finalization.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Finalize & Print" })).toBeDisabled();

    // Picking a customer unlocks both buttons and its code rides on the finalize call.
    fireEvent.click(screen.getByRole("button", { name: "Pick customer 42" }));
    await waitFor(() =>
      expect(screen.getByText("42 — عميل")).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Finalize" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Finalize" }));
    await waitFor(() =>
      expect(finalizeSalePayment).toHaveBeenCalledWith(
        "token-1",
        expect.objectContaining({ custId: 42, requireCustomer: true })
      )
    );
  });

  it("blocks finalize until the finalizing employee is verified", async () => {
    render(<PendingSalesPageContent />);
    await selectInvoiceRow();
    await fillMatchingPayment();

    expect(screen.getByText(/Verify the finalizing employee code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Finalize & Print" })).toBeDisabled();
    expect(finalizeSalePayment).not.toHaveBeenCalled();
  });

  it("rejects an employee that is not a sales employee", async () => {
    vi.mocked(lookupSalesManByPassword).mockResolvedValue({
      id: 9,
      code: null,
      name: "Rider",
      employType: 2,
    });
    render(<PendingSalesPageContent />);
    await selectInvoiceRow();
    await fillMatchingPayment();
    await verifyFinalizingEmployee("e5f6");

    expect(toast.error).toHaveBeenCalledWith("Sales Man not found");
    expect(screen.getByRole("button", { name: "Finalize" })).toBeDisabled();
  });

  it("changing the selection loads the newly selected invoice only", async () => {
    vi.mocked(getSalePaymentContext).mockImplementation(async (token, sthId) =>
      paymentContext(
        sthId === 602 ? { sthId: 602, finalPayableAmount: 80.5, totalBill: 80.5 } : {}
      ) as Awaited<ReturnType<typeof getSalePaymentContext>>
    );
    render(<PendingSalesPageContent />);
    await selectInvoiceRow(601);
    await waitFor(() =>
      expect(screen.getByText("Sale Total (payable): 150.00")).toBeInTheDocument()
    );

    await act(async () => {
      fireEvent.click(screen.getByText("602"));
    });
    await waitFor(() =>
      expect(screen.getByText("Sale Total (payable): 80.50")).toBeInTheDocument()
    );
    expect(screen.getByText("Invoice No: 602")).toBeInTheDocument();
  });

  it("folds a saved delivery service cost into Total Due and recalculates the balances", async () => {
    // Server rule: TotalBillNet = items + saved service cost; payable follows the header.
    let savedCost = 0;
    vi.mocked(upsertSaleDelivery).mockImplementation(async (_token, request) => {
      savedCost = request.salesServiceId === 5 ? 30 : 40;
      return null as never;
    });
    vi.mocked(getSalePaymentContext).mockImplementation(
      async () =>
        paymentContext(
          savedCost > 0
            ? { finalPayableAmount: 150 + savedCost, totalBillNet: 150 + savedCost }
            : {}
        ) as Awaited<ReturnType<typeof getSalePaymentContext>>
    );
    vi.mocked(getSaleDeliveryContext)
      .mockResolvedValueOnce(
        { ...deliveryContext, availableServices: [deliveryService30, deliveryService40] } as Awaited<
          ReturnType<typeof getSaleDeliveryContext>
        >
      )
      .mockResolvedValueOnce(
        savedDeliveryCtx(30, deliveryService30) as Awaited<
          ReturnType<typeof getSaleDeliveryContext>
        >
      )
      .mockResolvedValueOnce(
        savedDeliveryCtx(40, deliveryService40) as Awaited<
          ReturnType<typeof getSaleDeliveryContext>
        >
      );

    render(<PendingSalesPageContent />);
    await selectInvoiceRow();

    // Paid vs entered vs due vs remaining are distinct lines; 0.00 entered never reads as the total.
    expect(screen.getByText("Amount already paid: 0.00")).toBeInTheDocument();
    expect(screen.getByText("Payment entered: 0.00")).toBeInTheDocument();
    expect(screen.getByText("Total Due: 150.00")).toBeInTheDocument();
    expect(screen.getByText("Remaining balance: 150.00")).toBeInTheDocument();
    expect(screen.queryByText(/incl\. delivery/i)).not.toBeInTheDocument();
    expect(getSaleDeliveryContext).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Sales Kind"), { target: { value: "1" } });
    await waitFor(() => expect(getSalePaymentMethods).toHaveBeenCalledWith("token-1", 1));

    fireEvent.click(screen.getByRole("button", { name: "Require delivery" }));
    await waitFor(() =>
      expect(getSaleDeliveryContext).toHaveBeenCalledWith("token-1", 601)
    );

    fireEvent.change(screen.getByLabelText("Delivery service"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Customer + Delivery" }));

    // 1152 scenario: 150.00 invoice + 30.00 delivery = 180.00 due, paid still 0.00, outstanding 180.00.
    await waitFor(() =>
      expect(
        screen.getByText("Total Due (incl. delivery service): 180.00")
      ).toBeInTheDocument()
    );
    expect(screen.getByText("Sale Total (payable): 180.00")).toBeInTheDocument();
    expect(screen.getByText("Amount already paid: 0.00")).toBeInTheDocument();
    expect(screen.getByText("Remaining balance: 180.00")).toBeInTheDocument();

    const amount = (await screen.findByDisplayValue("0")) as HTMLInputElement;
    fireEvent.change(amount, { target: { value: "80" } });
    await waitFor(() =>
      expect(screen.getByText("Payment entered: 80.00")).toBeInTheDocument()
    );
    expect(screen.getByText("Remaining balance: 100.00")).toBeInTheDocument();

    // Changing the service recalculates the total from the refreshed server payable.
    fireEvent.change(screen.getByLabelText("Delivery service"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Customer + Delivery" }));
    await waitFor(() =>
      expect(
        screen.getByText("Total Due (incl. delivery service): 190.00")
      ).toBeInTheDocument()
    );
    expect(screen.getByText("Remaining balance: 110.00")).toBeInTheDocument();

    // Both buttons validate against that same total: one payment line, no double delivery charge.
    fireEvent.change(amount, { target: { value: "190" } });
    await verifyFinalizingEmployee();
    fireEvent.click(screen.getByRole("button", { name: "Finalize" }));
    await waitFor(() =>
      expect(finalizeSalePayment).toHaveBeenCalledWith(
        "token-1",
        expect.objectContaining({
          payments: [{ paymentMethodId: 10, amount: 190 }],
        })
      )
    );
    expect(finalizeSalePayment).toHaveBeenCalledTimes(1);
  });

  it("keeps an unsaved delivery service out of Total Due for delivery-requiring methods", async () => {
    vi.mocked(getSalePaymentMethods).mockResolvedValue([
      { ...cashMethod, deleveryRequair: true },
    ] as Awaited<ReturnType<typeof getSalePaymentMethods>>);
    render(<PendingSalesPageContent />);
    await selectInvoiceRow();

    fireEvent.change(screen.getByLabelText("Sales Kind"), { target: { value: "1" } });
    await waitFor(() => expect(getSalePaymentMethods).toHaveBeenCalled());
    const amount = await screen.findByDisplayValue("0");
    fireEvent.change(amount, { target: { value: "150" } });

    await waitFor(() =>
      expect(getSaleDeliveryContext).toHaveBeenCalledWith("token-1", 601)
    );

    expect(screen.getByText("Total Due: 150.00")).toBeInTheDocument();
    expect(screen.getByText("Remaining balance: 0.00")).toBeInTheDocument();
    expect(screen.queryByText(/incl\. delivery/i)).not.toBeInTheDocument();
    expect(upsertSaleDelivery).not.toHaveBeenCalled();
  });
});
