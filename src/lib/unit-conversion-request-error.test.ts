import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-client";
import { unitConversionRequestErrorMessage } from "@/lib/unit-conversion-request-error";

describe("unitConversionRequestErrorMessage", () => {
  it("returns ApiError message for permission failures", () => {
    const msg = unitConversionRequestErrorMessage(
      new ApiError(403, "Missing permission: ItemCatalog.View")
    );
    expect(msg).toBe("Missing permission: ItemCatalog.View");
  });

  it("returns generic text only for unknown errors", () => {
    expect(unitConversionRequestErrorMessage({})).toBe("Unit conversion failed.");
  });

  it("returns Error.message when present", () => {
    expect(unitConversionRequestErrorMessage(new Error("Network timeout"))).toBe(
      "Network timeout"
    );
  });
});