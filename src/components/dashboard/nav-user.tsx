"use client";

import { signOut, useSession } from "next-auth/react";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function NavUserSkeleton({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="border-t p-2">
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-2",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="bg-muted size-8 shrink-0 rounded-lg" />
        {!collapsed ? (
          <div className="min-w-0 flex-1 space-y-1">
            <div className="bg-muted h-4 w-24 rounded" />
            <div className="bg-muted h-3 w-16 rounded" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function NavUser({ collapsed = false }: { collapsed?: boolean }) {
  const hydrated = useHydrated();
  const { data: session } = useSession();
  const { roles } = usePermissions();

  if (!hydrated) {
    return <NavUserSkeleton collapsed={collapsed} />;
  }

  const email = session?.user?.email ?? "User";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="border-t p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            title={collapsed ? email : undefined}
            className={cn(
              "h-auto w-full gap-2 py-2",
              collapsed ? "justify-center px-2" : "justify-start px-2"
            )}
          >
            <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
              {initials}
            </div>
            {!collapsed ? (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{email}</p>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {roles.slice(0, 2).map((role) => (
                      <Badge key={role} variant="secondary" className="text-[10px]">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
                <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
              </>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
