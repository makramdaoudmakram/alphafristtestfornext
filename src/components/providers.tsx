"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { UnitOfflineBootstrap } from "@/components/offline/unit-offline-bootstrap";
import { OfflineProvider } from "@/components/providers/offline-provider";
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
      <OfflineProvider autoSync>
        <UnitOfflineBootstrap />
        <PermissionProvider>{children}</PermissionProvider>
      </OfflineProvider>
    </SessionProvider>
  );
}
