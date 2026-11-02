import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BatchTraceabilityPageContent } from "@/components/batch-traceability/batch-traceability-page-content";
import * as apiClient from "@/lib/api-client";
import { ApiError } from "@/lib/api-client";
import type { BatchTraceabilitySearchResponse } from "@/types/batch-traceability";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { accessToken: "test-token" },
    status: "authenticated",
  }),
}));

vi.mock("@/components/permissions/page-guard", () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function sampleResult(
  overrides: Partial<BatchTraceabilitySearchResponse["results"][0]["batch"]> = {}
): BatchTraceabilitySearchResponse["results"][0] {
  return {
    batch: {
      batchNo: "B-001",
      stockId: 1,
      itemId: 10,
      itemCode: "ITM-A",
      itemNameAr: "Item A",
      itemNameEn: "Item A",
      storeId: 1,
      storeName: "Main",
      expDate: "2027-01-01",
      purchasePrice: 1,
      salesPrice: 2,
      costPrice: 1.5,
      currentQty: 5,
      ...overrides,
    },
    creator: {
      userId: "u1",
      userName: "User One",
      createdAt: "2026-01-01T00:00:00Z",
      source: "Purchase",
    },
    currentStock: {
      locations: [{ storeId: 1, storeName: "Main", qty: 5 }],
      totalCurrentQty: 5,
    },
    timeline: [],
  };
}

describe("BatchTraceabilityPageContent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a single item/batch result", async () => {
    vi.spyOn(apiClient, "getBatchTraceability").mockResolvedValue({
      results: [sampleResult()],
    });

    render(<BatchTraceabilityPageContent />);
    fireEvent.change(screen.getByLabelText(/Batch No/i), {
      target: { value: "B-001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Search/i }));

    await waitFor(() => {
      expect(screen.getByText("ITM-A")).toBeInTheDocument();
    });
    expect(screen.getByText("Batch Details")).toBeInTheDocument();
  });

  it("renders multiple items sharing the same batch number separately", async () => {
    vi.spyOn(apiClient, "getBatchTraceability").mockResolvedValue({
      results: [
        sampleResult({ itemId: 10, itemCode: "ITM-A" }),
        sampleResult({ itemId: 20, itemCode: "ITM-B" }),
      ],
    });

    render(<BatchTraceabilityPageContent />);
    fireEvent.change(screen.getByLabelText(/Batch No/i), {
      target: { value: "B-001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Search/i }));

    await waitFor(() => {
      expect(screen.getByText(/matches 2 items/i)).toBeInTheDocument();
    });
    expect(screen.getByText("ITM-A — Batch B-001")).toBeInTheDocument();
    expect(screen.getByText("ITM-B — Batch B-001")).toBeInTheDocument();
  });

  it("shows independent location quantities per result", async () => {
    vi.spyOn(apiClient, "getBatchTraceability").mockResolvedValue({
      results: [
        {
          ...sampleResult(),
          currentStock: {
            locations: [
              { storeId: 1, storeName: "Store One", qty: 3 },
              { storeId: 2, storeName: "Store Two", qty: 2 },
            ],
            totalCurrentQty: 5,
          },
        },
      ],
    });

    render(<BatchTraceabilityPageContent />);
    fireEvent.change(screen.getByLabelText(/Batch No/i), {
      target: { value: "B-001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Search/i }));

    await waitFor(() => {
      expect(screen.getByText("Store One")).toBeInTheDocument();
    });
    expect(screen.getByText("Store Two")).toBeInTheDocument();
  });

  it("shows empty search result", async () => {
    vi.spyOn(apiClient, "getBatchTraceability").mockRejectedValue(
      new ApiError(404, "Batch not found")
    );

    render(<BatchTraceabilityPageContent />);
    fireEvent.change(screen.getByLabelText(/Batch No/i), {
      target: { value: "MISSING" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Search/i }));

    await waitFor(() => {
      expect(screen.getByText("Batch not found")).toBeInTheDocument();
    });
  });

  it("handles 403 access denied", async () => {
    vi.spyOn(apiClient, "getBatchTraceability").mockRejectedValue(
      new ApiError(403, "Forbidden")
    );

    render(<BatchTraceabilityPageContent />);
    fireEvent.change(screen.getByLabelText(/Batch No/i), {
      target: { value: "B-001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Search/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Forbidden");
    });
  });

  it("shows loading skeleton while fetching", async () => {
    let resolve!: (value: BatchTraceabilitySearchResponse) => void;
    vi.spyOn(apiClient, "getBatchTraceability").mockImplementation(
      () =>
        new Promise((res) => {
          resolve = res;
        })
    );

    render(<BatchTraceabilityPageContent />);
    fireEvent.change(screen.getByLabelText(/Batch No/i), {
      target: { value: "B-001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Search/i }));

    expect(document.querySelector(".animate-pulse")).toBeTruthy();

    resolve({ results: [sampleResult()] });
    await waitFor(() => {
      expect(screen.getByText("ITM-A")).toBeInTheDocument();
    });
  });
});
