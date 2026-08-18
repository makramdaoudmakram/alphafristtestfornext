"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FileSpreadsheet, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { getVoucherAccountsChart } from "@/lib/api-client";
import {
  getLedgerReport,
  ledgerReportToCsv,
  type LedgerReport,
} from "@/lib/ledger-api";
import { formatAccountLabel, normalizeLedgerCode } from "@/lib/journal-binding";
import type { AccountSelectItem } from "@/types/collected-voucher";
import { PageGuard } from "@/components/permissions/page-guard";
import { CostCenterMultiFilter } from "@/components/admin/cost-center-multi-filter";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
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
import { cn } from "@/lib/utils";

function monthStartInput() {
  const d = new Date();
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function todayInput() {
  return toIsoDate(new Date());
}

function toIsoDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function formatPeriod(from: string | null | undefined, to: string | null | undefined) {
  return `${formatDate(from)} – ${formatDate(to)}`;
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function AccountMultiSelect({
  accounts,
  selected,
  onChange,
  disabled,
}: {
  accounts: AccountSelectItem[];
  selected: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.accCode.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
    );
  }, [accounts, search]);

  const label =
    selected.length === 0
      ? "All accounts"
      : selected.length === 1
        ? formatAccountLabel(selected[0], accounts.find((a) => a.accCode === selected[0])?.name)
        : `${selected.length} accounts selected`;

  return (
    <div className="rounded-md border border-slate-300 bg-white p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm text-slate-700">{label}</p>
        {selected.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        ) : null}
      </div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search accounts…"
        disabled={disabled}
        className="mb-2 h-9"
      />
      <div className="max-h-48 overflow-y-auto">
        {filtered.map((account) => {
          const checked = selectedSet.has(account.accCode);
          return (
            <label
              key={account.accCode}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  if (checked) {
                    onChange(selected.filter((code) => code !== account.accCode));
                  } else {
                    onChange([...selected, account.accCode]);
                  }
                }}
              />
              <span className="truncate">
                {formatAccountLabel(account.accCode, account.name)}
              </span>
            </label>
          );
        })}
        {filtered.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">No accounts found.</p>
        ) : null}
      </div>
    </div>
  );
}

export function LedgerPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [dateFrom, setDateFrom] = useState(monthStartInput);
  const [dateTo, setDateTo] = useState(todayInput);
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [parentAccount, setParentAccount] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [costCenterMode, setCostCenterMode] = useState<"all" | "selected">("all");
  const [selectedCostCenters, setSelectedCostCenters] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<AccountSelectItem[]>([]);
  const [parentAccounts, setParentAccounts] = useState<AccountSelectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [report, setReport] = useState<LedgerReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAccounts() {
      if (!token) return;
      try {
        const chart = await getVoucherAccountsChart(token);
        if (cancelled) return;
        const mapped = chart
          .filter((item) => item.accCode.trim() !== "")
          .map((item) => ({
            accCode: normalizeLedgerCode(item.accCode),
            name: (item.accAName ?? item.accName ?? item.accCode).trim() || item.accCode,
            parentCode: item.parentCode,
          }));
        const parentCodes = new Set(
          mapped
            .map((item) => normalizeLedgerCode(item.parentCode))
            .filter((code) => code !== "")
        );
        const sorted = [...mapped].sort((a, b) =>
          a.accCode.localeCompare(b.accCode, undefined, { numeric: true })
        );
        setAccounts(sorted.map((item) => ({ accCode: item.accCode, name: item.name })));
        setParentAccounts(
          sorted
            .filter((item) => parentCodes.has(item.accCode))
            .map((item) => ({ accCode: item.accCode, name: item.name }))
        );
      } catch {
        if (!cancelled) {
          setAccounts([]);
          setParentAccounts([]);
        }
      }
    }
    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const parentAccountOptions = useMemo(
    () =>
      parentAccounts.map((account) => ({
        value: account.accCode,
        label: formatAccountLabel(account.accCode, account.name),
      })),
    [parentAccounts]
  );

  const generateReport = useCallback(async () => {
    if (!token) {
      toast.error("Sign in required");
      return;
    }
    if (!dateFrom) {
      toast.error("Start Date is required.");
      return;
    }
    if (!dateTo) {
      toast.error("End Date is required.");
      return;
    }
    if (dateFrom > dateTo) {
      toast.error("Start Date must be less than or equal to End Date.");
      return;
    }
    if ((dueDateFrom && !dueDateTo) || (!dueDateFrom && dueDateTo)) {
      toast.error("Due Date Start and Due Date End must both be supplied, or both empty.");
      return;
    }
    if (dueDateFrom && dueDateTo && dueDateFrom > dueDateTo) {
      toast.error("Due Date Start must be less than or equal to Due Date End.");
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const result = await getLedgerReport(
        {
          dateFrom,
          dateTo,
          dueDateFrom: dueDateFrom || undefined,
          dueDateTo: dueDateTo || undefined,
          parentAccountCodes: parentAccount ? [parentAccount] : undefined,
          accountCodes: selectedAccounts.length > 0 ? selectedAccounts : undefined,
          costCenterCodes:
            costCenterMode === "selected" && selectedCostCenters.length > 0
              ? selectedCostCenters
              : undefined,
        },
        token
      );
      setReport(result);
      if (result.costCenters.length === 0) {
        toast.message("No ledger transactions found for the selected criteria.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate ledger");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [
    token,
    dateFrom,
    dateTo,
    dueDateFrom,
    dueDateTo,
    parentAccount,
    selectedAccounts,
    costCenterMode,
    selectedCostCenters,
  ]);

  function exportExcel() {
    if (!report || report.costCenters.length === 0) {
      toast.error("Generate the report before exporting.");
      return;
    }
    const csv = ledgerReportToCsv(report);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ledger-${dateFrom}-to-${dateTo}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <PageGuard permission={null}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 md:p-6">
        <div className="space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard">Accounts</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Ledger</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Ledger</h1>
          <p className="text-muted-foreground">
            Opening balance is the account balance before the start date. Period
            rows are transactions between the selected start and end dates.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ledger Report Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="ledger-from">Start Date</Label>
                <Input
                  id="ledger-from"
                  type="date"
                  required
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ledger-to">End Date</Label>
                <Input
                  id="ledger-to"
                  type="date"
                  required
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ledger-due-from">Due Date Start</Label>
                <Input
                  id="ledger-due-from"
                  type="date"
                  value={dueDateFrom}
                  onChange={(e) => setDueDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ledger-due-to">Due Date End</Label>
                <Input
                  id="ledger-due-to"
                  type="date"
                  value={dueDateTo}
                  onChange={(e) => setDueDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <Label>Parent Account</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SearchableCombobox
                      options={parentAccountOptions}
                      value={parentAccount}
                      onValueChange={setParentAccount}
                      placeholder="Select parent account (optional)"
                    />
                  </div>
                  {parentAccount ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setParentAccount("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Selecting a parent includes all descendant leaf accounts.
                </p>
              </div>
              <div>
                <Label>Cost Center</Label>
                <CostCenterMultiFilter
                  mode={costCenterMode}
                  selectedCodes={selectedCostCenters}
                  onModeChange={setCostCenterMode}
                  onSelectedCodesChange={setSelectedCostCenters}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <Label>Accounts List</Label>
              <AccountMultiSelect
                accounts={accounts}
                selected={selectedAccounts}
                onChange={setSelectedAccounts}
                disabled={loading}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void generateReport()} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                {loading ? "Generating..." : "Generate Report"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={exportExcel}
                disabled={!report || report.costCenters.length === 0}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {!searched ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Enter a start and end date, then click Generate Report.
            </CardContent>
          </Card>
        ) : loading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Building ledger report…
            </CardContent>
          </Card>
        ) : !report ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No ledger transactions found for the selected criteria.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                General Ledger
              </h2>
              <p className="text-sm text-slate-700">
                Period: {formatPeriod(report.dateFrom ?? dateFrom, report.dateTo ?? dateTo)}
              </p>
            </div>
            {report.costCenters.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  No ledger transactions found for the selected criteria.
                </CardContent>
              </Card>
            ) : (
              report.costCenters.map((center) => (
              <Card key={center.costCenter || "none"} className="border-slate-300">
                <CardHeader className="bg-slate-50">
                  <CardTitle className="text-xl">
                    Cost Center: {center.costCenterLabel}
                  </CardTitle>
                  <div className="flex flex-wrap gap-6 text-sm text-slate-700">
                    <span>
                      Opening Balance:{" "}
                      <strong className="tabular-nums">
                        {formatMoney(center.openingBalance)}
                      </strong>
                    </span>
                    <span>
                      Final Balance:{" "}
                      <strong className="tabular-nums">
                        {formatMoney(center.finalBalance)}
                      </strong>
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 p-4">
                  {center.accounts.map((account) => (
                    <div key={`${account.acccountCode}-${account.currency ?? ""}`}>
                      <h3 className="mb-2 text-base font-semibold text-slate-950">
                        {account.accountLabel}
                        {account.currency ? ` (${account.currency})` : ""}
                      </h3>
                      <p className="mb-2 text-sm text-muted-foreground">
                        Opening Balance:{" "}
                        <span className="tabular-nums font-medium text-slate-900">
                          {formatMoney(account.openingBalance)}
                        </span>
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-slate-300">
                        <table className="w-full min-w-[920px] text-sm">
                          <thead>
                            <tr className="border-b bg-slate-100 text-left font-semibold">
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Type</th>
                              <th className="px-3 py-2">Receipt</th>
                              <th className="px-3 py-2">Description</th>
                              <th className="px-3 py-2">Due Date</th>
                              <th className="px-3 py-2 text-right">Debit</th>
                              <th className="px-3 py-2 text-right">Credit</th>
                              <th className="px-3 py-2 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {account.lines.map((line, index) => (
                              <tr
                                key={`${line.transNO}-${index}`}
                                className={cn(
                                  "border-b last:border-b-0",
                                  line.isOpening && "bg-amber-50"
                                )}
                              >
                                <td className="px-3 py-2">
                                  {line.isOpening ? "Opening" : formatDate(line.transDate)}
                                </td>
                                <td className="px-3 py-2">{line.transType || "—"}</td>
                                <td className="px-3 py-2">{line.receiptNO || "—"}</td>
                                <td className="px-3 py-2">{line.description || "—"}</td>
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
                      <p className="mt-2 text-sm font-semibold">
                        Final Balance:{" "}
                        <span className="tabular-nums">
                          {formatMoney(account.finalBalance)}
                        </span>
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
            )}
          </>
        )}
      </div>
    </PageGuard>
  );
}
