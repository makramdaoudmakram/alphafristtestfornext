"use client";

import { SessionProvider } from "next-auth/react";
import { PermissionProvider } from "@/components/permissions/permission-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PermissionProvider>{children}</PermissionProvider>
    </SessionProvider>
  );
}
