import { describe, expect, it, vi } from "vitest";
import {
  createEmptyDetailRow,
  emptyPurchaseHeader,
  headerToFormValues,
} from "@/lib/purchase.mapper";
import { PharmPurchaseService } from "@/services/pharm-purchase.service";
import type { PurchaseDetail } from "@/types/purchase";
import type { PurchaseHeaderFormValues } from "@/validation/purchase.schema";

vi.mock("@/lib/timed-fetch", () => ({
  timedFetch: vi.fn(),
}));

function header(): PurchaseHeaderFormValues {
  return headerToFormValues({
    ...emptyPurchaseHeader(),
    venBillNo: "VB-1",
    venBillDate: "2026-10-11",
    phtDate: "2026-10-11",
  });
}

function line(overrides: Partial<PurchaseDetail> = {}): PurchaseDetail {
  return {
    ...createEmptyDetailRow("1"),
    itmId: "ITM-1",
    expDate: "2027-01-01",
    qnty: 2,
    itmPurPrice: 10,
    ...overrides,
  };
}

const service = new PharmPurchaseService("token-1");

function firstIssue(
  validation: ReturnType<PharmPurchaseService["validateDocument"]>
) {
  if (validation.success) throw new Error("Expected the document to be rejected");
  return validation.error.issues[0];
}

describe("pharmacy purchase expiry validation", () => {
  it("blocks saving when the only line has no expiry date", () => {
    const issue = firstIssue(
      service.validateDocument(header(), [line({ expDate: "" })])
    );

    expect(issue?.message).toContain("Expiry date is required on line 1");
    expect(issue?.message).toContain("ITM-1");
    expect(issue?.path).toEqual(["details", 0, "expDate"]);
  });

  it("blocks saving when a line other than the first has no expiry date", () => {
    const issue = firstIssue(
      service.validateDocument(header(), [
        line({ itmId: "ITM-1", expDate: "2027-01-01" }),
        line({ itmId: "ITM-2", expDate: "" }),
        line({ itmId: "ITM-3", expDate: "02/2028" }),
      ])
    );

    expect(issue?.message).toContain(
      "Expiry date is required on line 2 (item ITM-2)"
    );
    expect(issue?.path).toEqual(["details", 1, "expDate"]);
  });

  it("blocks saving when the expiry is not a readable month", () => {
    const issue = firstIssue(
      service.validateDocument(header(), [line({ expDate: "13/2027" })])
    );

    expect(issue?.message).toContain("Expiry date is required on line 1");
  });

  it("saves when every line carries an expiry date", () => {
    const validation = service.validateDocument(header(), [
      line({ itmId: "ITM-1", expDate: "2027-01-01" }),
      line({ itmId: "ITM-2", expDate: "02/2028" }),
    ]);

    expect(validation.success).toBe(true);
  });
});
