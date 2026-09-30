"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permissions/permission-provider";
import { isDiagnosticsAdmin } from "@/lib/diagnostics/diagnostics-api";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DiagnosticsAdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { roles, ready, loading } = usePermissions();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!ready || loading || redirectedRef.current) return;
    if (!isDiagnosticsAdmin(roles)) {
      redirectedRef.current = true;
      router.replace("/dashboard");
    }
  }, [roles, ready, loading, router]);

  if (!ready || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading…</CardTitle>
          <CardDescription>Checking administrator access.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isDiagnosticsAdmin(roles)) {
    return null;
  }

  return <>{children}</>;
}
