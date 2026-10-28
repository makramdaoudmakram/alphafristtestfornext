import { describe, expect, it } from "vitest";
import { applyReturnDetailPatch } from "@/lib/return-calculations";
import { createEmptyDetailRow } from "@/lib/return.mapper";
import { clearReturnDetailStockFields } from "@/lib/return-detail-sales-stock";

describe("pharmacy purchase return quantity updates", () => {
  it("applies a new quantity from the patch", () => {
    const row = applyReturnDetailPatch(createEmptyDetailRow("3"), {
      itmId: "ITEM-1",
      batchNo: "B1",
      qnty: 1,
      maxReturnQty: 20,
    });

    const updated = applyReturnDetailPatch(row, { qnty: 7 });
    expect(updated.qnty).toBe(7);
  });

  it("does not change quantity when only stock metadata is cleared", () => {
    const row = applyReturnDetailPatch(createEmptyDetailRow("3"), {
      itmId: "ITEM-1",
      batchNo: "B1",
      qnty: 5,
    });

    const clearedOnly = applyReturnDetailPatch(row, clearReturnDetailStockFields());
    expect(clearedOnly.qnty).toBe(5);
  });
});
