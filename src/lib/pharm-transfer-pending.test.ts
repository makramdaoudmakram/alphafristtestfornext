import { describe, expect, it } from "vitest";
import {
  collectOutgoingPendingForStorage,
  isPharmTransferCancellable,
} from "@/lib/pharm-transfer-pending";
import type { PharmTranPendingHeader } from "@/types/pharm-tran";

function header(
  overrides: Partial<PharmTranPendingHeader> = {}
): PharmTranPendingHeader {
  return {
    id: 10,
    serialNo: 100,
    sendingPharmacyId: 5,
    sendingPharmacyName: "Pharm A",
    receivingPharmacyId: 8,
    receivingPharmacyName: "Pharm B",
    totalQuantity: 3,
    transferDate: "2026-10-01",
    totalSalesPrice: 15,
    details: [],
    ...overrides,
  };
}

describe("pharm-transfer-pending", () => {
  it("treats only positive document ids as cancellable", () => {
    expect(isPharmTransferCancellable(header())).toBe(true);
    expect(isPharmTransferCancellable(header({ id: 0 }))).toBe(false);
  });

  it("collects outgoing pending for the active pharmacy storage", () => {
    const mine = header({ id: 10, sendingPharmacyId: 5 });
    const other = header({ id: 11, sendingPharmacyId: 9 });
    const items = collectOutgoingPendingForStorage([mine, other], 5);
    expect(items.map((row) => row.id)).toEqual([10]);
  });
});
