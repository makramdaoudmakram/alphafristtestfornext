import { describe, expect, it } from "vitest";
import { resolveWorkspaceActiveTabId } from "@/lib/workspace-active-tab";

describe("resolveWorkspaceActiveTabId", () => {
  const tabs = [{ clientId: "a" }, { clientId: "b" }];

  it("returns null when there are no tabs", () => {
    expect(resolveWorkspaceActiveTabId([], null)).toBeNull();
  });

  it("uses activeId when it matches a tab", () => {
    expect(resolveWorkspaceActiveTabId(tabs, "b")).toBe("b");
  });

  it("falls back to first tab when activeId is null", () => {
    expect(resolveWorkspaceActiveTabId(tabs, null)).toBe("a");
  });

  it("falls back to first tab when activeId is stale", () => {
    expect(resolveWorkspaceActiveTabId(tabs, "missing")).toBe("a");
  });
});
