"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarNav } from "@/components/dashboard/nav-main";
import { NavUser } from "@/components/dashboard/nav-user";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppSidebar({
  onNavigate,
  forceExpanded = false,
}: {
  onNavigate?: () => void;
  forceExpanded?: boolean;
}) {
  const { collapsed, toggleCollapsed } = useSidebar();
  const isCollapsed = forceExpanded ? false : collapsed;

  return (
    <div className="bg-card flex h-full min-h-screen flex-col border-r">
      <div className={cn("border-b", isCollapsed ? "p-2" : "p-4")}>
        <div
          className={cn(
            "flex items-center",
            isCollapsed ? "flex-col gap-2" : "gap-2"
          )}
        >
          {!forceExpanded ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={toggleCollapsed}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
              <span className="sr-only">
                {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </span>
            </Button>
          ) : null}

          <div
            className={cn(
              "flex items-center gap-2",
              isCollapsed ? "justify-center" : "min-w-0 flex-1"
            )}
          >
            <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
              A
            </div>
            {!isCollapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Alfa Dashboard</p>
                <p className="text-muted-foreground truncate text-xs">
                  RBAC Control
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <SidebarNav onNavigate={onNavigate} forceExpanded={forceExpanded} />
      </div>

      <NavUser collapsed={isCollapsed} />
    </div>
  );
}
