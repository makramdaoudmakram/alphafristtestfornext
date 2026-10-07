"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Building2, Loader2, Plus, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  CustomerFormFields,
  emptyCustomerForm,
  formValuesToRequest,
  type CustomerFormValues,
} from "@/components/admin/customer-form-fields";
import { createCustomer, getCustomers, getNextCustomerCode } from "@/lib/customer-api";
import { PERMISSIONS } from "@/lib/route-permissions";
import { PageGuard } from "@/components/permissions/page-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CustomerItem } from "@/types/customer";

function displayCustomerName(customer: CustomerItem) {
  return customer.custNameEn || customer.custNameAr || `Customer #${customer.custCode}`;
}

function CreateCustomerSheet({
  open,
  onOpenChange,
  saving,
  previewCustCode,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  previewCustCode: number | null;
  onSubmit: (values: ReturnType<typeof formValuesToRequest>) => Promise<void>;
}) {
  const [values, setValues] = useState<CustomerFormValues>(emptyCustomerForm);

  useEffect(() => {
    if (open) {
      setValues(emptyCustomerForm);
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(formValuesToRequest(values));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Create customer</SheetTitle>
          <SheetDescription>
            Customer Code is assigned automatically when saved. Account No is optional.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 px-4 pb-4">
          <CustomerFormFields
            values={values}
            onChange={setValues}
            accountRequired={false}
            previewCustCode={previewCustCode}
          />

          <SheetFooter className="px-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create customer"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function CustomersPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [previewCustCode, setPreviewCustCode] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;
    return items.filter((customer) =>
      [
        customer.custNameAr,
        customer.custNameEn,
        customer.accountId,
        customer.custMobile,
        customer.custTel,
        customer.pharmCode,
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
      const [customers, nextCode] = await Promise.all([
        getCustomers(token),
        getNextCustomerCode(token),
      ]);
      setItems(customers);
      setPreviewCustCode(nextCode.nextCustCode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadData();
  }, [sessionReady, loadData]);

  async function handleCreate(values: ReturnType<typeof formValuesToRequest>) {
    if (!token) return;

    setSaving(true);
    try {
      await createCustomer(values, token);
      toast.success("Customer created");
      setSheetOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.customer.view}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Customers</h2>
          <p className="text-sm text-muted-foreground">
            Search and create customer records from the Customer table.
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
                placeholder="Search customers..."
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading customers...
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No customers found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((customer) => {
              return (
                <Card
                  key={customer.custCode > 0 ? String(customer.custCode) : displayCustomerName(customer)}
                  className="border-slate-300 transition-shadow hover:shadow-md"
                >
                  <Link href={`/dashboard/customers/${encodeURIComponent(customer.accountId || String(customer.custCode))}`}>
                    <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                      <div className="rounded-full bg-slate-100 p-3 text-slate-700">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-base">
                          {displayCustomerName(customer)}
                        </CardTitle>
                        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          Account No: {customer.accountId || "—"}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Code: {customer.custCode > 0 ? customer.custCode : "—"}
                      </p>
                      {customer.custMobile ? (
                        <p className="text-sm text-muted-foreground">Mobile: {customer.custMobile}</p>
                      ) : null}
                      {customer.custTel ? (
                        <p className="text-sm text-muted-foreground">Phone: {customer.custTel}</p>
                      ) : null}
                      {customer.custAddress ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          Address: {customer.custAddress}
                        </p>
                      ) : null}
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}

        <CreateCustomerSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          saving={saving}
          previewCustCode={previewCustCode}
          onSubmit={handleCreate}
        />
      </div>
    </PageGuard>
  );
}
