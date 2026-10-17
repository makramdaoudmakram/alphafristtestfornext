import { beforeEach, describe, expect, it, vi } from "vitest";
import { timedFetch } from "@/lib/timed-fetch";
import { cancelPharmStoreReturn } from "@/repository/pharm-store-return.repository";

vi.mock("@/lib/timed-fetch", () => ({
  timedFetch: vi.fn(),
}));

describe("pharm-store-return.repository cancel", () => {
  beforeEach(() => {
    vi.mocked(timedFetch).mockReset();
  });

  it("POSTs to PharmStoreReturn/{headerId}/cancel with bearer token", async () => {
    vi.mocked(timedFetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          Id: 42,
          SerialNo: 9001,
          MovFlag: 3,
          Message: "Cancelled.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await cancelPharmStoreReturn("token-abc", 42);

    expect(timedFetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(timedFetch).mock.calls[0]!;
    expect(String(url)).toContain("PharmStoreReturn/42/cancel");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer token-abc",
      "Content-Type": "application/json",
    });
    expect(result).toEqual({
      id: 42,
      serialNo: 9001,
      status: 3,
      message: "Cancelled.",
    });
  });

  it("surfaces API errors without a success payload", async () => {
    vi.mocked(timedFetch).mockResolvedValue(
      new Response(JSON.stringify({ Message: "Already accepted." }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(cancelPharmStoreReturn("token-abc", 7)).rejects.toMatchObject({
      message: "Already accepted.",
      status: 409,
    });
  });
});
