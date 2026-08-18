"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  BookOpen,
  CreditCard,
  FileText,
  Loader2,
  Pencil,
  Save,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAccountSubLedger,
  type AccountSubLedger,
} from "@/lib/ledger-api";
import { getVendorByAccountId, saveVendorByAccountId } from "@/lib/vendor-api";
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

type VendorDetailForm = {
  vendorName: string;
  vendorNameAr: string;
  accountId: string;
  address: string;
  tel: string;
  taxId: string;
  licenseId: string;
  paymentBankNo: string;
  responsibleName: string;
  maxValue: string;
};

function toFormValues(vendor: VendorItem): VendorDetailForm {
  return {
    vendorName: vendor.vendorNameEn ?? "",
    vendorNameAr: vendor.vendorNameAr ?? "",
    accountId: vendor.accountId ?? "",
    address: vendor.address ?? "",
    tel: vendor.tel ?? "",
    taxId: vendor.taxId ?? "",
    licenseId: vendor.licenseId ?? "",
    paymentBankNo: vendor.paymentBankNo ?? "",
    responsibleName: vendor.responsibleName ?? "",
    maxValue: vendor.maxValue == null ? "" : String(vendor.maxValue),
  };
}

function displayVendorName(vendor: VendorItem) {
  return vendor.vendorNameEn || vendor.vendorNameAr || vendor.accountId || "Vendor";
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const iso = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

function balanceClassName(value: number) {
  if (value > 0) return "text-red-600";
  if (value < 0) return "text-green-600";
  return "text-slate-700";
}

export function VendorDetailsPageContent({ accountId }: { accountId: string }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [vendor, setVendor] = useState<VendorItem | null>(null);
  const [values, setValues] = useState<VendorDetailForm | null>(null);
  const [subLedgerLoading, setSubLedgerLoading] = useState(false);
  const [showSubLedger, setShowSubLedger] = useState(false);
  const [subLedger, setSubLedger] = useState<AccountSubLedger | null>(null);

  const actionButtons = useMemo(
    () => [
      { label: "Sales", icon: ShoppingCart, action: "sales" as const },
      { label: "Purchase", icon: CreditCard, action: "purchase" as const },
      { label: "Bill", icon: FileText, action: "bill" as const },
      { label: "Sub Ledger", icon: BookOpen, action: "sub-ledger" as const },
    ],
    []
  );

  useEffect(() => {
    async function load() {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const item = await getVendorByAccountId(accountId, token);
        setVendor(item);
        setValues(toFormValues(item));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load vendor");
      } finally {
        setLoading(false);
      }
    }

    if (!sessionReady) return;
    void load();
  }, [accountId, token, sessionReady]);

  const loadSubLedger = useCallback(async () => {
    if (!token || !vendor?.accountId) return;

    setShowSubLedger(true);
    setSubLedgerLoading(true);
    try {
      const report = await getAccountSubLedger(vendor.accountId, token);
      setSubLedger(report);
      if (report.lines.length === 0) {
        toast.message("No ledger transactions found for this vendor.");
      }
    } catch (error) {
      setSubLedger(null);
      toast.error(error instanceof Error ? error.message : "Failed to load sub ledger");
    } finally {
      setSubLedgerLoading(false);
    }
  }, [token, vendor?.accountId]);

  function setField<K extends keyof VendorDetailForm>(key: K, value: VendorDetailForm[K]) {
    setValues((current) => (current ? { ...current, [key]: value } : current));
  }

  function handleSheetOpenChange(open: boolean) {
    if (!open && vendor) {
      setValues(toFormValues(vendor));
    }
    setSheetOpen(open);
  }

  function handleAction(action: "sales" | "purchase" | "bill" | "sub-ledger") {
    if (action === "sub-ledger") {
      void loadSubLedger();
      return;
    }
    toast.message(`${action.charAt(0).toUpperCase()}${action.slice(1)} coming soon`);
  }

  async function handleSave() {
    if (!token || !values) return;

    const payload: VendorCreateRequest = {
      vendorNameEn: values.vendorName.trim(),
      vendorNameAr: values.vendorNameAr.trim(),
      accountId: values.accountId.trim(),
      address: values.address.trim(),
      tel: values.tel.trim(),
      taxId: values.taxId.trim(),
      licenseId: values.licenseId.trim(),
      paymentBankNo: values.paymentBankNo.trim(),
      responsibleName: values.responsibleName.trim(),
      maxValue: values.maxValue.trim() ? Number(values.maxValue) : null,
    };

    setSaving(true);
    try {
      const saved = await saveVendorByAccountId(accountId, payload, token);
      setVendor(saved);
      setValues(toFormValues(saved));
      setSheetOpen(false);
      if (saved.accountId && saved.accountId !== accountId) {
        router.replace(`/dashboard/vendors/${encodeURIComponent(saved.accountId)}`);
      }
      toast.success("Vendor saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save vendor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageGuard permission={null}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">
                {loading ? "Vendor" : vendor ? displayVendorName(vendor) : "Vendor"}
              </h2>
              {vendor?.accountId ? (
                <p className="text-sm text-muted-foreground">Account No: {vendor.accountId}</p>
              ) : null}
            </div>

            <Button
              type="button"
              className="w-fit"
              onClick={() => setSheetOpen(true)}
              disabled={loading || !vendor}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>

            {loading ? (
              <Card className="w-fit">
                <CardContent className="flex items-center gap-2 px-4 py-3 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </CardContent>
              </Card>
            ) : vendor ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="rounded-lg border bg-white px-4 py-3">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className={`text-2xl font-semibold ${balanceClassName(vendor.balance)}`}>
                    {formatMoney(vendor.balance)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {actionButtons.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.label}
                        type="button"
                        variant="secondary"
                        className="bg-slate-100 text-slate-800 hover:bg-slate-200"
                        onClick={() => handleAction(action.action)}
                        disabled={action.action === "sub-ledger" && subLedgerLoading}
                      >
                        {action.action === "sub-ledger" && subLedgerLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Icon className="mr-2 h-4 w-4" />
                        )}
                        {action.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <Button asChild variant="outline">
            <Link href="/dashboard/vendors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to vendors
            </Link>
          </Button>
        </div>

        {showSubLedger ? (
          subLedgerLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading sub ledger...
              </CardContent>
            </Card>
          ) : !subLedger || subLedger.lines.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No ledger transactions found for this vendor account.
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-300">
              <CardHeader className="bg-slate-50">
                <CardTitle className="text-xl">Sub Ledger</CardTitle>
                <div className="space-y-1 text-sm text-slate-700">
                  <p>{subLedger.accountLabel}</p>
                  <div className="flex flex-wrap gap-6">
                    <span>
                      Total Debit:{" "}
                      <strong className="tabular-nums">{formatMoney(subLedger.totalDebit)}</strong>
                    </span>
                    <span>
                      Total Credit:{" "}
                      <strong className="tabular-nums">{formatMoney(subLedger.totalCredit)}</strong>
                    </span>
                    <span>
                      Final Balance:{" "}
                      <strong className={`tabular-nums ${balanceClassName(subLedger.finalBalance)}`}>
                        {formatMoney(subLedger.finalBalance)}
                      </strong>
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto rounded-lg border border-slate-300">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead>
                      <tr className="border-b bg-slate-100 text-left font-semibold">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Receipt</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2">Cost Center</th>
                        <th className="px-3 py-2">Due Date</th>
                        <th className="px-3 py-2 text-right">Debit</th>
                        <th className="px-3 py-2 text-right">Credit</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subLedger.lines.map((line) => (
                        <tr key={line.transNO} className="border-b last:border-b-0">
                          <td className="px-3 py-2">{formatDate(line.transDate)}</td>
                          <td className="px-3 py-2">{line.transType || "—"}</td>
                          <td className="px-3 py-2">{line.receiptNO || "—"}</td>
                          <td className="px-3 py-2">{line.description || "—"}</td>
                          <td className="px-3 py-2">{line.costCenterLabel || "—"}</td>
                          <td className="px-3 py-2">{formatDate(line.dueDate)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatMoney(line.debit)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatMoney(line.credit)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">
                            {formatMoney(line.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )
        ) : null}

        <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
            <SheetHeader>
              <SheetTitle>Edit vendor</SheetTitle>
              <SheetDescription>Update vendor details and save your changes.</SheetDescription>
            </SheetHeader>

            {values ? (
              <div className="grid gap-4 px-4 pb-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    id="vendor-name-detail"
                    label="Vendor Name"
                    value={values.vendorName}
                    onChange={(value) => setField("vendorName", value)}
                  />
                  <FormField
                    id="vendor-name-ar-detail"
                    label="Vendor Name Arabic"
                    value={values.vendorNameAr}
                    onChange={(value) => setField("vendorNameAr", value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    id="vendor-account-detail"
                    label="Account ID"
                    value={values.accountId}
                    onChange={(value) => setField("accountId", value)}
                  />
                  <FormField
                    id="vendor-tel-detail"
                    label="Phone"
                    value={values.tel}
                    onChange={(value) => setField("tel", value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    id="vendor-address-detail"
                    label="Address"
                    value={values.address}
                    onChange={(value) => setField("address", value)}
                  />
                  <FormField
                    id="vendor-responsible-detail"
                    label="Responsible Name"
                    value={values.responsibleName}
                    onChange={(value) => setField("responsibleName", value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    id="vendor-tax-detail"
                    label="Tax ID"
                    value={values.taxId}
                    onChange={(value) => setField("taxId", value)}
                  />
                  <FormField
                    id="vendor-license-detail"
                    label="License ID"
                    value={values.licenseId}
                    onChange={(value) => setField("licenseId", value)}
                  />
                  <FormField
                    id="vendor-max-detail"
                    label="Max Value"
                    type="number"
                    value={values.maxValue}
                    onChange={(value) => setField("maxValue", value)}
                  />
                </div>

                <FormField
                  id="vendor-payment-bank-detail"
                  label="Payment Bank No"
                  value={values.paymentBankNo}
                  onChange={(value) => setField("paymentBankNo", value)}
                />
              </div>
            ) : null}

            <SheetFooter className="px-4 pb-4">
              <Button type="button" onClick={() => void handleSave()} disabled={saving || !values}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSheetOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </PageGuard>
  );
}

function FormField({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
