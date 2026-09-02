import { Suspense } from "react";
import { AccessDeniedPageContent } from "@/components/auth/access-denied-page-content";
import UnauthorizedPageClient from "./unauthorized-client";

export default function UnauthorizedPage() {
  return (
    <Suspense
      fallback={
        <AccessDeniedPageContent description="Checking your access..." />
      }
    >
      <UnauthorizedPageClient />
    </Suspense>
  );
}
