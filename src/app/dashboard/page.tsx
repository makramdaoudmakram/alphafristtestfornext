"use client";

import { usePermissions } from "@/components/permissions/permission-provider";
import { AdminBadge } from "@/components/permissions/page-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NAV_LINKS, PERMISSIONS } from "@/lib/route-permissions";

export default function DashboardPage() {
  const { permissions, roles, loading, error, refresh, hasPermission } =
    usePermissions();

  return (
    <div className="space-y-6">
      {error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">
              Could not load permissions
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              This usually means the Alfa API is stopped, the database migration
              is missing, or <code className="text-xs">ALFA_API_URL</code> in{" "}
              <code className="text-xs">.env.local</code> does not match your
              API port (https profile: 7211, http profile: 5258).
            </p>
            <Button type="button" variant="outline" onClick={() => void refresh()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Overview</h2>
          <AdminBadge />
        </div>
        <p className="text-muted-foreground text-sm">
          Your roles and permissions from the Alfa API (aghapany_AlphaAPI).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your roles</CardTitle>
            <CardDescription>App roles assigned to your account</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : roles.length === 0 ? (
              <p className="text-muted-foreground text-sm">No roles assigned</p>
            ) : (
              roles.map((role) => (
                <Badge
                  key={role}
                  variant={role === "Admin" ? "default" : "secondary"}
                >
                  {role}
                </Badge>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your permissions</CardTitle>
            <CardDescription>From GET /api/Permissions/me</CardDescription>
          </CardHeader>
          <CardContent className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : permissions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No permissions</p>
            ) : (
              permissions.map((permission) => (
                <Badge key={permission} variant="outline">
                  {permission}
                </Badge>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pages you can access</CardTitle>
          <CardDescription>
            Navigation links appear based on your permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {NAV_LINKS.map((link) => {
            const canAccess =
              !link.permission || hasPermission(link.permission);
            return (
              <div
                key={link.href}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{link.label}</span>
                <Badge variant={canAccess ? "default" : "secondary"}>
                  {canAccess ? "Allowed" : "Denied"}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {hasPermission(PERMISSIONS.permissions.manage) && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle>Administrator</CardTitle>
            <CardDescription>
              You have Permissions.Manage — open Role Permissions to control
              what each role can do.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
