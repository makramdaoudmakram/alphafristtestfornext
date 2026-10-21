import { describe, expect, it } from "vitest";
import { validateShiftCloseForm } from "@/lib/shift-close-validation";

describe("validateShiftCloseForm", () => {
  it("accepts zero difference", () => {
    const result = validateShiftCloseForm({
      actualCash: "100",
      transferAmount: "100",
    });
    expect(result).toEqual({
      ok: true,
      actual: 100,
      transfer: 100,
      difference: 0,
    });
  });

  it("accepts positive difference", () => {
    const result = validateShiftCloseForm({
      actualCash: "150.50",
      transferAmount: "100",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.difference).toBe(50.5);
    }
  });

  it("rejects transfer greater than actual", () => {
    const result = validateShiftCloseForm({
      actualCash: "10",
      transferAmount: "25",
    });
    expect(result.ok).toBe(false);
  });
});
