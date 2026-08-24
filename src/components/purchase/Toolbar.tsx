"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PurchaseFormMode } from "@/hooks/usePurchase";

type ToolbarProps = {
  mode: PurchaseFormMode;
  saving: boolean;
  loading: boolean;
  hasRecord: boolean;
  nav: { atFirst: boolean; atLast: boolean; hasRecords: boolean };
  onNew: () => void;
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onRefresh: () => void;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onSearch: () => void;
  onCreateExcelTemplate: () => void;
  excelTemplateDisabled?: boolean;
  excelTemplateLoading?: boolean;
  excelImportHref: string;
};

function ToolbarButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  variant = "outline",
  href,
  className,
  loading,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "outline" | "default" | "destructive";
  href?: string;
  className?: string;
  loading?: boolean;
}) {
  const icon = loading ? (
    <Loader2 className="size-4 animate-spin" />
  ) : (
    <Icon className="size-4" />
  );

  const button = href ? (
    <Button
      asChild
      size="icon"
      variant={variant}
      className={className}
      aria-label={label}
    >
      <Link href={href}>{icon}</Link>
    </Button>
  ) : (
    <Button
      type="button"
      size="icon"
      variant={variant}
      disabled={disabled}
      onClick={onClick}
      className={className}
      aria-label={label}
    >
      {icon}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {disabled && !href ? (
          <span className="inline-flex">{button}</span>
        ) : (
          button
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** ERP document toolbar */
export function Toolbar({
  mode,
  saving,
  loading,
  hasRecord,
  nav,
  onNew,
  onSave,
  onEdit,
  onDelete,
  onPrint,
  onRefresh,
  onFirst,
  onPrev,
  onNext,
  onLast,
  onSearch,
  onCreateExcelTemplate,
  excelTemplateDisabled,
  excelTemplateLoading,
  excelImportHref,
}: ToolbarProps) {
  const canSave = mode === "new" || mode === "edit";

  return (
    <TooltipProvider>
      <div className="bg-card flex flex-wrap items-center gap-1 rounded-lg border p-2">
        <ToolbarButton label="New" icon={Plus} onClick={onNew} disabled={saving} />
        <ToolbarButton
          label="Save"
          icon={Save}
          onClick={onSave}
          disabled={!canSave || saving}
          variant="default"
        />
        <ToolbarButton
          label="Edit"
          icon={Pencil}
          onClick={onEdit}
          disabled={!hasRecord || mode === "edit" || saving}
        />
        <ToolbarButton
          label="Delete"
          icon={Trash2}
          onClick={onDelete}
          disabled={!hasRecord || saving}
          variant="destructive"
        />
        <ToolbarButton label="Print" icon={Printer} onClick={onPrint} disabled={!hasRecord} />
        <ToolbarButton
          label="Refresh"
          icon={RefreshCw}
          onClick={onRefresh}
          disabled={loading || saving}
        />

        <span className="bg-border mx-1 hidden h-6 w-px sm:inline" aria-hidden />

        <ToolbarButton
          label="First"
          icon={ChevronFirst}
          onClick={onFirst}
          disabled={!nav.hasRecords || nav.atFirst || loading}
        />
        <ToolbarButton
          label="Previous"
          icon={ChevronLeft}
          onClick={onPrev}
          disabled={!nav.hasRecords || nav.atFirst || loading}
        />
        <ToolbarButton
          label="Next"
          icon={ChevronRight}
          onClick={onNext}
          disabled={!nav.hasRecords || nav.atLast || loading}
        />
        <ToolbarButton
          label="Last"
          icon={ChevronLast}
          onClick={onLast}
          disabled={!nav.hasRecords || nav.atLast || loading}
        />

        <span className="bg-border mx-1 hidden h-6 w-px sm:inline" aria-hidden />

        <ToolbarButton label="Search" icon={Search} onClick={onSearch} />

        <div className="ml-auto flex items-center gap-1">
          <ToolbarButton
            label="Create template"
            icon={FileSpreadsheet}
            onClick={onCreateExcelTemplate}
            disabled={excelTemplateDisabled}
            loading={excelTemplateLoading}
            className={cn(
              "border-transparent bg-emerald-600 text-white shadow-sm",
              "hover:bg-emerald-700 hover:text-white",
              "focus-visible:ring-emerald-600/40"
            )}
          />
          <ToolbarButton
            label="Import Excel"
            icon={Upload}
            href={excelImportHref}
            className={cn(
              "border-transparent bg-sky-600 text-white shadow-sm",
              "hover:bg-sky-700 hover:text-white",
              "focus-visible:ring-sky-600/40"
            )}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
