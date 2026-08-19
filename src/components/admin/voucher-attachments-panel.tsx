"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Eye, FileText, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  deleteVoucherAttachment,
  downloadVoucherAttachmentBlob,
  getVoucherAttachments,
  uploadVoucherAttachment,
} from "@/lib/api-client";
import type {
  VoucherAttachmentItem,
  VoucherAttachmentType,
} from "@/types/voucher-attachment";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const MAX_MB = 10;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function FileIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) {
    return <FileText className="h-4 w-4 shrink-0 text-red-700" />;
  }
  return <ImageIcon className="h-4 w-4 shrink-0 text-blue-800" />;
}

type Props = {
  voucherType: VoucherAttachmentType;
  /** Parent voucher ReceiptNO — null while creating a new unsaved voucher. */
  voucherId: number | null;
  voucherRef?: string | null;
  disabled?: boolean;
  /**
   * `embedded` — compact block inside Cash Details (no outer card).
   * `card` — standalone card (e.g. Payment host page).
   */
  variant?: "embedded" | "card";
  className?: string;
  /** Allow selecting more than one file at a time. */
  multiple?: boolean;
  saveFirstMessage?: string;
};

export function VoucherAttachmentsPanel({
  voucherType,
  voucherId,
  disabled,
  variant = "embedded",
  className,
  multiple = false,
  saveFirstMessage = "Save the voucher first to attach documents.",
}: Props) {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [items, setItems] = useState<VoucherAttachmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const canUpload = voucherId != null && voucherId > 0 && !disabled;
  const compact = variant === "embedded";

  const reload = useCallback(async () => {
    if (!token || voucherId == null || voucherId <= 0) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      setItems(await getVoucherAttachments(voucherType, voucherId, token));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, voucherId, voucherType]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onPick = (files: FileList | null) => {
    if (!files?.length) {
      setSelected([]);
      return;
    }

    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.includes(".")
        ? `.${file.name.split(".").pop()!.toLowerCase()}`
        : "";
      if (![".pdf", ".jpg", ".jpeg", ".png"].includes(ext)) {
        toast.error(`${file.name}: only PDF, JPG, JPEG, and PNG files are allowed.`);
        continue;
      }
      if (file.size <= 0) {
        toast.error(`${file.name}: file is empty.`);
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        toast.error(`${file.name}: exceeds the maximum size of ${MAX_MB} MB.`);
        continue;
      }
      accepted.push(file);
    }

    setSelected(accepted);
    if (accepted.length === 0 && inputRef.current) inputRef.current.value = "";
  };

  const onUpload = async () => {
    if (!token || selected.length === 0 || voucherId == null) return;
    setUploading(true);
    try {
      for (const file of selected) {
        await uploadVoucherAttachment(voucherType, voucherId, file, token);
      }
      toast.success(
        selected.length === 1
          ? `Uploaded ${selected[0].name}`
          : `Uploaded ${selected.length} documents`
      );
      setSelected([]);
      if (inputRef.current) inputRef.current.value = "";
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      await reload();
    } finally {
      setUploading(false);
    }
  };

  const openBlob = async (id: number, asDownload: boolean) => {
    if (!token) return;
    try {
      const { blob, fileName, contentType } = await downloadVoucherAttachmentBlob(
        id,
        token
      );
      const url = URL.createObjectURL(blob);
      if (asDownload) {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
      } else if (contentType.startsWith("image/") || contentType === "application/pdf") {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const onDelete = async (row: VoucherAttachmentItem) => {
    if (!token) return;
    if (!window.confirm(`Delete attachment "${row.originalFileName}"?`)) return;
    try {
      await deleteVoucherAttachment(row.id, token);
      toast.success("Attachment deleted.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const body = (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        compact ? "gap-2" : "gap-4",
        className
      )}
    >
      <div className={cn("shrink-0", compact && "border-t border-slate-200 pt-3")}>
        {compact ? (
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-base font-semibold text-slate-800">
              Attachments
              {loading ? (
                <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-slate-500" />
              ) : null}
            </span>
          </div>
        ) : loading ? (
          <div className="mb-2">
            <Loader2 className="inline h-4 w-4 animate-spin text-slate-500" />
          </div>
        ) : null}

        {!canUpload ? (
          <p
            className={cn(
              "rounded-md border border-dashed border-amber-300 bg-amber-50 text-amber-950",
              compact ? "px-2.5 py-2 text-sm" : "px-4 py-3 text-base"
            )}
          >
            {saveFirstMessage}
          </p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple={multiple}
              className={cn(
                "min-w-0 flex-1 cursor-pointer file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:font-semibold",
                compact
                  ? "h-10 text-sm file:text-xs"
                  : "h-12 text-base file:text-sm file:px-3 file:py-2"
              )}
              disabled={uploading}
              onChange={(e) => onPick(e.target.files)}
            />
            <Button
              type="button"
              className={cn(
                "shrink-0 bg-blue-800 font-semibold hover:bg-blue-900",
                compact ? "h-10 text-base" : "h-12 text-lg"
              )}
              disabled={selected.length === 0 || uploading}
              onClick={() => void onUpload()}
            >
              {uploading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-4 w-4" />
              )}
              Upload
            </Button>
          </div>
        )}
        {selected.length > 0 ? (
          <p className="mt-1 truncate text-sm text-slate-700">
            {selected.length === 1
              ? `${selected[0].name} · ${formatSize(selected[0].size)}`
              : `${selected.length} files selected · ${formatSize(
                  selected.reduce((sum, file) => sum + file.size, 0)
                )}`}
          </p>
        ) : canUpload ? (
          <p className="mt-1 text-sm text-slate-500">
            PDF, JPG, PNG · max {MAX_MB} MB
            {multiple ? " · multiple files allowed" : ""}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-200 bg-white",
          compact ? "max-h-[220px] xl:max-h-none" : "max-h-[280px]"
        )}
      >
        {items.length === 0 && !loading ? (
          <p className="px-3 py-4 text-center text-sm text-slate-500">
            No documents attached.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-2 px-2.5 py-1.5 text-sm"
              >
                <FileIcon name={row.originalFileName} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-900">
                    {row.originalFileName}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {row.fileExtension.replace(".", "").toUpperCase() || "FILE"} ·{" "}
                    {formatSize(row.fileSize)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-700"
                    title="View"
                    onClick={() => void openBlob(row.id, false)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-700 hover:bg-red-50"
                    title="Delete"
                    disabled={disabled}
                    onClick={() => void onDelete(row)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  if (variant === "card") {
    return (
      <Card className={cn("mb-4 gap-0 border-slate-300 py-0 shadow-sm", className)}>
        <CardHeader className="border-b border-slate-200 px-5 py-3.5">
          <CardTitle className="text-lg font-bold text-slate-950">Attachments</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-4">{body}</CardContent>
      </Card>
    );
  }

  return body;
}
