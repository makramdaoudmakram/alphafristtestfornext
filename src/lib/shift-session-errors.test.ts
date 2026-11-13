import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-client";
import {
  classifyShiftApiError,
  shiftSessionStatusLabel,
} from "@/lib/shift-session-errors";

describe("shift-session-errors", () => {
  it("classifies 403 as authorization", () => {
    expect(
      classifyShiftApiError(new ApiError(403, "Missing permission: Sales.View."))
    ).toBe("authorization");
    expect(shiftSessionStatusLabel("authorization")).toBe("Authorization denied");
  });

  it("classifies 400 as missing pharmacy", () => {
    expect(
      classifyShiftApiError(new ApiError(400, "No active pharmacy selected."))
    ).toBe("missing_pharmacy");
  });
});
