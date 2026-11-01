"use client";

import {
  formatPharmacyOptionLabel,
  validateAccountClassification,
} from "@/lib/user-account-classification";
import type { PharmItem } from "@/types/pharm";
import { UserAccountKind, type UserAccountKindValue } from "@/types/user";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type UserAccountClassificationValues = {
  accountKind: UserAccountKindValue;
  homeParmId: number | null;
};

type UserAccountClassificationFieldsProps = {
  accountKind: UserAccountKindValue;
  homeParmId: number | null;
  pharmacies: PharmItem[];
  loadingPharmacies?: boolean;
  disabled?: boolean;
  onAccountKindChange: (accountKind: UserAccountKindValue) => void;
  onHomeParmIdChange: (homeParmId: number | null) => void;
};

export function UserAccountClassificationFields({
  accountKind,
  homeParmId,
  pharmacies,
  loadingPharmacies = false,
  disabled = false,
  onAccountKindChange,
  onHomeParmIdChange,
}: UserAccountClassificationFieldsProps) {
  const showHomePharmacy = accountKind === UserAccountKind.Pharmacy;
  const homeSelectValue =
    homeParmId != null && Number.isFinite(homeParmId) ? String(homeParmId) : "";

  return (
    <>
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-4">
        <label
          htmlFor="account-kind"
          className="text-muted-foreground text-sm font-medium sm:text-end"
        >
          Account type
        </label>
        <Select
          value={String(accountKind)}
          onValueChange={(value) => {
            const nextKind =
              value === String(UserAccountKind.MainBranch)
                ? UserAccountKind.MainBranch
                : UserAccountKind.Pharmacy;
            onAccountKindChange(nextKind);
            if (nextKind === UserAccountKind.MainBranch) {
              onHomeParmIdChange(null);
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger id="account-kind" className="w-full">
            <SelectValue placeholder="Select account type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={String(UserAccountKind.Pharmacy)}>
              Pharmacy
            </SelectItem>
            <SelectItem value={String(UserAccountKind.MainBranch)}>
              Main Branch / Head Office
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showHomePharmacy ? (
        <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-4">
          <label
            htmlFor="home-pharmacy"
            className="text-muted-foreground text-sm font-medium sm:text-end"
          >
            Home pharmacy
          </label>
          <Select
            value={homeSelectValue}
            onValueChange={(value) => onHomeParmIdChange(Number(value))}
            disabled={disabled || loadingPharmacies}
          >
            <SelectTrigger id="home-pharmacy" className="w-full">
              <SelectValue
                placeholder={
                  loadingPharmacies
                    ? "Loading pharmacies…"
                    : "Select home pharmacy"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {homeParmId != null &&
              !pharmacies.some((p) => p.parmId === homeParmId) ? (
                <SelectItem value={String(homeParmId)}>
                  Pharmacy #{homeParmId}
                </SelectItem>
              ) : null}
              {pharmacies.map((pharmacy) => (
                <SelectItem key={pharmacy.parmId} value={String(pharmacy.parmId)}>
                  {formatPharmacyOptionLabel(
                    pharmacy.parmId,
                    pharmacy.parmEnName,
                    pharmacy.parmArName
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </>
  );
}

export function validateUserAccountClassificationFields(
  values: UserAccountClassificationValues
): string | null {
  return validateAccountClassification(values.accountKind, values.homeParmId);
}
