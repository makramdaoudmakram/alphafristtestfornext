import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchOperationalPharmacyStoreId } from "@/lib/pharmacy-operational-store";
import { createPharmTransferRepository } from "@/repository/pharm-transfer.repository";

vi.mock("@/repository/pharm-transfer.repository", () => ({
  createPharmTransferRepository: vi.fn(),
}));

describe("fetchOperationalPharmacyStoreId", () => {
  beforeEach(() => {
    vi.mocked(createPharmTransferRepository).mockReset();
  });

  it("returns currentStoreId from PharmTranH context", async () => {
    vi.mocked(createPharmTransferRepository).mockReturnValue({
      getContext: vi.fn().mockResolvedValue({
        currentPharmacyId: 1,
        currentPharmacyName: "A",
        currentStoreId: 301,
        currentStoreName: "Ops",
        destinationPharmacies: [],
      }),
    } as ReturnType<typeof createPharmTransferRepository>);

    await expect(fetchOperationalPharmacyStoreId("token")).resolves.toBe(301);
  });

  it("returns null when context cannot be loaded", async () => {
    vi.mocked(createPharmTransferRepository).mockReturnValue({
      getContext: vi.fn().mockRejectedValue(new Error("fail")),
    } as ReturnType<typeof createPharmTransferRepository>);

    await expect(fetchOperationalPharmacyStoreId("token")).resolves.toBeNull();
  });
});
