import { describe, expect, it, vi } from "vitest";
import { PharmReciveService } from "@/services/pharm-recive.service";
import type { PharmReciveDetail } from "@/types/pharm-recive";

vi.mock("@/repository/pharm-recive.repository", () => ({
  createPharmReciveRepository: vi.fn(() => ({
    create: vi.fn(async () => ({
      header: { id: 1, fathId: 100, movId: 1, movStor: "10", movDis: "3" },
      details: [],
    })),
    update: vi.fn(async () => {
      throw new Error("update should not be called for new documents");
    }),
    search: vi.fn(),
    getById: vi.fn(),
    listIds: vi.fn(),
    getAuditHistory: vi.fn(),
    getServerDate: vi.fn(),
  })),
  PharmReciveRepositoryError: class extends Error {},
}));

describe("PharmReciveService.save", () => {
  it("uses repository.create for new documents (same endpoint as manual and Excel import)", async () => {
    const { createPharmReciveRepository } = await import(
      "@/repository/pharm-recive.repository"
    );
    const service = new PharmReciveService("token");

    const detail: PharmReciveDetail = {
      clientRowId: "1",
      itmId: "ITM-1",
      qnty: 5,
      batchNo: "B1",
      expDate: "2026-01-01",
      itmPurPrice: 1,
      itmSellPrice: 2,
      itemCostPrice: 1.5,
      unitId: 1,
      itmStock: 5,
    };

    await service.save({
      header: {
        id: null,
        movId: 7,
        movmentRowId: 12,
        fathId: 500,
        movStor: "10",
        movDis: "3",
        movDate: "2026-11-04",
        monNote: "",
        accountDept: "",
        accountCREDIT: "",
        movFlag: 10,
      },
      details: [detail],
    });

    const repo = vi.mocked(createPharmReciveRepository).mock.results[0]?.value;
    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
