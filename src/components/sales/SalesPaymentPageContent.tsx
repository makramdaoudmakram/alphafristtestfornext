"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { PageGuard } from "@/components/permissions/page-guard";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  ApiError,
  finalizeSalePayment,
  getSaleDeliveryContext,
  getSalePaymentContext,
  resolveSaleDeliveryEmployee,
  upsertSaleDelivery,
} from "@/lib/api-client";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { SalesDeliveryContext, SalesServiceOption } from "@/types/sales-delivery";
import type { SalesPaymentContext } from "@/types/sales-payment";

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return money(value).toFixed(2);
}

export function SalesPaymentPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? null;

  const [sthIdInput, setSthIdInput] = useState("");
  const [paymentContext, setPaymentContext] = useState<SalesPaymentContext | null>(null);
  const [deliveryContext, setDeliveryContext] = useState<SalesDeliveryContext | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [telephone, setTelephone] = useState("");
  const [address, setAddress] = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const [deliveryCode, setDeliveryCode] = useState("");
  const [deliveryEmployeeName, setDeliveryEmployeeName] = useState("");
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [resolvingEmployee, setResolvingEmployee] = useState(false);

  const isFinalized = paymentContext?.billTyp === 1;

  const selectedService: SalesServiceOption | null = useMemo(() => {
    if (!deliveryContext || !serviceId) return null;
    const id = Number(serviceId);
    return (
      deliveryContext.availableServices.find((s) => s.salesServiceId === id) ?? null
    );
  }, [deliveryContext, serviceId]);

  const requiresDeliveryEmployee = Boolean(selectedService?.requiresDeliveryEmployee);

  const paymentTotal = useMemo(() => {
    return money(
      selectedIds.reduce((sum, id) => {
        const raw = amounts[id]?.trim() ?? "";
        const parsed = Number(raw);
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0)
    );
  }, [selectedIds, amounts]);

  const saleTotal = paymentContext ? money(paymentContext.finalPayableAmount) : 0;
  const totalsMatch =
    paymentContext != null && paymentTotal === saleTotal && selectedIds.length > 0;
  const readyToPay = Boolean(paymentContext && !isFinalized && totalsMatch);

  const applyDeliveryForm = (ctx: SalesDeliveryContext) => {
    const d = ctx.delivery;
    setCustomerName(d?.customerName ?? "");
    setTelephone(d?.tel ?? "");
    setAddress(d?.address ?? "");
    setServiceId(d?.salesServiceId != null ? String(d.salesServiceId) : "");
    setDeliveryCode("");
    setDeliveryEmployeeName(d?.deliveryEmployeeName ?? "");
  };

  const loadSale = async () => {
    if (!token) {
      toast.error("Not authenticated.");
      return;
    }
    const sthId = Number(sthIdInput.trim());
    if (!Number.isInteger(sthId) || sthId <= 0) {
      toast.error("Enter a valid Sale number (Sth_Id).");
      return;
    }

    setLoading(true);
    try {
      const [payment, delivery] = await Promise.all([
        getSalePaymentContext(token, sthId),
        getSaleDeliveryContext(token, sthId),
      ]);
      setPaymentContext(payment);
      setDeliveryContext(delivery);
      applyDeliveryForm(delivery);
      setSelectedIds([]);
      setAmounts({});
      toast.success(`Loaded sale ${payment.sthId}`);
    } catch (err) {
      setPaymentContext(null);
      setDeliveryContext(null);
      toast.error(err instanceof ApiError ? err.message : "Failed to load sale.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMethod = (methodId: number, checked: boolean) => {
    if (isFinalized) return;
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(methodId) ? prev : [...prev, methodId];
      }
      return prev.filter((id) => id !== methodId);
    });
    if (!checked) {
      setAmounts((prev) => {
        const next = { ...prev };
        delete next[methodId];
        return next;
      });
    }
  };

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
      toast.success(employee.name ? `Delivery: ${employee.name}` : "Delivery employee found.");
    } catch (err) {
      setDeliveryEmployeeName("");
      toast.error(
        err instanceof ApiError ? err.message : "Invalid delivery code/password."
      );
    } finally {
      setResolvingEmployee(false);
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
    try {
      await upsertSaleDelivery(token, {
        sthId: paymentContext.sthId,
        custId: deliveryContext?.delivery?.custId ?? null,
        customerName: customerName.trim() || null,
        tel: telephone.trim() || null,
        address: address.trim() || null,
        salesServiceId: Number(serviceId),
        deliveryCodeOrPassword: requiresDeliveryEmployee
          ? deliveryCode.trim() || null
          : null,
      });
      const refreshed = await getSaleDeliveryContext(token, paymentContext.sthId);
      setDeliveryContext(refreshed);
      applyDeliveryForm(refreshed);
      toast.success("Customer + Delivery saved.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save delivery.");
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleFinalize = async () => {
    if (!token || !paymentContext || !readyToPay) return;

    const payments = selectedIds.map((paymentMethodId) => ({
      paymentMethodId,
      amount: money(Number(amounts[paymentMethodId] ?? 0)),
    }));

    if (payments.some((p) => p.amount <= 0)) {
      toast.error("Every selected payment amount must be greater than zero.");
      return;
    }

    setFinalizing(true);
    try {
      const result = await finalizeSalePayment(token, {
        sthId: paymentContext.sthId,
        payments,
      });
      toast.success(result.paymentStatus);
      const refreshed = await getSalePaymentContext(token, paymentContext.sthId);
      setPaymentContext(refreshed);
      setSelectedIds([]);
      setAmounts({});
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Payment finalization failed.");
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <PageGuard
      permission={PERMISSIONS.sales.view}
      redirectTo="/unauthorized?from=sales&permission=Sales.View"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="text-muted-foreground text-sm">
            Customer + Delivery is separate from Payment. Finalize Payment only creates payment
            rows and sets BillTyp.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Load sale</CardTitle>
            <CardDescription>
              Sale must already exist. Sale create remains out of this phase.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="sthId">Sale number (Sth_Id)</Label>
              <Input
                id="sthId"
                className="w-40"
                value={sthIdInput}
                onChange={(event) => setSthIdInput(event.target.value)}
                placeholder="e.g. 1001"
              />
            </div>
            <Button type="button" onClick={() => void loadSale()} disabled={loading || !token}>
              {loading ? "Loading…" : "Load"}
            </Button>
          </CardContent>
        </Card>

        {paymentContext && deliveryContext ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Customer + Delivery</CardTitle>
                <CardDescription>
                  Delivery service is not a payment method. Service list comes from the current
                  pharmacy assignment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Customer</p>
                  <div className="space-y-1">
                    <Label htmlFor="customerName">Customer</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="telephone">Telephone</Label>
                    <Input
                      id="telephone"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <p className="text-sm font-medium">Delivery</p>
                  <div className="space-y-1">
                    <Label htmlFor="service">Service</Label>
                    <select
                      id="service"
                      className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                      value={serviceId}
                      onChange={(e) => {
                        setServiceId(e.target.value);
                        setDeliveryCode("");
                        setDeliveryEmployeeName("");
                      }}
                    >
                      <option value="">Select service…</option>
                      {deliveryContext.availableServices.map((service) => (
                        <option key={service.salesServiceId} value={service.salesServiceId}>
                          {service.serviceName} ({service.serviceType}) — {formatMoney(service.cost)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Service cost</Label>
                    <Input
                      readOnly
                      value={
                        selectedService
                          ? formatMoney(selectedService.cost)
                          : deliveryContext.delivery?.serviceCost != null
                            ? formatMoney(deliveryContext.delivery.serviceCost)
                            : ""
                      }
                    />
                    <p className="text-muted-foreground text-xs">
                      Saved sales keep historical ServiceCost on SalesDelivInfo (not live master
                      cost).
                    </p>
                  </div>

                  {requiresDeliveryEmployee ? (
                    <div className="space-y-3 rounded-md border p-3">
                      <div className="space-y-1">
                        <Label htmlFor="deliveryCode">Delivery Code / Password</Label>
                        <div className="flex flex-wrap gap-2">
                          <Input
                            id="deliveryCode"
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
                        <Label htmlFor="deliveryEmployee">Delivery Employee</Label>
                        <Input
                          id="deliveryEmployee"
                          readOnly
                          value={deliveryEmployeeName}
                          placeholder="Resolved name"
                        />
                      </div>
                    </div>
                  ) : selectedService ? (
                    <p className="text-muted-foreground text-sm">
                      This service does not require a delivery employee.
                    </p>
                  ) : null}
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={savingDelivery || !serviceId}
                  onClick={() => void handleSaveDelivery()}
                >
                  {savingDelivery ? "Saving…" : "Save Customer + Delivery"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
                <CardDescription>
                  Status: {paymentContext.paymentStatus} (BillTyp = {paymentContext.billTyp})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>TotalBill: {formatMoney(paymentContext.totalBill)}</div>
                  <div>TotalBillAfterDisc: {formatMoney(paymentContext.totalBillAfterDisc)}</div>
                  <div>TotalBillNet: {formatMoney(paymentContext.totalBillNet)}</div>
                  <div className="font-medium">
                    Sale Total (payable): {formatMoney(paymentContext.finalPayableAmount)}
                  </div>
                  {deliveryContext.delivery?.serviceCost != null ? (
                    <div className="text-muted-foreground sm:col-span-2 text-xs">
                      Delivery ServiceCost snapshot:{" "}
                      {formatMoney(deliveryContext.delivery.serviceCost)} (not auto-added to
                      Phase 9 payable total)
                    </div>
                  ) : null}
                </div>

                {isFinalized ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-emerald-700">
                      Paid / Payment Finalized — payment controls are disabled.
                    </p>
                    <ul className="space-y-1 text-sm">
                      {paymentContext.existingPayments.map((row) => (
                        <li key={`${row.paymentMethodId}-${row.amount}`}>
                          {row.paymentName ?? row.paymentMethodId}: {formatMoney(row.amount)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <Label>Payment methods</Label>
                      {paymentContext.availablePaymentMethods.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          No active payment methods are assigned to this pharmacy.
                        </p>
                      ) : (
                        paymentContext.availablePaymentMethods.map((method) => {
                          const checked = selectedIds.includes(method.paymentMethodId);
                          return (
                            <div
                              key={method.paymentMethodId}
                              className="flex flex-col gap-2 rounded-md border p-3"
                            >
                              <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={checked}
                                  onChange={(event) =>
                                    toggleMethod(
                                      method.paymentMethodId,
                                      event.target.checked
                                    )
                                  }
                                />
                                <span>
                                  {method.paymentName ?? `Method ${method.paymentMethodId}`}
                                </span>
                              </label>
                              {checked ? (
                                <div className="space-y-1 pl-6">
                                  <Label htmlFor={`amt-${method.paymentMethodId}`}>
                                    {(method.paymentName ?? "Amount") + " amount"}
                                  </Label>
                                  <Input
                                    id={`amt-${method.paymentMethodId}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="w-40"
                                    value={amounts[method.paymentMethodId] ?? ""}
                                    onChange={(event) =>
                                      setAmounts((prev) => ({
                                        ...prev,
                                        [method.paymentMethodId]: event.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="grid gap-1 text-sm">
                      <div>Sale Total: {formatMoney(saleTotal)}</div>
                      <div>Payment Total: {formatMoney(paymentTotal)}</div>
                      <div>
                        Status:{" "}
                        {readyToPay
                          ? "Ready to Pay"
                          : selectedIds.length === 0
                            ? "Select payment method(s)"
                            : "Payment total must equal sale total"}
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => void handleFinalize()}
                      disabled={!readyToPay || finalizing}
                    >
                      {finalizing ? "Finalizing…" : "Finalize Payment"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </PageGuard>
  );
}
