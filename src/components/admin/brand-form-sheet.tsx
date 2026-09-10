"use client";

import { useEffect, useState } from "react";
import type { BrandItem } from "@/types/brand";
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

export type BrandFormValues = {
  brandNameAr: string;
  brandNameEn: string;
};

const emptyValues: BrandFormValues = {
  brandNameAr: "",
  brandNameEn: "",
};

function toFormValues(brand: BrandItem): BrandFormValues {
  return {
    brandNameAr: brand.brandNameAr ?? "",
    brandNameEn: brand.brandNameEn ?? "",
  };
}

export function BrandFormSheet({
  open,
  onOpenChange,
  brand,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: BrandItem | null;
  saving?: boolean;
  onSubmit: (values: BrandFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<BrandFormValues>(emptyValues);

  useEffect(() => {
    if (open && brand) {
      setValues(toFormValues(brand));
    }
  }, [open, brand]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Update brand</SheetTitle>
          <SheetDescription>
            Edit brand names. Brands linked to item catalog records cannot be deleted.
          </SheetDescription>
        </SheetHeader>

        {brand ? (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label>Brand ID</Label>
              <Input value={brand.id} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-brandNameAr">Arabic name</Label>
              <Input
                id="sheet-brandNameAr"
                value={values.brandNameAr}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    brandNameAr: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-brandNameEn">English name</Label>
              <Input
                id="sheet-brandNameEn"
                value={values.brandNameEn}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    brandNameEn: event.target.value,
                  }))
                }
              />
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
