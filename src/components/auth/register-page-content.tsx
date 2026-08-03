"use client";

import { useSearchParams } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { UserPermissions } from "@/components/admin/user-permissions/user-permissions";
import { ScrollArea } from "@/components/ui/scroll-area";

export function RegisterPageContent() {
  const searchParams = useSearchParams();
  const fromUsers = searchParams.get("from") === "users";

  return (
    <main className="flex h-dvh min-h-screen flex-col bg-muted/30">
      <section className="flex h-[30dvh] min-h-[16rem] shrink-0 items-start justify-start overflow-y-auto pt-[5vh] pl-[20vw] pr-4 sm:pr-6">
        <RegisterForm />
      </section>

      {fromUsers ? (
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden px-[20vw] pr-4 pb-4 pt-2">
          <ScrollArea className="h-full min-h-0 flex-1">
            <UserPermissions className="pb-2" />
          </ScrollArea>
        </section>
      ) : (
        <section className="min-h-0 flex-1" aria-hidden="true" />
      )}
    </main>
  );
}
