"use client";

import { useSearchParams } from "next/navigation";
import { AccessDeniedPageContent } from "@/components/auth/access-denied-page-content";

const PAGE_COPY: Record<
  string,
  { title: string; description: string; moduleLabel: string }
> = {
  sales: {
    title: "Sales access not authorized",
    description:
      "Your account is signed in, but it does not have permission to open the Sales page. Ask an administrator to assign the Sales.View permission or an appropriate sales role.",
    moduleLabel: "Sales Test",
  },
};

export default function UnauthorizedPageClient() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const permission = searchParams.get("permission") ?? undefined;
  const copy = PAGE_COPY[from];

  return (
    <AccessDeniedPageContent
      title={copy?.title}
      description={copy?.description}
      moduleLabel={copy?.moduleLabel}
      permissionCode={permission}
    />
  );
}
