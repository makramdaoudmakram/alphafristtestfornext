import { describe, expect, it } from "vitest";
import { validateAdminPasswordPolicy } from "@/components/admin/user-edit-sheet";

describe("validateAdminPasswordPolicy", () => {
  it("accepts a password matching Alfa Identity rules", () => {
    expect(validateAdminPasswordPolicy("ValidPass1")).toBeNull();
  });

  it("rejects short passwords", () => {
    expect(validateAdminPasswordPolicy("Ab1")).toMatch(/8 characters/i);
  });

  it("rejects passwords without required character classes", () => {
    expect(validateAdminPasswordPolicy("alllowercase1")).toMatch(/uppercase/i);
    expect(validateAdminPasswordPolicy("ALLUPPERCASE1")).toMatch(/lowercase/i);
    expect(validateAdminPasswordPolicy("NoDigitsHere")).toMatch(/digit/i);
  });
});
