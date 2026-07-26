"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { PermissionProvider } from "@/components/permissions/permission-provider";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      <PermissionProvider>{children}</PermissionProvider>
    </SessionProvider>
  );
}
