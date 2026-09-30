import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDebouncedDiagnosticsLookup } from "@/components/diagnostics/useDebouncedDiagnosticsLookup";
import * as diagnosticsApi from "@/lib/diagnostics/diagnostics-api";
import {
  itemToEntry,
  mergeLookupEntries,
  vendorToEntry,
} from "@/lib/diagnostics/diagnostics-picker-utils";

describe("diagnostics pickers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("search text triggers debounced lookup call", async () => {
    const lookupSpy = vi
      .spyOn(diagnosticsApi, "diagnosticsLookup")
      .mockResolvedValue([
        { id: "2140001", name: "Alpha Supplies", code: "2140001" },
      ]);

    const initialEntries = [
      { id: "2140001", name: "Alpha Supplies", code: "2140001" },
    ];

    const { result } = renderHook(() =>
      useDebouncedDiagnosticsLookup({
        token: "token-1",
        kind: "vendor",
        initialEntries,
        enabled: true,
        debounceMs: 50,
      })
    );

    act(() => {
      result.current.setSearch("alpha");
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });

    expect(lookupSpy).toHaveBeenCalledWith(
      "token-1",
      "vendor",
      "alpha",
      50,
      expect.any(AbortSignal)
    );

    expect(result.current.entries).toEqual([
      { id: "2140001", name: "Alpha Supplies", code: "2140001" },
    ]);
  });

  it("multi-select merge keeps selected items when search results change", () => {
    const selected = itemToEntry({ id: 10, name: "Kept Item", code: "ITM-10" });
    const searchHit = itemToEntry({ id: 20, name: "Search Hit", code: "ITM-20" });

    const merged = mergeLookupEntries([selected], [searchHit]);

    expect(merged).toHaveLength(2);
    expect(merged.some((entry) => entry.id === "10")).toBe(true);
    expect(merged.some((entry) => entry.id === "20")).toBe(true);
  });

  it("vendor picker value uses supplier account code", () => {
    const vendor = vendorToEntry({
      id: "2140001",
      name: "Supplier Alpha",
      code: "2140001",
    });

    expect(vendor.id).toBe("2140001");
    expect(vendor.code).toBe("2140001");

    const benchmarkVendorId = vendor.id;
    expect(benchmarkVendorId).toBe("2140001");
  });
});
