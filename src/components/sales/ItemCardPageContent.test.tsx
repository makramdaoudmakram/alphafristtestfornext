import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ItemCardResponse } from "@/types/item-card";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { accessToken: "token" },
    status: "authenticated",
  }),
}));

vi.mock("@/components/permissions/page-guard", () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/pharmacy/pharmacy-scope-provider", () => ({
  usePharmacyScope: () => ({
    authorizedPharmacies: [{ parmId: "1" }],
    activePharmacyId: "1",
    ready: true,
  }),
}));

vi.mock("@/lib/api-client", () => ({
  ApiError: class ApiError extends Error {},
  getItemCard: vi.fn(),
  getItemCardStores: vi.fn().mockResolvedValue({
    stores: [],
    unrestrictedStoreAccess: true,
  }),
  getPharms: vi.fn().mockResolvedValue([]),
  lookupItemCatalog: vi.fn(),
  lookupItemCatalogBySegment: vi.fn(),
}));

import { ItemCardPageContent } from "@/components/sales/ItemCardPageContent";

describe("ItemCardPageContent", () => {
  it("renders movement description column when results are shown", async () => {
    const sample: ItemCardResponse = {
      itemId: 1,
      fromDate: "2026-01-01",
      toDateExclusive: "2026-02-01",
      items: [
        {
          date: "2026-01-15T00:00:00Z",
          documentType: "Sales",
          documentId: 100,
          documentNo: 100,
          storeId: "1",
          storeName: "Store A",
          branchId: "1",
          branchName: "Branch A",
          movementType: "Sales",
          movementDirection: "OUT",
          quantityIn: 0,
          quantityOut: 2,
          balance: 8,
          unitId: 1,
          unitName: "Box",
          unitValue: 1,
          reportingKey: "Sales:100:1",
          lineNo: 1,
          description: "Employee One",
        },
      ],
      totalCount: 1,
      openingBalance: 10,
      totalIn: 0,
      totalOut: 2,
      net: -2,
      closingBalance: 8,
      displayUnitValue: null,
      displayUnitName: null,
      page: 1,
      pageSize: 50,
    };

    const { getItemCard } = await import("@/lib/api-client");
    vi.mocked(getItemCard).mockResolvedValue(sample);

    render(<ItemCardPageContent />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Employee One")).toBeInTheDocument();
    });
  });
});
