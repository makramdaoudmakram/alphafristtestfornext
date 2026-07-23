import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/session";
import { getAuthConfigError } from "@/lib/env";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage() {
  const configError = getAuthConfigError();
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-4">
        {configError ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Configuration error</CardTitle>
              <CardDescription>{configError}</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              On Vercel, set{" "}
              <code className="text-xs">NEXTAUTH_SECRET</code> (32+ chars) and
              redeploy. Preview URLs are detected automatically from{" "}
              <code className="text-xs">VERCEL_URL</code>.
            </CardContent>
          </Card>
        ) : null}
        <LoginForm />
      </div>
    </main>
  );
}
