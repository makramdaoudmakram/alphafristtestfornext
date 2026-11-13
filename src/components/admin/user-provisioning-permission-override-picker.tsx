"use client";

import { useCallback, useMemo, useState } from "react";
import type { UserProvisioningWizardPermissionOption } from "@/types/user-provisioning";
import { formatPermissionModuleHeading } from "@/lib/permission-module-labels";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type PermissionOverrideRow = {
  permissionId: number;
  isAllowed: boolean;
};

type UserProvisioningPermissionOverridePickerProps = {
  permissions: UserProvisioningWizardPermissionOption[];
  overrides: PermissionOverrideRow[];
  onChange: (overrides: PermissionOverrideRow[]) => void;
  disabled?: boolean;
};

function groupByModule(permissions: UserProvisioningWizardPermissionOption[]) {
  return permissions.reduce<Record<string, UserProvisioningWizardPermissionOption[]>>(
    (acc, item) => {
      const key = item.moduleCode?.trim() || "Other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {}
  );
}

function permissionDisplayName(p: UserProvisioningWizardPermissionOption): string {
  const name = p.permissionName?.trim();
  if (name) return name;
  return p.permissionCode;
}

function permissionExplanation(p: UserProvisioningWizardPermissionOption): string | null {
  const description = p.permissionDescription?.trim();
  if (description) return description;
  const type = p.permissionType?.trim();
  if (type) return `${type} permission`;
  return null;
}

export function UserProvisioningPermissionOverridePicker({
  permissions,
  overrides,
  onChange,
  disabled = false,
}: UserProvisioningPermissionOverridePickerProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const overrideById = useMemo(() => {
    const map = new Map<number, PermissionOverrideRow>();
    for (const row of overrides) map.set(row.permissionId, row);
    return map;
  }, [overrides]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return permissions;
    return permissions.filter((p) => {
      const name = permissionDisplayName(p).toLowerCase();
      return (
        p.permissionCode.toLowerCase().includes(term) ||
        name.includes(term) ||
        (p.permissionDescription?.toLowerCase().includes(term) ?? false) ||
        p.moduleCode.toLowerCase().includes(term) ||
        (formatPermissionModuleHeading(p.moduleCode).toLowerCase().includes(term))
      );
    });
  }, [permissions, search]);

  const groups = useMemo(() => groupByModule(filtered), [filtered]);

  const selectedCount = overrides.length;

  const setOverride = useCallback(
    (permissionId: number, patch: Partial<PermissionOverrideRow> | null) => {
      if (patch === null) {
        onChange(overrides.filter((o) => o.permissionId !== permissionId));
        return;
      }
      const existing = overrideById.get(permissionId);
      if (!existing) {
        onChange([
          ...overrides,
          { permissionId, isAllowed: patch.isAllowed ?? true },
        ]);
        return;
      }
      onChange(
        overrides.map((o) =>
          o.permissionId === permissionId ? { ...o, ...patch } : o
        )
      );
    },
    [onChange, overrideById, overrides]
  );

  const toggleCategory = (moduleCode: string, select: boolean) => {
    const items = groups[moduleCode] ?? [];
    const ids = new Set(items.map((p) => p.permissionId));
    if (!select) {
      onChange(overrides.filter((o) => !ids.has(o.permissionId)));
      return;
    }
    const next = new Map(overrides.map((o) => [o.permissionId, o]));
    for (const p of items) {
      if (!next.has(p.permissionId)) {
        next.set(p.permissionId, { permissionId: p.permissionId, isAllowed: true });
      }
    }
    onChange(Array.from(next.values()));
  };

  const isCategoryFullySelected = (moduleCode: string) => {
    const items = groups[moduleCode] ?? [];
    if (items.length === 0) return false;
    return items.every((p) => overrideById.has(p.permissionId));
  };

  const isExpanded = (moduleCode: string) => expanded[moduleCode] !== false;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label className="text-base">Permission overrides (optional)</Label>
          <p className="text-muted-foreground text-xs">
            Grantable permissions only — backend validates grant authority on save.
          </p>
          <p className="mt-1 text-sm font-medium">
            {selectedCount} selected override{selectedCount === 1 ? "" : "s"}
          </p>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, code, module…"
          className="h-9 max-w-sm"
          disabled={disabled}
          dir="auto"
        />
      </div>

      {Object.keys(groups)
        .sort((a, b) => a.localeCompare(b))
        .map((moduleCode) => {
          const items = [...groups[moduleCode]].sort((a, b) =>
            permissionDisplayName(a).localeCompare(permissionDisplayName(b))
          );
          const categorySelected = items.filter((p) =>
            overrideById.has(p.permissionId)
          ).length;

          return (
            <Collapsible
              key={moduleCode}
              open={isExpanded(moduleCode)}
              onOpenChange={(open) =>
                setExpanded((curr) => ({ ...curr, [moduleCode]: open }))
              }
              className="rounded-lg border"
            >
              <div className="flex w-full items-center justify-between gap-2 px-3 py-2">
                <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-start">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {formatPermissionModuleHeading(moduleCode)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {categorySelected} / {items.length} selected in this module
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "text-muted-foreground size-4 shrink-0 transition-transform",
                      isExpanded(moduleCode) && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 text-xs"
                  disabled={disabled || items.length === 0}
                  onClick={() =>
                    toggleCategory(moduleCode, !isCategoryFullySelected(moduleCode))
                  }
                >
                  {isCategoryFullySelected(moduleCode) ? "Clear module" : "Select module"}
                </Button>
              </div>

              <CollapsibleContent className="border-t px-3 py-2">
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {items.map((permission) => {
                    const selected = overrideById.get(permission.permissionId);
                    const explanation = permissionExplanation(permission);
                    return (
                      <li
                        key={permission.permissionId}
                        className={cn(
                          "rounded-md border px-2 py-2",
                          selected && "border-primary/40 bg-primary/5"
                        )}
                      >
                        <PermissionOverrideRow
                          permission={permission}
                          selected={!!selected}
                          isAllowed={selected?.isAllowed ?? true}
                          disabled={disabled}
                          onToggle={(checked) => {
                            if (!checked) {
                              setOverride(permission.permissionId, null);
                              return;
                            }
                            setOverride(permission.permissionId, { isAllowed: true });
                          }}
                          onAllowDenyChange={(isAllowed) =>
                            setOverride(permission.permissionId, { isAllowed })
                          }
                          explanation={explanation}
                        />
                      </li>
                    );
                  })}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
    </div>
  );
}

function PermissionOverrideRow({
  permission,
  selected,
  isAllowed,
  disabled,
  onToggle,
  onAllowDenyChange,
  explanation,
}: {
  permission: UserProvisioningWizardPermissionOption;
  selected: boolean;
  isAllowed: boolean;
  disabled?: boolean;
  onToggle: (checked: boolean) => void;
  onAllowDenyChange: (isAllowed: boolean) => void;
  explanation: string | null;
}) {
  const title = permissionDisplayName(permission);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
        <Checkbox
          checked={selected}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium" dir="auto">
            {title}
          </span>
          {explanation ? (
            <span className="text-muted-foreground mt-0.5 block text-xs" dir="auto">
              {explanation}
            </span>
          ) : null}
          <code className="text-muted-foreground mt-1 block text-[11px]">
            {permission.permissionCode}
          </code>
        </span>
      </label>
      {selected ? (
        <select
          className="border-input h-8 rounded-md border px-2 text-xs"
          value={isAllowed ? "allow" : "deny"}
          disabled={disabled}
          onChange={(e) => onAllowDenyChange(e.target.value === "allow")}
          aria-label={`Override effect for ${permission.permissionCode}`}
        >
          <option value="allow">Allow</option>
          <option value="deny">Deny</option>
        </select>
      ) : (
        <Badge variant="outline" className="text-muted-foreground text-xs">
          Not selected
        </Badge>
      )}
    </div>
  );
}
