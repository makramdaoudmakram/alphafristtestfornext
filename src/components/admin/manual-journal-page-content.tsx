"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  createManualJournal,
  getChartLeaves,
  getCurrencies,
  getManualJournal,
  getManualJournalAdjacent,
  getManualJournalLast,
  searchManualJournals,
  type CurrencySelectItem,
  type ManualJournalView,
} from "@/lib/manual-journal-api";
import type { AccountSelectItem } from "@/types/collected-voucher";
import { PageGuard } from "@/components/permissions/page-guard";
import { CostCenterCombobox } from "@/components/admin/cost-center-combobox";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type LedgerLine = {
  rowId: string;
  type: "Debit" | "Credit";
  acccountCode: string;
  accName: string;
  description: string;
  amount: number;
  amountEGP: number;
};

function toInputDate(value?: string | null) {
  if (!value) {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return toInputDate();
  return d.toISOString().slice(0, 10);
}

function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <Label className="mb-1.5 block text-base font-semibold text-slate-800">
      {children}
      {required ? <span className="text-red-600"> *</span> : null}
    </Label>
  );
}

const fieldClass = "h-12 text-lg border-slate-300";

function formatAccountDisplay(code: string, name?: string | null) {
  const n = (name ?? "").trim();
  if (!n || n === code) return code;
  if (n.startsWith(code)) return n;
  return `${code} - ${n}`;
}

function toAccountOptions(items: AccountSelectItem[]) {
  return items.map((a) => ({
    value: a.accCode,
    label: formatAccountDisplay(a.accCode, a.name),
  }));
}

export function ManualJournalPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const userName = session?.user?.name ?? session?.user?.email ?? "system";

  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receiptNo, setReceiptNo] = useState<string | null>(null);
  const [refNo, setRefNo] = useState("");
  const [transDate, setTransDate] = useState(toInputDate());
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [rate, setRate] = useState("1");
  const [costCenter, setCostCenter] = useState("");
  const [description, setDescription] = useState("");
  const [currencies, setCurrencies] = useState<CurrencySelectItem[]>([]);
  const [chartAccounts, setChartAccounts] = useState<AccountSelectItem[]>([]);
  const [lines, setLines] = useState<LedgerLine[]>([]);

  const [lineType, setLineType] = useState<"Debit" | "Credit">("Debit");
  const [lineAccount, setLineAccount] = useState("");
  const [lineDescription, setLineDescription] = useState("");
  const [lineAmount, setLineAmount] = useState("");

  const [findOpen, setFindOpen] = useState(false);
  const [searchMode, setSearchMode] = useState("ref");
  const [searchValue, setSearchValue] = useState("");
  const [searchRows, setSearchRows] = useState<
    Array<{
      receiptNO: string;
      ref: string | null;
      transDate: string | null;
      notes: string | null;
      amount: number | null;
    }>
  >([]);

  const rateNum = parseFloat(rate) || 1;
  const totalDebit = Math.round(
    lines.filter((l) => l.type === "Debit").reduce((s, l) => s + l.amount, 0) * 100
  ) / 100;
  const totalCredit = Math.round(
    lines.filter((l) => l.type === "Credit").reduce((s, l) => s + l.amount, 0) * 100
  ) / 100;
  const difference = Math.round((totalDebit - totalCredit) * 100) / 100;
  const balanced = Math.abs(difference) < 0.001 && lines.length > 0;

  const applyJournal = useCallback((v: ManualJournalView) => {
    setIsNew(false);
    setReceiptNo(v.receiptNO);
    setRefNo(v.ref ?? "");
    setTransDate(toInputDate(v.transDate));
    setDueDate(v.dueDate ? toInputDate(v.dueDate) : "");
    setCurrency(v.currency ?? "EGP");
    setRate(v.rate != null ? String(v.rate) : "1");
    setCostCenter(v.costCenter ?? "");
    setDescription(v.vNote ?? "");
    setLines(
      v.lines.map((l, i) => ({
        rowId: `gl-${v.receiptNO}-${i}-${l.acccountCode}`,
        type: (l.type === "Credit" ? "Credit" : "Debit") as "Debit" | "Credit",
        acccountCode: l.acccountCode,
        accName: l.accName ?? l.acccountCode,
        description: l.description ?? "",
        amount: l.amount ?? 0,
        amountEGP: l.amountEGP ?? 0,
      }))
    );
  }, []);

  const loadLast = useCallback(async () => {
    if (!token) return;
    try {
      applyJournal(await getManualJournalLast(token));
    } catch {
      setIsNew(true);
      setReceiptNo(null);
      setRefNo("");
      setLines([]);
    }
  }, [token, applyJournal]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const [leaves, curs] = await Promise.all([
          getChartLeaves(token),
          getCurrencies(token),
        ]);
        if (cancelled) return;
        setChartAccounts(leaves);
        if (leaves.length === 0) {
          toast.error(
            "No accounts found in Accounts Chart. Open Accounts Chart and add accounts first."
          );
        }
        // Only Egyptian Pound / US Dollar / Euro
        setCurrencies(curs);
        const egp = curs.find((c) => c.code === "EGP");
        setCurrency("EGP");
        setRate(String(egp?.rate ?? 1));
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : String(e));
      }
      if (!cancelled) void loadLast();
    })();
    return () => {
      cancelled = true;
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCurrencyChange = (code: string) => {
    setCurrency(code);
    const cur = currencies.find((c) => c.code === code);
    setRate(String(cur?.rate ?? 1));
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        amountEGP: Math.round(l.amount * (cur?.rate ?? 1) * 100) / 100,
      }))
    );
  };

  const startNew = () => {
    setIsNew(true);
    setReceiptNo(null);
    setRefNo("");
    setTransDate(toInputDate());
    setDueDate("");
    setDescription("");
    setLines([]);
    setLineType("Debit");
    setLineAccount("");
    setLineDescription("");
    setLineAmount("");
  };

  const navigate = async (direction: string) => {
    if (!token || !receiptNo) return;
    try {
      const next = await getManualJournalAdjacent(receiptNo, direction, token);
      if (!next) return;
      applyJournal(await getManualJournal(next, token));
    } catch {
      /* edge */
    }
  };

  const addLine = () => {
    const amt = parseFloat(lineAmount);
    if (lineType !== "Debit" && lineType !== "Credit") {
      toast.error("Please select Debit/Credit.");
      return;
    }
    if (!lineAccount) {
      toast.error("Account should be selected");
      return;
    }
    if (!(lineDescription || description).trim()) {
      toast.error("Please enter a description for the new row.");
      return;
    }
    if (!lineAmount || Number.isNaN(amt) || amt <= 0) {
      toast.error("Amount 0 not avalable");
      return;
    }
    const acc = chartAccounts.find((a) => a.accCode === lineAccount);
    setLines((prev) => [
      ...prev,
      {
        rowId: `row-${Date.now()}-${prev.length}-${lineAccount}`,
        type: lineType,
        acccountCode: lineAccount,
        accName: acc?.name ?? lineAccount,
        description: (lineDescription || description).trim(),
        amount: amt,
        amountEGP: Math.round(amt * rateNum * 100) / 100,
      },
    ]);
    setLineAccount("");
    setLineDescription("");
    setLineAmount("");
    setLineType("Debit");
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveJournal = async () => {
    if (!token) return;
    if (!transDate.trim()) {
      toast.error("Date Required");
      return;
    }
    if (!description.trim()) {
      toast.error("Description Required");
      return;
    }
    if (lines.length === 0) {
      toast.error("Please add accounting rows (Debit and Credit).");
      return;
    }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]!;
      if (!l.acccountCode) {
        toast.error("Account should be selected");
        return;
      }
      if (!l.amount || l.amount <= 0) {
        toast.error("Amount 0 not avalable");
        return;
      }
    }
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      toast.error("Total debit must be equal total credit , Actions Canceled");
      return;
    }
    if (totalDebit === 0 || totalCredit === 0) {
      toast.error("Total debit and Total credit not allow 0 value, Actions Canceled");
      return;
    }

    const due = dueDate.trim() || transDate;
    setBusy(true);
    try {
      const created = await createManualJournal(
        {
          transDate: new Date(transDate).toISOString(),
          dueDate: new Date(due).toISOString(),
          vNote: description.trim(),
          addedBy: userName,
          costCenter: costCenter || undefined,
          currancy: currency,
          rate: rateNum,
          lines: lines.map((l) => {
            const egp = Math.round(l.amount * rateNum * 100) / 100;
            const isDebit = l.type === "Debit";
            return {
              acccountCode: l.acccountCode,
              notes: l.description,
              amount: l.amount,
              depit: isDebit ? egp : 0,
              credit: isDebit ? 0 : egp,
              currancy: currency,
              rate: rateNum,
              dueDate: new Date(due).toISOString(),
              costCenter: costCenter || undefined,
            };
          }),
        },
        token
      );
      toast.success(`Receipt Number ( ${created.receiptNO} ) updated Done`);
      applyJournal(created);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const doSearch = async () => {
    if (!token || !searchValue.trim()) return;
    try {
      setSearchRows(await searchManualJournals(searchMode, searchValue.trim(), token));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const openSearchRow = async (no: string) => {
    if (!token) return;
    applyJournal(await getManualJournal(no, token));
    setFindOpen(false);
  };

  const canEdit = isNew;
  const voucherDisplay = refNo || receiptNo || "—";

  return (
    <PageGuard>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 p-4 pb-28 md:p-6 md:pb-32">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Adjustment Voucher
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-md px-3 py-1 text-base font-semibold",
                  isNew
                    ? "border-amber-400 bg-amber-100 text-amber-950"
                    : "border-emerald-400 bg-emerald-100 text-emerald-950"
                )}
              >
                {isNew ? "New" : "Posted"}
              </Badge>
              {!isNew && voucherDisplay !== "—" ? (
                <span className="rounded-md border border-slate-300 bg-white px-3 py-1 text-lg font-bold tabular-nums text-slate-900">
                  {voucherDisplay}
                </span>
              ) : null}
            </div>
            <p className="text-lg text-slate-700">
              Manual journal (TransType AJ) — Total Debit must equal Total Credit
            </p>
            <Breadcrumb>
              <BreadcrumbList className="text-base text-slate-700">
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <span className="text-slate-700">Accounts</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Manual Journal</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isNew ? (
              <div className="mr-1 flex items-center gap-0.5 rounded-lg border border-slate-300 bg-white p-0.5">
                {(
                  [
                    ["first", ChevronFirst],
                    ["previous", ChevronLeft],
                    ["next", ChevronRight],
                    ["last", ChevronLast],
                  ] as const
                ).map(([dir, Icon]) => (
                  <Button
                    key={dir}
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-slate-800"
                    disabled={busy}
                    onClick={() => void navigate(dir)}
                  >
                    <Icon className="h-5 w-5" />
                  </Button>
                ))}
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-11 border-slate-400 text-base font-semibold"
              onClick={startNew}
              disabled={busy}
            >
              New
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 border-slate-400 text-base font-semibold"
              onClick={() => setFindOpen(true)}
              disabled={busy}
            >
              <Search className="mr-2 h-4 w-4" />
              Find
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[65%_35%]">
          <Card className="border-slate-300 shadow-sm">
            <CardHeader className="border-b border-slate-200 bg-slate-50/80 py-4">
              <CardTitle className="text-xl font-bold text-slate-950">
                Journal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <FieldLabel>Voucher NO.</FieldLabel>
                <Input
                  className={fieldClass}
                  value={isNew ? "—" : voucherDisplay}
                  readOnly
                />
              </div>
              <div>
                <FieldLabel required>Voucher Date</FieldLabel>
                <Input
                  type="date"
                  className={fieldClass}
                  value={transDate}
                  onChange={(e) => setTransDate(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <FieldLabel required>Currency</FieldLabel>
                <Select
                  value={currency}
                  onValueChange={(v) => v && onCurrencyChange(v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className={fieldClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(currencies.length
                      ? currencies
                      : [
                          { code: "EGP", name: "Egyptian Pound", rate: 1 },
                          { code: "USD", name: "US Dollar", rate: 1 },
                          { code: "EUR", name: "Euro", rate: 1 },
                        ]
                    ).map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Rate</FieldLabel>
                <Input className={fieldClass} value={rate} readOnly />
              </div>
              <div>
                <FieldLabel>Due Date</FieldLabel>
                <Input
                  type="date"
                  className={fieldClass}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <FieldLabel>Cost Center</FieldLabel>
                <CostCenterCombobox
                  value={costCenter}
                  onValueChange={setCostCenter}
                  disabled={!canEdit}
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel required>Description</FieldLabel>
                <Textarea
                  className="min-h-[80px] text-lg border-slate-300"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Description Required"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-300 shadow-sm">
            <CardHeader className="border-b border-slate-200 bg-slate-50/80 py-4">
              <CardTitle className="text-xl font-bold text-slate-950">Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <div
                className={cn(
                  "rounded-lg border px-4 py-3 text-lg",
                  balanced
                    ? "border-emerald-400 bg-emerald-100"
                    : "border-slate-300 bg-slate-100"
                )}
              >
                <div className="flex justify-between gap-4 py-0.5">
                  <span className="font-medium text-slate-800">Total Debit</span>
                  <span className="font-bold tabular-nums text-blue-900">
                    {totalDebit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 py-0.5">
                  <span className="font-medium text-slate-800">Total Credit</span>
                  <span className="font-bold tabular-nums text-emerald-900">
                    {totalCredit.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between gap-4 border-t border-slate-300/60 pt-2">
                  <span className="font-medium text-slate-800">Difference</span>
                  <span
                    className={cn(
                      "font-bold tabular-nums",
                      Math.abs(difference) < 0.001
                        ? "text-emerald-800"
                        : "text-red-700"
                    )}
                  >
                    {difference.toFixed(2)}
                  </span>
                </div>
              </div>
              {canEdit ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="button"
                    className="h-12 flex-1 bg-blue-800 text-lg font-semibold hover:bg-blue-900"
                    disabled={busy}
                    onClick={() => void saveJournal()}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 border-slate-400 text-lg font-semibold"
                    disabled={busy}
                    onClick={() => void loadLast()}
                  >
                    Cancel
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-300 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 bg-slate-50/80 py-4">
            <CardTitle className="text-xl font-bold text-slate-950">
              Journal Details
            </CardTitle>
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 border-blue-400 text-lg font-semibold text-blue-900"
                onClick={addLine}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Row
              </Button>
            ) : null}
          </CardHeader>
          {canEdit ? (
            <div className="border-b border-amber-300 bg-amber-100 px-5 py-2.5 text-base text-amber-950">
              Add Debit and Credit rows, then Save. Totals must balance (Debit = Credit).
            </div>
          ) : (
            <div className="border-b border-emerald-300 bg-emerald-100 px-5 py-2.5 text-base text-emerald-950">
              Posted — lines loaded from General Ledger (TransType AJ).
            </div>
          )}
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-lg">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100 text-left text-base font-bold uppercase tracking-wide text-slate-800">
                    <th className="w-10 px-3 py-3">#</th>
                    <th className="w-[130px] px-3 py-3">DR / CR</th>
                    <th className="min-w-[180px] px-3 py-3">Account</th>
                    <th className="min-w-[160px] px-3 py-3">Description</th>
                    <th className="w-[110px] px-3 py-3 text-right">Amount F/C</th>
                    <th className="w-[110px] px-3 py-3 text-right">Amount EGP</th>
                    {canEdit ? <th className="w-12 px-3 py-3 text-center">Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr
                      key={l.rowId}
                      className="border-b border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-3 py-2.5 text-slate-600 tabular-nums">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-md text-base font-semibold",
                            l.type === "Debit"
                              ? "border-blue-400 bg-blue-100 text-blue-900"
                              : "border-emerald-400 bg-emerald-100 text-emerald-900"
                          )}
                        >
                          {l.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {formatAccountDisplay(l.acccountCode, l.accName)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800">{l.description}</td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        {l.amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                        {l.amountEGP.toFixed(2)}
                      </td>
                      {canEdit ? (
                        <td className="px-3 py-2.5 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-red-700 hover:bg-red-100"
                            onClick={() => removeLine(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                  {lines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canEdit ? 7 : 6}
                        className="px-3 py-10 text-center text-lg text-slate-600"
                      >
                        {canEdit
                          ? "Add Debit/Credit rows below."
                          : "No journal lines."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {canEdit ? (
              <div className="relative z-20 grid gap-3 border-t border-slate-200 bg-slate-100/80 p-4 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <FieldLabel>Type</FieldLabel>
                  <Select
                    value={lineType}
                    onValueChange={(v) =>
                      v && setLineType(v as "Debit" | "Credit")
                    }
                  >
                    <SelectTrigger className={fieldClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[300]">
                      <SelectItem value="Debit">Debit</SelectItem>
                      <SelectItem value="Credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative z-30 lg:col-span-2">
                  <FieldLabel required>Account</FieldLabel>
                  <SearchableCombobox
                    value={lineAccount}
                    onValueChange={setLineAccount}
                    options={toAccountOptions(chartAccounts)}
                    placeholder="Search account…"
                    size="lg"
                  />
                </div>
                <div>
                  <FieldLabel>Description</FieldLabel>
                  <Input
                    className={fieldClass}
                    value={lineDescription || description}
                    onChange={(e) => setLineDescription(e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel required>Amount</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      className={fieldClass}
                      value={lineAmount}
                      onChange={(e) => setLineAmount(e.target.value)}
                      placeholder="0.00"
                    />
                    <Button
                      type="button"
                      className="h-12 shrink-0 bg-blue-800 hover:bg-blue-900"
                      onClick={addLine}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={findOpen} onOpenChange={setFindOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Search For Voucher</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Select value={searchMode} onValueChange={(v) => v && setSearchMode(v)}>
              <SelectTrigger className={fieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ref">Reference</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="description">Description</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className={fieldClass}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search value"
            />
            <Button
              type="button"
              className="h-12 bg-blue-800 hover:bg-blue-900"
              onClick={() => void doSearch()}
            >
              Search
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NO</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searchRows.map((r) => (
                <TableRow
                  key={r.receiptNO}
                  className="cursor-pointer"
                  onClick={() => void openSearchRow(r.receiptNO)}
                >
                  <TableCell>{r.receiptNO}</TableCell>
                  <TableCell>{r.ref}</TableCell>
                  <TableCell>{r.transDate ? toInputDate(r.transDate) : ""}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.notes}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(r.amount ?? 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </PageGuard>
  );
}
