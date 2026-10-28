import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShiftClosingPanel } from "@/components/shift/ShiftClosingPanel";
import {
  ApiError,
  closeShift,
  getShiftClosingPreview,
  getShiftClosingReceipt,
  lookupSalesManByPassword,
} from "@/lib/api-client";
import type {
  ShiftClosingPreview,
  ShiftClosingTotals,
  ShiftStatus,
} from "@/types/shift";

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
  getShiftClosingPreview: vi.fn(),
  getShiftClosingReceipt: vi.fn(),
  closeShift: vi.fn(),
  lookupSalesManByPassword: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

import { toast } from "sonner";

const openStatus: ShiftStatus = {
  parmId: 1,
  pharmacyName: "Test Pharm",
  hasOpenShift: true,
  hasShiftHistory: true,
  isFirstShiftOpening: false,
  costCenterCode: "CC1",
  costCenterName: "Main",
  status: "Open",
  scId: 3,
  openedAt: "2026-01-01T10:00:00Z",
  openingBalance: 50,
  openedBy: "u1",
  cashier: "Cashier",
  notes: null,
  moveId: 5,
  movName: "Sales",
};

const baseTotals: ShiftClosingTotals = {
  salesPostPay: 10,
  salesPostPayDiscount: 1,
  salesMedicalDiscount: 2,
  salesMedicen: 100,
  salesAccessories: 20,
  salesTax: 5,
  salesTragurt: 50,
  salesCostMedicen: 40,
  salesAccessoricCost: 8,
  salesParmCost: 48,
  salesExpensive: 3,
  salesPurches: 12,
  salesReturnTotal: 0,
  purchaseReturnTotal: 0,
  deliveryValue: 0,
  deliveryCount: 0,
  totalReturnSales: 0,
  returnCash: 0,
  totalPurchReturn: 0,
  totalSales: 0,
  totalDiscountValue: 0,
};

function preview(overrides: Partial<ShiftClosingPreview> = {}): ShiftClosingPreview {
  return {
    parmId: 1,
    pharmKey: "1",
    scId: 3,
    moveId: 5,
    costCenterCode: "CC1",
    costCenterName: "Main",
    shiftStartedAt: "2026-01-01T10:00:00Z",
    openingBalance: 50,
    canClose: true,
    blockReason: null,
    unresolvedSales: [],
    pendingDeliveries: [],
    paymentClassifications: [],
    totals: baseTotals,
    ...overrides,
  };
}

async function openCloseForm() {
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() =>
    expect(screen.getByPlaceholderText("Enter employee password")).toBeInTheDocument()
  );
}

function mockCashierOneLookup() {
  vi.mocked(lookupSalesManByPassword).mockResolvedValue({
    id: 9,
    code: "E09",
    name: "Cashier One",
    employType: 1,
  });
}

async function submitEmployeePassword(password = "A1B2") {
  mockCashierOneLookup();
  const input = screen.getByPlaceholderText("Enter employee password");
  fireEvent.change(input, { target: { value: password } });
  fireEvent.keyDown(input, { key: "Enter" });
}

async function verifySalesMan(password = "A1B2") {
  await submitEmployeePassword(password);
  await waitFor(() => expect(screen.getByText("Cashier One")).toBeInTheDocument());
}

describe("ShiftClosingPanel", () => {
  beforeEach(() => {
    vi.mocked(getShiftClosingPreview).mockReset();
    vi.mocked(getShiftClosingReceipt).mockResolvedValue({
      summary: {
        pharmacyName: "Test Pharm",
        scId: 3,
        startTime: null,
        totalSales: "0",
        totalReturn: 0,
        totalExpen: 0,
        totalPurch: 0,
        totalPurchRet: 0,
        deliveryValue: 0,
        deliveryCount: 0,
        totalDiscount: 0,
        totalTransfer: 0,
      },
      classifications: [],
    });
    vi.mocked(closeShift).mockReset();
    vi.mocked(lookupSalesManByPassword).mockReset();
    vi.stubGlobal("print", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("displays Total Sales in closing totals preview", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(
      preview({
        totals: { ...baseTotals, totalSales: 275 },
      })
    );
    render(
      <ShiftClosingPanel token="t1" status={openStatus} onShiftClosed={vi.fn()} />
    );
    await openCloseForm();
    await verifySalesMan();
    fireEvent.click(
      screen.getByText(/Closing totals preview \(19 items\)/i)
    );
    await waitFor(() =>
      expect(screen.getByText("Total Sales")).toBeInTheDocument()
    );
    expect(screen.getByText("275.00")).toBeInTheDocument();
  });

  it("loads preview after employee verification", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(preview());
    render(
      <ShiftClosingPanel token="t1" status={openStatus} onShiftClosed={vi.fn()} />
    );
    await openCloseForm();
    await verifySalesMan();
    await waitFor(() => expect(getShiftClosingPreview).toHaveBeenCalledWith("t1", 3));
    expect(screen.queryByLabelText(/Opening balance/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Actual pharmacy cash/i)).not.toBeInTheDocument();
  });

  it("shows invoice warning under closing notes when unfinalized sales exist", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(
      preview({
        canClose: false,
        blockReason: "You have to finish all pending invoices before closing the shift.",
        unresolvedSales: [{ sthId: 701, totalBillNet: 90, createdAt: null }],
      })
    );

    render(
      <ShiftClosingPanel token="t1" status={openStatus} onShiftClosed={vi.fn()} />
    );
    await openCloseForm();
    await submitEmployeePassword();
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /You have to finish all pending invoices before closing the shift/
      )
    );
    expect(
      screen.getByRole("button", { name: "Submit close" })
    ).toBeDisabled();
  });

  it("shows delivery warning under closing notes when deliveries are open", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(
      preview({
        canClose: false,
        blockReason: "You have to finish all pending deliveries before closing the shift.",
        pendingDeliveries: [
          { sthId: 801, contact: "A", tel: "1", delivStat: "P" },
        ],
      })
    );

    render(
      <ShiftClosingPanel token="t1" status={openStatus} onShiftClosed={vi.fn()} />
    );
    await openCloseForm();
    await submitEmployeePassword();
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /You have to finish all pending deliveries before closing the shift/
      )
    );
    expect(screen.getByRole("button", { name: "Submit close" })).toBeDisabled();
  });

  it("shows both warnings when invoices and deliveries are pending", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(
      preview({
        canClose: false,
        unresolvedSales: [{ sthId: 701, totalBillNet: 90, createdAt: null }],
        pendingDeliveries: [
          { sthId: 801, contact: "A", tel: "1", delivStat: "P" },
        ],
      })
    );

    render(
      <ShiftClosingPanel token="t1" status={openStatus} onShiftClosed={vi.fn()} />
    );
    await openCloseForm();
    await submitEmployeePassword();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      /You have to finish all pending invoices before closing the shift/
    );
    expect(alert).toHaveTextContent(
      /You have to finish all pending deliveries before closing the shift/
    );
  });

  it("renders one textbox per distinct payment classification", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(
      preview({
        paymentClassifications: [
          { salesClassifyId: 1, displayName: "Cash", salesInvoiceCount: 7 },
          { salesClassifyId: 2, displayName: "Visa", salesInvoiceCount: 5 },
          { salesClassifyId: 3, displayName: "InstaPay", salesInvoiceCount: 3 },
        ],
      })
    );

    render(
      <ShiftClosingPanel token="t1" status={openStatus} onShiftClosed={vi.fn()} />
    );
    await openCloseForm();
    await verifySalesMan();
    await waitFor(() =>
      expect(screen.getByLabelText("Cash (7)")).toBeInTheDocument()
    );
    expect(screen.getByLabelText("Visa (5)")).toBeInTheDocument();
    expect(screen.getByLabelText("InstaPay (3)")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Cash (7)"), {
      target: { value: "100.50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Refresh preview" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Cash (7)")).toHaveValue(100.5)
    );
  });

  it("shows empty message when no classifications exist", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(preview());
    render(
      <ShiftClosingPanel token="t1" status={openStatus} onShiftClosed={vi.fn()} />
    );
    await openCloseForm();
    await verifySalesMan();
    await waitFor(() =>
      expect(
        screen.getByText(/No payment classifications were found/i)
      ).toBeInTheDocument()
    );
  });

  it("submits close with password using API cash placeholder", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(preview());
    vi.mocked(closeShift).mockResolvedValue({
      scId: 3,
      closedAt: "2026-01-01T18:00:00Z",
      totals: baseTotals,
      nextScId: 4,
      nextOpeningBalance: 25,
      nextShiftStartedAt: "2026-01-01T18:05:00Z",
    });
    const onClosed = vi.fn().mockResolvedValue(undefined);

    render(
      <ShiftClosingPanel token="t1" status={openStatus} onShiftClosed={onClosed} />
    );
    await openCloseForm();
    await verifySalesMan("A1B2");
    await waitFor(() => screen.getByRole("button", { name: "Submit close" }));

    fireEvent.click(screen.getByRole("button", { name: "Submit close" }));

    await waitFor(() =>
      expect(closeShift).toHaveBeenCalledWith("t1", {
        scId: 3,
        actualPharmacyCash: 0,
        headOfficeTransferAmount: 0,
        employeePassword: "A1B2",
        closingNotes: null,
        paymentCollection: [],
      })
    );
    expect(toast.success).toHaveBeenCalled();
    expect(onClosed).toHaveBeenCalled();
  });

  it("surfaces HTTP 409 without success toast", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(preview());
    vi.mocked(closeShift).mockRejectedValue(new ApiError(409, "Shift is already closed."));
    const onClosed = vi.fn().mockResolvedValue(undefined);

    render(
      <ShiftClosingPanel token="t1" status={openStatus} onShiftClosed={onClosed} />
    );
    await openCloseForm();
    await verifySalesMan("x");
    await waitFor(() => screen.getByRole("button", { name: "Submit close" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit close" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onClosed).toHaveBeenCalled();
  });

  it("shows Sales Man name after successful password verification", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(preview());
    render(
      <ShiftClosingPanel token="t1" status={openStatus} onShiftClosed={vi.fn()} />
    );
    await openCloseForm();
    await verifySalesMan("GOOD");
    expect(lookupSalesManByPassword).toHaveBeenCalledWith("t1", "GOOD");
    expect(screen.queryByPlaceholderText("Enter employee password")).not.toBeInTheDocument();
  });

  it("shows Sales Man not found for invalid password", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(preview());
    vi.mocked(lookupSalesManByPassword).mockResolvedValue(null);
    render(
      <ShiftClosingPanel token="t1" status={openStatus} onShiftClosed={vi.fn()} />
    );
    await openCloseForm();
    const input = screen.getByPlaceholderText("Enter employee password");
    fireEvent.change(input, { target: { value: "BAD1" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Sales Man not found"));
    expect(screen.getByPlaceholderText("Enter employee password")).toBeInTheDocument();
  });

  it("submits payment collection amounts from Cash and Visa inputs", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(
      preview({
        paymentClassifications: [
          { salesClassifyId: 1, displayName: "Cash", salesInvoiceCount: 2 },
          { salesClassifyId: 2, displayName: "Visa", salesInvoiceCount: 1 },
        ],
      })
    );
    vi.mocked(closeShift).mockResolvedValue({
      scId: 3,
      closedAt: null,
      totals: baseTotals,
      nextScId: 4,
      nextOpeningBalance: 0,
      nextShiftStartedAt: null,
    });

    render(
      <ShiftClosingPanel token="t1" status={openStatus} onShiftClosed={vi.fn()} />
    );
    await openCloseForm();
    await verifySalesMan("A1B2");
    await waitFor(() => screen.getByLabelText("Cash (2)"));

    fireEvent.change(screen.getByLabelText("Cash (2)"), {
      target: { value: "2000" },
    });
    fireEvent.change(screen.getByLabelText("Visa (1)"), {
      target: { value: "1500" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit close" }));

    await waitFor(() =>
      expect(closeShift).toHaveBeenCalledWith("t1", {
        scId: 3,
        actualPharmacyCash: 0,
        headOfficeTransferAmount: 0,
        employeePassword: "A1B2",
        closingNotes: null,
        paymentCollection: [
          { salesClassifyId: 1, actualAmount: 2000 },
          { salesClassifyId: 2, actualAmount: 1500 },
        ],
      })
    );
  });

  it("submits the latest verified employee after Change", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(preview());
    vi.mocked(closeShift).mockResolvedValue({
      scId: 3,
      closedAt: null,
      totals: baseTotals,
      nextScId: 4,
      nextOpeningBalance: 10,
      nextShiftStartedAt: null,
    });
    render(
      <ShiftClosingPanel token="t1" status={openStatus} onShiftClosed={vi.fn()} />
    );
    await openCloseForm();
    await verifySalesMan("FIRST");
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Enter employee password")).toBeInTheDocument()
    );

    vi.mocked(lookupSalesManByPassword).mockResolvedValue({
      id: 10,
      code: "E10",
      name: "Cashier Two",
      employType: 1,
    });
    const input = screen.getByPlaceholderText("Enter employee password");
    fireEvent.change(input, { target: { value: "SECOND" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.getByText("Cashier Two")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Submit close" }));
    await waitFor(() =>
      expect(closeShift).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ employeePassword: "SECOND" })
      )
    );
    expect(closeShift).not.toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({ employeePassword: "FIRST" })
    );
  });
});
