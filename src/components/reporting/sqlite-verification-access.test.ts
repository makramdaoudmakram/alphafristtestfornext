import { describe, expect, it } from "vitest";
import { isDiagnosticsAdmin } from "@/lib/diagnostics/diagnostics-api";

describe("SQLite verification access", () => {
  it("allows Admin and SuperAdmin roles", () => {
    expect(isDiagnosticsAdmin(["Admin"])).toBe(true);
    expect(isDiagnosticsAdmin(["SuperAdmin"])).toBe(true);
    expect(isDiagnosticsAdmin(["Viewer"])).toBe(false);
  });
});
