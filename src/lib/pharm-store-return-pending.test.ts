import { describe, expect, it } from "vitest";
import {
  PHARM_STORE_RETURN_STATUS_PENDING,
  collectOutgoingPendingForStorage,
  isPharmStoreReturnCancellable,
} from "@/lib/pharm-store-return-pending";
import type {
  PharmStoreReturnPendingHeader,
  PharmStoreReturnPendingPage,
} from "@/types/pharm-store-return";

function header(
  overrides: Partial<PharmStoreReturnPendingHeader> = {}
): PharmStoreReturnPendingHeader {
  return {
    id: 10,
    serialNo: 100,
    sourceStoreId: 5,
    sourcePharmacyName: "Pharm A",
    destinationStoreId: 1,
    destinationStoreName: "Main",
    totalQuantity: 3,
    returnDate: "2026-10-01",
    status: PHARM_STORE_RETURN_STATUS_PENDING,
    statusText: "Pending",
    insertUid: "u1",
    details: [],
    ...overrides,
  };
}

function emptyPage(): PharmStoreReturnPendingPage {
  return {
    activeStoreId: null,
    activeStoreName: null,
    message: null,
    mainStore: { storeId: 1, storeName: "Main", isCurrentStore: false, items: [] },
    expireStore: { storeId: 2, storeName: "Expire", isCurrentStore: false, items: [] },
  };
}

describe("pharm-store-return-pending", () => {
  it("treats only pending status as cancellable", () => {
    expect(isPharmStoreReturnCancellable(header())).toBe(true);
    expect(isPharmStoreReturnCancellable(header({ status: 2 }))).toBe(false);
    expect(isPharmStoreReturnCancellable(header({ id: 0 }))).toBe(false);
  });

  it("collects outgoing pending for the active pharmacy storage and dedupes sections", () => {
    const mainItem = header({ id: 10, sourceStoreId: 5 });
    const duplicateInExpire = header({ id: 10, sourceStoreId: 5 });
    const otherPharm = header({ id: 11, sourceStoreId: 9 });
    const accepted = header({ id: 12, sourceStoreId: 5, status: 2 });

    const page: PharmStoreReturnPendingPage = {
      ...emptyPage(),
      mainStore: {
        storeId: 1,
        storeName: "Main",
        isCurrentStore: false,
        items: [mainItem, otherPharm, accepted],
      },
      expireStore: {
        storeId: 2,
        storeName: "Expire",
        isCurrentStore: false,
        items: [duplicateInExpire],
      },
    };

    const items = collectOutgoingPendingForStorage(page, 5);
    expect(items.map((row) => row.id)).toEqual([10]);
  });
});
