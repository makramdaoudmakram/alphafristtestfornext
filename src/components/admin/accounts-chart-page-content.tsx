"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown, ChevronRight, Check, Ban } from "lucide-react";
import { toast } from "sonner";
import {
  createAccountsChart,
  deleteAccountsChart,
  getAccountsCharts,
  updateAccountsChart,
} from "@/lib/api-client";
import {
  buildAccountsChartTree,
  collectDescendantCodes,
  getAccountLabel,
  type AccountsChartTreeNode,
} from "@/lib/accounts-chart-tree";
import type { AccountsChartItem } from "@/types/accounts-chart";
import { PageGuard } from "@/components/permissions/page-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type InlineFormState = {
  mode: "add" | "edit";
  /** For edit: account being edited. For add: parent under which we insert. */
  anchorCode: string | null;
  parentCode: string;
  accCode: string;
  accName: string;
  accAName: string;
  currency: string;
  accKind: boolean;
  accType: boolean;
  receipt: boolean;
  payment: boolean;
};

type VisibleRow = {
  node: AccountsChartTreeNode;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
};

function emptyInline(
  mode: "add" | "edit",
  anchorCode: string | null,
  parentCode: string
): InlineFormState {
  return {
    mode,
    anchorCode,
    parentCode,
    accCode: "",
    accName: "",
    accAName: "",
    currency: "EGP",
    accKind: false,
    accType: true,
    receipt: false,
    payment: false,
  };
}

function fromAccount(account: AccountsChartItem): InlineFormState {
  return {
    mode: "edit",
    anchorCode: account.accCode,
    parentCode: account.parentCode ?? "",
    accCode: account.accCode,
    accName: account.accName ?? "",
    accAName: account.accAName ?? "",
    currency: account.currency ?? "EGP",
    accKind: Boolean(account.accKind),
    accType: Boolean(account.accType),
    receipt: Boolean(account.receipt),
    payment: Boolean(account.payment),
  };
}

function collectVisibleRows(
  nodes: AccountsChartTreeNode[],
  expanded: Set<string>,
  depth = 0
): VisibleRow[] {
  const rows: VisibleRow[] = [];

  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    const isExpanded = hasChildren && expanded.has(node.accCode);
    rows.push({ node, depth, hasChildren, expanded: isExpanded });
    if (isExpanded) {
      rows.push(...collectVisibleRows(node.children, expanded, depth + 1));
    }
  }

  return rows;
}

function FlagCell({ checked }: { checked: boolean }) {
  return (
    <input
      type="checkbox"
      className="pointer-events-none size-3.5 accent-sky-700"
      checked={checked}
      readOnly
      tabIndex={-1}
      aria-hidden
    />
  );
}

function InlineEditor({
  form,
  accounts,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  form: InlineFormState;
  accounts: AccountsChartItem[];
  saving: boolean;
  onChange: (next: InlineFormState) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const parentOptions = useMemo(() => {
    if (form.mode === "add") {
      return accounts.map((a) => a.accCode);
    }
    const blocked = form.accCode
      ? collectDescendantCodes(form.accCode, accounts)
      : new Set<string>();
    return accounts
      .filter((a) => !blocked.has(a.accCode))
      .map((a) => a.accCode);
  }, [accounts, form.mode, form.accCode]);

  return (
    <tr className="bg-[#fffef0] border-b border-sky-200">
      <td colSpan={10} className="p-0">
        <div className="border-t border-amber-300 bg-gradient-to-b from-amber-50 to-[#fffef5] px-4 py-3">
          <div className="grid max-w-3xl gap-2 text-sm sm:grid-cols-[140px_1fr]">
            <label className="flex items-center gap-2 font-medium text-slate-700">
              Account NO:
            </label>
            <Input
              className="h-8 font-mono text-sm"
              value={form.accCode}
              disabled={form.mode === "edit"}
              onChange={(e) =>
                onChange({ ...form, accCode: e.target.value })
              }
            />

            <label className="flex items-center gap-2 font-medium text-slate-700">
              Parent Code:
            </label>
            {form.mode === "add" ? (
              <Input
                className="h-8 font-mono text-sm"
                value={form.parentCode}
                readOnly
                title="Set automatically from the selected parent row (old Web Forms behavior)"
              />
            ) : (
              <select
                className="border-input bg-background h-8 rounded-md border px-2 font-mono text-sm"
                value={form.parentCode}
                onChange={(e) =>
                  onChange({ ...form, parentCode: e.target.value })
                }
              >
                <option value="">(root)</option>
                {parentOptions.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            )}

            <label className="flex items-center gap-2 font-medium text-slate-700">
              Account Name:
            </label>
            <Input
              className="h-8 text-sm"
              value={form.accName}
              onChange={(e) =>
                onChange({ ...form, accName: e.target.value })
              }
            />

            <label className="flex items-center gap-2 font-medium text-slate-700">
              Arabic Name:
            </label>
            <Input
              className="h-8 text-sm"
              dir="rtl"
              value={form.accAName}
              onChange={(e) =>
                onChange({ ...form, accAName: e.target.value })
              }
            />

            <label className="flex items-center gap-2 font-medium text-slate-700">
              Currency:
            </label>
            <Input
              className="h-8 max-w-[8rem] text-sm uppercase"
              maxLength={3}
              value={form.currency}
              onChange={(e) =>
                onChange({
                  ...form,
                  currency: e.target.value.toUpperCase(),
                })
              }
            />

            <span className="font-medium text-slate-700">P&amp;L Account:</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4"
                checked={form.accKind}
                onChange={(e) =>
                  onChange({ ...form, accKind: e.target.checked })
                }
              />
            </label>

            <span className="font-medium text-slate-700">CV:</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4"
                checked={form.receipt}
                onChange={(e) =>
                  onChange({ ...form, receipt: e.target.checked })
                }
              />
            </label>

            <span className="font-medium text-slate-700">PV:</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4"
                checked={form.payment}
                onChange={(e) =>
                  onChange({ ...form, payment: e.target.checked })
                }
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1 bg-emerald-700 hover:bg-emerald-800"
              disabled={saving}
              onClick={onSave}
            >
              <Check className="size-3.5" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 border-rose-300 text-rose-700 hover:bg-rose-50"
              disabled={saving}
              onClick={onCancel}
            >
              <Ban className="size-3.5" />
              Cancel
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

export function AccountsChartPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [accounts, setAccounts] = useState<AccountsChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [inline, setInline] = useState<InlineFormState | null>(null);
  const [search, setSearch] = useState("");

  const tree = useMemo(() => buildAccountsChartTree(accounts), [accounts]);
  const visibleRows = useMemo(
    () => collectVisibleRows(tree, expanded),
    [tree, expanded]
  );

  const loadAccounts = useCallback(
    async (opts?: { keepExpanded?: boolean; expandCodes?: string[] }) => {
      if (!token) {
        setAccounts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const data = await getAccountsCharts(token);
        setAccounts(data);

        setExpanded((prev) => {
          if (opts?.keepExpanded) {
            const next = new Set(prev);
            for (const code of opts.expandCodes ?? []) next.add(code);
            return next;
          }
          // Default: expand all parents that have children (readable chart like screenshot)
          const parents = new Set<string>();
          for (const a of data) {
            if (a.parentCode) parents.add(a.parentCode);
          }
          return parents;
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load accounts chart";
        setLoadError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!sessionReady) return;
    void loadAccounts();
  }, [sessionReady, loadAccounts]);

  function toggleExpand(accCode: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(accCode)) next.delete(accCode);
      else next.add(accCode);
      return next;
    });
  }

  function handleAdd(parent: AccountsChartItem) {
    setExpanded((prev) => new Set(prev).add(parent.accCode));
    setInline(
      emptyInline("add", parent.accCode, parent.accCode)
    );
  }

  function handleAddRoot() {
    setInline(emptyInline("add", null, ""));
  }

  function handleEdit(account: AccountsChartItem) {
    if (account.parentCode) {
      setExpanded((prev) => new Set(prev).add(account.parentCode!));
    }
    setInline(fromAccount(account));
  }

  function handleCancel() {
    setInline(null);
  }

  async function handleSave() {
    if (!token || !inline) return;

    const code = inline.accCode.trim();
    const name = inline.accName.trim() || inline.accAName.trim();
    const arabic = inline.accAName.trim() || inline.accName.trim();

    if (!code || !name || !inline.currency.trim()) {
      toast.error("Fill all Fields, Action Canceled");
      return;
    }

    if (inline.parentCode && inline.parentCode === code) {
      toast.error("An account cannot be its own parent.");
      return;
    }

    if (
      inline.parentCode &&
      !accounts.some((a) => a.accCode === inline.parentCode) &&
      inline.mode === "edit"
    ) {
      toast.error("Invalid PARENTCode — must reference an existing ACCCode.");
      return;
    }

    const payload = {
      accCode: code,
      parentCode: inline.parentCode.trim() || null,
      accName: inline.accName.trim() || name,
      accAName: arabic,
      currency: inline.currency.trim().toUpperCase(),
      accKind: inline.accKind,
      accType: inline.accType,
      receipt: inline.receipt,
      payment: inline.payment,
    };

    setSaving(true);
    try {
      if (inline.mode === "add") {
        await createAccountsChart(payload, token);
        toast.success("Account created");
      } else {
        await updateAccountsChart(code, payload, token);
        toast.success("Account updated");
      }

      const expandCodes = [
        ...(payload.parentCode ? [payload.parentCode] : []),
        ...(inline.anchorCode ? [inline.anchorCode] : []),
      ];
      setInline(null);
      await loadAccounts({ keepExpanded: true, expandCodes });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Save failed"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(account: AccountsChartItem) {
    toast(`Delete account "${account.accCode}"?`, {
      description:
        "Please delete all child items before deleting their parent item. Also blocked if used in GeneralLedger.",
      action: {
        label: "Delete",
        onClick: () => void confirmDelete(account),
      },
      cancel: {
        label: "Cancel",
        onClick: () => toast.message("Delete cancelled"),
      },
    });
  }

  async function confirmDelete(account: AccountsChartItem) {
    if (!token) return;
    try {
      await deleteAccountsChart(account.accCode, token);
      toast.success("Account deleted");
      if (inline?.anchorCode === account.accCode) setInline(null);
      await loadAccounts({ keepExpanded: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account"
      );
    }
  }

  const filteredVisible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return visibleRows;
    return visibleRows.filter((row) => {
      const a = row.node;
      return (
        a.accCode.toLowerCase().includes(term) ||
        (a.parentCode?.toLowerCase().includes(term) ?? false) ||
        (a.accAName?.toLowerCase().includes(term) ?? false) ||
        (a.accName?.toLowerCase().includes(term) ?? false) ||
        (a.currency?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [visibleRows, search]);

  return (
    <PageGuard permission={null}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Accounts Chart
            </h2>
            <p className="text-muted-foreground text-xs">
              Hierarchical Tree/Grid —{" "}
              <span className="font-mono">PARENTCode → ACCCode</span>. Add /
              Edit open inline under the selected row (old Web Forms behavior).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-8 w-56 text-sm"
              placeholder="Filter visible rows…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              onClick={handleAddRoot}
            >
              Add root
            </Button>
          </div>
        </div>

        <div className="overflow-auto rounded-md border border-sky-300 bg-white shadow-sm">
          <table className="w-full min-w-[960px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-gradient-to-b from-sky-100 to-sky-200 text-slate-800">
                <th className="border border-sky-300 px-2 py-1.5 text-left font-semibold">
                  Account NO.
                </th>
                <th className="border border-sky-300 px-2 py-1.5 text-left font-semibold leading-tight">
                  Parent
                  <br />
                  Code.
                </th>
                <th className="border border-sky-300 px-2 py-1.5 text-left font-semibold">
                  Arabic Name
                </th>
                <th className="border border-sky-300 px-2 py-1.5 text-center font-semibold">
                  Currency
                </th>
                <th className="border border-sky-300 px-2 py-1.5 text-center font-semibold leading-tight">
                  P&amp;L
                  <br />
                  Account
                </th>
                <th className="border border-sky-300 px-2 py-1.5 text-center font-semibold">
                  CV
                </th>
                <th className="border border-sky-300 px-2 py-1.5 text-center font-semibold">
                  PV
                </th>
                <th className="border border-sky-300 px-2 py-1.5 text-center font-semibold">
                  Add
                </th>
                <th className="border border-sky-300 px-2 py-1.5 text-center font-semibold">
                  Edit
                </th>
                <th className="border border-sky-300 px-2 py-1.5 text-center font-semibold">
                  Delete
                </th>
              </tr>
            </thead>
            <tbody>
              {inline?.mode === "add" && inline.anchorCode == null ? (
                <InlineEditor
                  form={inline}
                  accounts={accounts}
                  saving={saving}
                  onChange={setInline}
                  onSave={() => void handleSave()}
                  onCancel={handleCancel}
                />
              ) : null}

              {!sessionReady || loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-muted-foreground px-3 py-8 text-center"
                  >
                    Loading accounts…
                  </td>
                </tr>
              ) : null}

              {!loading && filteredVisible.length === 0 && !inline ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-muted-foreground px-3 py-8 text-center"
                  >
                    No accounts found. Use &quot;Add root&quot; to create the
                    first account.
                  </td>
                </tr>
              ) : null}

              {filteredVisible.map(({ node, depth, hasChildren, expanded: isOpen }) => {
                const isEditAnchor =
                  inline?.mode === "edit" && inline.anchorCode === node.accCode;
                const isAddAnchor =
                  inline?.mode === "add" && inline.anchorCode === node.accCode;

                return (
                  <FragmentRows
                    key={node.accCode}
                    node={node}
                    depth={depth}
                    hasChildren={hasChildren}
                    expanded={isOpen}
                    highlighted={Boolean(isEditAnchor)}
                    showInlineAfter={Boolean(isEditAnchor || isAddAnchor)}
                    inline={inline}
                    accounts={accounts}
                    saving={saving}
                    onToggle={() => toggleExpand(node.accCode)}
                    onAdd={() => handleAdd(node)}
                    onEdit={() => handleEdit(node)}
                    onDelete={() => handleDelete(node)}
                    onInlineChange={setInline}
                    onSave={() => void handleSave()}
                    onCancel={handleCancel}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        {loadError ? (
          <div className="flex items-center gap-3">
            <p className="text-destructive text-sm">{loadError}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void loadAccounts()}
            >
              Retry
            </Button>
          </div>
        ) : null}
      </div>
    </PageGuard>
  );
}

function FragmentRows({
  node,
  depth,
  hasChildren,
  expanded,
  highlighted,
  showInlineAfter,
  inline,
  accounts,
  saving,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
  onInlineChange,
  onSave,
  onCancel,
}: {
  node: AccountsChartTreeNode;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  highlighted: boolean;
  showInlineAfter: boolean;
  inline: InlineFormState | null;
  accounts: AccountsChartItem[];
  saving: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onInlineChange: (next: InlineFormState) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <tr
        className={cn(
          "border-b border-sky-100 hover:bg-sky-50/60",
          highlighted && "bg-amber-200/80 ring-1 ring-inset ring-amber-400"
        )}
      >
        <td className="border-r border-sky-100 px-1 py-1 align-middle">
          <div
            className="flex items-center gap-0.5 font-mono text-[13px]"
            style={{ paddingInlineStart: `${depth * 1.15}rem` }}
          >
            {hasChildren ? (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground inline-flex size-5 items-center justify-center rounded"
                onClick={onToggle}
                aria-label={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </button>
            ) : (
              <span className="inline-block size-5" />
            )}
            <span>{node.accCode}</span>
          </div>
        </td>
        <td className="border-r border-sky-100 px-2 py-1 font-mono text-[13px]">
          {node.parentCode ?? ""}
        </td>
        <td
          className="border-r border-sky-100 px-2 py-1 text-[13px]"
          dir="rtl"
        >
          {node.accAName || getAccountLabel(node)}
        </td>
        <td className="border-r border-sky-100 px-2 py-1 text-center text-[13px]">
          {node.currency ?? ""}
        </td>
        <td className="border-r border-sky-100 px-2 py-1 text-center">
          <FlagCell checked={Boolean(node.accKind)} />
        </td>
        <td className="border-r border-sky-100 px-2 py-1 text-center">
          <FlagCell checked={Boolean(node.receipt)} />
        </td>
        <td className="border-r border-sky-100 px-2 py-1 text-center">
          <FlagCell checked={Boolean(node.payment)} />
        </td>
        <td className="border-r border-sky-100 px-1 py-1 text-center">
          <button
            type="button"
            className="text-sky-800 hover:underline"
            onClick={onAdd}
          >
            Add
          </button>
        </td>
        <td className="border-r border-sky-100 px-1 py-1 text-center">
          <button
            type="button"
            className="text-sky-800 hover:underline"
            onClick={onEdit}
          >
            Edit
          </button>
        </td>
        <td className="px-1 py-1 text-center">
          <button
            type="button"
            className="text-rose-700 hover:underline"
            onClick={onDelete}
          >
            Delete
          </button>
        </td>
      </tr>

      {showInlineAfter && inline ? (
        <InlineEditor
          form={inline}
          accounts={accounts}
          saving={saving}
          onChange={onInlineChange}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : null}
    </>
  );
}
