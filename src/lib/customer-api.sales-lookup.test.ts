import { describe, expect, it, vi, beforeEach } from "vitest";
import { lookupCustomersForSales } from "@/lib/customer-api";

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

describe("lookupCustomersForSales", () => {
  beforeEach(async () => {
    const { apiFetch } = await import("@/lib/api-client");
    vi.mocked(apiFetch).mockReset();
  });

  it("calls Customer lookup with search and take", async () => {
    const { apiFetch } = await import("@/lib/api-client");
    vi.mocked(apiFetch).mockResolvedValue([
      {
        CustCode: 10,
        CustNameEn: "Ahmed",
        CustNameAr: "أحمد",
        CustMobile: "01001234567",
        AccountId: "1143-010",
        Balance: 0,
      },
    ]);

    const rows = await lookupCustomersForSales("token", "Ah", 15);

    expect(apiFetch).toHaveBeenCalledWith(
      "Customer/lookup?search=Ah&take=15",
      {},
      "token"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].custCode).toBe(10);
    expect(rows[0].custNameEn).toBe("Ahmed");
    expect(rows[0].custMobile).toBe("01001234567");
  });
});