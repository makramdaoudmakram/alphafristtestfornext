"use client";

import type { ReactNode } from "react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ResizeHandleProps } from "@/hooks/use-grid-preferences";

type ResizableTableHeadProps = {
  columnId: string;
  width: number;
  resizeHandleProps: ResizeHandleProps;
  children: ReactNode;
  className?: string;
};

export function ResizableTableHead({
  columnId,
  width,
  resizeHandleProps,
  children,
  className,
}: ResizableTableHeadProps) {
  return (
    <TableHead
      data-grid-col={columnId}
      style={{
        width,
        minWidth: width,
        maxWidth: width,
      }}
      className={cn("relative select-none overflow-hidden", className)}
    >
      <span className="block truncate pr-2">{children}</span>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${columnId} column`}
        title="Drag to resize column"
        className={cn(
          "absolute top-0 right-0 z-10 h-full w-2 translate-x-1/2 cursor-col-resize touch-none",
          "hover:bg-orange-400/30 active:bg-orange-400/50"
        )}
        onMouseDown={resizeHandleProps.onMouseDown}
        onDoubleClick={resizeHandleProps.onDoubleClick}
      />
    </TableHead>
  );
}
