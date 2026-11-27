import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scheduleThermalBrowserPrint } from "@/lib/thermal-browser-print";

describe("scheduleThermalBrowserPrint", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      }
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("print", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("prints after layout delay and calls onAfterPrint", () => {
    const onPrint = vi.fn();
    const onAfterPrint = vi.fn();
    const cleanup = scheduleThermalBrowserPrint({ onPrint, onAfterPrint, delayMs: 350 });

    expect(onPrint).not.toHaveBeenCalled();
    vi.advanceTimersByTime(350);
    expect(onPrint).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event("afterprint"));
    expect(onAfterPrint).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("does not print after cleanup", () => {
    const onPrint = vi.fn();
    const cleanup = scheduleThermalBrowserPrint({ onPrint, delayMs: 100 });
    cleanup();
    vi.advanceTimersByTime(500);
    expect(onPrint).not.toHaveBeenCalled();
  });
});