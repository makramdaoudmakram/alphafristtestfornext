"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  async function handleLogout() {
    await signOut({ callbackUrl: "/login" });
    toast.success("Logged out successfully");
  }

  return (
    <Button variant="outline" onClick={handleLogout}>
      <LogOut className="size-4" />
      Logout
    </Button>
  );
}
