"use client";

import { useEffect, useState } from "react";
import type { EmployInfoItem } from "@/types/employ-info";
import {
  emptyEmployInfoFormValues,
  type EmployInfoFormValues,
} from "@/types/employ-info";
import { EmployInfoCostCenterCombobox } from "@/components/admin/employ-info-cost-center-combobox";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EMPLOY_TYPE_OPTIONS } from "@/lib/employ-info-enums";

function toFormValues(item: EmployInfoItem): EmployInfoFormValues {
  return {
    name: item.name?.trim() ?? "",
    code: item.code?.trim() ?? "",
    generatedPassword: item.password?.trim() ?? "",
    pharm: item.pharm,
    employType: String(item.employType),
    active: item.active,
  };
}

export function EmployInfoFormSheet({
  open,
  onOpenChange,
  item,
  saving,
  passwordLoading,
  onRequestGeneratedPassword,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: EmployInfoItem | null;
  saving?: boolean;
  passwordLoading?: boolean;
  onRequestGeneratedPassword: () => Promise<string>;
  onSubmit: (values: EmployInfoFormValues, mode: "create" | "edit") => Promise<void>;
}) {
  const isCreateMode = item == null;
  const [values, setValues] = useState<EmployInfoFormValues>(emptyEmployInfoFormValues);

  useEffect(() => {
    if (!open) return;

    if (item) {
      setValues(toFormValues(item));
      return;
    }

    setValues(emptyEmployInfoFormValues);
    void (async () => {
      try {
        const password = await onRequestGeneratedPassword();
        setValues((current) => ({ ...current, generatedPassword: password }));
      } catch {
        setValues((current) => ({ ...current, generatedPassword: "" }));
      }
    })();
  }, [open, item, onRequestGeneratedPassword]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values, isCreateMode ? "create" : "edit");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isCreateMode ? "New employee info" : "Update employee info"}
          </SheetTitle>
          <SheetDescription>
            {isCreateMode
              ? "Enter employee details. The initial password is generated automatically."
              : "Edit employee details. The password is shown for reference and cannot be changed here."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
          {!isCreateMode ? (
            <div className="space-y-2">
              <Label>ID</Label>
              <p className="text-sm text-muted-foreground">#{item?.id}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="sheet-employee-name">Employee Name</Label>
            <Input
              id="sheet-employee-name"
              value={values.name}
              onChange={(event) =>
                setValues((current) => ({ ...current, name: event.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheet-employee-code">Employee Code</Label>
            <Input
              id="sheet-employee-code"
              value={values.code}
              onChange={(event) =>
                setValues((current) => ({ ...current, code: event.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheet-employee-password">Password</Label>
            <Input
              id="sheet-employee-password"
              value={
                isCreateMode
                  ? passwordLoading
                    ? "Generating..."
                    : values.generatedPassword
                  : values.generatedPassword || "—"
              }
              readOnly
              disabled
              className="font-mono uppercase"
            />
            <p className="text-muted-foreground text-xs">
              {isCreateMode
                ? "Generated automatically"
                : values.generatedPassword
                  ? "Stored employee PIN"
                  : "Not available for older records"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheet-employee-cost-center">Cost Center</Label>
            <EmployInfoCostCenterCombobox
              value={values.pharm}
              onValueChange={(next) =>
                setValues((current) => ({ ...current, pharm: next }))
              }
              fallbackLabel={item?.costCenterName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheet-employee-type">Employee Type</Label>
            <SearchableCombobox
              value={values.employType}
              onValueChange={(next) =>
                setValues((current) => ({ ...current, employType: next }))
              }
              options={[...EMPLOY_TYPE_OPTIONS]}
              placeholder="Select employee type"
              size="lg"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="sheet-employee-active"
              checked={values.active}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  active: event.target.checked,
                }))
              }
            />
            <Label htmlFor="sheet-employee-active">Active</Label>
          </div>

          <SheetFooter className="px-0 pb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isCreateMode ? "default" : "update"}
              disabled={saving || (isCreateMode && (passwordLoading || !values.generatedPassword))}
            >
              {saving ? "Saving..." : isCreateMode ? "Save" : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
