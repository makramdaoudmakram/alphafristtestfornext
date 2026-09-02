"use client";

import type { ComponentType } from "react";
import {
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { InventoryAdjustmentFormMode } from "@/hooks/useInventoryAdjustment";

type InventoryAdjustmentToolbarProps = {
  mode: InventoryAdjustmentFormMode;
  saving: boolean;
  loading: boolean;
  hasRecord: boolean;
  isPosted: boolean;
  onNew: () => void;
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
};

function ToolbarButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  variant = "outline",
  loading,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "outline" | "default" | "destructive";
  loading?: boolean;
}) {
  const icon = loading ? (
    <Loader2 className="size-4 animate-spin" />
  ) : (
    <Icon className="size-4" />
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            type="button"
            size="icon"
            variant={variant}
            disabled={disabled}
            onClick={onClick}
            aria-label={label}
          >
            {icon}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Inventory adjustment document toolbar (Purchase/Return pattern). */
export function InventoryAdjustmentToolbar({
  mode,
  saving,
  loading,
  hasRecord,
  isPosted,
  onNew,
  onSave,
  onEdit,
  onDelete,
  onRefresh,
}: InventoryAdjustmentToolbarProps) {
  const canSave = mode === "new" || mode === "edit";

  return (
    <TooltipProvider>
      <div className={cn("bg-card flex flex-wrap items-center gap-1 rounded-lg border p-2")}>
        <ToolbarButton label="New" icon={Plus} onClick={onNew} disabled={saving} />
        <ToolbarButton
          label="Save"
          icon={Save}
          onClick={onSave}
          disabled={!canSave || saving || isPosted}
          variant="default"
          loading={saving}
        />
        <ToolbarButton
          label="Edit"
          icon={Pencil}
          onClick={onEdit}
          disabled={!hasRecord || mode === "edit" || saving || isPosted}
        />
        <ToolbarButton
          label="Delete"
          icon={Trash2}
          onClick={onDelete}
          disabled={!hasRecord || saving || isPosted}
          variant="destructive"
        />
        <ToolbarButton
          label="Refresh"
          icon={RefreshCw}
          onClick={onRefresh}
          disabled={loading || saving}
        />
      </div>
    </TooltipProvider>
  );
}
