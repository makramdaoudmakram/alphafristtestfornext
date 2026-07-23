"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/components/permissions/permission-provider";
import { NAV_LINKS } from "@/lib/route-permissions";
import { cn } from "@/lib/utils";

export function DashboardNav() {
  const pathname = usePathname();
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <nav className="border-b px-6 py-3">
        <p className="text-muted-foreground text-sm">Loading menu...</p>
      </nav>
    );
  }

  return (
    <nav className="flex flex-wrap gap-2 border-b px-6 py-3">
      {NAV_LINKS.map((link) => {
        if (link.permission && !hasPermission(link.permission)) {
          return null;
        }

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              pathname === link.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
