import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyReturnDetailPatch } from "@/lib/return-calculations";
import {
  createEmptyDetailRow,
  emptyReturnHeader,
  headerToFormValues,
} from "@/lib/return.mapper";
import { PharmPurchaseReturnService } from "@/services/pharm-purchase-return.service";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { ReturnHeaderFormValues } from "@/validation/return.schema";

const repositoryCreate = vi.fn();

vi.mock("@/repository/pharm-purchase-return.repository", () => ({
  createPharmPurchaseReturnRepository: () => ({
    create: repositoryCreate,
    getContext: vi.fn(),
    getById: vi.fn(),
  }),
  PharmPurchaseReturnRepositoryError: class PharmPurchaseReturnRepositoryError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
}));

function returnHeader(): ReturnHeaderFormValues {
  return headerToFormValues({
    ...emptyReturnHeader(),
    venBillNo: "1001",
    venBillDate: "2026-10-11",
    phtDate: "2026-10-11",
    employCode: 1,
  });
}

function catalogItem81848(): ItemCatalogItem {
  return {
    id: 48,
    itemCatalogId: 48,
    itmCode: "81848",
    itmCode2: null,
    itmNameAr: "ع",
    itmNameEn: "Item",
    itmUnit1: 5,
    itmUnit2: null,
    itmUnit3: null,
    child: null,
  } as ItemCatalogItem;
}

describe("PharmPurchaseReturnService.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates units with the catalog map from the caller", async () => {
    repositoryCreate.mockResolvedValueOnce({
      header: { id: 1, pthId: 1 },
      details: [],
    });

    const service = new PharmPurchaseReturnService("token");
    const details = [
      applyReturnDetailPatch(createEmptyDetailRow("3"), {
        itmId: "81848",
        unitId: 5,
        qnty: 2,
        itmPurPrice: 10,
        itmSell: 12,
        stoId: "3",
        batchNo: "B1",
        expDate: "2026-12-01",
      }),
    ];
    const itemByCode = new Map<string, ItemCatalogItem>([
      ["81848", catalogItem81848()],
    ]);

    await expect(
      service.create({
        header: returnHeader(),
        details,
        itemByCode,
        catalogItems: [],
      })
    ).resolves.toMatchObject({ header: { id: 1 } });

    expect(repositoryCreate).toHaveBeenCalledOnce();
  });

  it("rejects create when unit validation runs without a catalog map", async () => {
    const service = new PharmPurchaseReturnService("token");
    const details = [
      applyReturnDetailPatch(createEmptyDetailRow("3"), {
        itmId: "81848",
        unitId: 5,
        qnty: 1,
        itmPurPrice: 10,
        stoId: "3",
        batchNo: "B1",
        expDate: "2026-12-01",
      }),
    ];

    await expect(
      service.create({
        header: returnHeader(),
        details,
      })
    ).rejects.toMatchObject({
      message: expect.stringMatching(
        /81848.*not found in the catalog for unit validation/i
      ),
    });

    expect(repositoryCreate).not.toHaveBeenCalled();
  });
});
