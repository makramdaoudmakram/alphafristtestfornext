"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type AccessDeniedPageContentProps = {
  title?: string;
  description?: string;
  moduleLabel?: string;
  permissionCode?: string;
};

export function AccessDeniedPageContent({
  title = "Access not authorized",
  description = "You are signed in, but your account does not have permission to open this page. Contact your administrator if you believe this is a mistake.",
  moduleLabel,
  permissionCode,
}: AccessDeniedPageContentProps) {
  return (
    <main className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-gradient-to-br p-4 md:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-lg md:grid-cols-2">
        <div className="relative hidden min-h-[320px] bg-muted/40 md:block">
          <Image
            src="/illustrations/access-denied.png"
            alt="Access not authorized illustration"
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="from-card/10 to-card/60 absolute inset-0 bg-gradient-to-t" />
        </div>

        <div className="flex flex-col justify-center gap-6 p-8 md:p-10">
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 text-destructive flex size-11 items-center justify-center rounded-full">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
                403 Forbidden
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            </div>
          </div>

          <p className="text-muted-foreground leading-relaxed">{description}</p>

          {(moduleLabel || permissionCode) && (
            <div className="bg-muted/50 space-y-2 rounded-lg border p-4 text-sm">
              {moduleLabel ? (
                <p>
                  <span className="text-muted-foreground">Page: </span>
                  <span className="font-medium">{moduleLabel}</span>
                </p>
              ) : null}
              {permissionCode ? (
                <p>
                  <span className="text-muted-foreground">Required permission: </span>
                  <code className="bg-background rounded px-1.5 py-0.5 text-xs">
                    {permissionCode}
                  </code>
                </p>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 size-4" />
                Back to dashboard
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Sign in with another account</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
