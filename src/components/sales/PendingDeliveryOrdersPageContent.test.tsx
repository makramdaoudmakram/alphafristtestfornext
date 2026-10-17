import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PendingDeliveryOrdersPageContent } from "@/components/sales/PendingDeliveryOrdersPageContent";
import {
  acceptDeliveryOrder,
  ApiError,
  getPendingDeliveryOrders,
  getSalesSaleDetails,
} from "@/lib/api-client";
import type { PendingDeliveryOrder } from "@/types/sales-delivery";
import type { SalesReceiptLine } from "@/types/sales-receipt";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { accessToken: "token-1" } }),
}));

vi.mock("@/components/permissions/page-guard", () => ({
  PageGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
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
  acceptDeliveryOrder: vi.fn(),
  getPendingDeliveryOrders: vi.fn(),
  getSalesSaleDetails: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

import { toast } from "sonner";

const orders: PendingDeliveryOrder[] = [
  {
    id: 12,
    sthId: 702,
    deliveryName: "مروة",
    totalInvoice: 100,
    paymentType: null,
    billTyp: 0,
  },
  {
    id: 11,
    sthId: 701,
    deliveryName: "Ali Driver",
    totalInvoice: 180,
    paymentType: "Cash + Visa",
    billTyp: 1,
  },
];

const line701: SalesReceiptLine = {
  lineNo: 1,
  itemName: "دواء",
  itemCode: "ITM-9",
  quantity: 2,
  unitName: "علبة",
  unitPrice: 50,
  lineDiscount: 10,
  lineNet: 90,
};

const line702: SalesReceiptLine = {
  lineNo: 1,
  itemName: "كريم",
  itemCode: "ITM-8",
  quantity: 1,
  unitName: "شريط",
  unitPrice: 25,
  lineDiscount: 0,
  lineNet: 25,
};

function detailsFixture(sthId: number, lines: SalesReceiptLine[]) {
  return {
    sthId,
    billTyp: 1,
    custId: 42,
    customerName: null,
    customerTel: null,
    lines,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("PendingDeliveryOrdersPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPendingDeliveryOrders).mockResolvedValue(orders);
    vi.mocked(getSalesSaleDetails).mockImplementation(
      async (_token, sthId) =>
        detailsFixture(sthId, sthId === 701 ? [line701] : [line702]) as Awaited<
          ReturnType<typeof getSalesSaleDetails>
        >
    );
    vi.mocked(acceptDeliveryOrder).mockResolvedValue({
      id: 11,
      sthId: 701,
      delivStat: "C",
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("lists the pending orders with readable names and formatted totals", async () => {
    render(<PendingDeliveryOrdersPageContent />);
    await waitFor(() =>
      expect(getPendingDeliveryOrders).toHaveBeenCalledWith("token-1")
    );

    expect(await screen.findByText("701")).toBeInTheDocument();
    expect(screen.getByText("Ali Driver")).toBeInTheDocument();
    expect(screen.getByText("Cash + Visa")).toBeInTheDocument();
    expect(screen.getByText("180.00")).toBeInTheDocument();
    expect(screen.getByText("702")).toBeInTheDocument();
    expect(screen.getByText("مروة")).toBeInTheDocument();
    expect(screen.getByText("100.00")).toBeInTheDocument();
    // No payment rows yet → readable placeholder, not an internal id.
    expect(screen.getAllByText("—")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Accept" })).toHaveLength(2);
    // Item lines are lazy: nothing loaded while every row is collapsed.
    expect(getSalesSaleDetails).not.toHaveBeenCalled();
  });

  it("shows the loading state before the list arrives", async () => {
    const gate = deferred<PendingDeliveryOrder[]>();
    vi.mocked(getPendingDeliveryOrders).mockReturnValue(gate.promise);
    render(<PendingDeliveryOrdersPageContent />);

    expect(
      screen.getByText("Loading pending delivery orders…")
    ).toBeInTheDocument();
    gate.resolve(orders);
    await waitFor(() => expect(screen.getByText("701")).toBeInTheDocument());
    expect(
      screen.queryByText("Loading pending delivery orders…")
    ).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no pending delivery orders", async () => {
    vi.mocked(getPendingDeliveryOrders).mockResolvedValue([]);
    render(<PendingDeliveryOrdersPageContent />);
    expect(
      await screen.findByText(/No pending delivery orders/i)
    ).toBeInTheDocument();
  });

  it("shows an error banner when the list call fails", async () => {
    vi.mocked(getPendingDeliveryOrders).mockRejectedValue(new Error("boom"));
    render(<PendingDeliveryOrdersPageContent />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "Failed to load pending delivery orders."
    );
  });

  it("accept removes the row only after backend confirmation and reports success", async () => {
    render(<PendingDeliveryOrdersPageContent />);
    await waitFor(() => expect(screen.getByText("701")).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("button", { name: "Accept" })[1]);

    await waitFor(() =>
      expect(acceptDeliveryOrder).toHaveBeenCalledWith("token-1", 11)
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Delivery order for invoice 701 accepted."
      )
    );
    expect(screen.queryByText("701")).not.toBeInTheDocument();
    expect(screen.getByText("702")).toBeInTheDocument();
    // The accepted row is removed directly; no extra list round-trip.
    expect(getPendingDeliveryOrders).toHaveBeenCalledTimes(1);
  });

  it("blocks repeated clicks while an accept request is in flight", async () => {
    const gate = deferred<{ id: number; sthId: number; delivStat: string }>();
    vi.mocked(acceptDeliveryOrder).mockReturnValue(gate.promise);
    render(<PendingDeliveryOrdersPageContent />);
    await waitFor(() => expect(screen.getByText("701")).toBeInTheDocument());

    const buttons = screen.getAllByRole("button", { name: "Accept" });
    fireEvent.click(buttons[1]);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Accepting…"
        })).toBeInTheDocument()
    );
    // Every Accept button is disabled during the in-flight request.
    expect(
      screen
        .getAllByRole("button", { name: "Accept" })
        .every((b) => (b as HTMLButtonElement).disabled)
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Accepting…" }));

    gate.resolve({ id: 11, sthId: 701, delivStat: "C" });
    await waitFor(() => expect(screen.queryByText("701")).not.toBeInTheDocument());
    expect(acceptDeliveryOrder).toHaveBeenCalledTimes(1);
  });

  it("a failed accept keeps the row and shows the server error", async () => {
    vi.mocked(acceptDeliveryOrder).mockRejectedValue(new ApiError(500, "boom"));
    render(<PendingDeliveryOrdersPageContent />);
    await waitFor(() => expect(screen.getByText("701")).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("button", { name: "Accept" })[1]);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("boom"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByText("701")).toBeInTheDocument();
    expect(getPendingDeliveryOrders).toHaveBeenCalledTimes(1);
  });

  it("accepting an order already taken elsewhere refreshes the table", async () => {
    vi.mocked(acceptDeliveryOrder).mockRejectedValue(
      new ApiError(400, "Delivery order is already accepted.")
    );
    vi.mocked(getPendingDeliveryOrders)
      .mockResolvedValueOnce(orders)
      .mockResolvedValueOnce([orders[0]]);
    render(<PendingDeliveryOrdersPageContent />);
    await waitFor(() => expect(screen.getByText("701")).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("button", { name: "Accept" })[1]);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Delivery order is already accepted.")
    );
    await waitFor(() =>
      expect(getPendingDeliveryOrders).toHaveBeenCalledTimes(2)
    );
    expect(screen.queryByText("701")).not.toBeInTheDocument();
  });

  it("expanding an invoice row loads and shows its item lines on demand", async () => {
    render(<PendingDeliveryOrdersPageContent />);
    await waitFor(() => expect(screen.getByText("701")).toBeInTheDocument());

    fireEvent.click(screen.getByText("701"));

    await waitFor(() =>
      expect(getSalesSaleDetails).toHaveBeenCalledWith("token-1", 701)
    );
    expect(await screen.findByText("ITM-9")).toBeInTheDocument();
    expect(screen.getByText("دواء")).toBeInTheDocument();
    expect(screen.getByText("علبة")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("50.00")).toBeInTheDocument();
    // Line total comes from the shared receipt projection, not a new calculation.
    expect(screen.getByText("90.00")).toBeInTheDocument();
    expect(getSalesSaleDetails).toHaveBeenCalledTimes(1);
  });

  it("collapsing and re-expanding reuses the cached item lines", async () => {
    render(<PendingDeliveryOrdersPageContent />);
    await waitFor(() => expect(screen.getByText("701")).toBeInTheDocument());

    fireEvent.click(screen.getByText("701"));
    expect(await screen.findByText("ITM-9")).toBeInTheDocument();

    // Click again: the section collapses.
    fireEvent.click(screen.getByText("701"));
    await waitFor(() => expect(screen.queryByText("ITM-9")).not.toBeInTheDocument());

    // Re-expand: cached — no second API call, lines are back immediately.
    fireEvent.click(screen.getByText("701"));
    expect(await screen.findByText("ITM-9")).toBeInTheDocument();
    expect(getSalesSaleDetails).toHaveBeenCalledTimes(1);
  });

  it("invoice rows expand and collapse independently", async () => {
    render(<PendingDeliveryOrdersPageContent />);
    await waitFor(() => expect(screen.getByText("701")).toBeInTheDocument());

    fireEvent.click(screen.getByText("701"));
    expect(await screen.findByText("ITM-9")).toBeInTheDocument();
    fireEvent.click(screen.getByText("702"));
    expect(await screen.findByText("ITM-8")).toBeInTheDocument();
    expect(screen.getByText("ITM-9")).toBeInTheDocument();

    // Collapsing 701 leaves 702's section open.
    fireEvent.click(screen.getByText("701"));
    await waitFor(() => expect(screen.queryByText("ITM-9")).not.toBeInTheDocument());
    expect(screen.getByText("ITM-8")).toBeInTheDocument();
  });

  it("shows a loading indicator while item lines load, then the lines", async () => {
    const gate = deferred<Awaited<ReturnType<typeof getSalesSaleDetails>>>();
    vi.mocked(getSalesSaleDetails).mockReturnValueOnce(gate.promise);
    render(<PendingDeliveryOrdersPageContent />);
    await waitFor(() => expect(screen.getByText("701")).toBeInTheDocument());

    fireEvent.click(screen.getByText("701"));
    expect(screen.getByText("Loading items…")).toBeInTheDocument();

    gate.resolve(detailsFixture(701, [line701]) as Awaited<
      ReturnType<typeof getSalesSaleDetails>
    >);
    expect(await screen.findByText("ITM-9")).toBeInTheDocument();
    expect(
      screen.queryByText("Loading items…")
    ).not.toBeInTheDocument();
  });

  it("shows an error with a working retry when item loading fails", async () => {
    vi.mocked(getSalesSaleDetails).mockRejectedValueOnce(new Error("boom"));
    render(<PendingDeliveryOrdersPageContent />);
    await waitFor(() => expect(screen.getByText("701")).toBeInTheDocument());

    fireEvent.click(screen.getByText("701"));
    expect(await screen.findByText("Failed to load invoice items.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("ITM-9")).toBeInTheDocument();
    expect(getSalesSaleDetails).toHaveBeenCalledTimes(2);
  });

  it("shows an empty state when the invoice has no item lines", async () => {
    vi.mocked(getSalesSaleDetails).mockResolvedValueOnce(
      detailsFixture(701, []) as Awaited<ReturnType<typeof getSalesSaleDetails>>
    );
    render(<PendingDeliveryOrdersPageContent />);
    await waitFor(() => expect(screen.getByText("701")).toBeInTheDocument());

    fireEvent.click(screen.getByText("701"));
    expect(
      await screen.findByText("No item lines on this invoice.")
    ).toBeInTheDocument();
  });

  it("clicking Accept does not expand the row and still removes it on success", async () => {
    render(<PendingDeliveryOrdersPageContent />);
    await waitFor(() => expect(screen.getByText("701")).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("button", { name: "Accept" })[1]);

    await waitFor(() =>
      expect(acceptDeliveryOrder).toHaveBeenCalledWith("token-1", 11)
    );
    // The accept click never toggles the accordion or fetches details.
    expect(getSalesSaleDetails).not.toHaveBeenCalled();
    expect(screen.queryByText("Loading items…")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Delivery order for invoice 701 accepted."
      )
    );
    expect(screen.queryByText("701")).not.toBeInTheDocument();
  });
});
