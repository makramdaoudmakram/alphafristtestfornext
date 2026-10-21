import { beforeEach, describe, expect, it, vi } from "vitest";
import { timedFetch } from "@/lib/timed-fetch";
import { createPharmTransferRepository } from "@/repository/pharm-transfer.repository";

vi.mock("@/lib/timed-fetch", () => ({
  timedFetch: vi.fn(),
}));

describe("pharm-transfer.repository cancel", () => {
  beforeEach(() => {
    vi.mocked(timedFetch).mockReset();
  });

  it("POSTs to PharmTranH/{headerId}/cancel with bearer token", async () => {
    vi.mocked(timedFetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          Id: 42,
          SerialNo: 100,
          TraFlag: 1,
          Message: "Transfer cancelled successfully.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const repo = createPharmTransferRepository("token-abc");
    const result = await repo.cancel(42);

    expect(timedFetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(timedFetch).mock.calls[0]!;
    expect(String(url)).toContain("PharmTranH/42/cancel");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer token-abc",
      "Content-Type": "application/json",
    });
    expect(result.message).toContain("cancelled");
  });
});
