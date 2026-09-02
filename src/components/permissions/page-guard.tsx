"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { getAlfaApiHint } from "@/lib/api-config";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePermissions, canAccessPermission } from "./permission-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PageGuard({
  permission,
  redirectTo,
  children,
}: {
  permission: string | string[] | null;
  redirectTo?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { roles, permissions, loading, ready, error, refresh } =
    usePermissions();
  const hydrated = useHydrated();
  const signingOutRef = useRef(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!error) return;
    const lower = error.toLowerCase();
    const isSessionError =
      lower.includes("session") ||
      lower.includes("sign in") ||
      lower.includes("unauthorized");
    if (!isSessionError || signingOutRef.current) return;
    signingOutRef.current = true;
    void signOut({ callbackUrl: "/login" });
  }, [error]);

  const allowed =
    permission === null
      ? true
      : Array.isArray(permission)
        ? permission.some((code) =>
            canAccessPermission(code, roles, permissions)
          )
        : canAccessPermission(permission, roles, permissions);

  useEffect(() => {
    if (!redirectTo || redirectedRef.current) return;
    if (!hydrated || loading || !ready || error) return;
    if (allowed) return;

    redirectedRef.current = true;
    router.replace(redirectTo);
  }, [allowed, error, hydrated, loading, ready, redirectTo, router]);

  if (!hydrated || loading || !ready) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading permissions...</CardTitle>
          <CardDescription>Checking your access level.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    const isSessionError =
      error.toLowerCase().includes("session") ||
      error.toLowerCase().includes("sign in") ||
      error.toLowerCase().includes("unauthorized");

    if (isSessionError) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Session expired</CardTitle>
            <CardDescription>Redirecting to sign in…</CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not verify access</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Make sure the Alfa API is running at{" "}
            <code className="text-xs">{getAlfaApiHint()}</code>, then try
            again.
          </p>
          <Button type="button" variant="outline" onClick={() => void refresh()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!allowed) {
    if (redirectTo) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Redirecting...</CardTitle>
            <CardDescription>
              You do not have permission to view this page.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>
            You need the{" "}
            <code className="text-xs">
              {Array.isArray(permission) ? permission.join(" or ") : permission}
            </code>{" "}
            permission or the Admin role. Ask an administrator to assign the
            Admin role to your account, then restart the Alfa API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Your roles: {roles.length ? roles.join(", ") : "none assigned"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

export function ActionGuard({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission, loading, ready } = usePermissions();
  const hydrated = useHydrated();

  if (!hydrated || loading || !ready) return null;
  if (!hasPermission(permission)) return <>{fallback}</>;
  return <>{children}</>;
}

export function AdminBadge() {
  const { hasRole } = usePermissions();
  if (!hasRole("Admin")) return null;

  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      Admin
    </span>
  );
}
