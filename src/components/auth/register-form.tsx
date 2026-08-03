"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { registerWithAlfaApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function InlineField({
  id,
  label,
  type = "text",
  value,
  onChange,
  disabled,
  minLength,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minLength?: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Label htmlFor={id} className="shrink-0 text-sm">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        disabled={disabled}
        minLength={minLength}
        className="h-9 min-w-[8rem] flex-1"
      />
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await registerWithAlfaApi({
        email: email.trim(),
        password,
        userName: name.trim() || undefined,
      });

      if (!result.isSuccess || !result.token || !result.userId) {
        toast.error(result.message || "Registration failed");
        return;
      }

      const login = await signIn("credentials", {
        email: email.trim(),
        password,
        accessToken: result.token,
        userId: result.userId,
        redirect: false,
      });

      if (login?.error) {
        toast.success("Account created. Please sign in.");
        router.push("/login");
        return;
      }

      toast.success("Account created!");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Registration failed"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-[80%] max-w-5xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Create account</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap items-end gap-x-4 gap-y-3"
        >
          <InlineField
            id="name"
            label="Name"
            value={name}
            onChange={setName}
            disabled={isLoading}
          />
          <InlineField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            disabled={isLoading}
          />
          <InlineField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            disabled={isLoading}
            minLength={8}
          />
          <Button type="submit" className="h-9 shrink-0" disabled={isLoading}>
            {isLoading ? "Creating..." : "Register"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
