"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  commitUserProvisioningExcel,
  downloadUserProvisioningTemplate,
  getUserProvisioningWizardReferenceData,
  provisionUser,
  validateUserProvisioningExcel,
} from "@/lib/user-provisioning-api";
import { validateAdminPasswordPolicy } from "@/components/admin/user-edit-sheet";
import { UserAccountKind, type UserAccountKindValue } from "@/types/user";
import type {
  UserProvisionRequest,
  UserProvisioningWizardPermissionOption,
} from "@/types/user-provisioning";
import { UserProvisioningPermissionOverridePicker } from "@/components/admin/user-provisioning-permission-override-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormFieldInline } from "@/components/ui/form-field-inline";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function UserProvisioningWizardPageContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.accessToken ?? null;

  const [step, setStep] = useState<WizardStep>(1);
  const [saving, setSaving] = useState(false);

  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [accountKind, setAccountKind] = useState<UserAccountKindValue>(UserAccountKind.MainBranch);
  const [homeParmId, setHomeParmId] = useState<number | null>(null);
  const [employInfoId, setEmployInfoId] = useState<string>("");

  const [pharmacies, setPharmacies] = useState<Array<{ parmId: number; name: string }>>([]);
  const [selectedPharmacies, setSelectedPharmacies] = useState<number[]>([]);
  const [defaultPharmacyId, setDefaultPharmacyId] = useState<number | null>(null);

  const [jobTitles, setJobTitles] = useState<Array<{ jobTitleId: number; name: string }>>([]);
  const [jobRows, setJobRows] = useState<Array<{ parmId: number; jobTitleId: number }>>([]);

  const [profiles, setProfiles] = useState<Array<{ profileId: number; name: string; category: string }>>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<number[]>([]);

  const [overrides, setOverrides] = useState<Array<{ permissionId: number; isAllowed: boolean }>>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<
    UserProvisioningWizardPermissionOption[]
  >([]);

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelPreview, setExcelPreview] = useState<string | null>(null);

  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [employInfoOptions, setEmployInfoOptions] = useState<
    Array<{ id: number; label: string }>
  >([]);
  const [permissionOptions, setPermissionOptions] = useState<
    Array<{ permissionId: number; label: string }>
  >([]);

  const loadReferenceData = useCallback(async () => {
    if (!token) return;
    setReferenceLoading(true);
    setReferenceError(null);
    try {
      const data = await getUserProvisioningWizardReferenceData(token);
      setPharmacies(data.pharmacies);
      setJobTitles(
        data.jobTitles.map((t) => ({
          jobTitleId: t.jobTitleId,
          name: t.name || t.jobTitleCode,
        }))
      );
      setProfiles(
        data.responsibilityProfiles.map((p) => ({
          profileId: p.profileId,
          name: p.name,
          category: p.category,
        }))
      );
      setEmployInfoOptions(
        data.employInfoRecords.map((e) => ({
          id: e.id,
          label: [e.name, e.code].filter(Boolean).join(" — ") || `EmployInfo #${e.id}`,
        }))
      );
      setPermissionCatalog(data.permissions);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not load wizard reference data.";
      setReferenceError(message);
      toast.error(message);
    } finally {
      setReferenceLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  const buildRequest = useCallback((): UserProvisionRequest => {
    return {
      userName: userName.trim(),
      email: email.trim(),
      password,
      phoneNumber: phoneNumber.trim() || null,
      isActive,
      accountKind,
      homeParmId: accountKind === UserAccountKind.Pharmacy ? homeParmId : null,
      employInfoId: employInfoId ? Number.parseInt(employInfoId, 10) : null,
      displayName: userName.trim(),
      pharmacyAssignments: (accountKind === UserAccountKind.MainBranch
        ? selectedPharmacies
        : homeParmId
          ? [...new Set([homeParmId, ...selectedPharmacies])]
          : selectedPharmacies
      ).map((parmId) => ({
        parmId,
        isDefault:
          accountKind === UserAccountKind.Pharmacy
            ? parmId === homeParmId
            : defaultPharmacyId === parmId,
      })),
      jobAssignments: jobRows,
      responsibilityProfiles: selectedProfiles.map((profileId) => ({ profileId })),
      permissionOverrides: overrides,
    };
  }, [
    accountKind,
    defaultPharmacyId,
    email,
    employInfoId,
    homeParmId,
    isActive,
    jobRows,
    overrides,
    password,
    phoneNumber,
    selectedPharmacies,
    selectedProfiles,
    userName,
  ]);

  const permissionById = useMemo(
    () => new Map(permissionCatalog.map((p) => [p.permissionId, p])),
    [permissionCatalog]
  );

  const overrideSummaryLines = useMemo(
    () =>
      overrides.map((o) => {
        const meta = permissionById.get(o.permissionId);
        const label =
          meta?.permissionName?.trim() || meta?.permissionCode || `Permission #${o.permissionId}`;
        const code = meta?.permissionCode ?? String(o.permissionId);
        return `${o.isAllowed ? "Allow" : "Deny"}: ${label} (${code})`;
      }),
    [overrides, permissionById]
  );

  const summary = useMemo(() => JSON.stringify(buildRequest(), null, 2).replace(password, "***"), [
    buildRequest,
    password,
  ]);

  const goNext = () => setStep((s) => Math.min(7, s + 1) as WizardStep);
  const goBack = () => setStep((s) => Math.max(1, s - 1) as WizardStep);

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!userName.trim() || !email.trim()) return "User name and email are required.";
      const pwErr = validateAdminPasswordPolicy(password);
      if (pwErr) return pwErr;
      if (password !== confirmPassword) return "Passwords do not match.";
      if (accountKind === UserAccountKind.Pharmacy && !homeParmId) return "Home pharmacy is required.";
    }
    if (step === 3 && accountKind === UserAccountKind.MainBranch && selectedPharmacies.length === 0) {
      return "Assign at least one pharmacy for Main Branch users.";
    }
    if (step === 3 && accountKind === UserAccountKind.Pharmacy && !homeParmId) {
      return "Set the default (home) pharmacy in step 1.";
    }
    return null;
  };

  const handleSave = async () => {
    if (!token) return;
    const err = validateStep();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const result = await provisionUser(buildRequest(), token);
      if (!result.success) {
        toast.error(result.message ?? "Provisioning failed.");
        if (result.errors?.length) toast.error(result.errors.join("; "));
        return;
      }
      toast.success("User provisioned.");
      router.push("/dashboard/admin/users");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Provisioning failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleValidateExcel = async () => {
    if (!token || !excelFile) return;
    try {
      const preview = await validateUserProvisioningExcel(excelFile, token);
      setExcelPreview(
        `Valid: ${preview.validRowCount} / ${preview.totalRows}. Invalid: ${preview.invalidRowCount}.`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Validation failed.");
    }
  };

  const handleCommitExcel = async () => {
    if (!token || !excelFile) return;
    try {
      await commitUserProvisioningExcel(excelFile, token);
      toast.success("Excel import committed.");
      router.push("/dashboard/admin/users");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed.");
    }
  };

  return (
    <PageGuard permission={PERMISSIONS.users.create}>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">User provisioning wizard</h1>
            <p className="text-muted-foreground text-sm">Step {step} of 7</p>
          </div>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/admin/users">Back to users</Link>
          </Button>
        </div>

        {referenceError ? (
          <Card className="border-destructive">
            <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-6 text-sm">
              <span>{referenceError}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={referenceLoading}
                onClick={() => void loadReferenceData()}
              >
                {referenceLoading ? "Retrying…" : "Retry"}
              </Button>
            </CardContent>
          </Card>
        ) : referenceLoading ? (
          <p className="text-muted-foreground text-sm">Loading wizard reference data…</p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "Account information"}
              {step === 2 && "Employee association (optional)"}
              {step === 3 && "Pharmacy access"}
              {step === 4 && "Job responsibilities"}
              {step === 5 && "Responsibility profiles"}
              {step === 6 && "Permission overrides (optional)"}
              {step === 7 && "Review and save"}
            </CardTitle>
            <CardDescription>
              Provisioning uses a single backend service with transactional safety.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <FormFieldInline id="uname" label="User name" value={userName} onChange={(e) => setUserName(e.target.value)} />
                <FormFieldInline id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <FormFieldInline id="pw" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <FormFieldInline id="pw2" label="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                <FormFieldInline id="phone" label="Phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  Account active
                </label>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Account type</label>
                  <select
                    className="border-input bg-background rounded-md border px-2 py-1 text-sm"
                    value={accountKind}
                    onChange={(e) =>
                      setAccountKind(Number(e.target.value) as UserAccountKindValue)
                    }
                  >
                    <option value={String(UserAccountKind.MainBranch)}>Main Branch</option>
                    <option value={String(UserAccountKind.Pharmacy)}>Pharmacy</option>
                  </select>
                </div>
                {accountKind === UserAccountKind.Pharmacy ? (
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Home pharmacy</label>
                    <select
                      className="border-input bg-background rounded-md border px-2 py-1 text-sm"
                      value={homeParmId ?? ""}
                      onChange={(e) => setHomeParmId(Number(e.target.value))}
                    >
                      <option value="">Select…</option>
                      {pharmacies.map((p) => (
                        <option key={p.parmId} value={p.parmId}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </>
            )}

            {step === 2 && (
              <div className="space-y-3">
                {employInfoOptions.length > 0 ? (
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Link employee (optional)</label>
                    <select
                      className="border-input bg-background rounded-md border px-2 py-1 text-sm"
                      value={employInfoId}
                      onChange={(e) => setEmployInfoId(e.target.value)}
                    >
                      <option value="">None</option>
                      {employInfoOptions.map((e) => (
                        <option key={e.id} value={String(e.id)}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <FormFieldInline
                  id="employ"
                  label="EmployInfo Id"
                  value={employInfoId}
                  onChange={(e) => setEmployInfoId(e.target.value)}
                  placeholder="Optional — numeric Id if not listed above"
                />
              </div>
            )}

            {step === 3 && (
              <>
                {accountKind === UserAccountKind.MainBranch ? (
                  <div className="space-y-2">
                    {pharmacies.map((p) => (
                      <label key={p.parmId} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selectedPharmacies.includes(p.parmId)}
                          onChange={(e) => {
                            setSelectedPharmacies((curr) =>
                              e.target.checked
                                ? [...curr, p.parmId]
                                : curr.filter((id) => id !== p.parmId)
                            );
                            if (e.target.checked && defaultPharmacyId == null) {
                              setDefaultPharmacyId(p.parmId);
                            }
                          }}
                        />
                        {p.name}
                      </label>
                    ))}
                    <div className="grid gap-2 pt-2">
                      <label className="text-sm font-medium">Default pharmacy</label>
                      <select
                        className="border-input bg-background rounded-md border px-2 py-1 text-sm"
                        value={defaultPharmacyId ?? ""}
                        onChange={(e) => setDefaultPharmacyId(Number(e.target.value))}
                      >
                        {selectedPharmacies.map((id) => (
                          <option key={id} value={id}>
                            {pharmacies.find((p) => p.parmId === id)?.name ?? id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">
                      Home pharmacy from step 1 is always included as the default. Select additional
                      pharmacies the user may access.
                    </p>
                    {pharmacies
                      .filter((p) => p.parmId !== homeParmId)
                      .map((p) => (
                        <label key={p.parmId} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={selectedPharmacies.includes(p.parmId)}
                            onChange={(e) => {
                              setSelectedPharmacies((curr) =>
                                e.target.checked
                                  ? [...curr, p.parmId]
                                  : curr.filter((id) => id !== p.parmId)
                              );
                            }}
                          />
                          {p.name}
                        </label>
                      ))}
                  </div>
                )}
              </>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs">Assign job titles per pharmacy.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setJobRows((rows) => [...rows, { parmId: selectedPharmacies[0] ?? homeParmId ?? 1, jobTitleId: jobTitles[0]?.jobTitleId ?? 0 }])
                  }
                >
                  Add job assignment
                </Button>
                {jobRows.map((row, index) => (
                  <div key={index} className="flex flex-wrap gap-2">
                    <select
                      className="border-input rounded-md border px-2 py-1 text-sm"
                      value={row.parmId}
                      onChange={(e) => {
                        const parmId = Number(e.target.value);
                        setJobRows((rows) => rows.map((r, i) => (i === index ? { ...r, parmId } : r)));
                      }}
                    >
                      {(accountKind === UserAccountKind.MainBranch
                        ? selectedPharmacies
                        : homeParmId
                          ? [...new Set([homeParmId, ...selectedPharmacies])]
                          : []
                      ).map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                    <select
                      className="border-input rounded-md border px-2 py-1 text-sm"
                      value={row.jobTitleId}
                      onChange={(e) => {
                        const jobTitleId = Number(e.target.value);
                        setJobRows((rows) => rows.map((r, i) => (i === index ? { ...r, jobTitleId } : r)));
                      }}
                    >
                      {jobTitles.map((t) => (
                        <option key={t.jobTitleId} value={t.jobTitleId}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setJobRows((rows) => rows.filter((_, i) => i !== index))}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-2">
                {profiles.map((p) => (
                  <label key={p.profileId} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedProfiles.includes(p.profileId)}
                      onChange={(e) =>
                        setSelectedProfiles((curr) =>
                          e.target.checked ? [...curr, p.profileId] : curr.filter((id) => id !== p.profileId)
                        )
                      }
                    />
                    <span>
                      {p.name} <span className="text-muted-foreground">({p.category})</span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            {step === 6 && (
              <UserProvisioningPermissionOverridePicker
                permissions={permissionCatalog}
                overrides={overrides}
                onChange={setOverrides}
                disabled={referenceLoading || !!referenceError}
              />
            )}

            {step === 7 && (
              <div className="space-y-3">
                {overrideSummaryLines.length > 0 ? (
                  <div className="rounded-md border p-3 text-sm">
                    <p className="mb-2 font-medium">Permission overrides</p>
                    <ul className="text-muted-foreground list-inside list-disc text-xs">
                      {overrideSummaryLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No permission overrides selected.</p>
                )}
                <pre className="bg-muted max-h-80 overflow-auto rounded-md p-3 text-xs">{summary}</pre>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" disabled={step === 1} onClick={goBack}>
                Back
              </Button>
              {step < 7 ? (
                <Button
                  type="button"
                  onClick={() => {
                    const err = validateStep();
                    if (err) {
                      toast.error(err);
                      return;
                    }
                    goNext();
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? "Saving…" : "Save user"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Excel bulk provisioning</CardTitle>
            <CardDescription>Uses the same provisioning service as the wizard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!token}
                onClick={async () => {
                  if (!token) return;
                  const blob = await downloadUserProvisioningTemplate(token);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "user-provisioning-template.xlsx";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download template
              </Button>
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" onClick={() => void handleValidateExcel()} disabled={!excelFile}>
                Validate
              </Button>
              <Button type="button" onClick={() => void handleCommitExcel()} disabled={!excelFile}>
                Commit valid rows
              </Button>
            </div>
            {excelPreview ? <p className="text-muted-foreground text-sm">{excelPreview}</p> : null}
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
