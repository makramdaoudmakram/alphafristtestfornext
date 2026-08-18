"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getJournalEditBundle,
  updateJournal,
  type JournalEditBundle,
  type JournalLedgerLine,
} from "@/lib/journal-api";
import { getChartLeaves } from "@/lib/manual-journal-api";
import type { AccountSelectItem } from "@/types/collected-voucher";
import { CostCenterCombobox } from "@/components/admin/cost-center-combobox";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Badge } from "@/components/ui/badge";
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type EditableLine = JournalLedgerLine & { rowId: string; isNew?: boolean };

const fieldClass =
  "h-11 border-slate-400 bg-white text-base shadow-sm focus-visible:ring-blue-600";

function toAccountOptions(accounts: AccountSelectItem[]) {
  return accounts.map((a) => ({
    value: a.accCode,
    label: `${a.accCode} - ${a.name}`,
  }));
}

function formatAccountDisplay(code: string, name: string) {
  if (!code) return "—";
  return name && name !== code ? `${code} — ${name}` : code;
}

function toInputDate(value?: string | null) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accOrder: number | null;
  token: string | undefined;
  onSaved: () => void;
};

export function JournalEditSheet({
  open,
  onOpenChange,
  accOrder,
  token,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bundle, setBundle] = useState<JournalEditBundle | null>(null);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [transDate, setTransDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [rate, setRate] = useState("1");
  const [deletedTransNos, setDeletedTransNos] = useState<number[]>([]);
  const [chartAccounts, setChartAccounts] = useState<AccountSelectItem[]>([]);

  const [lineType, setLineType] = useState<"Debit" | "Credit">("Debit");
  const [lineAccount, setLineAccount] = useState("");
  const [lineDescription, setLineDescription] = useState("");
  const [lineAmount, setLineAmount] = useState("");

  const load = useCallback(async () => {
    if (!token || accOrder == null) return;
    setLoading(true);
    try {
      const [data, accounts] = await Promise.all([
        getJournalEditBundle(accOrder, token),
        getChartLeaves(token),
      ]);
      setBundle(data);
      setChartAccounts(accounts);
      setTransDate(toInputDate(data.transDate));
      setDueDate(data.dueDate ? toInputDate(data.dueDate) : "");
      setDescription(data.vNote ?? "");
      setCostCenter(data.costCenter ?? "");
      setCurrency(data.currency ?? "EGP");
      setRate(String(data.rate ?? 1));
      setDeletedTransNos([]);
      setLines(
        data.lines.map((l) => ({
          ...l,
          rowId: `existing-${l.transNO}`,
        }))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load journal");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [accOrder, onOpenChange, token]);

  useEffect(() => {
    if (open && accOrder != null) void load();
    if (!open) {
      setBundle(null);
      setLines([]);
    }
  }, [open, accOrder, load]);

  const accountOptions = useMemo(
    () => toAccountOptions(chartAccounts),
    [chartAccounts]
  );

  const totalDebit = useMemo(
    () => lines.reduce((s, l) => s + (l.type === "Debit" ? l.amountEGP : 0), 0),
    [lines]
  );
  const totalCredit = useMemo(
    () => lines.reduce((s, l) => s + (l.type === "Credit" ? l.amountEGP : 0), 0),
    [lines]
  );
  const difference = Math.round((totalDebit - totalCredit) * 100) / 100;
  const balanced = Math.abs(difference) < 0.001 && totalDebit > 0;

  function addLine() {
    const amount = Number(lineAmount);
    if (!lineAccount.trim()) {
      toast.error("Account should be selected");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const acc = chartAccounts.find((a) => a.accCode === lineAccount);
    setLines((prev) => [
      ...prev,
      {
        rowId: `new-${Date.now()}`,
        transNO: 0,
        isNew: true,
        type: lineType,
        acccountCode: lineAccount,
        accName: acc?.name ?? lineAccount,
        description: lineDescription || description,
        amount,
        amountEGP: amount,
        costCenter: costCenter || null,
      },
    ]);
    setLineAmount("");
    setLineDescription("");
  }

  function removeLine(index: number) {
    setLines((prev) => {
      const row = prev[index];
      if (row && row.transNO > 0) {
        setDeletedTransNos((ids) => [...ids, row.transNO]);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSave() {
    if (!token || accOrder == null || !bundle) return;
    if (!description.trim()) {
      toast.error("Description Required");
      return;
    }
    if (lines.length === 0) {
      toast.error("Please add accounting rows (Debit and Credit).");
      return;
    }
    if (!balanced) {
      toast.error("Total Debit must equal Total Credit.");
      return;
    }

    setSaving(true);
    try {
      await updateJournal(
        accOrder,
        {
          transDate,
          vNote: description,
          dueDate: dueDate || transDate,
          currancy: currency,
          rate: Number(rate) || 1,
          costCenter,
          deleteTransNos: deletedTransNos,
          lines: lines.map((l) => ({
            transNO: l.isNew ? undefined : l.transNO,
            acccountCode: l.acccountCode,
            notes: l.description,
            amount: l.amount,
            depit: l.type === "Debit" ? l.amountEGP : 0,
            credit: l.type === "Credit" ? l.amountEGP : 0,
            costCenter: l.costCenter ?? costCenter,
          })),
        },
        token
      );
      toast.success("Journal updated successfully");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  function renderSource() {
    if (!bundle) return null;
    const { source } = bundle;
    const voucher = source.collectedVoucher ?? source.paymentVoucher;
    if (voucher) {
      return (
        <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-slate-900">{source.sourceLabel}</p>
          <div className="grid gap-1 sm:grid-cols-2">
            <span>Receipt #: {voucher.receiptNO}</span>
            <span>Ref: {voucher.recRef ?? "—"}</span>
            <span>Date: {voucher.receiptDate?.slice(0, 10) ?? "—"}</span>
            <span>Amount: {voucher.amount ?? "—"}</span>
            <span>Party: {voucher.collectedName ?? "—"}</span>
            <span>Method: {voucher.type ?? "—"}</span>
            <span className="sm:col-span-2">
              Description: {voucher.description ?? "—"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Source voucher is shown for reference. Ledger corrections update General
            Ledger directly (Web Forms EditJournal behavior).
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="font-semibold text-slate-900">{source.sourceLabel}</p>
        <p className="text-muted-foreground">
          Ref: {bundle.ref ?? "—"} · Receipt #: {bundle.receiptNO ?? "—"}
        </p>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Edit Journal</SheetTitle>
          <SheetDescription>
            ACCOrder {accOrder ?? "—"} · {bundle?.transType ?? ""}{" "}
            {bundle?.receiptNO ? `#${bundle.receiptNO}` : ""}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <p className="mt-8 text-center text-muted-foreground">Loading journal…</p>
        ) : bundle ? (
          <div className="mt-6 space-y-6">
            {renderSource()}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Transaction Date</Label>
                <Input
                  type="date"
                  className={fieldClass}
                  value={transDate}
                  onChange={(e) => setTransDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  className={fieldClass}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  className={fieldClass}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </div>
              <div>
                <Label>Rate</Label>
                <Input
                  className={fieldClass}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Cost Center</Label>
                <CostCenterCombobox
                  value={costCenter}
                  onValueChange={setCostCenter}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Description (VNote)</Label>
                <Textarea
                  className="min-h-[80px] border-slate-400 text-base"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-300">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-slate-100 text-left font-semibold">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">DR/CR</th>
                    <th className="px-2 py-2">Account</th>
                    <th className="px-2 py-2">Description</th>
                    <th className="px-2 py-2 text-right">Amount</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={l.rowId} className="border-b">
                      <td className="px-2 py-2">{idx + 1}</td>
                      <td className="px-2 py-2">
                        <Badge variant="outline">{l.type}</Badge>
                      </td>
                      <td className="px-2 py-2">
                        {formatAccountDisplay(l.acccountCode, l.accName)}
                      </td>
                      <td className="px-2 py-2">{l.description}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {l.amountEGP.toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(idx)}
                        >
                          <Trash2 className="h-4 w-4 text-red-700" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={lineType}
                  onValueChange={(v) => v && setLineType(v as "Debit" | "Credit")}
                >
                  <SelectTrigger className={fieldClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Debit">Debit</SelectItem>
                    <SelectItem value="Credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Account</Label>
                <SearchableCombobox
                  options={accountOptions}
                  value={lineAccount}
                  onValueChange={setLineAccount}
                  placeholder="Select account"
                  size="lg"
                />
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  className={fieldClass}
                  value={lineAmount}
                  onChange={(e) => setLineAmount(e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <Label>Line description</Label>
                <Input
                  className={fieldClass}
                  value={lineDescription}
                  onChange={(e) => setLineDescription(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" onClick={addLine}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            <div
              className={cn(
                "grid gap-2 rounded-lg border p-4 sm:grid-cols-3",
                balanced ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"
              )}
            >
              <div>
                <p className="text-sm text-muted-foreground">Total Debit</p>
                <p className="text-lg font-bold tabular-nums">{totalDebit.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Credit</p>
                <p className="text-lg font-bold tabular-nums">{totalCredit.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Difference</p>
                <p className="text-lg font-bold tabular-nums">{difference.toFixed(2)}</p>
              </div>
              {!balanced ? (
                <p className="text-sm font-medium text-red-800 sm:col-span-3">
                  Total Debit must equal Total Credit.
                </p>
              ) : null}
            </div>

            <SheetFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={saving || !balanced} onClick={() => void handleSave()}>
                {saving ? "Updating…" : "Update"}
              </Button>
            </SheetFooter>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
