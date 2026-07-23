"use client";

import { getAlfaApiHint } from "@/lib/api-config";
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
  children,
}: {
  permission: string | string[];
  children: React.ReactNode;
}) {
  const { roles, permissions, loading, ready, error, refresh } =
    usePermissions();

  const allowed = Array.isArray(permission)
    ? permission.some((code) => canAccessPermission(code, roles, permissions))
    : canAccessPermission(permission, roles, permissions);

  if (loading || !ready) {
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
          {error.toLowerCase().includes("sign in") ||
          error.toLowerCase().includes("unauthorized") ||
          error.toLowerCase().includes("session") ? (
            <Button asChild>
              <a href="/login">Sign in again</a>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (!allowed) {
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

  if (loading || !ready) return null;
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
