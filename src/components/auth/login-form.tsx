"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { loginWithAlfaApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signOut({ redirect: false });

      const apiResult = await loginWithAlfaApi(email.trim(), password);

      if (!apiResult.isSuccess || !apiResult.token || !apiResult.userId) {
        toast.error(apiResult.message || "Invalid email or password");
        return;
      }

      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        accessToken: apiResult.token,
        userId: apiResult.userId,
        redirect: false,
      });

      if (result?.error) {
        toast.error(`Login failed: ${result.error}`);
        return;
      }

      if (!result?.ok) {
        toast.error("Session could not be created. Try again.");
        return;
      }

      toast.success("Welcome back!");
      window.location.href = "/dashboard";
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>
          Sign in with your Alfa API account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            Connected to your Alfa API (aghapany_AlphaAPI)
          </p>
          <p className="text-muted-foreground text-center text-sm">
            No account?{" "}
            <Link href="/register" className="text-foreground underline">
              Register
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
