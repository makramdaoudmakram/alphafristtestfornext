"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  Barcode,
  BookOpen,
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
  posting: boolean;
  loading: boolean;
  hasRecord: boolean;
  isPosted: boolean;
  isPostButtonVisible: boolean;
  isReverseButtonVisible?: boolean;
  isTransferButtonVisible: boolean;
  isBarcodeButtonVisible: boolean;
  barcodeLoading?: boolean;
  reversing?: boolean;
  nav: { atFirst: boolean; atLast: boolean; hasRecords: boolean };
  onNew: () => void;
  onSave: () => void;
  onPost: () => void;
  onReverse?: () => void;
  onTransfer: () => void;
  onPrintBarcode: () => void;
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

function ToolbarTextButton({
  label,
  onClick,
  disabled,
  className,
  loading,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

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
  posting,
  loading,
  hasRecord,
  isPosted,
  isPostButtonVisible,
  isReverseButtonVisible = false,
  isTransferButtonVisible,
  isBarcodeButtonVisible,
  barcodeLoading,
  reversing,
  nav,
  onNew,
  onSave,
  onPost,
  onReverse,
  onTransfer,
  onPrintBarcode,
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
          disabled={!canSave || saving || isPosted}
          variant="default"
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
          disabled={!hasRecord || saving || posting || isPosted}
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
          {isTransferButtonVisible ? (
            <ToolbarTextButton
              label="Transfer"
              onClick={onTransfer}
              disabled={saving || posting || loading}
              className={cn(
                "border-transparent bg-violet-600 text-white shadow-sm",
                "hover:bg-violet-700 hover:text-white",
                "focus-visible:ring-violet-600/40",
                "disabled:opacity-50"
              )}
            />
          ) : null}
          {isReverseButtonVisible ? (
            <ToolbarTextButton
              label="Reverse"
              onClick={() => onReverse?.()}
              disabled={saving || posting || loading || reversing}
              loading={reversing}
              className={cn(
                "border-transparent bg-orange-600 text-white shadow-sm",
                "hover:bg-orange-700 hover:text-white",
                "focus-visible:ring-orange-600/40",
                "disabled:opacity-50"
              )}
            />
          ) : null}
          {isPostButtonVisible ? (
            <ToolbarButton
              label="Post"
              icon={BookOpen}
              onClick={onPost}
              disabled={mode !== "view" || saving || posting || loading}
              loading={posting}
              className={cn(
                "border-transparent bg-yellow-500 text-yellow-950 shadow-sm",
                "hover:bg-yellow-600 hover:text-yellow-950",
                "focus-visible:ring-yellow-500/40",
                "disabled:opacity-50"
              )}
            />
          ) : null}
          {isBarcodeButtonVisible ? (
            <ToolbarButton
              label="Print Barcode"
              icon={Barcode}
              onClick={onPrintBarcode}
              disabled={saving || posting || loading || barcodeLoading}
              loading={barcodeLoading}
            />
          ) : null}
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
