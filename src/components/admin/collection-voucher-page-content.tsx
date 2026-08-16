"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  createCollectedVoucher,
  getAccountChildren,
  getAccountCurrency,
  getAccountSources,
  getAccountsCharts,
  getCollectedVoucher,
  getCollectedVoucherAdjacent,
  getCollectedVoucherJournal,
  getCollectedVoucherLast,
  getCollectionVoucherBanks,
  getCollectionVoucherSafes,
  postCollectedVoucher,
  searchCollectedVouchers,
} from "@/lib/api-client";
import { amountInArabicWords } from "@/lib/amount-in-words-ar";
import type {
  AccountSelectItem,
  CollectedVoucherItem,
  VoucherJournalLine,
} from "@/types/collected-voucher";
import { PageGuard } from "@/components/permissions/page-guard";
import { CostCenterCombobox } from "@/components/admin/cost-center-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";

type LedgerLine = VoucherJournalLine & { locked?: boolean };

function toInputDate(value?: string | null) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function CollectionVoucherPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const userName = session?.user?.name ?? session?.user?.email ?? "system";

  const [isNew, setIsNew] = useState(false);
  const [receiptNo, setReceiptNo] = useState<number | null>(null);
  const [recRef, setRecRef] = useState("");
  const [receiptDate, setReceiptDate] = useState(toInputDate());
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Cheque" | "Transfer">("Cash");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("1");
  const [currency, setCurrency] = useState("EGP");
  const [costCenter, setCostCenter] = useState("");
  const [totalString, setTotalString] = useState("");
  const [vSource, setVSource] = useState<"Customer" | "Supplier" | "Other">("Other");
  const [collectedCode, setCollectedCode] = useState("");
  const [collectedName, setCollectedName] = useState("");
  const [description, setDescription] = useState("");
  const [approved, setApproved] = useState(false);

  const [safeCode, setSafeCode] = useState("");
  const [safeCurrencyAcc, setSafeCurrencyAcc] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeBank, setChequeBank] = useState("");
  const [chequeAccount, setChequeAccount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [transferBank, setTransferBank] = useState("");
  const [transferAccount, setTransferAccount] = useState("");

  const [safes, setSafes] = useState<AccountSelectItem[]>([]);
  const [banks, setBanks] = useState<AccountSelectItem[]>([]);
  const [safeChildren, setSafeChildren] = useState<AccountSelectItem[]>([]);
  const [chequeAccounts, setChequeAccounts] = useState<AccountSelectItem[]>([]);
  const [transferAccounts, setTransferAccounts] = useState<AccountSelectItem[]>([]);
  const [sources, setSources] = useState<AccountSelectItem[]>([]);
  const [chartAccounts, setChartAccounts] = useState<AccountSelectItem[]>([]);

  const [lines, setLines] = useState<LedgerLine[]>([]);
  const [lineType, setLineType] = useState("Credit");
  const [lineAccount, setLineAccount] = useState("");
  const [lineAmount, setLineAmount] = useState("");
  const [lineDescription, setLineDescription] = useState("");

  const [busy, setBusy] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchRows, setSearchRows] = useState<CollectedVoucherItem[]>([]);

  const debitAccountCode = useMemo(() => {
    if (paymentMethod === "Cash") return safeCurrencyAcc;
    if (paymentMethod === "Cheque") return chequeAccount;
    return transferAccount;
  }, [paymentMethod, safeCurrencyAcc, chequeAccount, transferAccount]);

  const debitAccountName = useMemo(() => {
    const list =
      paymentMethod === "Cash"
        ? safeChildren
        : paymentMethod === "Cheque"
          ? chequeAccounts
          : transferAccounts;
    return list.find((a) => a.accCode === debitAccountCode)?.name ?? debitAccountCode;
  }, [paymentMethod, safeChildren, chequeAccounts, transferAccounts, debitAccountCode]);

  const totalDebit = lines
    .filter((l) => l.type === "Debit")
    .reduce((s, l) => s + (l.amount ?? 0), 0);
  const totalCredit = lines
    .filter((l) => l.type === "Credit")
    .reduce((s, l) => s + (l.amount ?? 0), 0);

  const loadAccountCurrency = useCallback(
    async (accCode: string) => {
      if (!token || !accCode) return;
      try {
        const row = await getAccountCurrency(accCode, token);
        if (row.code) {
          setCurrency(row.code);
          setRate(String(row.rate ?? 1));
        }
      } catch {
        /* keep */
      }
    },
    [token]
  );

  /** Web Forms ReadSavingData / drpSave_SelectedIndexChanged */
  const onSafeChange = useCallback(
    async (code: string, preserveCurrencyAcc?: string) => {
      setSafeCode(code);
      if (!token || !code) {
        setSafeChildren([]);
        setSafeCurrencyAcc("");
        return;
      }
      const children = await getAccountChildren(code, token);
      setSafeChildren(children);
      const next =
        preserveCurrencyAcc && children.some((c) => c.accCode === preserveCurrencyAcc)
          ? preserveCurrencyAcc
          : "";
      setSafeCurrencyAcc(next);
      if (next) await loadAccountCurrency(next);
    },
    [token, loadAccountCurrency]
  );

  /** Web Forms drpCBank_SelectedIndexChanged */
  const onChequeBankChange = useCallback(
    async (code: string, preserveAccount?: string) => {
      setChequeBank(code);
      if (!token || !code) {
        setChequeAccounts([]);
        setChequeAccount("");
        return;
      }
      const children = await getAccountChildren(code, token);
      setChequeAccounts(children);
      const next =
        preserveAccount && children.some((c) => c.accCode === preserveAccount)
          ? preserveAccount
          : "";
      setChequeAccount(next);
      if (next) await loadAccountCurrency(next);
    },
    [token, loadAccountCurrency]
  );

  /** Web Forms drpTBank_SelectedIndexChanged */
  const onTransferBankChange = useCallback(
    async (code: string, preserveAccount?: string) => {
      setTransferBank(code);
      if (!token || !code) {
        setTransferAccounts([]);
        setTransferAccount("");
        return;
      }
      const children = await getAccountChildren(code, token);
      setTransferAccounts(children);
      const next =
        preserveAccount && children.some((c) => c.accCode === preserveAccount)
          ? preserveAccount
          : "";
      setTransferAccount(next);
      if (next) await loadAccountCurrency(next);
    },
    [token, loadAccountCurrency]
  );

  /**
   * Web Forms: Bank Name list = AccountsChart WHERE PARENTCode = 111.
   * Load only when Cheque / Transfer needs the ComboBox (not full chart).
   */
  const ensureBanksLoaded = useCallback(async () => {
    if (!token) return;
    if (banks.length > 0) return;
    try {
      const list = await getCollectionVoucherBanks(token);
      setBanks(list);
      if (list.length === 0) {
        toast.error(
          "Bank Name empty: no AccountsChart rows with PARENTCode = 111."
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }, [token, banks.length]);

  /**
   * Web Forms rdoReceiptType_SelectedIndexChanged:
   * switch panel + Rate; load Bank Name when Cheque/Transfer.
   */
  const onPaymentMethodChange = useCallback(
    async (method: "Cash" | "Cheque" | "Transfer") => {
      setPaymentMethod(method);
      if (method === "Cheque" || method === "Transfer") {
        await ensureBanksLoaded();
      }
      const acc =
        method === "Cash"
          ? safeCurrencyAcc
          : method === "Cheque"
            ? chequeAccount
            : transferAccount;
      if (acc) await loadAccountCurrency(acc);
    },
    [
      safeCurrencyAcc,
      chequeAccount,
      transferAccount,
      loadAccountCurrency,
      ensureBanksLoaded,
    ]
  );

  /** Web Forms drpSource_SelectedIndexChanged */
  const onCollectedFromChange = useCallback(
    async (source: "Customer" | "Supplier" | "Other") => {
      setVSource(source);
      setCollectedCode("");
      setCollectedName("");
      if (!token || source === "Other") {
        setSources([]);
        return;
      }
      try {
        setSources(await getAccountSources(source.toLowerCase(), token));
      } catch {
        setSources([]);
      }
    },
    [token]
  );

  const loadJournal = useCallback(
    async (no: number, voucher: CollectedVoucherItem) => {
      if (!token) return;
      try {
        const journal = await getCollectedVoucherJournal(no, token);
        if (journal.length > 0) {
          setLines(journal.map((l) => ({ ...l, locked: true })));
          return;
        }
      } catch {
        /* unposted */
      }
      const amt = voucher.amount ?? 0;
      const r = voucher.rate ?? 1;
      const code = voucher.accountNO ?? "";
      if (!code || !amt) {
        setLines([]);
        return;
      }
      setLines([
        {
          type: "Debit",
          acccountCode: code,
          accName: code,
          description: voucher.description ?? "",
          amount: amt,
          amountEGP: Math.round(amt * r * 100) / 100,
          locked: true,
        },
      ]);
    },
    [token]
  );

  /**
   * Web Forms ReadData — set parent first, load children, then set child.
   * See COLLECTION_VOUCHER_WEBFORMS_FLOW.md §3.
   */
  const applyVoucher = useCallback(
    async (v: CollectedVoucherItem) => {
      if (!token) return;
      setIsNew(false);
      setReceiptNo(v.receiptNO);
      setRecRef(v.recRef ?? "");
      setReceiptDate(toInputDate(v.receiptDate));
      const type = ((v.type as "Cash" | "Cheque" | "Transfer") || "Cash");
      setPaymentMethod(type);
      setAmount(v.amount != null ? String(v.amount) : "");
      setCurrency(v.currency ?? "EGP");
      setRate(v.rate != null ? String(v.rate) : "1");
      setCostCenter(v.costCenter ?? "");
      setTotalString(v.totalString ?? "");
      setVSource((v.vSource as "Customer" | "Supplier" | "Other") || "Other");
      setCollectedCode(v.collectedCode ?? "");
      setCollectedName(v.collectedName ?? "");
      setDescription(v.description ?? "");
      setApproved(!!v.approved);
      setChequeNo(v.chequeNO ?? "");
      setDueDate(v.dueDate ? toInputDate(v.dueDate) : "");
      // ReadData injects one party item — do not re-run CTE here
      setSources(
        v.collectedCode
          ? [{ accCode: v.collectedCode, name: v.collectedName ?? v.collectedCode }]
          : []
      );

      if (type === "Cash") {
        await onSafeChange(v.saveCode ?? "", v.accountNO ?? undefined);
      } else if (type === "Cheque") {
        await ensureBanksLoaded();
        await onChequeBankChange(v.bankCode ?? "", v.accountNO ?? undefined);
      } else {
        await ensureBanksLoaded();
        await onTransferBankChange(v.bankCode ?? "", v.accountNO ?? undefined);
      }

      await loadJournal(v.receiptNO, v);
    },
    [
      token,
      loadJournal,
      onSafeChange,
      onChequeBankChange,
      onTransferBankChange,
      ensureBanksLoaded,
    ]
  );

  const loadLast = useCallback(async () => {
    if (!token) return;
    try {
      const v = await getCollectedVoucherLast(token);
      await applyVoucher(v);
    } catch {
      setIsNew(true);
      setReceiptNo(null);
      setRecRef("");
      setLines([]);
    }
  }, [token, applyVoucher]);

  /**
   * Web Forms Page_Load (!IsPostBack):
   * bind Safe (PARENTCode = 110) + Cost/GL chart; Bank Name when Cheque/Transfer.
   * Default payment method = Cash. Then ReadData(last).
   */
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, charts] = await Promise.all([
          getCollectionVoucherSafes(token),
          getAccountsCharts(token),
        ]);
        if (cancelled) return;
        setSafes(s);
        setChartAccounts(
          charts
            .filter((c) => c.receipt)
            .map((c) => ({
              accCode: c.accCode,
              name: `${c.accCode} - ${c.accAName || c.accName || ""}`,
            }))
        );
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : String(e));
      }
      if (!cancelled) void loadLast();
    })();
    return () => {
      cancelled = true;
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps — Page_Load once per token

  useEffect(() => {
    if (approved || isNew || !receiptNo) return;
    const amt = parseFloat(amount) || 0;
    const r = parseFloat(rate) || 1;
    if (!debitAccountCode || !amt) return;
    setLines((prev) => {
      const credits = prev.filter((l) => !l.locked);
      const debit: LedgerLine = {
        type: "Debit",
        acccountCode: debitAccountCode,
        accName: debitAccountName,
        description,
        amount: amt,
        amountEGP: Math.round(amt * r * 100) / 100,
        locked: true,
      };
      return [debit, ...credits];
    });
  }, [amount, rate, description, debitAccountCode, debitAccountName, approved, isNew, receiptNo]);

  const refreshAmountWords = () => {
    try {
      setTotalString(amountInArabicWords(amount));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  /** Web Forms btnNewReceipt_Click */
  const startNew = async () => {
    setIsNew(true);
    setApproved(false);
    setReceiptNo(null);
    setRecRef("");
    setReceiptDate(toInputDate());
    setAmount("");
    setTotalString("");
    setDescription("");
    setRate("1");
    setCurrency("EGP");
    setCostCenter("");
    setPaymentMethod("Cash");
    await onSafeChange("");
    await onChequeBankChange("");
    await onTransferBankChange("");
    setChequeNo("");
    setDueDate("");
    await onCollectedFromChange("Customer");
    setLines([]);
  };

  const navigate = async (direction: string) => {
    if (!token || receiptNo == null) return;
    try {
      const next = await getCollectedVoucherAdjacent(receiptNo, direction, token);
      if (next == null) return;
      const v = await getCollectedVoucher(next, token);
      await applyVoucher(v);
    } catch {
      /* edge */
    }
  };

  const doSearch = async () => {
    if (!token || !searchValue.trim()) return;
    try {
      setSearchRows(await searchCollectedVouchers(searchValue.trim(), token));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const openSearchRow = async (no: number) => {
    if (!token) return;
    const v = await getCollectedVoucher(no, token);
    await applyVoucher(v);
    setFindOpen(false);
  };

  const saveHeader = async () => {
    if (!token) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Amount is required.");
      return;
    }
    if (paymentMethod === "Cheque" && (!chequeNo || !dueDate)) {
      toast.error("Cheque No. and due date are required.");
      return;
    }

    let saveCode = "0";
    let bankCode = "0";
    let accountNO = "";
    let cheque = "";
    let due: string | null = null;

    if (paymentMethod === "Cash") {
      saveCode = safeCode || "0";
      accountNO = safeCurrencyAcc;
    } else if (paymentMethod === "Cheque") {
      cheque = chequeNo;
      bankCode = chequeBank || "0";
      accountNO = chequeAccount;
      due = dueDate;
    } else {
      bankCode = transferBank || "0";
      accountNO = transferAccount;
    }

    const sCode = vSource === "Other" ? "0" : collectedCode;
    const sName =
      vSource === "Other"
        ? collectedName
        : collectedName || sources.find((s) => s.accCode === collectedCode)?.name || "";

    let words = totalString;
    if (!words) {
      try {
        words = amountInArabicWords(amount);
        setTotalString(words);
      } catch {
        words = "";
      }
    }

    setBusy(true);
    try {
      const created = await createCollectedVoucher(
        {
          receiptDate: receiptDate ? new Date(receiptDate).toISOString() : null,
          saveCode,
          amount: amt,
          currency,
          rate: parseFloat(rate) || 1,
          type: paymentMethod,
          vSource,
          collectedCode: sCode,
          collectedName: sName,
          description,
          chequeNO: cheque,
          bankCode,
          dueDate: due ? new Date(due).toISOString() : null,
          accountNO,
          totalString: words,
          costCenter,
          addedUser: userName,
        },
        token
      );
      toast.success(`Receipt Number ( ${created.receiptNO} ) updated Done`);
      await applyVoucher(created);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const addCreditLine = () => {
    const amt = parseFloat(lineAmount);
    const r = parseFloat(rate) || 1;
    if (!lineAccount || !amt) {
      toast.error("Account and amount are required.");
      return;
    }
    const acc = chartAccounts.find((a) => a.accCode === lineAccount);
    setLines((prev) => [
      ...prev,
      {
        type: lineType,
        acccountCode: lineAccount,
        accName: acc?.name ?? lineAccount,
        description: lineDescription || description,
        amount: amt,
        amountEGP: Math.round(amt * r * 100) / 100,
        locked: false,
      },
    ]);
    setLineAmount("");
    setLineAccount("");
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((l, i) => i !== idx || l.locked));
  };

  const postJournal = async () => {
    if (!token || !receiptNo) return;
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      toast.error("Total debit must be equal total credit , Actions Canceled");
      return;
    }
    if (totalDebit === 0 || totalCredit === 0) {
      toast.error("Total debit and Total credit not allow 0 value, Actions Canceled");
      return;
    }
    setBusy(true);
    try {
      const r = parseFloat(rate) || 1;
      await postCollectedVoucher(
        receiptNo,
        lines.map((l) => {
          const isDebit = l.type === "Debit";
          const egp = l.amountEGP ?? (l.amount ?? 0) * r;
          return {
            acccountCode: l.acccountCode,
            description: isDebit
              ? `من حساب  ${l.accName ?? ""}`
              : `إلى حساب  ${l.accName ?? ""}`,
            currancy: currency,
            rate: r,
            amount: l.amount,
            depit: isDebit ? egp : 0,
            credit: isDebit ? 0 : egp,
            notes: l.description,
            costCenter,
            chequeNO: paymentMethod === "Cheque" ? chequeNo : undefined,
            bankAccount: paymentMethod === "Transfer" ? transferAccount : undefined,
            dueDate:
              paymentMethod === "Cheque" && dueDate
                ? new Date(dueDate).toISOString()
                : new Date(receiptDate).toISOString(),
          };
        }),
        token
      );
      toast.success(`Receipt Number ( ${receiptNo} ) journal posted`);
      const v = await getCollectedVoucher(receiptNo, token);
      await applyVoucher(v);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const detailTitle =
    paymentMethod === "Cash"
      ? "Safe Details"
      : paymentMethod === "Cheque"
        ? "Cheque Details"
        : "Transfer Details";

  const toOptions = (items: AccountSelectItem[]): ComboboxOption[] =>
    items.map((i) => ({ value: i.accCode, label: i.name }));

  return (
    <PageGuard permission={null}>
      <div className="min-h-full bg-[#eef1f4] p-3 md:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button type="button" title="First" disabled={isNew} onClick={() => navigate("first")} className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40">
              <ChevronFirst className="h-7 w-7" strokeWidth={2.5} />
            </button>
            <button type="button" title="Previous" disabled={isNew} onClick={() => navigate("previous")} className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40">
              <ChevronLeft className="h-7 w-7" strokeWidth={2.5} />
            </button>
            <button type="button" title="Next" disabled={isNew} onClick={() => navigate("next")} className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40">
              <ChevronRight className="h-7 w-7" strokeWidth={2.5} />
            </button>
            <button type="button" title="Last" disabled={isNew} onClick={() => navigate("last")} className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40">
              <ChevronLast className="h-7 w-7" strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex overflow-hidden rounded-md bg-slate-700 text-sm font-medium text-white shadow">
            <button type="button" onClick={startNew} className="px-4 py-2 hover:bg-slate-600">New</button>
            <button type="button" onClick={() => setFindOpen(true)} className="border-l border-slate-600 px-4 py-2 hover:bg-slate-600">Find</button>
            <button type="button" disabled className="border-l border-slate-600 px-4 py-2 opacity-60">Print</button>
            <button type="button" disabled className="border-l border-slate-600 px-4 py-2 opacity-60">Print Journal</button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-300 bg-[#e8ebef] p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-800">Collection Voucher</h1>
            <div className="min-w-[280px] max-w-md flex-1 rounded border border-slate-300 bg-[#eef1f4] p-3">
              <div className="mb-2 text-base font-bold italic text-[#006699]">{detailTitle}</div>
              {paymentMethod === "Cash" && (
                <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
                  <span className="text-sm">Safe NO.</span>
                  <SearchableCombobox value={safeCode} onValueChange={(v) => void onSafeChange(v)} options={toOptions(safes)} placeholder="Select safe" disabled={!isNew} />
                  <span className="text-sm">Currency</span>
                  <SearchableCombobox
                    value={safeCurrencyAcc}
                    onValueChange={(v) => {
                      setSafeCurrencyAcc(v);
                      void loadAccountCurrency(v);
                    }}
                    options={toOptions(safeChildren)}
                    placeholder="Select currency account"
                    disabled={!isNew}
                  />
                </div>
              )}
              {paymentMethod === "Cheque" && (
                <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
                  <span className="text-sm">Cheque NO.</span>
                  <Input className="bg-white" value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} disabled={!isNew} />
                  <span className="text-sm">Bank Name</span>
                  <SearchableCombobox value={chequeBank} onValueChange={(v) => void onChequeBankChange(v)} options={toOptions(banks)} placeholder="Select bank" disabled={!isNew} />
                  <span className="text-sm">Account NO.</span>
                  <SearchableCombobox
                    value={chequeAccount}
                    onValueChange={(v) => {
                      setChequeAccount(v);
                      void loadAccountCurrency(v);
                    }}
                    options={toOptions(chequeAccounts)}
                    placeholder="Select account"
                    disabled={!isNew}
                  />
                  <span className="text-sm">Due Date</span>
                  <Input type="date" className="bg-white" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!isNew} />
                </div>
              )}
              {paymentMethod === "Transfer" && (
                <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
                  <span className="text-sm">Bank Name</span>
                  <SearchableCombobox value={transferBank} onValueChange={(v) => void onTransferBankChange(v)} options={toOptions(banks)} placeholder="Select bank" disabled={!isNew} />
                  <span className="text-sm">Account NO.</span>
                  <SearchableCombobox
                    value={transferAccount}
                    onValueChange={(v) => {
                      setTransferAccount(v);
                      void loadAccountCurrency(v);
                    }}
                    options={toOptions(transferAccounts)}
                    placeholder="Select account"
                    disabled={!isNew}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-800">
            <div className="grid items-center gap-2 md:grid-cols-[110px_minmax(0,1fr)_110px_200px]">
              <span>Receipt NO.</span>
              <span className="font-medium">{recRef || (isNew ? "" : receiptNo ?? "")}</span>
              <span>Receipt Date</span>
              <Input type="date" className="bg-white" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} disabled={!isNew} />
            </div>

            <div className="grid items-center gap-2 md:grid-cols-[110px_1fr]">
              <span>Payment Method</span>
              <div className="flex flex-wrap gap-6">
                {(["Cash", "Cheque", "Transfer"] as const).map((m) => (
                  <label key={m} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === m}
                      disabled={!isNew}
                      onChange={() => void onPaymentMethodChange(m)}
                    />
                    {m === "Transfer" ? "Bank Transfer" : m}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid items-center gap-2 md:grid-cols-[110px_160px_60px_80px_80px_80px]">
              <span>Amount</span>
              <Input className="bg-white" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!isNew} inputMode="decimal" />
              <span>Rate</span>
              <span className="font-medium">{rate}</span>
              <span>Currency</span>
              <span className="font-medium">{currency}</span>
            </div>

            <div className="grid items-center gap-2 md:grid-cols-[110px_220px]">
              <span>Cost Center</span>
              <CostCenterCombobox value={costCenter} onValueChange={setCostCenter} disabled={!isNew} />
            </div>

            <div className="grid items-center gap-2 md:grid-cols-[110px_minmax(0,1fr)_auto]">
              <span>Amount in String</span>
              <Input className="bg-white text-right" dir="rtl" value={totalString} readOnly />
              <button type="button" onClick={refreshAmountWords} disabled={!isNew || !amount} className="rounded bg-[#17a2b8] px-4 py-2 font-medium text-white hover:bg-[#138496] disabled:opacity-50">
                Refresh
              </button>
            </div>

            <div className="grid items-center gap-2 md:grid-cols-[110px_140px_minmax(0,1fr)]">
              <span>Collected From</span>
              <Select
                value={vSource}
                onValueChange={(v) => {
                  if (!v) return;
                  void onCollectedFromChange(v as "Customer" | "Supplier" | "Other");
                }}
                disabled={!isNew}
              >
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer">Customer</SelectItem>
                  <SelectItem value="Supplier">Supplier</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {vSource === "Other" ? (
                <Input
                  className="bg-white"
                  value={collectedName}
                  onChange={(e) => {
                    setCollectedName(e.target.value);
                    if (!description) setDescription(e.target.value);
                  }}
                  disabled={!isNew}
                />
              ) : (
                <SearchableCombobox
                  value={collectedCode}
                  onValueChange={(code) => {
                    setCollectedCode(code);
                    const s = sources.find((x) => x.accCode === code);
                    setCollectedName(s?.name ?? "");
                    if (s?.name) setDescription(s.name);
                  }}
                  options={toOptions(sources)}
                  placeholder={`Select ${vSource.toLowerCase()}`}
                  disabled={!isNew}
                />
              )}
            </div>

            <div className="grid items-start gap-2 md:grid-cols-[110px_minmax(0,1fr)]">
              <span className="pt-2">Description</span>
              <textarea
                className="min-h-[75px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs outline-none disabled:opacity-50"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isNew}
                placeholder="Description Required"
              />
            </div>

            {isNew && (
              <div className="flex gap-2 pt-1">
                <Button onClick={saveHeader} disabled={busy} className="bg-slate-700 hover:bg-slate-600">Save</Button>
                <Button variant="outline" onClick={loadLast} disabled={busy}>Cancel</Button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-md border border-slate-400 bg-white">
          <div className="flex items-center justify-between border-b border-slate-300 bg-slate-100 px-3 py-2">
            <span className="text-sm font-semibold text-slate-700">General Ledger</span>
            {!approved && receiptNo && !isNew && (
              <Button size="sm" onClick={postJournal} disabled={busy}>Save Account</Button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black text-left text-white">
                <th className="px-2 py-2 font-medium">DR\CR</th>
                <th className="px-2 py-2 font-medium">Accounts</th>
                <th className="px-2 py-2 font-medium">Description</th>
                <th className="px-2 py-2 text-right font-medium">Amount F/C</th>
                <th className="px-2 py-2 text-right font-medium">Amount EGP</th>
                {!approved && <th className="px-2 py-2" />}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={`${l.acccountCode}-${idx}`} className="border-b border-slate-200">
                  <td className="px-2 py-1.5">{l.type}</td>
                  <td className="px-2 py-1.5">{l.acccountCode}{l.accName ? ` - ${l.accName}` : ""}</td>
                  <td className="px-2 py-1.5">{l.description}</td>
                  <td className="px-2 py-1.5 text-right">{(l.amount ?? 0).toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <Input className="h-8 bg-slate-100 text-right" value={(l.amountEGP ?? 0).toFixed(2)} readOnly />
                  </td>
                  {!approved && (
                    <td className="px-2 py-1.5">
                      {!l.locked && (
                        <Button variant="ghost" size="sm" onClick={() => removeLine(idx)}>Remove</Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-slate-500">No ledger lines</td>
                </tr>
              )}
            </tbody>
          </table>

          {!approved && receiptNo && !isNew && (
            <div className="grid gap-2 border-t border-slate-200 bg-slate-50 p-3 sm:grid-cols-5">
              <Select value={lineType} onValueChange={(v) => v && setLineType(v)}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Credit">Credit</SelectItem>
                  <SelectItem value="Debit">Debit</SelectItem>
                </SelectContent>
              </Select>
              <div className="sm:col-span-2">
                <SearchableCombobox
                  value={lineAccount}
                  onValueChange={setLineAccount}
                  options={chartAccounts.map((a) => ({ value: a.accCode, label: a.name }))}
                  placeholder="Accounts"
                />
              </div>
              <Input className="bg-white" placeholder="Description" value={lineDescription || description} onChange={(e) => setLineDescription(e.target.value)} />
              <div className="flex gap-2">
                <Input className="bg-white" placeholder="Amount" value={lineAmount} onChange={(e) => setLineAmount(e.target.value)} />
                <Button onClick={addCreditLine}>Add</Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-8 border-t border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold">
            <span>Total Debit: {totalDebit.toFixed(2)}</span>
            <span>Total Credit: {totalCredit.toFixed(2)}</span>
          </div>
        </div>

        <Dialog open={findOpen} onOpenChange={setFindOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Find Collection Voucher</DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              <Input
                className="flex-1"
                placeholder="Search by Ref / name / description"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
              <Button onClick={doSearch}>
                <Search className="mr-1 h-4 w-4" />
                Search
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt NO</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchRows.map((r) => (
                  <TableRow
                    key={r.receiptNO}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => openSearchRow(r.receiptNO)}
                  >
                    <TableCell>{r.receiptNO}</TableCell>
                    <TableCell>{r.recRef}</TableCell>
                    <TableCell>{r.receiptDate ? toInputDate(r.receiptDate) : ""}</TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell className="text-right">{(r.amount ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
      </div>
    </PageGuard>
  );
}
