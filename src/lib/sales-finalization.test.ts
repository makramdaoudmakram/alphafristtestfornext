import { describe, expect, it } from "vitest";
import {
  canFinalizeSale,
  createEmptyTab,
  isSaleFinalized,
} from "@/lib/sales-workspace-calc";
import type { SalesWorkspaceTab } from "@/types/sales-workspace";

function tab(patch: Partial<SalesWorkspaceTab> = {}): SalesWorkspaceTab {
  return { ...createEmptyTab(1, "2026-10-15 10:00:00"), ...patch };
}

describe("canFinalizeSale", () => {
  it("allows a saved invoice that is still pending payment", () => {
    expect(canFinalizeSale(tab({ saved: true, sthId: 501, billTyp: 0 }))).toBe(true);
  });

  it("treats a missing BillTyp as pending", () => {
    expect(canFinalizeSale(tab({ saved: true, sthId: 501, billTyp: null }))).toBe(true);
  });

  it("blocks a finalized invoice from finalizing again", () => {
    const finalized = tab({ saved: true, sthId: 501, billTyp: 1 });
    expect(canFinalizeSale(finalized)).toBe(false);
  });

  it("blocks an unsaved invoice and one without a header id", () => {
    expect(canFinalizeSale(tab({ saved: false, sthId: 501, billTyp: 0 }))).toBe(false);
    expect(canFinalizeSale(tab({ saved: true, sthId: null, billTyp: 0 }))).toBe(false);
    expect(canFinalizeSale(tab({ saved: true, sthId: 0, billTyp: 0 }))).toBe(false);
  });

  it("blocks every request while one is already in flight", () => {
    const pending = tab({ saved: true, sthId: 501, billTyp: 0 });
    expect(canFinalizeSale(pending, false)).toBe(true);
    expect(canFinalizeSale(pending, true)).toBe(false);
  });

  it("blocks a finalized invoice even when no request is in flight", () => {
    expect(canFinalizeSale(tab({ saved: true, sthId: 501, billTyp: 1 }), true)).toBe(false);
  });

  it("blocks when there is no active tab", () => {
    expect(canFinalizeSale(null)).toBe(false);
  });
});

describe("isSaleFinalized", () => {
  it("is true only for a saved invoice with BillTyp 1", () => {
    expect(isSaleFinalized(tab({ saved: true, sthId: 501, billTyp: 1 }))).toBe(true);
    expect(isSaleFinalized(tab({ saved: true, sthId: 501, billTyp: 0 }))).toBe(false);
    expect(isSaleFinalized(tab({ saved: true, sthId: 501, billTyp: null }))).toBe(false);
    expect(isSaleFinalized(tab({ saved: false, sthId: 501, billTyp: 1 }))).toBe(false);
    expect(isSaleFinalized(null)).toBe(false);
  });

  it("leaves a finalized invoice with no remaining finalize gate", () => {
    const finalized = tab({ saved: true, sthId: 501, billTyp: 1 });
    expect(isSaleFinalized(finalized)).toBe(true);
    expect(canFinalizeSale(finalized)).toBe(false);
  });
});
