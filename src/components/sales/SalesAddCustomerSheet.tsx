"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createCustomer, getNextCustomerAccount } from "@/lib/customer-api";
import { getScopePharmacies } from "@/lib/pharmacy-scope-api";
import type { CustomerItem } from "@/types/customer";
import type { PharmacyScopeItem } from "@/types/pharmacy-scope";

type SalesAddCustomerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | null;
  /** Current SalesPage pharmacy (ParmId as string) — default for Pharmacy combo. */
  currentParmId: string | null;
  onCreated: (customer: CustomerItem) => void;
};

export function SalesAddCustomerSheet({
  open,
  onOpenChange,
  token,
  currentParmId,
  onCreated,
}: SalesAddCustomerSheetProps) {
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nextCode, setNextCode] = useState("");
  const [pharmacies, setPharmacies] = useState<PharmacyScopeItem[]>([]);
  const [mobile, setMobile] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [pharmCode, setPharmCode] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!open || !token) return;

    let cancelled = false;
    setMobile("");
    setCustomerName("");
    setAddress("");
    setNextCode("");
    setPharmCode(currentParmId?.trim() || "");
    setLoadingMeta(true);

    void (async () => {
      try {
        const [nextAccount, scope] = await Promise.all([
          getNextCustomerAccount(token),
          getScopePharmacies(token),
        ]);
        if (cancelled) return;
        setNextCode(nextAccount.nextAccountCode);
        setPharmacies(scope.pharmacies);
        const defaultPharm =
          currentParmId?.trim() ||
          scope.activePharmacyId?.trim() ||
          scope.pharmacies[0]?.parmId ||
          "";
        setPharmCode(defaultPharm);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load customer form"
          );
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, token, currentParmId]);

  async function handleSave() {
    if (!token) return;

    const name = customerName.trim();
    if (!name) {
      toast.error("Customer Name is required.");
      return;
    }
    if (!pharmCode.trim()) {
      toast.error("Pharmacy is required.");
      return;
    }

    setSaving(true);
    try {
      const created = await createCustomer(
        {
          custNameEn: name,
          custNameAr: name,
          custMobile: mobile.trim() || null,
          custAddress: address.trim() || null,
          pharmCode: pharmCode.trim(),
          accountId: nextCode.trim() || null,
          custActive: true,
          custPayment: 0,
        },
        token
      );
      toast.success("Customer created");
      onCreated(created);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create customer"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add Customer</SheetTitle>
        </SheetHeader>

        <div className="grid gap-4 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="sales-add-customer-code">Customer Code</Label>
            <Input
              id="sales-add-customer-code"
              readOnly
              disabled
              value={loadingMeta ? "…" : nextCode || "—"}
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sales-add-customer-mobile">Mobile</Label>
            <Input
              id="sales-add-customer-mobile"
              value={mobile}
              maxLength={15}
              disabled={saving}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Mobile"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sales-add-customer-name">Customer Name</Label>
            <Input
              id="sales-add-customer-name"
              value={customerName}
              disabled={saving}
              required
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sales-add-customer-pharmacy">Pharmacy</Label>
            <Select
              value={pharmCode || undefined}
              disabled={saving || loadingMeta || pharmacies.length === 0}
              onValueChange={setPharmCode}
            >
              <SelectTrigger id="sales-add-customer-pharmacy" className="w-full">
                <SelectValue placeholder="Select pharmacy" />
              </SelectTrigger>
              <SelectContent>
                {pharmacies.map((p) => (
                  <SelectItem key={p.parmId} value={p.parmId}>
                    {p.name || p.parmId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sales-add-customer-address">Address</Label>
            <Textarea
              id="sales-add-customer-address"
              value={address}
              maxLength={100}
              disabled={saving}
              rows={3}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address"
            />
          </div>

          <SheetFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || loadingMeta || !token}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : "Save Customer"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
