import { describe, expect, it } from "vitest";
import {
  formatPendingMovementKindLabel,
  formatStoreItemPendingMovementLabel,
  pendingMovementKindLabel,
} from "@/lib/store-stock-pending-sheet";

describe("pending movement sheet mapping", () => {
  it("maps API movement kinds to display labels", () => {
    expect(pendingMovementKindLabel("PharmacyTransfer")).toBe("Pharmacy transfer");
    expect(pendingMovementKindLabel("PharmacyStoreReturn")).toBe("Store return");
    expect(pendingMovementKindLabel("PharmacyReceive")).toBe("Pharmacy receive");
    expect(pendingMovementKindLabel("Other")).toBe("Other");
  });

  it("appends destination name for outbound rows", () => {
    expect(
      formatPendingMovementKindLabel("PharmacyTransfer", "Elradwan")
    ).toBe("Pharmacy transfer (Elradwan)");
    expect(
      formatPendingMovementKindLabel("PharmacyStoreReturn", "Main Store")
    ).toBe("Store return (Main Store)");
  });

  it("omits parentheses when destination is missing", () => {
    expect(formatPendingMovementKindLabel("PharmacyTransfer", null)).toBe(
      "Pharmacy transfer"
    );
    expect(formatPendingMovementKindLabel("PharmacyTransfer", "   ")).toBe(
      "Pharmacy transfer"
    );
  });

  it("uses source name for incoming unaccepted rows", () => {
    expect(
      formatStoreItemPendingMovementLabel("PharmacyStoreReturn", {
        isIncomingUnaccepted: true,
        sourceName: "Store B",
      })
    ).toBe("Store return (Store B)");
    expect(
      formatStoreItemPendingMovementLabel("PharmacyReceive", {
        isIncomingUnaccepted: false,
        destinationName: "Receiving Pharm",
      })
    ).toBe("Pharmacy receive (Receiving Pharm)");
  });
});
