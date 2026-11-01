import { describe, expect, it } from "vitest";
import {
  accountClassificationFromUser,
  buildAccountClassificationRequest,
  readAccountKindFromApi,
  readHomeParmIdFromApi,
  validateAccountClassification,
} from "@/lib/user-account-classification";
import { UserAccountKind } from "@/types/user";

describe("user account classification", () => {
  it("builds create payload for a pharmacy user with home pharmacy", () => {
    const payload = buildAccountClassificationRequest(UserAccountKind.Pharmacy, 12);

    expect(payload).toEqual({
      accountKind: UserAccountKind.Pharmacy,
      homeParmId: 12,
    });
    expect(validateAccountClassification(payload.accountKind, payload.homeParmId)).toBeNull();
  });

  it("builds update payload when editing a pharmacy user home pharmacy", () => {
    const payload = buildAccountClassificationRequest(UserAccountKind.Pharmacy, 99);

    expect(payload.homeParmId).toBe(99);
    expect(payload.accountKind).toBe(UserAccountKind.Pharmacy);
  });

  it("clears HomeParmId when switching to Main Branch", () => {
    const payload = buildAccountClassificationRequest(
      UserAccountKind.MainBranch,
      5
    );

    expect(payload).toEqual({
      accountKind: UserAccountKind.MainBranch,
      homeParmId: null,
    });
  });

  it("loads existing user values from API-shaped fields", () => {
    expect(readAccountKindFromApi(0)).toBe(UserAccountKind.Pharmacy);
    expect(readAccountKindFromApi(1)).toBe(UserAccountKind.MainBranch);
    expect(readHomeParmIdFromApi(42)).toBe(42);
    expect(readHomeParmIdFromApi(null)).toBeNull();

    const fromUser = accountClassificationFromUser({
      id: "u1",
      userName: "staff",
      fullName: "staff",
      email: "staff@example.com",
      phoneNumber: "",
      isActive: true,
      emailConfirmed: true,
      lockoutEnabled: false,
      accountKind: UserAccountKind.MainBranch,
      homeParmId: null,
    });

    expect(fromUser).toEqual({
      accountKind: UserAccountKind.MainBranch,
      homeParmId: null,
    });
  });

  it("rejects pharmacy accounts without a home pharmacy", () => {
    expect(
      validateAccountClassification(UserAccountKind.Pharmacy, null)
    ).toMatch(/home pharmacy/i);
    expect(
      validateAccountClassification(UserAccountKind.Pharmacy, 0)
    ).toMatch(/home pharmacy/i);
    expect(
      validateAccountClassification(UserAccountKind.MainBranch, null)
    ).toBeNull();
  });
});

describe("validateAdminPasswordPolicy", () => {
  it("accepts a password matching Alfa Identity rules", async () => {
    const { validateAdminPasswordPolicy } = await import(
      "@/components/admin/user-edit-sheet"
    );
    expect(validateAdminPasswordPolicy("ValidPass1")).toBeNull();
  });
});
