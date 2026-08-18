"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronsUpDown, Check } from "lucide-react";
import { getCostCentersForComp } from "@/lib/api-client";
import type { CostCenterCompoItem } from "@/types/cost-center";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  mode: "all" | "selected";
  selectedCodes: string[];
  onModeChange: (mode: "all" | "selected") => void;
  onSelectedCodesChange: (codes: string[]) => void;
  disabled?: boolean;
};

export function CostCenterMultiFilter({
  mode,
  selectedCodes,
  onModeChange,
  onSelectedCodesChange,
  disabled,
}: Props) {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const [items, setItems] = useState<CostCenterCompoItem[]>([]);

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }
    try {
      setItems(await getCostCentersForComp(token));
    } catch {
      setItems([]);
    }
  }, [token]);

  useEffect(() => {
    if (status === "loading") return;
    void load();
  }, [status, load]);

  const label = useMemo(() => {
    if (mode === "all") return "All Cost Centers";
    if (selectedCodes.length === 0) return "Select cost centers…";
    if (selectedCodes.length === 1) {
      const item = items.find((i) => i.code === selectedCodes[0]);
      return item ? `${item.code} — ${item.name}` : selectedCodes[0];
    }
    return `${selectedCodes.length} cost centers selected`;
  }, [mode, selectedCodes, items]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={mode === "all" ? "default" : "outline"}
        size="sm"
        disabled={disabled}
        onClick={() => {
          onModeChange("all");
          onSelectedCodesChange([]);
        }}
      >
        All
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant={mode === "selected" ? "default" : "outline"}
            size="sm"
            className="min-w-[220px] justify-between"
            disabled={disabled || status === "loading"}
          >
            <span className="truncate">{label}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-72 w-72 overflow-y-auto">
          {items
            .filter((item): item is CostCenterCompoItem & { code: string } =>
              !!item.code?.trim()
            )
            .map((item) => {
            const checked = selectedCodes.includes(item.code);
            return (
              <DropdownMenuItem
                key={item.code}
                onSelect={(e) => {
                  e.preventDefault();
                  onModeChange("selected");
                  if (checked) {
                    const next = selectedCodes.filter((c) => c !== item.code);
                    onSelectedCodesChange(next);
                    if (next.length === 0) onModeChange("all");
                  } else {
                    onSelectedCodesChange([...selectedCodes, item.code]);
                  }
                }}
              >
                <Check className={cn("size-4", !checked && "opacity-0")} />
                {item.code} — {item.name}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
