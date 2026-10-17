"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { PageGuard } from "@/components/permissions/page-guard";
import { SalesCustomerAutocomplete } from "@/components/sales/SalesCustomerAutocomplete";
import { SalesThermalReceipt } from "@/components/sales/SalesThermalReceipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PERMISSIONS } from "@/lib/route-permissions";
import {
  ApiError,
  finalizeSalePayment,
  getPendingSales,
  getSaleDeliveryContext,
  getSalePaymentContext,
  getSalePaymentKinds,
  getSalePaymentMethods,
  getSalesReceipt,
  getSalesSaleDetails,
  lookupSalesManByPassword,
  resolveSaleDeliveryEmployee,
  upsertSaleDelivery,
} from "@/lib/api-client";
import {
  finalizeWithPrintIfNeeded,
} from "@/lib/sales-receipt-print";
import { cn } from "@/lib/utils";
import type { CustomerItem } from "@/types/customer";
import type { SalesDeliveryContext, SalesServiceOption } from "@/types/sales-delivery";
import type {
  PendingSaleListItem,
  SalesPaymentContext,
  SalesPaymentKindOption,
  SalesPaymentMethodOption,
  SalesSaleDetails,
} from "@/types/sales-payment";
import type { ReceiptPaperWidth } from "@/types/sales-receipt";

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return money(value).toFixed(2);
}

export function PendingSalesPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? null;

  const [pendingList, setPendingList] = useState<PendingSaleListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedSthId, setSelectedSthId] = useState<number | null>(null);

  const [paymentContext, setPaymentContext] = useState<SalesPaymentContext | null>(null);
  const [deliveryContext, setDeliveryContext] = useState<SalesDeliveryContext | null>(null);
  const [salesKinds, setSalesKinds] = useState<SalesPaymentKindOption[]>([]);
  const [salesKindId, setSalesKindId] = useState<number | null>(null);
  const [methods, setMethods] = useState<SalesPaymentMethodOption[]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});

  const [loadingSale, setLoadingSale] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [paperWidth, setPaperWidth] = useState<ReceiptPaperWidth>(80);
  const [receiptToPrint, setReceiptToPrint] = useState<{
    receipt: import("@/types/sales-receipt").SalesReceipt;
    width: ReceiptPaperWidth;
  } | null>(null);

  // Customer + delivery fields (same flow as the standalone sale-by-id payment page).
  const [customerName, setCustomerName] = useState("");
  const [telephone, setTelephone] = useState("");
  const [address, setAddress] = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const [deliveryCode, setDeliveryCode] = useState("");
  const [deliveryEmployeeName, setDeliveryEmployeeName] = useState("");
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [resolvingEmployee, setResolvingEmployee] = useState(false);
  const [deliveryWanted, setDeliveryWanted] = useState(false);

  // Item lines + header customer (GET SalesPayment/{sthId}/details).
  const [saleDetails, setSaleDetails] = useState<SalesSaleDetails | null>(null);

  // Customer picker: undefined = keep the customer linked on the header, null = explicitly cleared.
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerSelection, setCustomerSelection] = useState<
    { custId: number; label: string } | null | undefined
  >(undefined);

  // Finalizing employee: verified via the same lookup as the Sales page; the raw code is
  // re-verified server-side during finalize, never an employee id from the client.
  const [employeeCode, setEmployeeCode] = useState("");
  const [finalizeEmployee, setFinalizeEmployee] = useState<{
    id: number;
    code: string;
    name: string | null;
  } | null>(null);
  const [verifyingEmployee, setVerifyingEmployee] = useState(false);

  const selectSeq = useRef(0);
  const deliveryLoadedForRef = useRef<number | null>(null);
  const deliveryLoadingRef = useRef(false);

  const loadList = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    setListError(null);
    try {
      setPendingList(await getPendingSales(token));
    } catch (err) {
      setPendingList([]);
      setListError(
        err instanceof ApiError ? err.message : "Failed to load pending invoices."
      );
    } finally {
      setListLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void loadList();
  }, [token, loadList]);

  const resetPanel = () => {
    setSelectedSthId(null);
    setPaymentContext(null);
    setDeliveryContext(null);
    setSalesKinds([]);
    setSalesKindId(null);
    setMethods([]);
    setAmounts({});
    setCustomerName("");
    setTelephone("");
    setAddress("");
    setServiceId("");
    setDeliveryCode("");
    setDeliveryEmployeeName("");
    setDeliveryWanted(false);
    setSaleDetails(null);
    setCustomerQuery("");
    setCustomerSelection(undefined);
    setEmployeeCode("");
    setFinalizeEmployee(null);
    setSavingDelivery(false);
    deliveryLoadedForRef.current = null;
    deliveryLoadingRef.current = false;
  };

  const applyDeliveryForm = (ctx: SalesDeliveryContext) => {
    const d = ctx.delivery;
    setCustomerName(d?.customerName ?? "");
    setTelephone(d?.tel ?? "");
    setAddress(d?.address ?? "");
    setServiceId(d?.salesServiceId != null ? String(d.salesServiceId) : "");
    setDeliveryCode("");
    setDeliveryEmployeeName(d?.deliveryEmployeeName ?? "");
  };

  const selectInvoice = async (sthId: number) => {
    if (!token) return;
    const seq = selectSeq.current + 1;
    selectSeq.current = seq;
    setSelectedSthId(sthId);
    setLoadingSale(true);
    setPaymentContext(null);
    setDeliveryContext(null);
    setMethods([]);
    setSalesKindId(null);
    setAmounts({});
    setSaleDetails(null);
    setCustomerQuery("");
    setCustomerSelection(undefined);
    setCustomerName("");
    setTelephone("");
    setAddress("");
    setServiceId("");
    setDeliveryCode("");
    setDeliveryEmployeeName("");
    setDeliveryWanted(false);
    setEmployeeCode("");
    setFinalizeEmployee(null);
    setSavingDelivery(false);
    deliveryLoadedForRef.current = null;
    deliveryLoadingRef.current = false;
    try {
      // Delivery data is lazy: fetched only when a delivery-requiring choice is made below.
      const [payment, kinds, details] = await Promise.all([
        getSalePaymentContext(token, sthId),
        getSalePaymentKinds(token).catch(() => [] as SalesPaymentKindOption[]),
        getSalesSaleDetails(token, sthId).catch(() => null),
      ]);
      if (selectSeq.current !== seq) return;
      if (payment.billTyp === 1) {
        // Authoritative status changed since the list was loaded: keep it out of the pending list.
        setPendingList((prev) => prev.filter((row) => row.sthId !== sthId));
        resetPanel();
        toast.message(`Sale ${sthId} is already finalized.`);
        return;
      }
      setPaymentContext(payment);
      setSalesKinds(kinds);
      setSaleDetails(details);
      if (details?.custId != null && details.custId > 0) {
        setCustomerSelection({
          custId: details.custId,
          label: `${details.custId} — ${details.customerName ?? ""}`.trim(),
        });
      }
    } catch (err) {
      if (selectSeq.current !== seq) return;
      setSelectedSthId(null);
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load invoice payment data."
      );
    } finally {
      if (selectSeq.current === seq) setLoadingSale(false);
    }
  };

  const ensureDeliveryContext = useCallback(
    async (sthId: number) => {
      if (!token) return;
      if (deliveryLoadedForRef.current === sthId || deliveryLoadingRef.current) return;
      const seq = selectSeq.current;
      deliveryLoadingRef.current = true;
      try {
        const ctx = await getSaleDeliveryContext(token, sthId);
        if (selectSeq.current !== seq) return;
        deliveryLoadedForRef.current = sthId;
        setDeliveryContext(ctx);
        // Fill only what the user has not entered yet (delivery fields stay user-controlled).
        const d = ctx.delivery;
        if (d) {
          setServiceId((prev) => prev || (d.salesServiceId != null ? String(d.salesServiceId) : ""));
          setTelephone((prev) => prev || (d.tel ?? ""));
          setAddress((prev) => prev || (d.address ?? ""));
          setCustomerName((prev) => prev || (d.customerName ?? ""));
          setDeliveryEmployeeName((prev) => prev || (d.deliveryEmployeeName ?? ""));
        }
      } catch (err) {
        if (selectSeq.current === seq) {
          toast.error(
            err instanceof ApiError ? err.message : "Failed to load delivery services."
          );
        }
      } finally {
        deliveryLoadingRef.current = false;
      }
    },
    [token]
  );

  const onSalesKindChange = async (raw: string) => {
    const nextId = raw ? Number(raw) : null;
    const kindId =
      nextId != null && Number.isInteger(nextId) && nextId > 0 ? nextId : null;
    setSalesKindId(kindId);
    setMethods([]);
    setAmounts({});

    if (!token || !paymentContext || kindId == null) return;

    setLoadingMethods(true);
    try {
      const [nextMethods, refreshed] = await Promise.all([
        getSalePaymentMethods(token, kindId),
        getSalePaymentContext(token, paymentContext.sthId, kindId),
      ]);
      setMethods(nextMethods);
      setPaymentContext(refreshed);
    } catch (err) {
      setMethods([]);
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load payment methods."
      );
    } finally {
      setLoadingMethods(false);
    }
  };

  const selectedKind =
    salesKindId != null
      ? salesKinds.find((k) => k.salesKindId === salesKindId) ?? null
      : null;
  const deliveryMandatory = Boolean(selectedKind?.deleveryMandatory);

  const selectedService: SalesServiceOption | null = useMemo(() => {
    if (!deliveryContext || !serviceId) return null;
    const id = Number(serviceId);
    return (
      deliveryContext.availableServices.find((s) => s.salesServiceId === id) ?? null
    );
  }, [deliveryContext, serviceId]);

  const requiresDeliveryEmployee = Boolean(selectedService?.requiresDeliveryEmployee);

  const savedDelivery = deliveryContext?.delivery ?? null;
  const paymentRequiresDelivery = methods.some(
    (m) =>
      m.deleveryRequair &&
      money(Number(amounts[m.paymentMethodId] ?? 0) || 0) > 0
  );
  const deliveryRequired = deliveryMandatory || paymentRequiresDelivery || deliveryWanted;

  // Delivery data is requested lazily, only once delivery is actually required for this invoice.
  useEffect(() => {
    if (paymentContext && deliveryRequired) {
      void ensureDeliveryContext(paymentContext.sthId);
    }
  }, [paymentContext, deliveryRequired, ensureDeliveryContext]);

  const effectiveCustId =
    customerSelection != null
      ? customerSelection?.custId ?? null
      : saleDetails?.custId ?? null;

  const customerPresent =
    (effectiveCustId ?? 0) > 0 ||
    (savedDelivery?.custId ?? 0) > 0 ||
    (savedDelivery?.customerName?.trim() ?? "") !== "";

  const deliveryMissingReasons = useMemo(() => {
    if (!deliveryRequired) return [];
    const reasons: string[] = [];
    if (deliveryMandatory && !customerPresent) {
      reasons.push("Customer is required when DeliveryMandatory is enabled.");
    }
    if (!savedDelivery || !savedDelivery.salesServiceId || savedDelivery.salesServiceId <= 0) {
      reasons.push("Save the delivery service for this invoice (Customer + Delivery).");
    } else if (savedDelivery.requiresDeliveryEmployee && (savedDelivery.delivEmpId ?? 0) <= 0) {
      reasons.push("Delivery employee is required for the saved delivery service.");
    }
    return reasons;
  }, [
    deliveryRequired,
    deliveryMandatory,
    customerPresent,
    savedDelivery,
  ]);

  const payable = paymentContext ? money(paymentContext.finalPayableAmount) : 0;

  const blockReasons = useMemo(() => {
    const reasons = [...deliveryMissingReasons];
    if (paymentContext && !customerPresent && !reasons.some((r) => /customer/i.test(r))) {
      reasons.push("Customer is required before finalization.");
    }
    if (paymentContext && !finalizeEmployee) {
      reasons.push("Verify the finalizing employee code.");
    }
    return reasons;
  }, [deliveryMissingReasons, paymentContext, customerPresent, finalizeEmployee]);

  const paymentTotal = useMemo(
    () =>
      money(
        methods.reduce((sum, m) => {
          const parsed = Number(amounts[m.paymentMethodId] ?? "");
          return sum + (Number.isFinite(parsed) ? parsed : 0);
        }, 0)
      ),
    [methods, amounts]
  );
  // Paid vs due vs remaining: totals come only from the server context
  // (finalPayableAmount already includes a saved delivery service cost).
  const paidAmount = money(
    (paymentContext?.existingPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)
  );
  const remainingBalance = money(payable - paymentTotal);
  const totalsMatch = paymentTotal > 0 && paymentTotal === payable;

  const handleResolveDeliveryEmployee = async () => {
    if (!token || !requiresDeliveryEmployee) return;
    const code = deliveryCode.trim();
    if (!code || code === "0") {
      toast.error("Enter a delivery code or password.");
      return;
    }

    setResolvingEmployee(true);
    try {
      const employee = await resolveSaleDeliveryEmployee(token, code);
      setDeliveryEmployeeName(employee.name ?? "");
      toast.success(
        employee.name ? `Delivery: ${employee.name}` : "Delivery employee found."
      );
    } catch (err) {
      setDeliveryEmployeeName("");
      toast.error(
        err instanceof ApiError ? err.message : "Invalid delivery code/password."
      );
    } finally {
      setResolvingEmployee(false);
    }
  };

  const handleResolveFinalizingEmployee = async () => {
    if (!token) return;
    const code = employeeCode.trim();
    if (!code) {
      toast.error("Enter employee password.");
      return;
    }

    setVerifyingEmployee(true);
    try {
      const emp = await lookupSalesManByPassword(token, code);
      if (!emp || emp.employType !== 1) {
        setFinalizeEmployee(null);
        toast.error("Sales Man not found");
        return;
      }
      // Keep the code in state only (input is cleared, mirroring the Sales page).
      setFinalizeEmployee({ id: emp.id, code, name: emp.name });
      setEmployeeCode("");
      toast.success(emp.name ? `Sales Man: ${emp.name}` : "Sales Man verified.");
    } catch (err) {
      setFinalizeEmployee(null);
      toast.error(
        err instanceof ApiError ? err.message : "Invalid employee password."
      );
    } finally {
      setVerifyingEmployee(false);
    }
  };

  const handleSaveDelivery = async () => {
    if (!token || !paymentContext) return;
    if (!serviceId) {
      toast.error("Select a service.");
      return;
    }

    if (requiresDeliveryEmployee) {
      const code = deliveryCode.trim();
      if (!code || code === "0") {
        toast.error("Delivery code/password is required for this service.");
        return;
      }
    }

    setSavingDelivery(true);
    const seq = selectSeq.current;
    try {
      await upsertSaleDelivery(token, {
        sthId: paymentContext.sthId,
        custId: effectiveCustId ?? savedDelivery?.custId ?? null,
        customerName: customerName.trim() || null,
        tel: telephone.trim() || null,
        address: address.trim() || null,
        salesServiceId: Number(serviceId),
        deliveryCodeOrPassword: requiresDeliveryEmployee
          ? deliveryCode.trim() || null
          : null,
      });
      // Saving the service rewrites TotalBillNet server-side (items + service cost),
      // so the payable amount must be re-read from the payment context too.
      const [refreshed, payment] = await Promise.all([
        getSaleDeliveryContext(token, paymentContext.sthId),
        salesKindId != null && salesKindId > 0
          ? getSalePaymentContext(token, paymentContext.sthId, salesKindId)
          : getSalePaymentContext(token, paymentContext.sthId),
      ]);
      if (selectSeq.current !== seq) return;
      deliveryLoadedForRef.current = paymentContext.sthId;
      setDeliveryContext(refreshed);
      applyDeliveryForm(refreshed);
      setPaymentContext(payment);
      toast.success("Customer + Delivery saved.");
    } catch (err) {
      if (selectSeq.current === seq) {
        toast.error(
          err instanceof ApiError ? err.message : "Failed to save delivery."
        );
      }
    } finally {
      if (selectSeq.current === seq) setSavingDelivery(false);
    }
  };

  const handleFinalize = async (printAfter = false) => {
    if (!token || !paymentContext || selectedSthId == null || isFinalizing) return;

    if (paymentContext.billTyp === 1) return; // finalized: buttons do nothing here.

    if (deliveryMissingReasons.length > 0) {
      toast.error(deliveryMissingReasons[0]);
      return;
    }

    // Customer is mandatory on this page; the server re-checks via RequireCustomer.
    if (!customerPresent) {
      toast.error("Customer is required before finalization.");
      return;
    }

    if (!finalizeEmployee) {
      toast.error("Verify the finalizing employee code.");
      return;
    }

    const sthId = paymentContext.sthId;
    if (salesKindId == null || salesKindId <= 0) {
      toast.error("Select a sales kind.");
      return;
    }

    const entries = methods
      .map((m) => ({
        paymentMethodId: m.paymentMethodId,
        amount: money(Number(amounts[m.paymentMethodId] ?? 0) || 0),
      }))
      .filter((p) => p.amount > 0);

    if (entries.length === 0) {
      toast.error("Enter at least one payment amount greater than zero.");
      return;
    }

    if (paymentTotal !== payable) {
      toast.error(
        `Payment total ${paymentTotal.toFixed(2)} must equal payable ${payable.toFixed(2)}.`
      );
      return;
    }

    setIsFinalizing(true);
    try {
      const outcome = await finalizeWithPrintIfNeeded({
        inFlight: false,
        printAfter,
        finalize: () =>
          finalizeSalePayment(token, {
            sthId,
            salesKindId,
            payments: entries,
            // Server re-verifies the employee code and the customer before committing.
            employeeCode: finalizeEmployee?.code ?? null,
            custId: effectiveCustId ?? savedDelivery?.custId ?? null,
            requireCustomer: true,
          }),
        // Read-only GET of the persisted invoice; never finalizes or pays again.
        fetchReceipt: (id) => getSalesReceipt(token, id),
        onFinalized: (result) => {
          // A replay means the sale was already finalized: no new payment was recorded.
          if (result.replay) {
            toast.message(
              `Sale ${result.sthId} was already finalized. No new payment was recorded.`
            );
          } else {
            toast.success(
              `Sale ${result.sthId} paid. ${result.paymentStatus || "Payment finalized"}.`
            );
          }
        },
      });

      if (outcome.kind === "finalize-failed") {
        // Keep the invoice in the list and preserve the entered payment data.
        const err = outcome.error;
        toast.error(
          err instanceof ApiError ? err.message : "Payment finalization failed."
        );
        return;
      }

      if (outcome.kind === "printed") {
        setReceiptToPrint({ receipt: outcome.receipt, width: paperWidth });
      } else if (outcome.kind === "print-blocked") {
        toast.error(
          outcome.reason === "not-finalized"
            ? "The server reports this invoice is not finalized. Printing skipped."
            : "Payment finalized, but the receipt data could not be loaded. Printing skipped."
        );
      }

      // Finalized server-side: drop the row, reset the panel, refresh from the database.
      selectSeq.current += 1; // invalidate any in-flight selection load
      resetPanel();
      await loadList();
    } finally {
      setIsFinalizing(false);
    }
  };

  const canFinalize = Boolean(
    token &&
      paymentContext &&
      paymentContext.billTyp !== 1 &&
      !isFinalizing &&
      !loadingSale &&
      salesKindId != null &&
      salesKindId > 0 &&
      methods.length > 0 &&
      totalsMatch &&
      blockReasons.length === 0
  );

  const finalizeButtonDisabledProps = (printAfter: boolean) => ({
    disabled: !canFinalize,
    onClick: () => void handleFinalize(printAfter),
  });

  return (
    <PageGuard
      permission={PERMISSIONS.sales.view}
      redirectTo="/unauthorized?from=sales&permission=Sales.View"
    >
      <div className="flex flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Pending Sales
            <span className="ms-2 text-base font-normal text-muted-foreground">
              المبيعات المعلقة
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Saved invoices that are not paid yet. Select one to complete its
            payment and finalize it. Finalizing never creates a new invoice.
          </p>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Pending invoices</CardTitle>
                <CardDescription>
                  Current pharmacy only, unfinalized sales.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={listLoading || !token}
                onClick={() => void loadList()}
              >
                {listLoading ? "Refreshing…" : "Refresh"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {listError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"
                >
                  {listError}
                </div>
              ) : null}

              {listLoading && pendingList.length === 0 ? (
                <p className="text-muted-foreground text-sm">Loading pending invoices…</p>
              ) : null}

              {!listLoading && !listError && pendingList.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No pending invoices for this pharmacy.
                </p>
              ) : null}

              {pendingList.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Total Sales Value</TableHead>
                        <TableHead>Salesman</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingList.map((row) => (
                        <TableRow
                          key={row.sthId}
                          data-selected={selectedSthId === row.sthId || undefined}
                          className={cn(
                            "cursor-pointer",
                            selectedSthId === row.sthId && "bg-accent"
                          )}
                          onClick={() => void selectInvoice(row.sthId)}
                        >
                          <TableCell className="font-medium">{row.sthId}</TableCell>
                          <TableCell>{formatMoney(row.totalBill)}</TableCell>
                          <TableCell>{row.salesmanName?.trim() || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
              <CardDescription>
                {selectedSthId != null
                  ? `Invoice ${selectedSthId}`
                  : "Select a pending invoice to complete payment."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!paymentContext ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  {loadingSale
                    ? "Loading invoice…"
                    : "Select a pending invoice to complete payment."}
                </p>
              ) : (
                <>
                  <div className="grid gap-1 text-sm sm:grid-cols-2">
                    <div>Invoice No: {paymentContext.sthId}</div>
                    <div>Status: {paymentContext.paymentStatus}</div>
                    <div>TotalBill: {formatMoney(paymentContext.totalBill)}</div>
                    <div>
                      Sale Total (payable): {formatMoney(paymentContext.finalPayableAmount)}
                    </div>
                  </div>

                  {/* Item lines with the selected sales unit names (علبة/شريط), same projection as the receipt. */}
                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm font-medium">Items</p>
                    {saleDetails == null ? (
                      <p className="text-muted-foreground text-sm">
                        {loadingSale ? "Loading items…" : "Item details are not available."}
                      </p>
                    ) : saleDetails.lines.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No item lines on this invoice.
                      </p>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code</TableHead>
                              <TableHead>Item</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                              <TableHead className="text-right">Price</TableHead>
                              <TableHead className="text-right">Disc</TableHead>
                              <TableHead className="text-right">Net</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {saleDetails.lines.map((line) => (
                              <TableRow key={line.lineNo}>
                                <TableCell>{line.itemCode ?? "—"}</TableCell>
                                <TableCell dir="rtl">{line.itemName ?? "—"}</TableCell>
                                <TableCell>{line.unitName ?? "—"}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {line.quantity.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatMoney(line.unitPrice)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatMoney(line.lineDiscount)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatMoney(line.lineNet)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <p className="text-sm font-medium">
                      Customer
                      <span className="text-destructive"> *</span>
                    </p>
                    <div className="space-y-1">
                      <Label>Select customer</Label>
                      <SalesCustomerAutocomplete
                        value={customerQuery || customerSelection?.label || ""}
                        token={token}
                        disabled={isFinalizing}
                        onQueryChange={(text) => {
                          setCustomerQuery(text);
                          setCustomerSelection(null);
                        }}
                        onCustomerSelected={(customer: CustomerItem) => {
                          const name =
                            customer.custNameAr?.trim() ||
                            customer.custNameEn?.trim() ||
                            "";
                          setCustomerSelection({
                            custId: customer.custCode,
                            label: `${customer.custCode} — ${name}`,
                          });
                          setCustomerQuery("");
                          setCustomerName((prev) => prev || name);
                          setTelephone((prev) => prev || (customer.custMobile ?? ""));
                          setAddress((prev) => prev || (customer.custAddress ?? ""));
                        }}
                      />
                      {customerSelection ? (
                        <div className="text-muted-foreground text-sm">
                          {customerSelection.label}
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">
                          No customer selected.
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label htmlFor="pending-customer-name">Customer (delivery contact)</Label>
                        <Input
                          id="pending-customer-name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="pending-customer-tel">Telephone</Label>
                        <Input
                          id="pending-customer-tel"
                          value={telephone}
                          onChange={(e) => setTelephone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="pending-customer-address">Address</Label>
                        <Input
                          id="pending-customer-address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Delivery</span>
                      <Button
                        type="button"
                        size="sm"
                        variant={deliveryRequired ? "default" : "outline"}
                        aria-pressed={deliveryRequired}
                        disabled={isFinalizing}
                        onClick={() =>
                          setDeliveryWanted((v) =>
                            deliveryMandatory || paymentRequiresDelivery ? v : !v
                          )
                        }
                      >
                        {deliveryRequired ? "Delivery required" : "Require delivery"}
                      </Button>
                    </div>

                    {deliveryRequired ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="pending-service">Delivery service</Label>
                          <select
                            id="pending-service"
                            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                            value={serviceId}
                            onChange={(e) => {
                              setServiceId(e.target.value);
                              setDeliveryCode("");
                              setDeliveryEmployeeName("");
                            }}
                          >
                            <option value="">Select service…</option>
                            {(deliveryContext?.availableServices ?? []).map((service) => (
                              <option key={service.salesServiceId} value={service.salesServiceId}>
                                {service.serviceName} ({service.serviceType}) —{" "}
                                {formatMoney(service.cost)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {requiresDeliveryEmployee ? (
                          <div className="space-y-3 rounded-md border p-3">
                            <div className="space-y-1">
                              <Label htmlFor="pending-delivery-code">
                                Delivery Code / Password
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                <Input
                                  id="pending-delivery-code"
                                  type="password"
                                  className="w-48"
                                  value={deliveryCode}
                                  onChange={(e) => {
                                    setDeliveryCode(e.target.value);
                                    setDeliveryEmployeeName("");
                                  }}
                                  autoComplete="off"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={resolvingEmployee || !token}
                                  onClick={() => void handleResolveDeliveryEmployee()}
                                >
                                  {resolvingEmployee ? "Looking up…" : "Lookup"}
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="pending-delivery-employee">Delivery Employee</Label>
                              <Input
                                id="pending-delivery-employee"
                                readOnly
                                value={deliveryEmployeeName}
                                placeholder="Resolved name"
                              />
                            </div>
                          </div>
                        ) : null}

                        <Button
                          type="button"
                          variant="secondary"
                          disabled={savingDelivery || !serviceId || isFinalizing}
                          onClick={() => void handleSaveDelivery()}
                        >
                          {savingDelivery ? "Saving…" : "Save Customer + Delivery"}
                        </Button>
                      </div>
                    ) : null}

                    {blockReasons.length > 0 ? (
                      <div className="text-destructive text-xs" role="alert">
                        <p>Finalize is disabled until these are resolved:</p>
                        <ul className="list-disc ps-4">
                          {blockReasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <Label htmlFor="pending-sales-kind">Sales Kind</Label>
                    <select
                      id="pending-sales-kind"
                      className="border-input bg-background h-9 w-full rounded-md border px-2"
                      disabled={isFinalizing || salesKinds.length === 0}
                      value={salesKindId ?? ""}
                      onChange={(e) => void onSalesKindChange(e.target.value)}
                    >
                      <option value="">Select Sales Kind</option>
                      {salesKinds.map((k) => (
                        <option key={k.salesKindId} value={k.salesKindId}>
                          {k.salesKindName?.trim() || `Kind #${k.salesKindId}`}
                        </option>
                      ))}
                    </select>
                    {salesKinds.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No sales kinds assigned to the current pharmacy.
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    {!salesKindId ? (
                      <p className="text-muted-foreground text-sm">
                        Select a sales kind to load payment methods.
                      </p>
                    ) : methods.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        {loadingMethods
                          ? "Loading payment methods…"
                          : "No payment methods assigned for this pharmacy and sales kind."}
                      </p>
                    ) : (
                      methods.map((m) => (
                        <div
                          key={m.paymentMethodId}
                          className="flex items-center justify-between gap-2"
                        >
                          <Label className="min-w-24">
                            {m.paymentName || m.paymentMethodId}
                          </Label>
                          <Input
                            className="w-32"
                            type="number"
                            min={0}
                            step="0.01"
                            disabled={isFinalizing}
                            value={amounts[m.paymentMethodId] ?? "0"}
                            onChange={(e) =>
                              setAmounts((prev) => ({
                                ...prev,
                                [m.paymentMethodId]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      ))
                    )}
                    <div className="grid gap-1 text-sm">
                      <div>Amount already paid: {paidAmount.toFixed(2)}</div>
                      <div>Payment entered: {paymentTotal.toFixed(2)}</div>
                      <div className="font-medium">
                        {savedDelivery?.serviceCost != null
                          ? "Total Due (incl. delivery service):"
                          : "Total Due:"}{" "}
                        {payable.toFixed(2)}
                      </div>
                      <div>Remaining balance: {remainingBalance.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <Label htmlFor="pending-finalize-emp-code">Finalizing Employee *</Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        id="pending-finalize-emp-code"
                        type="password"
                        className="w-48"
                        placeholder="Enter employee password"
                        autoComplete="off"
                        disabled={isFinalizing}
                        value={employeeCode}
                        onChange={(e) => {
                          setEmployeeCode(e.target.value);
                          setFinalizeEmployee(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleResolveFinalizingEmployee();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={verifyingEmployee || !token || isFinalizing}
                        onClick={() => void handleResolveFinalizingEmployee()}
                      >
                        {verifyingEmployee ? "Checking…" : "Verify"}
                      </Button>
                    </div>
                    {finalizeEmployee ? (
                      <p className="text-sm text-green-700">
                        Verified: {finalizeEmployee.name ?? `Employee #${finalizeEmployee.id}`}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                    <div className="mr-auto flex items-center gap-1">
                      <span className="text-muted-foreground text-xs">Receipt</span>
                      <Button
                        type="button"
                        size="sm"
                        variant={paperWidth === 80 ? "default" : "outline"}
                        aria-pressed={paperWidth === 80}
                        onClick={() => setPaperWidth(80)}
                      >
                        80 mm
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={paperWidth === 58 ? "default" : "outline"}
                        aria-pressed={paperWidth === 58}
                        onClick={() => setPaperWidth(58)}
                      >
                        58 mm
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      {...finalizeButtonDisabledProps(false)}
                    >
                      {isFinalizing ? "Finalizing…" : "Finalize"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      {...finalizeButtonDisabledProps(true)}
                    >
                      {isFinalizing ? "Finalizing…" : "Finalize & Print"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {receiptToPrint ? (
        <SalesThermalReceipt
          receipt={receiptToPrint.receipt}
          width={receiptToPrint.width}
          onClose={() => setReceiptToPrint(null)}
        />
      ) : null}
    </PageGuard>
  );
}
