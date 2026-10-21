import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShiftClosingPanel } from "@/components/shift/ShiftClosingPanel";
import {
  ApiError,
  closeShift,
  getShiftClosingPreview,
  lookupSalesManByPassword,
} from "@/lib/api-client";
import type { ShiftClosingPreview, ShiftStatus } from "@/types/shift";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
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
  getShiftClosingPreview: vi.fn(),
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

const baseTotals = {
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
    vi.mocked(closeShift).mockReset();
    vi.mocked(lookupSalesManByPassword).mockReset();
    routerPush.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads preview after employee verification", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(preview());
    render(
      <ShiftClosingPanel token="t1" status={openStatus} onShiftClosed={vi.fn()} />
    );
    await openCloseForm();
    await verifySalesMan();
    await waitFor(() => expect(getShiftClosingPreview).toHaveBeenCalledWith("t1", 3));
    expect(screen.getByDisplayValue("50.00")).toBeInTheDocument();
  });

  it("redirects to pending sales when unfinalized sales exist", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(
      preview({
        canClose: false,
        blockReason: "There are unfinalized sales",
        unresolvedSales: [{ sthId: 701, totalBillNet: 90, createdAt: null }],
      })
    );

    render(
      <ShiftClosingPanel token="t1" status={openStatus} onShiftClosed={vi.fn()} />
    );
    await openCloseForm();
    await submitEmployeePassword();
    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith("/dashboard/sales/pending")
    );
    expect(screen.queryByLabelText(/Actual pharmacy cash/)).not.toBeInTheDocument();
  });

  it("redirects to pending delivery when deliveries are open", async () => {
    vi.mocked(getShiftClosingPreview).mockResolvedValue(
      preview({
        canClose: false,
        blockReason: "Pending delivery",
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
      expect(routerPush).toHaveBeenCalledWith("/dashboard/sales/delivery")
    );
    expect(screen.queryByLabelText(/Actual pharmacy cash/)).not.toBeInTheDocument();
  });

  it("submits close with cash, transfer, and password", async () => {
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
    await waitFor(() => screen.getByLabelText(/Actual pharmacy cash/));
    fireEvent.change(screen.getByLabelText(/Actual pharmacy cash/), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Head-office transfer/), {
      target: { value: "75" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit close" }));

    await waitFor(() =>
      expect(closeShift).toHaveBeenCalledWith("t1", {
        scId: 3,
        actualPharmacyCash: 100,
        headOfficeTransferAmount: 75,
        employeePassword: "A1B2",
        closingNotes: null,
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
    await waitFor(() => screen.getByLabelText(/Actual pharmacy cash/));
    fireEvent.change(screen.getByLabelText(/Actual pharmacy cash/), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/Head-office transfer/), {
      target: { value: "0" },
    });
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
    await waitFor(() => screen.getByLabelText(/Actual pharmacy cash/));
    fireEvent.change(screen.getByLabelText(/Actual pharmacy cash/), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Head-office transfer/), {
      target: { value: "10" },
    });
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
