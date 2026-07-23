"use client";

import { useSession } from "next-auth/react";
import { LogoutButton } from "@/components/auth/logout-button";
import { AdminBadge } from "@/components/permissions/page-guard";
import { usePermissions } from "@/components/permissions/permission-provider";
import { Badge } from "@/components/ui/badge";

export function DashboardHeader() {
  const { data: session } = useSession();
  const { roles } = usePermissions();

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Alfa Dashboard</h1>
          <AdminBadge />
        </div>
        <p className="text-muted-foreground text-sm">
          {session?.user?.email ?? "User"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {roles.map((role) => (
          <Badge
            key={role}
            variant={role === "Admin" ? "default" : "secondary"}
          >
            {role}
          </Badge>
        ))}
        <LogoutButton />
      </div>
    </header>
  );
}
