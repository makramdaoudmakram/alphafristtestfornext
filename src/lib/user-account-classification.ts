import type { UserListItem } from "@/types/user";
import { UserAccountKind, type UserAccountKindValue } from "@/types/user";

export function readAccountKindFromApi(raw: unknown): UserAccountKindValue {
  if (raw === UserAccountKind.MainBranch || raw === "MainBranch" || raw === 1) {
    return UserAccountKind.MainBranch;
  }
  return UserAccountKind.Pharmacy;
}

export function readHomeParmIdFromApi(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const value = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function validateAccountClassification(
  accountKind: UserAccountKindValue,
  homeParmId: number | null
): string | null {
  if (accountKind === UserAccountKind.MainBranch) {
    return null;
  }
  if (homeParmId == null || !Number.isFinite(homeParmId) || homeParmId <= 0) {
    return "Home pharmacy is required for pharmacy accounts.";
  }
  return null;
}

export function buildAccountClassificationRequest(
  accountKind: UserAccountKindValue,
  homeParmId: number | null
): { accountKind: UserAccountKindValue; homeParmId: number | null } {
  if (accountKind === UserAccountKind.MainBranch) {
    return { accountKind, homeParmId: null };
  }
  return { accountKind, homeParmId };
}

export function accountClassificationFromUser(
  user: Pick<UserListItem, "accountKind" | "homeParmId">
): { accountKind: UserAccountKindValue; homeParmId: number | null } {
  return {
    accountKind: user.accountKind,
    homeParmId: user.homeParmId,
  };
}

export function formatPharmacyOptionLabel(
  parmId: number,
  parmEnName?: string | null,
  parmArName?: string | null
): string {
  const name = parmEnName?.trim() || parmArName?.trim();
  return name ? `${name} (#${parmId})` : `Pharmacy #${parmId}`;
}
