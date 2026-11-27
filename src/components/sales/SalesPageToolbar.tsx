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

const TOOLBAR_RAIL_WIDTH = "2.75rem";

/** Fixed 36×36px — overrides global Button transition-all / size variants for this rail only. */
const SALES_ACTION_BTN_DIM =
  "box-border !size-9 !min-h-9 !min-w-9 !max-h-9 !max-w-9 shrink-0 justify-center gap-0 !p-0 !transition-colors hover:!scale-100 active:!scale-100";

type SalesPageToolbarProps = {
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
  disabled,
}: {
  action: ToolbarAction;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant={action.variant ?? "default"}
          disabled={disabled}
          aria-label={action.label}
          onClick={action.onClick}
          className={cn(SALES_ACTION_BTN_DIM, action.className)}
        >
          {action.icon}
          <span className="sr-only">{action.label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{action.label}</TooltipContent>
    </Tooltip>
  );
}

export function SalesPageToolbar({
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
      className="border-border bg-background sticky top-0 z-20 shrink-0 self-start border-l py-2 pl-1.5 pr-1.5"
      style={{
        width: TOOLBAR_RAIL_WIDTH,
        minWidth: TOOLBAR_RAIL_WIDTH,
        maxWidth: TOOLBAR_RAIL_WIDTH,
      }}
    >
      <TooltipProvider delayDuration={200}>
        <div className="flex flex-col gap-1">
          <ToolbarButton action={messageAction} disabled={disabled} />
          {actions.map((action) => (
            <ToolbarButton key={action.key} action={action} disabled={disabled} />
          ))}
        </div>
      </TooltipProvider>
    </aside>
  );
}