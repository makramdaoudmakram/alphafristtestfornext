import { beforeEach, describe, expect, it, vi } from "vitest";
import { timedFetch } from "@/lib/timed-fetch";
import {
  createEmptyDetailRow,
  emptyPurchaseHeader,
  headerToFormValues,
  mapHeaderFromApi,
  toUpsertPayload,
} from "@/lib/purchase.mapper";
import { createPharmPurchaseRepository } from "@/repository/pharm-purchase.repository";
import { createPurchaseRepository } from "@/repository/purchase.repository";
import { purchaseHeaderSchema } from "@/validation/purchase.schema";

vi.mock("@/lib/timed-fetch", () => ({
  timedFetch: vi.fn(),
}));

function savedHeader(overrides: Record<string, unknown> = {}) {
  return headerToFormValues({
    ...emptyPurchaseHeader(),
    id: 7,
    pthId: 900,
    movId: 100,
    movmentRowId: 10,
    venBillNo: "VB-1",
    venBillDate: "2026-10-11",
    phtDate: "2026-10-11",
    ...overrides,
  });
}

function payload(overrides: Record<string, unknown> = {}) {
  return toUpsertPayload(savedHeader(overrides), [createEmptyDetailRow("1")]);
}

function responseBody(): Response {
  return new Response(
    JSON.stringify({ Header: { Id: 7, PthId: 900 }, PurTransDetails: [] }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

function sentBody(): string {
  const call = vi.mocked(timedFetch).mock.calls[0];
  expect(call).toBeDefined();
  return String(call?.[1]?.body);
}

function sentHeader(): Record<string, unknown> {
  const body = JSON.parse(sentBody()) as { Header: Record<string, unknown> };
  return body.Header;
}

describe("pharmacy purchase employee + shift save payload", () => {
  beforeEach(() => {
    vi.mocked(timedFetch).mockReset();
    vi.mocked(timedFetch).mockResolvedValue(responseBody());
  });

  it("sends the resolved employee id and never a shift number", async () => {
    await createPharmPurchaseRepository("token-1").update(
      7,
      payload({ shitNo: 77, employCode: 4401 })
    );

    const header = sentHeader();
    expect(header.EmployCode).toBe(4401);
    // A modified request must not be able to choose the shift; the server resolves it.
    expect(header).not.toHaveProperty("ShitNo");
  });

  it("sends 0 for the employee when it is empty so the server clears it", async () => {
    await createPharmPurchaseRepository("token-1").update(7, payload());

    const header = sentHeader();
    expect(header.EmployCode).toBe(0);
    expect(header).not.toHaveProperty("ShitNo");
  });

  it("sends no shift on create either", async () => {
    await createPharmPurchaseRepository("token-1").create(
      payload({ shitNo: 77, employCode: 4401 })
    );

    const header = sentHeader();
    expect(header.EmployCode).toBe(4401);
    expect(header).not.toHaveProperty("ShitNo");
  });

  it("carries no password field in the request body", async () => {
    await createPharmPurchaseRepository("token-1").update(
      7,
      payload({ shitNo: 77, employCode: 4401 })
    );

    const init = sentBody();
    expect(init.toLowerCase()).not.toContain("password");
  });

  it("leaves the regular purchase request body unchanged", async () => {
    await createPurchaseRepository("token-1").update(
      7,
      payload({ shitNo: 77, employCode: 4401 })
    );

    const header = sentHeader();
    expect(header).not.toHaveProperty("ShitNo");
    expect(header).not.toHaveProperty("EmployCode");
  });

  it("reads ShitNo and EmployCode back from the API and treats 0 as empty", () => {
    const stored = mapHeaderFromApi({ Id: 7, ShitNo: 77, EmployCode: 4401 });
    expect(stored.shitNo).toBe(77);
    expect(stored.employCode).toBe(4401);

    const unassigned = mapHeaderFromApi({ Id: 7, ShitNo: 0, EmployCode: null });
    expect(unassigned.shitNo).toBeNull();
    expect(unassigned.employCode).toBeNull();
  });

  it("reads the retrieved employee name and never sends it back", async () => {
    const stored = mapHeaderFromApi({
      Id: 7,
      EmployCode: 4401,
      EmployName: "Pharmacy buyer",
    });
    expect(stored.employName).toBe("Pharmacy buyer");

    await createPharmPurchaseRepository("token-1").update(
      7,
      payload({ employCode: 4401, employName: "Pharmacy buyer" })
    );

    const header = sentHeader();
    expect(header.EmployCode).toBe(4401);
    expect(header).not.toHaveProperty("EmployName");
    expect(header).not.toHaveProperty("ShitNo");
  });

  it("validates shift and employee values as smallint-sized whole numbers", () => {
    const base = savedHeader();

    expect(purchaseHeaderSchema.safeParse({ ...base, shitNo: 77 }).success).toBe(
      true
    );
    expect(purchaseHeaderSchema.safeParse({ ...base, shitNo: 7.5 }).success).toBe(
      false
    );
    expect(
      purchaseHeaderSchema.safeParse({ ...base, employCode: 40000 }).success
    ).toBe(false);
    expect(
      purchaseHeaderSchema.safeParse({ ...base, shitNo: null }).success
    ).toBe(true);
  });
});
