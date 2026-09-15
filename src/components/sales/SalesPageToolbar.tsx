"use client";

import type { ReactNode } from "react";
import { MessageSquare, PackageX, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SalesPageToolbarProps = {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  disabled?: boolean;
  onCustomer: () => void;
  onMissingSalesItem: () => void;
  onNew: () => void;
};

type ToolbarAction = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  className?: string;
  variant?: "default" | "destructive" | "outline";
};

function ToolbarButton({
  action,
  expanded,
  disabled,
}: {
  action: ToolbarAction;
  expanded: boolean;
  disabled?: boolean;
}) {
  const button = (
    <Button
      type="button"
      size={expanded ? "sm" : "icon"}
      variant={action.variant ?? "default"}
      disabled={disabled}
      aria-label={action.label}
      onClick={action.onClick}
      className={cn(
        "w-full justify-start gap-2 overflow-hidden",
        !expanded && "size-9 justify-center px-0",
        action.className
      )}
    >
      {action.icon}
      <span
        className={cn(
          "truncate whitespace-nowrap transition-opacity duration-150",
          expanded ? "opacity-100" : "sr-only opacity-0"
        )}
      >
        {action.label}
      </span>
    </Button>
  );

  if (expanded) {
    return <div className="w-full">{button}</div>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="left">{action.label}</TooltipContent>
    </Tooltip>
  );
}

export function SalesPageToolbar({
  expanded,
  onExpandedChange,
  disabled = false,
  onCustomer,
  onMissingSalesItem,
  onNew,
}: SalesPageToolbarProps) {
  const actions: ToolbarAction[] = [
    {
      key: "customer",
      label: "Customer",
      icon: <UserPlus className="size-4 shrink-0" />,
      onClick: onCustomer,
      className: "bg-orange-600 text-white shadow-sm hover:bg-orange-600/90",
    },
    {
      key: "missing",
      label: "Missing Sales Item",
      icon: <PackageX className="size-4 shrink-0" />,
      onClick: onMissingSalesItem,
      variant: "destructive",
    },
    {
      key: "new",
      label: "New",
      icon: <Plus className="size-4 shrink-0" />,
      onClick: onNew,
    },
  ];

  const messageAction: ToolbarAction = {
    key: "message",
    label: "Message",
    icon: <MessageSquare className="size-4 shrink-0" />,
    onClick: () => toast.message("under construct"),
    variant: "outline",
  };

  return (
    <aside
      aria-label="Sales actions"
      onMouseEnter={() => onExpandedChange(true)}
      onMouseLeave={() => onExpandedChange(false)}
      className={cn(
        "border-border bg-background sticky top-0 flex shrink-0 flex-col gap-1 self-stretch border-l py-2 pl-1.5 pr-1.5 transition-[width] duration-200 ease-out",
        expanded ? "w-[13.5rem]" : "w-11"
      )}
    >
      <TooltipProvider delayDuration={200}>
        <ToolbarButton
          action={messageAction}
          expanded={expanded}
          disabled={disabled}
        />

        {actions.map((action) => (
          <ToolbarButton
            key={action.key}
            action={action}
            expanded={expanded}
            disabled={disabled}
          />
        ))}
      </TooltipProvider>
    </aside>
  );
}
