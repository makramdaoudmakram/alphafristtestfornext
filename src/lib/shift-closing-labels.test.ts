import { describe, expect, it } from "vitest";
import { SHIFT_CLOSING_TOTAL_ROWS } from "@/lib/shift-closing-labels";

describe("SHIFT_CLOSING_TOTAL_ROWS", () => {
  it("includes Total Sales as the 18th preview row", () => {
    expect(SHIFT_CLOSING_TOTAL_ROWS).toHaveLength(19);
    const totalSalesRow = SHIFT_CLOSING_TOTAL_ROWS.at(-2);
    expect(totalSalesRow?.key).toBe("totalSales");
    expect(totalSalesRow?.labelEn).toBe("Total Sales");
    const totalDiscountRow = SHIFT_CLOSING_TOTAL_ROWS.at(-1);
    expect(totalDiscountRow?.key).toBe("totalDiscountValue");
    expect(totalDiscountRow?.labelEn).toBe("Total Discount Value");
  });
});
