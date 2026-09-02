"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PageGuard } from "@/components/permissions/page-guard";
import { usePermissions } from "@/components/permissions/permission-provider";
import { usePharmacyScope } from "@/components/pharmacy/pharmacy-scope-provider";
import { getScopeTest, validatePharmacyScope } from "@/lib/pharmacy-scope-api";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { ScopeTestResponse } from "@/types/pharmacy-scope";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SalesTestPageContent() {
  const { data: session } = useSession();
  const { roles, hasPermission } = usePermissions();
  const { authorizedPharmacies, activePharmacy, activePharmacyId } =
    usePharmacyScope();
  const [scopeTest, setScopeTest] = useState<ScopeTestResponse | null>(null);
  const [testValue, setTestValue] = useState("");
  const [validateParmId, setValidateParmId] = useState("");
  const [validateResult, setValidateResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.accessToken) return;

    setLoading(true);
    void getScopeTest(session.accessToken)
      .then(setScopeTest)
      .finally(() => setLoading(false));
  }, [session?.accessToken, activePharmacyId]);

  const primaryRole =
    roles.find((role) =>
      ["AreaManager", "SalesManager", "SalesMan", "SuperAdmin", "Admin"].includes(
        role
      )
    ) ?? roles[0] ?? "None";

  const handleValidate = async () => {
    if (!session?.accessToken || !validateParmId.trim()) return;

    try {
      await validatePharmacyScope(validateParmId.trim(), session.accessToken);
      setValidateResult("Allowed");
    } catch (err) {
      setValidateResult(
        err instanceof Error ? err.message : "Forbidden or validation failed."
      );
    }
  };

  return (
    <PageGuard
      permission={PERMISSIONS.sales.view}
      redirectTo="/unauthorized?from=sales&permission=Sales.View"
    >
      <div className="mx-auto max-w-3xl font-mono text-sm leading-6">
        <pre className="whitespace-pre-wrap">
{`========================================
             SALES TEST PAGE
========================================

Logged In:
    ${scopeTest?.userName ?? session?.user?.name ?? session?.user?.email ?? "—"}

User ID:
    ${scopeTest?.userId ?? "—"}

Role:
    ${primaryRole}

Authentication:
    ${session?.accessToken ? "✓ Authenticated" : "✗ Not authenticated"}

Page Permission:
    ${hasPermission(PERMISSIONS.sales.view!) ? "✓ Sales.View" : "✗ Sales.View"}

Authorized Pharmacies:`}
        </pre>

        {authorizedPharmacies.length === 0 ? (
          <pre className="whitespace-pre-wrap">    (none)</pre>
        ) : (
          authorizedPharmacies.map((pharmacy) => (
            <pre key={pharmacy.parmId} className="whitespace-pre-wrap">{`    ✓ ${pharmacy.name}`}</pre>
          ))
        )}

        <pre className="whitespace-pre-wrap">
{`
Active Pharmacy:
    ${activePharmacy?.name ?? "None"}

Active Pharmacy Authorization:
    ${scopeTest?.activePharmacyAuthorized ? "✓ Authorized" : "✗ Not authorized"}

Backend Scope:
    ${scopeTest?.scopeValid ? "✓ Valid" : "✗ Invalid"}

Test Value:
    [${testValue || "_____________________"}]

========================================`}
        </pre>

        <div className="mt-4 space-y-3">
          <Input
            value={testValue}
            onChange={(event) => setTestValue(event.target.value)}
            placeholder="Test value"
          />

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">
                Validate pharmacy scope (ParmId)
              </label>
              <Input
                value={validateParmId}
                onChange={(event) => setValidateParmId(event.target.value)}
                placeholder="e.g. 1"
                className="w-40"
              />
            </div>
            <Button type="button" variant="outline" onClick={() => void handleValidate()}>
              Validate
            </Button>
          </div>

          {validateResult ? (
            <p className="text-muted-foreground text-xs">
              Validate result: {validateResult}
            </p>
          ) : null}

          {loading ? (
            <p className="text-muted-foreground text-xs">Refreshing backend scope...</p>
          ) : null}
        </div>
      </div>
    </PageGuard>
  );
}
