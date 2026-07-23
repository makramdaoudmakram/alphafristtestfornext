"use client";

import { useEffect, useState } from "react";
import type { CompanyItem } from "@/types/company";
import { Button } from "@/components/ui/button";
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

export type CompanyFormValues = {
  comCode: string;
  comNameAr: string;
  comNameEn: string;
  comTel: string;
  comAddress: string;
  comActive: boolean;
};

const emptyValues: CompanyFormValues = {
  comCode: "",
  comNameAr: "",
  comNameEn: "",
  comTel: "",
  comAddress: "",
  comActive: true,
};

function toFormValues(company: CompanyItem): CompanyFormValues {
  return {
    comCode: company.comCode ?? "",
    comNameAr: company.comNameAr ?? "",
    comNameEn: company.comNameEn ?? "",
    comTel: company.comTel ?? "",
    comAddress: company.comAddress ?? "",
    comActive: company.comActive,
  };
}

export function CompanyFormSheet({
  open,
  onOpenChange,
  company,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanyItem | null;
  saving?: boolean;
  onSubmit: (values: CompanyFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<CompanyFormValues>(emptyValues);

  useEffect(() => {
    if (open && company) {
      setValues(toFormValues(company));
    }
  }, [open, company]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Update company</SheetTitle>
          <SheetDescription>
            Edit company details. Companies linked to item catalog records cannot be deleted.
          </SheetDescription>
        </SheetHeader>

        {company ? (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label>Company ID</Label>
              <Input value={String(company.comId)} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-comCode">Company code</Label>
              <Input
                id="sheet-comCode"
                value={values.comCode}
                onChange={(e) =>
                  setValues((current) => ({ ...current, comCode: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-comNameAr">Arabic name</Label>
              <Input
                id="sheet-comNameAr"
                value={values.comNameAr}
                onChange={(e) =>
                  setValues((current) => ({ ...current, comNameAr: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-comNameEn">English name</Label>
              <Input
                id="sheet-comNameEn"
                value={values.comNameEn}
                onChange={(e) =>
                  setValues((current) => ({ ...current, comNameEn: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-comTel">Phone</Label>
              <Input
                id="sheet-comTel"
                value={values.comTel}
                onChange={(e) =>
                  setValues((current) => ({ ...current, comTel: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-comAddress">Address</Label>
              <Input
                id="sheet-comAddress"
                value={values.comAddress}
                onChange={(e) =>
                  setValues((current) => ({ ...current, comAddress: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="sheet-comActive"
                type="checkbox"
                checked={values.comActive}
                onChange={(e) =>
                  setValues((current) => ({ ...current, comActive: e.target.checked }))
                }
                className="size-4 rounded border"
              />
              <Label htmlFor="sheet-comActive">Active company</Label>
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
              <Button type="submit" variant="update" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
