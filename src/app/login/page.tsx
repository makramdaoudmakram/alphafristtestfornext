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

const LOGIN_PAGE_BACKGROUND =
  "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=1920&q=80";

export default async function LoginPage() {
  const configError = getAuthConfigError();
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat p-4"
      style={{ backgroundImage: `url('${LOGIN_PAGE_BACKGROUND}')` }}
    >
      <div
        className="absolute inset-0 bg-black/45"
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md space-y-4">
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
