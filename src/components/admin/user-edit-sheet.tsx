"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getUserById,
  getPharms,
  resetUserPassword,
  updateUser,
  ApiError,
} from "@/lib/api-client";
import {
  accountClassificationFromUser,
  buildAccountClassificationRequest,
} from "@/lib/user-account-classification";
import type { UserListItem, UserAccountKindValue } from "@/types/user";
import { UserAccountKind } from "@/types/user";
import type { PharmItem } from "@/types/pharm";
import {
  UserAccountClassificationFields,
  validateUserAccountClassificationFields,
} from "@/components/admin/user-account-classification-fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormFieldInline } from "@/components/ui/form-field-inline";
import { Separator } from "@/components/ui/separator";
import { UserResponsibilitiesSection } from "@/components/admin/user-responsibilities-section";
import { UserEffectiveAccessSection } from "@/components/admin/user-effective-access-section";
import { ActionGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type UserProfileFormValues = {
  userName: string;
  email: string;
  phoneNumber: string;
  emailConfirmed: boolean;
  isActive: boolean;
  accountKind: UserAccountKindValue;
  homeParmId: number | null;
};

const emptyProfile: UserProfileFormValues = {
  userName: "",
  email: "",
  phoneNumber: "",
  emailConfirmed: false,
  isActive: true,
  accountKind: UserAccountKind.Pharmacy,
  homeParmId: null,
};

function toProfileValues(user: UserListItem): UserProfileFormValues {
  const classification = accountClassificationFromUser(user);
  return {
    userName: user.userName ?? "",
    email: user.email ?? "",
    phoneNumber: user.phoneNumber ?? "",
    emailConfirmed: user.emailConfirmed,
    isActive: user.isActive,
    accountKind: classification.accountKind,
    homeParmId: classification.homeParmId,
  };
}

export function validateAdminPasswordPolicy(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include an uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include a lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include a digit.";
  }
  return null;
}

export function UserEditSheet({
  open,
  onOpenChange,
  userId,
  token,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  token: string | null;
  onUpdated: () => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfileFormValues>(emptyProfile);
  const [pharmacies, setPharmacies] = useState<PharmItem[]>([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetPasswordFields = useCallback(() => {
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
  }, []);

  const loadUser = useCallback(async () => {
    if (!open || !userId || !token) {
      return;
    }

    setLoading(true);
    setLoadError(null);
    setProfileError(null);
    resetPasswordFields();

    try {
      const user = await getUserById(userId, token);
      setProfile(toProfileValues(user));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load user";
      setLoadError(message);
      setProfile(emptyProfile);
    } finally {
      setLoading(false);
    }
  }, [open, userId, token, resetPasswordFields]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!open || !token) return;

    let cancelled = false;
    setLoadingPharmacies(true);

    void getPharms(token)
      .then((items) => {
        if (!cancelled) setPharmacies(items);
      })
      .catch(() => {
        if (!cancelled) setPharmacies([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPharmacies(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, token]);

  useEffect(() => {
    if (!open) {
      setLoadError(null);
      setProfileError(null);
      resetPasswordFields();
    }
  }, [open, resetPasswordFields]);

  async function handleProfileSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!userId || !token) return;

    setSavingProfile(true);
    setProfileError(null);

    const classificationError = validateUserAccountClassificationFields({
      accountKind: profile.accountKind,
      homeParmId: profile.homeParmId,
    });
    if (classificationError) {
      setProfileError(classificationError);
      setSavingProfile(false);
      return;
    }

    const classification = buildAccountClassificationRequest(
      profile.accountKind,
      profile.homeParmId
    );

    try {
      await updateUser(
        userId,
        {
          userName: profile.userName.trim(),
          email: profile.email.trim(),
          phoneNumber: profile.phoneNumber.trim(),
          emailConfirmed: profile.emailConfirmed,
          isActive: profile.isActive,
          accountKind: classification.accountKind,
          homeParmId: classification.homeParmId,
        },
        token
      );
      toast.success("User updated.");
      await onUpdated();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to update user";
      setProfileError(message);
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!userId || !token) return;

    setPasswordError(null);

    const policyError = validateAdminPasswordPolicy(newPassword);
    if (policyError) {
      setPasswordError(policyError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    const confirmed = window.confirm(
      "Reset this user's password? They will need the new password to sign in."
    );
    if (!confirmed) return;

    setResettingPassword(true);

    try {
      const result = await resetUserPassword(userId, newPassword, token);
      if (!result.isSuccess) {
        const message = result.message || "Password reset failed.";
        setPasswordError(message);
        toast.error(message);
        return;
      }

      toast.success(result.message);
      resetPasswordFields();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Password reset failed";
      setPasswordError(message);
      toast.error(message);
    } finally {
      setResettingPassword(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit user</SheetTitle>
          <SheetDescription>
            Update account details, responsibility profiles, or set a new password.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <p className="text-muted-foreground px-4 text-sm">Loading user…</p>
        ) : loadError ? (
          <div className="space-y-3 px-4">
            <p className="text-destructive text-sm">{loadError}</p>
            <Button type="button" variant="outline" onClick={() => void loadUser()}>
              Retry
            </Button>
          </div>
        ) : userId ? (
          <div className="flex flex-col gap-6 px-4 pb-4">
            <form onSubmit={handleProfileSubmit} className="space-y-3">
              <FormFieldInline
                id="edit-userName"
                label="User name"
                value={profile.userName}
                onChange={(e) =>
                  setProfile((current) => ({
                    ...current,
                    userName: e.target.value,
                  }))
                }
                required
              />
              <FormFieldInline
                id="edit-email"
                label="Email"
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile((current) => ({
                    ...current,
                    email: e.target.value,
                  }))
                }
                required
              />
              <FormFieldInline
                id="edit-phone"
                label="Phone"
                value={profile.phoneNumber}
                onChange={(e) =>
                  setProfile((current) => ({
                    ...current,
                    phoneNumber: e.target.value,
                  }))
                }
              />

              <UserAccountClassificationFields
                accountKind={profile.accountKind}
                homeParmId={profile.homeParmId}
                pharmacies={pharmacies}
                loadingPharmacies={loadingPharmacies}
                disabled={savingProfile}
                onAccountKindChange={(accountKind) =>
                  setProfile((current) => ({ ...current, accountKind }))
                }
                onHomeParmIdChange={(homeParmId) =>
                  setProfile((current) => ({ ...current, homeParmId }))
                }
              />

              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-4">
                <span className="text-muted-foreground text-sm font-medium sm:text-end">
                  Options
                </span>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={profile.emailConfirmed}
                      onChange={(e) =>
                        setProfile((current) => ({
                          ...current,
                          emailConfirmed: e.target.checked,
                        }))
                      }
                    />
                    Email confirmed
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={profile.isActive}
                      onChange={(e) =>
                        setProfile((current) => ({
                          ...current,
                          isActive: e.target.checked,
                        }))
                      }
                    />
                    Account active
                  </label>
                </div>
              </div>

              {profileError ? (
                <p className="text-destructive text-sm">{profileError}</p>
              ) : null}

              <SheetFooter className="px-0 pt-2 sm:pl-[calc(9.5rem+1rem)]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={savingProfile}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="update" disabled={savingProfile}>
                  {savingProfile ? "Saving…" : "Save changes"}
                </Button>
              </SheetFooter>
            </form>

            <Separator />

            {token && userId ? (
              <ActionGuard permission={PERMISSIONS.users.edit}>
                <UserEffectiveAccessSection userId={userId} token={token} />
              </ActionGuard>
            ) : null}

            <Separator />

            {token && userId ? (
              <ActionGuard
                permission={PERMISSIONS.responsibilityProfiles.manage}
                requireGrantedPermission
              >
                <UserResponsibilitiesSection userId={userId} token={token} />
              </ActionGuard>
            ) : null}

            <Separator />

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Change password</h3>
                <p className="text-muted-foreground text-xs">
                  Minimum 8 characters with uppercase, lowercase, and a digit.
                  The current password is never shown.
                </p>
              </div>
              <FormFieldInline
                id="new-password"
                label="New password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
              />
              <FormFieldInline
                id="confirm-password"
                label="Confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
              />

              {passwordError ? (
                <p className="text-destructive text-sm">{passwordError}</p>
              ) : null}

              <div className="sm:pl-[calc(9.5rem+1rem)]">
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={resettingPassword || !newPassword || !confirmPassword}
                >
                  {resettingPassword ? "Resetting…" : "Reset password"}
                </Button>
              </div>
            </form>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
