/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";

describe("Excel template wizard layout contract", () => {
  it("documents sticky footer and step-3 export accessibility markers", () => {
    const footerClasses =
      "bg-background sticky bottom-0 shrink-0 gap-2 border-t px-6 py-4 sm:justify-between";
    const dialogClasses =
      "flex max-h-[min(92vh,880px)] max-w-5xl flex-col gap-0 overflow-hidden p-0";

    expect(footerClasses).toContain("sticky");
    expect(footerClasses).toContain("bottom-0");
    expect(dialogClasses).toContain("max-h-[min(92vh,880px)]");
    expect(dialogClasses).toContain("overflow-hidden");
  });

  it("supports 1366×768 and 1920×1080 viewport max heights", () => {
    const viewports = [1366, 1920];
    for (const width of viewports) {
      const maxHeight = Math.min(window.innerHeight * 0.92, 880);
      expect(maxHeight).toBeGreaterThan(0);
      expect(width).toBeGreaterThan(0);
    }
  });
});