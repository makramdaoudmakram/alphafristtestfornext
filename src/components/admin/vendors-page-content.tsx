"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Building2, Loader2, Plus, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { createVendor, getNextVendorAccount, getVendors } from "@/lib/vendor-api";
import { PageGuard } from "@/components/permissions/page-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { VendorCreateRequest, VendorItem } from "@/types/vendor";

type VendorFormValues = {
  vendorNameAr: string;
  vendorNameEn: string;
  address: string;
  tel: string;
  accountId: string;
  taxId: string;
  licenseId: string;
  paymentBankNo: string;
  responsibleName: string;
  maxValue: string;
};

const emptyForm: VendorFormValues = {
  vendorNameAr: "",
  vendorNameEn: "",
  address: "",
  tel: "",
  accountId: "",
  taxId: "",
  licenseId: "",
  paymentBankNo: "",
  responsibleName: "",
  maxValue: "",
};

function displayVendorName(vendor: VendorItem) {
  return vendor.vendorNameEn || vendor.vendorNameAr || `Vendor #${vendor.vendorId}`;
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function CreateVendorSheet({
  open,
  onOpenChange,
  saving,
  defaultAccountId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  defaultAccountId: string;
  onSubmit: (values: VendorCreateRequest) => Promise<void>;
}) {
  const [values, setValues] = useState<VendorFormValues>(emptyForm);

  useEffect(() => {
    if (open) {
      setValues((current) => ({
        ...emptyForm,
        accountId: current.accountId || defaultAccountId,
      }));
    }
  }, [open, defaultAccountId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({
      vendorNameAr: values.vendorNameAr.trim(),
      vendorNameEn: values.vendorNameEn.trim(),
      address: values.address.trim(),
      tel: values.tel.trim(),
      accountId: values.accountId.trim(),
      taxId: values.taxId.trim(),
      licenseId: values.licenseId.trim(),
      paymentBankNo: values.paymentBankNo.trim(),
      responsibleName: values.responsibleName.trim(),
      maxValue: values.maxValue.trim() ? Number(values.maxValue) : null,
    });
  }

  function setField<K extends keyof VendorFormValues>(key: K, value: VendorFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Create vendor</SheetTitle>
          <SheetDescription>
            Account No defaults to the next child under supplier parent account `2140`.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 px-4 pb-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor-account">Account No</Label>
              <Input
                id="vendor-account"
                value={values.accountId}
                onChange={(e) => setField("accountId", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-max">Max Value</Label>
              <Input
                id="vendor-max"
                type="number"
                step="0.01"
                value={values.maxValue}
                onChange={(e) => setField("maxValue", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor-name-en">Vendor Name</Label>
              <Input
                id="vendor-name-en"
                value={values.vendorNameEn}
                onChange={(e) => setField("vendorNameEn", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-name-ar">Vendor Name Arabic</Label>
              <Input
                id="vendor-name-ar"
                value={values.vendorNameAr}
                onChange={(e) => setField("vendorNameAr", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor-tel">Phone</Label>
              <Input
                id="vendor-tel"
                value={values.tel}
                onChange={(e) => setField("tel", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-responsible">Responsible Name</Label>
              <Input
                id="vendor-responsible"
                value={values.responsibleName}
                onChange={(e) => setField("responsibleName", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor-address">Address</Label>
            <Input
              id="vendor-address"
              value={values.address}
              onChange={(e) => setField("address", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="vendor-tax">Tax ID</Label>
              <Input
                id="vendor-tax"
                value={values.taxId}
                onChange={(e) => setField("taxId", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-license">License ID</Label>
              <Input
                id="vendor-license"
                value={values.licenseId}
                onChange={(e) => setField("licenseId", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-bank">Payment Bank No</Label>
              <Input
                id="vendor-bank"
                value={values.paymentBankNo}
                onChange={(e) => setField("paymentBankNo", e.target.value)}
              />
            </div>
          </div>

          <SheetFooter className="px-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create vendor"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function VendorsPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [nextAccountId, setNextAccountId] = useState("");

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;
    return items.filter((vendor) =>
      [
        vendor.vendorNameAr,
        vendor.vendorNameEn,
        vendor.accountId,
        vendor.tel,
        vendor.taxId,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    );
  }, [items, searchTerm]);

  const loadData = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [vendors, nextAccount] = await Promise.all([
        getVendors(token),
        getNextVendorAccount(token),
      ]);
      setItems(vendors);
      setNextAccountId(nextAccount.nextAccountCode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadData();
  }, [sessionReady, loadData]);

  async function handleCreate(values: VendorCreateRequest) {
    if (!token) return;

    setSaving(true);
    try {
      await createVendor(values, token);
      toast.success("Vendor created");
      setSheetOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create vendor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageGuard permission={null}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Vendors</h2>
          <p className="text-sm text-muted-foreground">
            Search vendors, view current balance, and create a new vendor with the next
            supplier account number.
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <Button onClick={() => setSheetOpen(true)} className="sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vendors..."
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading vendors...
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No vendors found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((vendor) => {
              const balanceColor =
                vendor.balance > 0
                  ? "text-red-600"
                  : vendor.balance < 0
                    ? "text-green-600"
                    : "text-slate-600";

              return (
                <Card
                  key={vendor.accountId || `${vendor.vendorId}-${displayVendorName(vendor)}`}
                  className="border-slate-300 transition-shadow hover:shadow-md"
                >
                  <Link href={`/dashboard/vendors/${encodeURIComponent(vendor.accountId || "")}`}>
                    <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                      <div className="rounded-full bg-slate-100 p-3 text-slate-700">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-base">
                          {displayVendorName(vendor)}
                        </CardTitle>
                        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          Account No: {vendor.accountId || "—"}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className={`text-lg font-semibold ${balanceColor}`}>
                        Balance: {formatMoney(vendor.balance)}
                      </p>
                      {vendor.tel ? (
                        <p className="text-sm text-muted-foreground">Phone: {vendor.tel}</p>
                      ) : null}
                      {vendor.address ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          Address: {vendor.address}
                        </p>
                      ) : null}
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}

        <CreateVendorSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          saving={saving}
          defaultAccountId={nextAccountId}
          onSubmit={handleCreate}
        />
      </div>
    </PageGuard>
  );
}
