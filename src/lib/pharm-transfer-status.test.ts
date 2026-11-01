import { describe, expect, it } from "vitest";
import {
  formatPharmTransferStatusLabel,
  isPharmTransferPendingTraFlag,
} from "@/lib/pharm-transfer-status";
import {
  PHARM_TRANSFER_TRA_FLAG_ACCEPTED,
  PHARM_TRANSFER_TRA_FLAG_CANCELLED,
  PHARM_TRANSFER_TRA_FLAG_PENDING,
} from "@/types/pharm-transfer";

describe("pharm-transfer-status", () => {
  it("maps TraFlag values when API status text is missing", () => {
    expect(formatPharmTransferStatusLabel(PHARM_TRANSFER_TRA_FLAG_PENDING)).toBe(
      "Not Accept"
    );
    expect(formatPharmTransferStatusLabel(PHARM_TRANSFER_TRA_FLAG_ACCEPTED)).toBe(
      "Accept"
    );
    expect(formatPharmTransferStatusLabel(PHARM_TRANSFER_TRA_FLAG_CANCELLED)).toBe(
      "Cancelled"
    );
  });

  it("prefers API status text", () => {
    expect(
      formatPharmTransferStatusLabel(PHARM_TRANSFER_TRA_FLAG_CANCELLED, "Cancelled")
    ).toBe("Cancelled");
  });

  it("treats only pending TraFlag as editable pending", () => {
    expect(isPharmTransferPendingTraFlag(null)).toBe(true);
    expect(isPharmTransferPendingTraFlag(PHARM_TRANSFER_TRA_FLAG_PENDING)).toBe(
      true
    );
    expect(isPharmTransferPendingTraFlag(PHARM_TRANSFER_TRA_FLAG_ACCEPTED)).toBe(
      false
    );
    expect(isPharmTransferPendingTraFlag(PHARM_TRANSFER_TRA_FLAG_CANCELLED)).toBe(
      false
    );
  });
});
