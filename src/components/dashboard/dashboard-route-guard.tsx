"use client";

import { usePathname } from "next/navigation";
import { PageGuard } from "@/components/permissions/page-guard";
import { getRoutePermissionForPath } from "@/lib/route-permissions";
import { resolvePageKeyFromPathname } from "@/lib/pharmacy-page-access";

/**
 * Shell-level guard so direct URL navigation is blocked even when a page omits PageGuard.
 */
export function DashboardRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageKey = resolvePageKeyFromPathname(pathname);
  const permission = getRoutePermissionForPath(pathname);

  return (
    <PageGuard permission={permission} pageKey={pageKey}>
      {children}
    </PageGuard>
  );
}
