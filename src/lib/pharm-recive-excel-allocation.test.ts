import { describe, expect, it, vi } from "vitest";
import {
  allocatePharmReciveReceivingQuantityFromPool,
  buildPharmReciveDetailsFromAllocation,
  clonePharmReciveStockBatches,
  fetchPharmReciveStockBatchesForItem,
  type PharmReciveStockBatch,
} from "@/lib/pharm-recive-stock-allocation";
import type { ItemCatalogItem } from "@/types/item-catalog";

vi.mock("@/lib/api-client", () => ({
  getUnitConversionInfo: vi.fn(async (_token: string, _code: string, _unitId: number, qty: number) => ({
    conversionValue: 1,
    quantityNet: qty,
    errorMessage: null,
  })),
  searchStockBatches: vi.fn(),
}));

const { searchStockBatches } = await import("@/lib/api-client");

const baseItem = {
  itmCode: "ITM-POOL",
  itmUnit1: 1,
  itmUnit3: 1,
  itmUnit1Unit3: 1,
} as unknown as ItemCatalogItem;

const batch = (
  batchNo: string,
  qtyBase: number,
  expDate = "2026-06-01"
): PharmReciveStockBatch => ({
  batchNo,
  expDate,
  qtyBase,
  salesPrice: 1,
  purshPrice: 1,
  costPrice: 1,
});

describe("PharmRecive Excel pool allocation", () => {
  it("rejects second row when 40 + 40 exceeds 70 available base", async () => {
    const pool = clonePharmReciveStockBatches([batch("B1", 70)]);

    const first = await allocatePharmReciveReceivingQuantityFromPool({
      token: "t",
      item: baseItem,
      itemCode: "ITM-POOL",
      requestedQty: 40,
      batches: pool,
    });
    expect(first.ok).toBe(true);

    const second = await allocatePharmReciveReceivingQuantityFromPool({
      token: "t",
      item: baseItem,
      itemCode: "ITM-POOL",
      requestedQty: 40,
      batches: pool,
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.message).toMatch(/Insufficient stock quantity/i);
  });

  it("loads stock batches using the movement source store id", async () => {
    vi.mocked(searchStockBatches).mockResolvedValueOnce({
      items: [
        {
          batchNo: "B1",
          expDate: "2026-01-01",
          qty: 10,
          transferQty: 0,
          availableQty: 10,
          salesPrice: 1,
          purshPrice: 1,
          costPrice: 1,
          storeId: 55,
          itemCode: "ITM-POOL",
        },
      ],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 500,
    });

    const batches = await fetchPharmReciveStockBatchesForItem("token", "ITM-POOL", "55");
    expect(searchStockBatches).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ storeId: "55", itemCode: "ITM-POOL" })
    );
    expect(batches[0]?.qtyBase).toBe(10);
  });

  it("preserves batch identity across multi-batch FIFO lines", async () => {
    const pool = clonePharmReciveStockBatches([
      batch("OLD", 30, "2025-01-01"),
      batch("NEW", 50, "2026-01-01"),
    ]);

    const allocation = await allocatePharmReciveReceivingQuantityFromPool({
      token: "t",
      item: baseItem,
      itemCode: "ITM-POOL",
      requestedQty: 60,
      batches: pool,
    });
    expect(allocation.ok).toBe(true);
    if (!allocation.ok) return;

    expect(allocation.lines.map((line) => line.batchNo)).toEqual(["OLD", "NEW"]);
    expect(allocation.lines[0]!.receivingQty).toBe(30);
    expect(allocation.lines[1]!.receivingQty).toBe(30);

    const details = buildPharmReciveDetailsFromAllocation(
      {
        clientRowId: "r1",
        itmId: "ITM-POOL",
        qnty: 60,
        batchNo: "",
        expDate: "",
        itmPurPrice: 0,
        itmSellPrice: 0,
        itemCostPrice: 0,
        unitId: 1,
        itmStock: 0,
      },
      allocation.lines,
      allocation.unitId
    );
    expect(details.map((d) => d.batchNo)).toEqual(["OLD", "NEW"]);
  });

  it("uses base-unit availability when conversion factor is greater than one", async () => {
    const { getUnitConversionInfo } = await import("@/lib/api-client");
    vi.mocked(getUnitConversionInfo).mockResolvedValueOnce({
      conversionValue: 3,
      quantityNet: 3,
      errorMessage: null,
    });

    const boxItem = {
      itmCode: "ITM-BOX",
      itmUnit1: 10,
      itmUnit3: 30,
      itmUnit1Unit3: 3,
    } as unknown as ItemCatalogItem;

    const pool = clonePharmReciveStockBatches([batch("B1", 6)]);

    const ok = await allocatePharmReciveReceivingQuantityFromPool({
      token: "t",
      item: boxItem,
      itemCode: "ITM-BOX",
      requestedQty: 2,
      unitId: 10,
      batches: pool,
    });
    expect(ok.ok).toBe(true);

    const fail = await allocatePharmReciveReceivingQuantityFromPool({
      token: "t",
      item: boxItem,
      itemCode: "ITM-BOX",
      requestedQty: 3,
      unitId: 10,
      batches: pool,
    });
    expect(fail.ok).toBe(false);
  });
});
