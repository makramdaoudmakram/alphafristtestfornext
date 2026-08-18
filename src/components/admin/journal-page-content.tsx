"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ChevronDown,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getJournalEditBundle,
  searchJournals,
  sourceLabel,
  updateJournal,
  type JournalEditBundle,
  type JournalSearchLine,
} from "@/lib/journal-api";
import { getCostCentersForComp, getVoucherAccountsChart } from "@/lib/api-client";
import {
  buildAccountNameMap,
  buildCostCenterNameMap,
  formatAccountLabel,
  formatCostCenterLabel,
  mergeAccountComboboxOptions,
  mergeCostCenterComboboxOptions,
  normalizeLedgerCode,
  resolveAccountName,
  toAccountComboboxOptions,
  toCostCenterComboboxOptions,
} from "@/lib/journal-binding";
import type { AccountSelectItem } from "@/types/collected-voucher";
import type { CostCenterCompoItem } from "@/types/cost-center";
import { PageGuard } from "@/components/permissions/page-guard";
import { CostCenterCombobox } from "@/components/admin/cost-center-combobox";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type JournalGroup = {
  accOrder: number;
  transType: string | null;
  receiptNO: string | null;
  ref: string | null;
  transDate: string | null;
  description: string | null;
  costCenter: string | null;
  lines: JournalSearchLine[];
  debitTotal: number;
  creditTotal: number;
};

type EditableLedgerLine = {
  rowId: string;
  transNO?: number;
  type: "Debit" | "Credit";
  accountCode: string;
  accName: string;
  description: string;
  amount: string;
  costCenter: string;
  isNew?: boolean;
};

const fieldClass =
  "h-10 border-slate-300 bg-white text-sm shadow-sm focus-visible:ring-blue-600";

function monthStartInput() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString();
}

function toInputDate(value?: string | null) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatAccountDisplay(code: string, name: string) {
  const formatted = formatAccountLabel(code, name);
  if (formatted) return formatted;
  const fallback = (name ?? "").trim();
  return fallback || "—";
}

function formatCostCenterDisplay(
  code: string,
  nameByCode: Map<string, string>
) {
  const normalized = normalizeLedgerCode(code);
  if (!normalized) return "—";
  return formatCostCenterLabel(normalized, nameByCode.get(normalized));
}

function resolveLineAccountName(
  accountCode: string,
  accountNameByCode: Map<string, string>,
  group: JournalGroup,
  transNO?: number,
  fallbackName?: string
) {
  const normalized = normalizeLedgerCode(accountCode);
  if (normalized) {
    const fromMap = accountNameByCode.get(normalized);
    if (fromMap) return fromMap;
  }
  if (transNO != null) {
    const searchLine = group.lines.find((line) => line.transNO === transNO);
    if (searchLine?.accName?.trim()) return searchLine.accName.trim();
  }
  if (fallbackName?.trim()) return fallbackName.trim();
  return resolveAccountName(normalized, accountNameByCode, fallbackName);
}

function buildJournalGroups(rows: JournalSearchLine[]): JournalGroup[] {
  const map = new Map<number, JournalGroup>();
  for (const row of rows) {
    const existing = map.get(row.accOrder);
    if (existing) {
      existing.lines.push(row);
      existing.debitTotal = round2(existing.debitTotal + row.debit);
      existing.creditTotal = round2(existing.creditTotal + row.credit);
      continue;
    }
    map.set(row.accOrder, {
      accOrder: row.accOrder,
      transType: row.transType,
      receiptNO: row.receiptNO,
      ref: row.ref,
      transDate: row.transDate,
      description: row.vNote ?? row.notes,
      costCenter: row.costCenter,
      lines: [row],
      debitTotal: round2(row.debit),
      creditTotal: round2(row.credit),
    });
  }
  return [...map.values()].sort((a, b) => {
    const dateA = a.transDate ? new Date(a.transDate).getTime() : 0;
    const dateB = b.transDate ? new Date(b.transDate).getTime() : 0;
    return dateB - dateA || b.accOrder - a.accOrder;
  });
}

function toEditableLines(
  group: JournalGroup,
  accountNameByCode: Map<string, string>,
  bundle?: JournalEditBundle | null
): EditableLedgerLine[] {
  if (bundle) {
    return bundle.lines.map((line, index) => {
      const accountCode = normalizeLedgerCode(line.acccountCode);
      const costCenter =
        normalizeLedgerCode(line.costCenter) ||
        normalizeLedgerCode(bundle.costCenter);
      return {
        rowId: `existing-${line.transNO}-${index}`,
        transNO: line.transNO,
        type: line.type,
        accountCode,
        accName: resolveLineAccountName(
          accountCode,
          accountNameByCode,
          group,
          line.transNO,
          line.accName ?? undefined
        ),
        description: line.description,
        amount: String(line.amount ?? line.amountEGP ?? 0),
        costCenter,
      };
    });
  }

  return group.lines.map((line, index) => {
    const accountCode = normalizeLedgerCode(line.acccountCode);
    const costCenter =
      normalizeLedgerCode(line.costCenter) ||
      normalizeLedgerCode(group.costCenter);
    return {
      rowId: `search-${line.transNO}-${index}`,
      transNO: line.transNO,
      type: line.debit > 0 ? "Debit" : "Credit",
      accountCode,
      accName: resolveLineAccountName(
        accountCode,
        accountNameByCode,
        group,
        line.transNO,
        line.accName ?? undefined
      ),
      description: line.notes ?? "",
      amount: String(line.amount ?? (line.debit > 0 ? line.debit : line.credit) ?? 0),
      costCenter,
    };
  });
}

type JournalAccordionItemProps = {
  group: JournalGroup;
  token: string | undefined;
  accountOptions: Array<{ value: string; label: string }>;
  accountNameByCode: Map<string, string>;
  costCenterOptions: Array<{ value: string; label: string }>;
  costCenterNameByCode: Map<string, string>;
  costCentersLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

function JournalAccordionItem({
  group,
  token,
  accountOptions,
  accountNameByCode,
  costCenterOptions,
  costCenterNameByCode,
  costCentersLoading,
  open,
  onOpenChange,
  onSaved,
}: JournalAccordionItemProps) {
  const [editMode, setEditMode] = useState(false);
  const [loadingBundle, setLoadingBundle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bundle, setBundle] = useState<JournalEditBundle | null>(null);
  const [transDate, setTransDate] = useState(toInputDate(group.transDate));
  const [description, setDescription] = useState(group.description ?? "");
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [rate, setRate] = useState("1");
  const [headerCostCenter, setHeaderCostCenter] = useState(
    normalizeLedgerCode(group.costCenter)
  );
  const [lines, setLines] = useState<EditableLedgerLine[]>(() =>
    toEditableLines(group, accountNameByCode)
  );
  const [deletedTransNos, setDeletedTransNos] = useState<number[]>([]);

  useEffect(() => {
    setEditMode(false);
    setBundle(null);
    setDeletedTransNos([]);
    setTransDate(toInputDate(group.transDate));
    setDescription(group.description ?? "");
    setHeaderCostCenter(normalizeLedgerCode(group.costCenter));
    setLines(toEditableLines(group, accountNameByCode));
    // Reset only when switching journals; account names refresh in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid wiping edit state when chart loads
  }, [group.accOrder]);

  useEffect(() => {
    if (accountNameByCode.size === 0) return;
    setLines((prev) =>
      prev.map((line) => ({
        ...line,
        accName: resolveLineAccountName(
          line.accountCode,
          accountNameByCode,
          group,
          line.transNO,
          line.accName ?? undefined
        ),
      }))
    );
  }, [accountNameByCode, group]);

  const rowAccountOptions = useMemo(
    () =>
      mergeAccountComboboxOptions(
        accountOptions,
        lines.map((line) => ({
          code: line.accountCode,
          name: resolveLineAccountName(
            line.accountCode,
            accountNameByCode,
            group,
            line.transNO,
            line.accName ?? undefined
          ),
        }))
      ),
    [accountOptions, accountNameByCode, group, lines]
  );

  const rowCostCenterOptions = useMemo(
    () =>
      mergeCostCenterComboboxOptions(
        costCenterOptions,
        lines.map((line) => line.costCenter),
        costCenterNameByCode
      ),
    [costCenterOptions, costCenterNameByCode, lines]
  );

  const totals = useMemo(() => {
    const debit = lines.reduce((sum, line) => {
      const amount = Number(line.amount) || 0;
      return line.type === "Debit" ? sum + amount : sum;
    }, 0);
    const credit = lines.reduce((sum, line) => {
      const amount = Number(line.amount) || 0;
      return line.type === "Credit" ? sum + amount : sum;
    }, 0);
    return {
      debit: round2(debit),
      credit: round2(credit),
      difference: round2(debit - credit),
    };
  }, [lines]);

  const balanced = Math.abs(totals.difference) < 0.001 && totals.debit > 0;

  const loadBundle = useCallback(async () => {
    if (!token) return;
    setLoadingBundle(true);
    try {
      const result = await getJournalEditBundle(group.accOrder, token);
      setBundle(result);
      setTransDate(toInputDate(result.transDate));
      setDescription(result.vNote ?? group.description ?? "");
      setDueDate(result.dueDate ? toInputDate(result.dueDate) : "");
      setCurrency(result.currency ?? "EGP");
      setRate(String(result.rate ?? 1));
      setHeaderCostCenter(
        normalizeLedgerCode(result.costCenter ?? group.costCenter)
      );
      setDeletedTransNos([]);
      setLines(toEditableLines(group, accountNameByCode, result));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load journal");
    } finally {
      setLoadingBundle(false);
    }
  }, [accountNameByCode, group, token]);

  function updateLine(
    rowId: string,
    patch: Partial<EditableLedgerLine>
  ) {
    setLines((current) =>
      current.map((line) =>
        line.rowId === rowId ? { ...line, ...patch } : line
      )
    );
  }

  function addNewLine() {
    setLines((current) => [
      ...current,
      {
        rowId: `new-${Date.now()}-${current.length}`,
        type: "Debit",
        accountCode: "",
        accName: "",
        description: description ?? "",
        amount: "",
        costCenter: headerCostCenter,
        isNew: true,
      },
    ]);
  }

  function removeLine(rowId: string) {
    setLines((current) => {
      const line = current.find((item) => item.rowId === rowId);
      if (line?.transNO) {
        setDeletedTransNos((prev) =>
          prev.includes(line.transNO!) ? prev : [...prev, line.transNO!]
        );
      }
      return current.filter((item) => item.rowId !== rowId);
    });
  }

  async function startEdit() {
    setEditMode(true);
    if (!bundle) {
      await loadBundle();
    }
  }

  function cancelEdit() {
    setEditMode(false);
    setDeletedTransNos([]);
    setTransDate(toInputDate(bundle?.transDate ?? group.transDate));
    setDescription(bundle?.vNote ?? group.description ?? "");
    setDueDate(bundle?.dueDate ? toInputDate(bundle.dueDate) : "");
    setCurrency(bundle?.currency ?? "EGP");
    setRate(String(bundle?.rate ?? 1));
    setHeaderCostCenter(
      normalizeLedgerCode(bundle?.costCenter ?? group.costCenter)
    );
    setLines(toEditableLines(group, accountNameByCode, bundle));
  }

  async function saveChanges() {
    if (!token) {
      toast.error("Sign in required");
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
    for (const line of lines) {
      if (!line.accountCode.trim()) {
        toast.error("Account should be selected");
        return;
      }
      if (!(Number(line.amount) > 0)) {
        toast.error("Amount must be greater than zero");
        return;
      }
    }
    if (!balanced) {
      toast.error("Total Debit must equal Total Credit.");
      return;
    }

    setSaving(true);
    try {
      await updateJournal(
        group.accOrder,
        {
          transDate,
          vNote: description,
          dueDate: dueDate || transDate,
          currancy: currency,
          rate: Number(rate) || 1,
          costCenter: headerCostCenter,
          deleteTransNos: deletedTransNos,
          lines: lines.map((line) => ({
            transNO: line.isNew ? undefined : line.transNO,
            acccountCode: line.accountCode,
            notes: line.description,
            amount: Number(line.amount) || 0,
            depit: line.type === "Debit" ? Number(line.amount) || 0 : 0,
            credit: line.type === "Credit" ? Number(line.amount) || 0 : 0,
            costCenter: line.costCenter || headerCostCenter,
          })),
        },
        token
      );
      toast.success("Journal updated successfully");
      setEditMode(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  const source = bundle?.source;
  const sourceVoucher = source?.collectedVoucher ?? source?.paymentVoucher ?? null;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card className="overflow-hidden border-slate-300 shadow-sm">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-4 bg-slate-50 px-4 py-4 text-left hover:bg-slate-100"
          >
            <ChevronDown
              className={cn(
                "size-5 shrink-0 text-slate-600 transition-transform",
                open && "rotate-180"
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
                <span className="font-semibold text-slate-950">
                  {formatDate(group.transDate)}
                </span>
                <span className="truncate text-slate-700">
                  {group.description || "Journal entry"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Debit: {group.debitTotal.toFixed(2)}</span>
                <span>Credit: {group.creditTotal.toFixed(2)}</span>
                <span>{sourceLabel(group.transType)}</span>
                <span>Order {group.accOrder}</span>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Date: {formatDate(bundle?.transDate ?? group.transDate)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Description: {bundle?.vNote ?? group.description ?? "—"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!editMode ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => void startEdit()}>
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit / Update
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                      <X className="mr-1 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button type="button" size="sm" disabled={saving || loadingBundle} onClick={() => void saveChanges()}>
                      {saving ? "Saving..." : "Save Update"}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {source ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-900">{source.sourceLabel}</p>
                {sourceVoucher ? (
                  <p className="mt-1 text-muted-foreground">
                    Receipt #{sourceVoucher.receiptNO} · Ref {sourceVoucher.recRef ?? "—"} ·{" "}
                    {sourceVoucher.collectedName ?? sourceVoucher.description ?? "—"}
                  </p>
                ) : (
                  <p className="mt-1 text-muted-foreground">
                    Ref {bundle?.ref ?? group.ref ?? "—"} · Receipt #{bundle?.receiptNO ?? group.receiptNO ?? "—"}
                  </p>
                )}
              </div>
            ) : null}

            {editMode ? (
              <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
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
                <div className="md:col-span-2">
                  <Label>Cost Center</Label>
                  <CostCenterCombobox
                    value={headerCostCenter}
                    onValueChange={setHeaderCostCenter}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    className="min-h-20 border-slate-300 bg-white text-sm shadow-sm focus-visible:ring-blue-600"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            ) : null}

            {loadingBundle && editMode ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading editable journal details...
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-slate-300">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b bg-slate-100 text-left font-semibold text-slate-900">
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Account</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                    <th className="px-3 py-3">Cost Center</th>
                    {editMode ? <th className="px-3 py-3 text-center">Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.rowId} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        {editMode ? (
                          <Select
                            value={line.type}
                            onValueChange={(value) =>
                              updateLine(line.rowId, {
                                type: value as "Debit" | "Credit",
                              })
                            }
                          >
                            <SelectTrigger className={fieldClass}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Debit">Debit</SelectItem>
                              <SelectItem value="Credit">Credit</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          line.type
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editMode ? (
                          <SearchableCombobox
                            options={rowAccountOptions}
                            value={line.accountCode}
                            onValueChange={(value) => {
                              const code = normalizeLedgerCode(value);
                              updateLine(line.rowId, {
                                accountCode: code,
                                accName: accountNameByCode.get(code) ?? code,
                              });
                            }}
                            placeholder="Select account"
                            size="lg"
                          />
                        ) : (
                          formatAccountDisplay(
                            line.accountCode,
                            resolveLineAccountName(
                              line.accountCode,
                              accountNameByCode,
                              group,
                              line.transNO,
                              line.accName ?? undefined
                            )
                          )
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editMode ? (
                          <Input
                            className={fieldClass}
                            value={line.description}
                            onChange={(e) =>
                              updateLine(line.rowId, {
                                description: e.target.value,
                              })
                            }
                          />
                        ) : (
                          line.description || "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {editMode ? (
                          <Input
                            type="number"
                            step="0.01"
                            className={cn(fieldClass, "text-right tabular-nums")}
                            value={line.amount}
                            onChange={(e) =>
                              updateLine(line.rowId, {
                                amount: e.target.value,
                              })
                            }
                          />
                        ) : (
                          <span className="tabular-nums">
                            {(Number(line.amount) || 0).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editMode ? (
                          <CostCenterCombobox
                            value={line.costCenter}
                            onValueChange={(value) =>
                              updateLine(line.rowId, {
                                costCenter: normalizeLedgerCode(value),
                              })
                            }
                            options={rowCostCenterOptions}
                            loading={costCentersLoading}
                          />
                        ) : (
                          formatCostCenterDisplay(
                            line.costCenter,
                            costCenterNameByCode
                          )
                        )}
                      </td>
                      {editMode ? (
                        <td className="px-3 py-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(line.rowId)}
                          >
                            <Trash2 className="h-4 w-4 text-red-700" />
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {editMode ? (
              <div className="flex justify-start">
                <Button type="button" variant="outline" onClick={addNewLine}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add New
                </Button>
              </div>
            ) : null}

            <div
              className={cn(
                "grid gap-3 rounded-lg border p-4 md:grid-cols-3",
                balanced ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"
              )}
            >
              <div>
                <p className="text-sm text-muted-foreground">Total Debit</p>
                <p className="text-lg font-bold tabular-nums">
                  {totals.debit.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Credit</p>
                <p className="text-lg font-bold tabular-nums">
                  {totals.credit.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Difference</p>
                <p className="text-lg font-bold tabular-nums">
                  {totals.difference.toFixed(2)}
                </p>
              </div>
              {!balanced ? (
                <p className="text-sm font-medium text-red-800 md:col-span-3">
                  Total Debit must equal Total Credit.
                </p>
              ) : null}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function JournalPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [dateFrom, setDateFrom] = useState(monthStartInput);
  const [dateTo, setDateTo] = useState(todayInput);
  const [costCenterMode, setCostCenterMode] = useState<"all" | "selected">("all");
  const [selectedCostCenters, setSelectedCostCenters] = useState<string[]>([]);
  const [rows, setRows] = useState<JournalSearchLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [openAccOrder, setOpenAccOrder] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<AccountSelectItem[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterCompoItem[]>([]);
  const [costCentersLoading, setCostCentersLoading] = useState(false);

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
          }))
          .sort((a, b) =>
            a.accCode.localeCompare(b.accCode, undefined, { numeric: true })
          );
        setAccounts(mapped);
      } catch {
        if (!cancelled) setAccounts([]);
      }
    }
    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    async function loadCostCenters() {
      if (!token) return;
      setCostCentersLoading(true);
      try {
        const items = await getCostCentersForComp(token);
        if (!cancelled) setCostCenters(items);
      } catch {
        if (!cancelled) setCostCenters([]);
      } finally {
        if (!cancelled) setCostCentersLoading(false);
      }
    }
    void loadCostCenters();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const accountNameByCode = useMemo(
    () => buildAccountNameMap(accounts),
    [accounts]
  );
  const costCenterNameByCode = useMemo(
    () => buildCostCenterNameMap(costCenters),
    [costCenters]
  );
  const baseAccountOptions = useMemo(
    () => toAccountComboboxOptions(accounts),
    [accounts]
  );
  const accountOptions = useMemo(
    () =>
      mergeAccountComboboxOptions(
        baseAccountOptions,
        rows.map((row) => ({
          code: row.acccountCode ?? "",
          name: row.accName,
        }))
      ),
    [baseAccountOptions, rows]
  );
  const costCenterOptions = useMemo(
    () => toCostCenterComboboxOptions(costCenters),
    [costCenters]
  );
  const groups = useMemo(() => buildJournalGroups(rows), [rows]);
  const grandTotals = useMemo(() => {
    const debit = round2(groups.reduce((sum, group) => sum + group.debitTotal, 0));
    const credit = round2(groups.reduce((sum, group) => sum + group.creditTotal, 0));
    return {
      debit,
      credit,
      difference: round2(debit - credit),
    };
  }, [groups]);

  const handleSearch = useCallback(async () => {
    if (!token) {
      toast.error("Sign in required");
      return;
    }
    if (dateFrom > dateTo) {
      toast.error("From Date must be less than or equal to To Date.");
      return;
    }
    setLoading(true);
    setSearched(true);
    setOpenAccOrder(null);
    try {
      const result = await searchJournals(token, {
        dateFrom,
        dateTo,
        costCenters:
          costCenterMode === "selected" && selectedCostCenters.length > 0
            ? selectedCostCenters
            : undefined,
        pageSize: 500,
      });
      setRows(result.items);
      if (result.items.length === 0) {
        toast.message("No journals found for the selected filters.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, dateFrom, dateTo, costCenterMode, selectedCostCenters]);

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
                <BreadcrumbPage>Journal</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Journal</h1>
          <p className="text-muted-foreground">
            Journals are grouped by the actual transaction batch (`ACCOrder`).
            Open a row to review details, then edit the full ledger directly inside
            the expanded journal.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="journal-from">From Date</Label>
                <Input
                  id="journal-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="journal-to">To Date</Label>
                <Input
                  id="journal-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
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
              <Button type="button" onClick={() => void handleSearch()} disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Journal Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!searched ? (
              <p className="py-10 text-center text-muted-foreground">
                Enter a date range and click Search.
              </p>
            ) : groups.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">
                No records found for the selected filters.
              </p>
            ) : (
              groups.map((group) => (
                <JournalAccordionItem
                  key={group.accOrder}
                  group={group}
                  token={token}
                  accountOptions={accountOptions}
                  accountNameByCode={accountNameByCode}
                  costCenterOptions={costCenterOptions}
                  costCenterNameByCode={costCenterNameByCode}
                  costCentersLoading={costCentersLoading}
                  open={openAccOrder === group.accOrder}
                  onOpenChange={(open) =>
                    setOpenAccOrder(open ? group.accOrder : null)
                  }
                  onSaved={() => void handleSearch()}
                />
              ))
            )}
          </CardContent>
        </Card>

        {searched ? (
          <Card>
            <CardHeader>
              <CardTitle>Grand Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "grid gap-3 rounded-lg border p-4 md:grid-cols-3",
                  Math.abs(grandTotals.difference) < 0.001
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-red-300 bg-red-50"
                )}
              >
                <div>
                  <p className="text-sm text-muted-foreground">Total Debit</p>
                  <p className="text-lg font-bold tabular-nums">
                    {formatMoney(grandTotals.debit)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Credit</p>
                  <p className="text-lg font-bold tabular-nums">
                    {formatMoney(grandTotals.credit)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Difference</p>
                  <p className="text-lg font-bold tabular-nums">
                    {formatMoney(grandTotals.difference)}
                  </p>
                </div>
                {Math.abs(grandTotals.difference) >= 0.001 ? (
                  <p className="text-sm font-medium text-red-800 md:col-span-3">
                    Search result Debit and Credit are not equal.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageGuard>
  );
}
