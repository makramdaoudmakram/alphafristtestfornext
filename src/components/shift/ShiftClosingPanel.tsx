"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
  ApiError,
  closeShift,
  getShiftClosingPreview,
  lookupSalesManByPassword,
} from "@/lib/api-client";
import { SHIFT_CLOSING_TOTAL_ROWS } from "@/lib/shift-closing-labels";
import {
  classifyShiftClosingPreview,
  PENDING_DELIVERY_PATH,
  PENDING_SALES_PATH,
} from "@/lib/shift-close-blockers";
import {
  formatMoneyDifference,
  validateShiftCloseForm,
} from "@/lib/shift-close-validation";
import type { ShiftClosingPreview, ShiftStatus } from "@/types/shift";

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(2);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

type ShiftClosingPanelProps = {
  token: string | null;
  status: ShiftStatus | null;
  onShiftClosed: () => Promise<void>;
};

export function ShiftClosingPanel({
  token,
  status,
  onShiftClosed,
}: ShiftClosingPanelProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<ShiftClosingPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeFlowOpen, setCloseFlowOpen] = useState(false);

  const [actualCash, setActualCash] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [employeePasswordInput, setEmployeePasswordInput] = useState("");
  const [verifiedSalesMan, setVerifiedSalesMan] = useState<{
    name: string;
    code: string;
    submitPassword: string;
  } | null>(null);
  const [closingNotes, setClosingNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const scId = status?.scId ?? null;
  const hasOpenShift = Boolean(status?.hasOpenShift && scId != null);

  const clientValidation = useMemo(
    () =>
      validateShiftCloseForm({
        actualCash,
        transferAmount,
      }),
    [actualCash, transferAmount]
  );

  const clearSalesMan = () => {
    setVerifiedSalesMan(null);
    setEmployeePasswordInput("");
    setPreview(null);
  };

  const runBlockerChecksAndLoadPreview = useCallback(async (): Promise<boolean> => {
    if (!token || !hasOpenShift) {
      return false;
    }

    setLoadingPreview(true);
    setPreview(null);
    try {
      const data = await getShiftClosingPreview(token, scId);
      const classified = classifyShiftClosingPreview(data);
      if (!classified.ok) {
        if (classified.kind === "pending-sales") {
          toast.error("Resolve pending sales before closing the shift.");
          router.push(PENDING_SALES_PATH);
        } else {
          toast.error("Resolve pending delivery orders before closing the shift.");
          router.push(PENDING_DELIVERY_PATH);
        }
        setCloseFlowOpen(false);
        setVerifiedSalesMan(null);
        setEmployeePasswordInput("");
        return false;
      }
      setPreview(classified.preview);
      return true;
    } catch (err) {
      setPreview(null);
      toast.error(
        err instanceof ApiError ? err.message : "تعذر تحميل معاينة إغلاق الوردية."
      );
      return false;
    } finally {
      setLoadingPreview(false);
    }
  }, [token, hasOpenShift, scId, router]);

  const openCloseFlow = () => {
    setCloseFlowOpen(true);
    setFormError(null);
    setPreview(null);
  };

  useEffect(() => {
    if (!closeFlowOpen) {
      setActualCash("");
      setTransferAmount("");
      setEmployeePasswordInput("");
      setVerifiedSalesMan(null);
      setClosingNotes("");
      setFormError(null);
    }
  }, [closeFlowOpen]);

  const resolveSalesMan = async () => {
    if (!token) return;
    if (verifiedSalesMan) return;

    const password = employeePasswordInput.trim();
    if (!password) {
      toast.error("Enter Sales Man password.");
      return;
    }

    try {
      const emp = await lookupSalesManByPassword(token, password);
      if (!emp?.id || emp.employType !== 1) {
        toast.error("Sales Man not found");
        setVerifiedSalesMan(null);
        setEmployeePasswordInput("");
        return;
      }
      setVerifiedSalesMan({
        name: emp.name ?? "",
        code: emp.code ?? "",
        submitPassword: password,
      });
      setEmployeePasswordInput("");
      toast.success("Sales Man loaded.");
      void runBlockerChecksAndLoadPreview();
    } catch (err) {
      setVerifiedSalesMan(null);
      setEmployeePasswordInput("");
      toast.error(
        err instanceof ApiError && err.status !== 404
          ? err.message
          : "Sales Man not found"
      );
    }
  };

  const handleSubmitClose = async () => {
    if (!token || !preview?.canClose || closing) return;

    const validation = validateShiftCloseForm({ actualCash, transferAmount });
    if (!validation.ok) {
      setFormError(validation.message);
      return;
    }

    if (!verifiedSalesMan?.submitPassword) {
      setFormError("Verify Sales Man password before closing.");
      return;
    }

    setFormError(null);
    setClosing(true);
    const passwordForClose = verifiedSalesMan.submitPassword;
    try {
      const result = await closeShift(token, {
        scId: preview.scId,
        actualPharmacyCash: validation.actual,
        headOfficeTransferAmount: validation.transfer,
        employeePassword: passwordForClose,
        closingNotes: closingNotes.trim() || null,
      });
      toast.success(
        `تم إغلاق الوردية ${result.scId}. الوردية الجديدة ${result.nextScId} — رصيد فتح ${formatMoney(
          result.nextOpeningBalance
        )}`
      );
      setPreview(null);
      setCloseFlowOpen(false);
      clearSalesMan();
      await onShiftClosed();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
        if (err.status === 409) {
          await onShiftClosed();
        } else {
          await runBlockerChecksAndLoadPreview();
        }
      } else {
        toast.error("فشل إغلاق الوردية.");
        await runBlockerChecksAndLoadPreview();
      }
    } finally {
      setClosing(false);
    }
  };

  if (!hasOpenShift) {
    return null;
  }

  const displayStartedAt =
    preview?.shiftStartedAt ?? status?.openedAt ?? null;
  const displayOpening =
    preview?.openingBalance ?? status?.openingBalance ?? null;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>إغلاق الوردية / Close shift</CardTitle>
        <CardDescription>
         لا بد من التحقق من عدم وجود اى اوردرات معلقه او فواتير معلقه
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!closeFlowOpen ? (
          <Button
            type="button"
            variant="destructive"
            disabled={!token || loadingPreview}
            onClick={openCloseFlow}
          >
            Close
          </Button>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={loadingPreview || closing || !verifiedSalesMan}
                onClick={() => void runBlockerChecksAndLoadPreview()}
              >
                {loadingPreview ? "جاري التحميل…" : "Refresh preview"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={closing}
                onClick={() => {
                  setCloseFlowOpen(false);
                  setPreview(null);
                  clearSalesMan();
                }}
              >
                Cancel
              </Button>
            </div>

            <div className="space-y-2 rounded-md border p-4">
              <h3 className="text-sm font-semibold">Sales Man</h3>
              {verifiedSalesMan ? (
                <div className="max-w-md space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name: </span>
                    {verifiedSalesMan.name || "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Code: </span>
                    {verifiedSalesMan.code || "—"}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={closing}
                    onClick={clearSalesMan}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <Input
                  id="shift-emp-password"
                  type="password"
                  autoComplete="off"
                  placeholder="Enter employee password"
                  className="max-w-xs"
                  disabled={closing}
                  value={employeePasswordInput}
                  onChange={(e) => setEmployeePasswordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void resolveSalesMan();
                    }
                  }}
                />
              )}
              {!verifiedSalesMan ? (
                <p className="text-muted-foreground text-sm">
                  Verify employee password to check pending sales and deliveries.
                </p>
              ) : null}
            </div>

            {loadingPreview && !preview ? (
              <p className="text-muted-foreground text-sm">Loading closing preview…</p>
            ) : null}

            {preview ? (
              <div className="space-y-4">
                <div
                  className={
                    preview.canClose
                      ? "rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm"
                      : "rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
                  }
                >
                  <div className="font-medium">
                    {preview.canClose
                      ? "يمكن إغلاق الوردية."
                      : "لا يمكن الإغلاق حتى تُحل العوائق:"}
                  </div>
                  {preview.blockReason ? (
                    <p className="mt-1 text-muted-foreground">{preview.blockReason}</p>
                  ) : null}
                </div>

                {preview.unresolvedSales.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">
                      فواتير غير مُقفلة —{" "}
                      <Link
                        href="/dashboard/sales/pending"
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        المبيعات المعلقة
                      </Link>
                    </h3>
                    <ul className="divide-y rounded-md border text-sm">
                      {preview.unresolvedSales.map((row) => (
                        <li
                          key={row.sthId}
                          className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2"
                        >
                          <span>فاتورة {row.sthId}</span>
                          <span>صافي: {formatMoney(row.totalBillNet)}</span>
                          <span>تاريخ: {formatDateTime(row.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {preview.pendingDeliveries.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">
                      توصيل معلق —{" "}
                      <Link
                        href="/dashboard/sales/delivery"
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        شاشة التوصيل
                      </Link>
                    </h3>
                    <ul className="divide-y rounded-md border text-sm">
                      {preview.pendingDeliveries.map((row) => (
                        <li
                          key={row.sthId}
                          className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2"
                        >
                          <span>فاتورة {row.sthId}</span>
                          <span>{row.contact ?? "—"}</span>
                          <span>{row.tel ?? "—"}</span>
                          <span>حالة: {row.delivStat ?? "P"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {preview.canClose ? (
                  <div className="space-y-4 rounded-md border p-4">
                    <h3 className="text-sm font-semibold">Closing form</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Shift (Sc_Id)</Label>
                        <Input readOnly value={String(preview.scId)} className="bg-muted" />
                      </div>
                      <div>
                        <Label>Shift start</Label>
                        <Input
                          readOnly
                          value={formatDateTime(displayStartedAt)}
                          className="bg-muted"
                        />
                      </div>
                      <div>
                        <Label>Opening balance (Sc_StartCash)</Label>
                        <Input
                          readOnly
                          value={formatMoney(displayOpening)}
                          className="bg-muted"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="shift-actual-cash">Actual pharmacy cash *</Label>
                        <Input
                          id="shift-actual-cash"
                          type="number"
                          min="0"
                          step="0.01"
                          autoComplete="off"
                          disabled={closing}
                          value={actualCash}
                          onChange={(e) => setActualCash(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="shift-transfer">Head-office transfer *</Label>
                        <Input
                          id="shift-transfer"
                          type="number"
                          min="0"
                          step="0.01"
                          autoComplete="off"
                          disabled={closing}
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Difference (actual − transfer)</Label>
                      <Input
                        readOnly
                        className="bg-muted w-40 font-mono tabular-nums"
                        value={
                          clientValidation.ok
                            ? formatMoneyDifference(clientValidation.difference)
                            : "—"
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="shift-close-notes">Closing note</Label>
                      <Input
                        id="shift-close-notes"
                        maxLength={50}
                        disabled={closing}
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                      />
                    </div>

                    {formError ? (
                      <p className="text-sm text-destructive">{formError}</p>
                    ) : null}
                    {!clientValidation.ok &&
                    actualCash.trim() &&
                    transferAmount.trim() ? (
                      <p className="text-sm text-destructive">
                        {clientValidation.message}
                      </p>
                    ) : null}

                    <Button
                      type="button"
                      variant="destructive"
                      disabled={
                        closing ||
                        loadingPreview ||
                        !clientValidation.ok ||
                        !verifiedSalesMan?.submitPassword
                      }
                      onClick={() => void handleSubmitClose()}
                    >
                      {closing ? "Closing…" : "Submit close"}
                    </Button>
                  </div>
                ) : null}

                <details className="text-sm">
                  <summary className="cursor-pointer font-medium">
                    Closing totals preview (12 items)
                  </summary>
                  <div className="mt-2 overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[320px] text-sm">
                      <tbody>
                        {SHIFT_CLOSING_TOTAL_ROWS.map((row) => (
                          <tr key={row.key} className="border-t">
                            <td className="px-3 py-2">{row.labelEn}</td>
                            <td className="px-3 py-2 text-end font-mono tabular-nums">
                              {formatMoney(preview.totals[row.key])}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
