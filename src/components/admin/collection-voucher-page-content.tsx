"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import {
  Building2,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  FileText,
  Landmark,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  createCollectedVoucher,
  getAccountChildren,
  getAccountCurrency,
  getAccountSources,
  getCollectedVoucher,
  getCollectedVoucherAdjacent,
  getCollectedVoucherJournal,
  getCollectedVoucherLast,
  getCollectionVoucherBanks,
  getCollectionVoucherSafes,
  getReceiptChartLeaves,
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
import { VoucherAttachmentsPanel } from "@/components/admin/voucher-attachments-panel";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { cn } from "@/lib/utils";

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <Label htmlFor={htmlFor} className="mb-1.5 text-base font-semibold text-slate-800">
      {children}
      {required ? <span className="ml-0.5 text-red-600">*</span> : null}
    </Label>
  );
}

/** Strip leading business-code prefix from a preformatted "CODE - Name" label. */
function stripLeadingCode(name: string, code: string): string {
  const n = name.trim();
  const c = code.trim();
  if (!c || !n) return n;
  const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cleaned = n.replace(new RegExp(`^${escaped}\\s*[-–—:]\\s*`, "i"), "").trim();
  return cleaned || n;
}

/**
 * AccountChart / Safe / Bank lookups.
 * Value = ACCCode (business account code, not a surrogate PK).
 * Label = "ACCCode - Name" for readable ERP lists.
 */
function toAccountOptions(items: AccountSelectItem[]): ComboboxOption[] {
  return items.map((i) => {
    const code = (i.accCode ?? "").trim();
    const name = stripLeadingCode(i.name ?? "", code);
    const label = name && name !== code ? `${code} - ${name}` : name || code;
    return { value: code, label };
  });
}

/**
 * Customer / Supplier party lookup.
 * Value = ACCCode (saved as CollectedCode). Label = party name only (no DB Id).
 * Search still matches ACCCode via ComboboxOption.value.
 */
function toPartyOptions(items: AccountSelectItem[]): ComboboxOption[] {
  return items.map((i) => {
    const code = (i.accCode ?? "").trim();
    const name = stripLeadingCode(i.name ?? "", code);
    return { value: code, label: name || code };
  });
}

/** Journal / table display: name first; business account code when present. */
function formatAccountDisplay(code?: string | null, name?: string | null): string {
  const c = (code ?? "").trim();
  const n = stripLeadingCode(name ?? "", c);
  if (n && c && n !== c) return `${c} - ${n}`;
  return n || c || "—";
}

type LedgerLine = VoucherJournalLine & { locked?: boolean; rowId?: string };

function toInputDate(value?: string | null) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function focusCollectField(name: string) {
  if (typeof document === "undefined") return;
  const el = document.querySelector<HTMLElement>(`[data-cv-field="${name}"]`);
  el?.focus();
}

/** Web Forms TreasuryIn validators + btnUpdate_Click / btnSaveAccount_Click rules. */
type HeaderValidationInput = {
  receiptDate: string;
  paymentMethod: "Cash" | "Cheque" | "Transfer";
  amount: string;
  totalString: string;
  description: string;
  vSource: "Customer" | "Supplier" | "Other";
  collectedCode: string;
  collectedName: string;
  safeCode: string;
  safeCurrencyAcc: string;
  chequeNo: string;
  chequeBank: string;
  chequeAccount: string;
  dueDate: string;
  transferBank: string;
  transferAccount: string;
};

function validateHeaderForm(v: HeaderValidationInput): string | null {
  // 1. Main required fields (ASP.NET ValidationGroup Update)
  if (!v.receiptDate.trim()) {
    focusCollectField("receiptDate");
    return "Please enter the Receipt Date.";
  }
  if (Number.isNaN(new Date(v.receiptDate).getTime())) {
    focusCollectField("receiptDate");
    return "Please enter a valid Receipt Date.";
  }
  if (!v.paymentMethod) {
    return "Please select the Payment Method.";
  }
  const amt = parseFloat(v.amount);
  if (!v.amount.trim() || Number.isNaN(amt) || amt <= 0) {
    focusCollectField("amount");
    return "Please enter the Amount.";
  }
  if (!v.totalString.trim()) {
    focusCollectField("totalString");
    return "Please enter the Amount in String (or press Refresh).";
  }
  if (!v.description.trim()) {
    focusCollectField("description");
    return "Please enter the Description.";
  }

  // 2–3. Payment-method-specific (Web Forms MultiView + Cheque explicit check)
  if (v.paymentMethod === "Cash") {
    if (!v.safeCode) {
      focusCollectField("safeCode");
      return "Please select the Safe NO.";
    }
    if (!v.safeCurrencyAcc) {
      focusCollectField("safeCurrencyAcc");
      return "Please select the Currency account (Account NO.).";
    }
  } else if (v.paymentMethod === "Cheque") {
    if (!v.chequeNo.trim()) {
      focusCollectField("chequeNo");
      return "Please enter the Cheque NO.";
    }
    if (!v.dueDate.trim()) {
      focusCollectField("dueDate");
      return "Please enter the Due Date.";
    }
    if (Number.isNaN(new Date(v.dueDate).getTime())) {
      focusCollectField("dueDate");
      return "Please enter a valid Due Date.";
    }
    if (!v.chequeBank) {
      focusCollectField("chequeBank");
      return "Please select the Bank Name.";
    }
    if (!v.chequeAccount) {
      focusCollectField("chequeAccount");
      return "Please select the Account NO.";
    }
  } else if (v.paymentMethod === "Transfer") {
    if (!v.transferBank) {
      focusCollectField("transferBank");
      return "Please select the Bank Name.";
    }
    if (!v.transferAccount) {
      focusCollectField("transferAccount");
      return "Please select the Bank Account NO.";
    }
  }

  // Collected From
  if (v.vSource === "Other") {
    if (!v.collectedName.trim()) {
      focusCollectField("collectedName");
      return "Please enter the Collected From name.";
    }
  } else if (!v.collectedCode.trim()) {
    focusCollectField("collectedCode");
    return "Please select the Collected From party.";
  }

  return null;
}

function validateJournalForm(
  rows: LedgerLine[],
  totalDebit: number,
  totalCredit: number
): string | null {
  if (rows.length === 0) {
    return "Please add accounting rows (Debit and Credit).";
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const n = i + 1;
    if (!row.type || (row.type !== "Debit" && row.type !== "Credit")) {
      return `Please select Debit/Credit for Row ${n}.`;
    }
    if (!row.acccountCode?.trim()) {
      return `Please select an account for Row ${n}.`;
    }
    if (!row.description?.trim()) {
      return `Please enter a description for Row ${n}.`;
    }
    const amt = row.amount ?? 0;
    if (!amt || amt <= 0 || Number.isNaN(amt)) {
      return `Please enter a valid amount for Row ${n}.`;
    }
  }

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    return "Debit total must equal Credit total.";
  }
  if (totalDebit === 0 || totalCredit === 0) {
    return "Total debit and Total credit not allow 0 value, Actions Canceled";
  }

  return null;
}

export function CollectionVoucherPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const userName = session?.user?.name ?? session?.user?.email ?? "system";
  const searchParams = useSearchParams();
  const deepLinkId =
    searchParams.get("id") ?? searchParams.get("ReceiptNO");

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

  const totalDebit = lines
    .filter((l) => l.type === "Debit")
    .reduce((s, l) => s + (l.amount ?? 0), 0);
  const totalCredit = lines
    .filter((l) => l.type === "Credit")
    .reduce((s, l) => s + (l.amount ?? 0), 0);
  const difference = Math.round((totalDebit - totalCredit) * 100) / 100;

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
          setLines(
            journal.map((l, i) => ({
              ...l,
              accName: stripLeadingCode(l.accName ?? "", l.acccountCode) || l.accName,
              locked: true,
              rowId: `gl-${no}-${i}-${l.acccountCode}`,
            }))
          );
          return;
        }
      } catch {
        /* unposted — fall through to seed Debit like Web Forms ReadJornal */
      }

      // Web Forms ReadJornal: if no GL yet, seed ONE Debit from AccountNO (Cash/Cheque/Transfer)
      const amt = voucher.amount ?? 0;
      const r = voucher.rate ?? 1;
      const code = voucher.accountNO ?? "";
      if (!code || !amt) {
        setLines([]);
        return;
      }
      const nameRaw =
        (paymentMethod === "Cash"
          ? safeChildren.find((a) => a.accCode === code)?.name
          : paymentMethod === "Cheque"
            ? chequeAccounts.find((a) => a.accCode === code)?.name
            : transferAccounts.find((a) => a.accCode === code)?.name) ?? "";
      const name = stripLeadingCode(nameRaw, code) || code;

      setLines([
        {
          rowId: `seed-${no}-${code}`,
          type: "Debit",
          acccountCode: code,
          accName: name,
          description: voucher.description ?? "",
          amount: amt,
          amountEGP: Math.round(amt * r * 100) / 100,
          locked: true,
        },
      ]);
    },
    [token, paymentMethod, safeChildren, chequeAccounts, transferAccounts]
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
          ? [
              {
                accCode: v.collectedCode,
                name: stripLeadingCode(v.collectedName ?? "", v.collectedCode) || v.collectedName || v.collectedCode,
              },
            ]
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
        const [s, receiptLeaves] = await Promise.all([
          getCollectionVoucherSafes(token),
          getReceiptChartLeaves(token),
        ]);
        if (cancelled) return;
        setSafes(s);
        setChartAccounts(receiptLeaves);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : String(e));
      }
      if (cancelled) return;

      // PendingVoucher / TreasuryIn: ?ReceiptNO= loads that voucher (else last)
      const openNo = deepLinkId ? Number(deepLinkId) : NaN;
      if (Number.isFinite(openNo) && openNo > 0) {
        try {
          const v = await getCollectedVoucher(openNo, token);
          if (!cancelled) await applyVoucher(v);
        } catch (e) {
          if (!cancelled) {
            toast.error(e instanceof Error ? e.message : String(e));
            void loadLast();
          }
        }
      } else {
        void loadLast();
      }
    })();
    return () => {
      cancelled = true;
    };
    // Page_Load once per token/deep-link
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, deepLinkId]);

  // NOTE: Do NOT sync/rebuild `lines` from header fields after load.
  // A previous effect did: setLines([newDebit, ...prev.filter(l => !l.locked)])
  // which dropped Row 1 whenever the first user-added row was also locked/Debit,
  // or replaced the full list incorrectly. Web Forms seeds Debit once in ReadJornal only.

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

    // Auto-fill Amount in String if empty (Web Forms RequiredFieldValidator on txtTotalString)
    let words = totalString.trim();
    if (!words && amount.trim()) {
      try {
        words = amountInArabicWords(amount);
        setTotalString(words);
      } catch {
        /* leave empty — validation will catch */
      }
    }

    const headerError = validateHeaderForm({
      receiptDate,
      paymentMethod,
      amount,
      totalString: words || totalString,
      description,
      vSource,
      collectedCode,
      collectedName,
      safeCode,
      safeCurrencyAcc,
      chequeNo,
      chequeBank,
      chequeAccount,
      dueDate,
      transferBank,
      transferAccount,
    });
    if (headerError) {
      toast.error(headerError);
      return;
    }

    let saveCode = "0";
    let bankCode = "0";
    let accountNO = "";
    let cheque = "";
    let due: string | null = null;

    if (paymentMethod === "Cash") {
      saveCode = safeCode;
      accountNO = safeCurrencyAcc;
    } else if (paymentMethod === "Cheque") {
      cheque = chequeNo;
      bankCode = chequeBank;
      accountNO = chequeAccount;
      due = dueDate;
    } else {
      bankCode = transferBank;
      accountNO = transferAccount;
    }

    let sCode = "0";
    let sName = "";
    if (vSource === "Other") {
      sCode = "0";
      sName = collectedName.trim();
    } else {
      const raw = collectedCode.trim();
      const codeOnly = raw.includes(" ") ? raw.split(/\s+/)[0]! : raw;
      sCode = codeOnly;
      sName =
        collectedName.trim() ||
        sources.find((s) => s.accCode === codeOnly || s.accCode === raw)?.name ||
        "";
    }

    const amt = parseFloat(amount);

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
          description: description.trim(),
          chequeNO: cheque,
          bankCode,
          dueDate: due ? new Date(due).toISOString() : null,
          accountNO,
          totalString: words || totalString,
          costCenter,
          addedUser: userName,
        },
        token
      );
      toast.success(`Receipt Number ( ${created.receiptNO} ) updated Done`);
      toast.message(
        "Header saved. Add Credit row(s), then press Update to post Debit+Credit to General Ledger."
      );
      await applyVoucher(created);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const addJournalLine = () => {
    const amt = parseFloat(lineAmount);
    const r = parseFloat(rate) || 1;
    if (!lineType || (lineType !== "Debit" && lineType !== "Credit")) {
      toast.error("Please select Debit/Credit.");
      return;
    }
    if (!lineAccount) {
      toast.error("Please select an account.");
      focusCollectField("lineAccount");
      return;
    }
    if (!(lineDescription || description).trim()) {
      toast.error("Please enter a description for the new row.");
      focusCollectField("lineDescription");
      return;
    }
    if (!lineAmount || Number.isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount greater than zero.");
      focusCollectField("lineAmount");
      return;
    }
    const acc = chartAccounts.find((a) => a.accCode === lineAccount);
    setLines((prev) => [
      ...prev,
      {
        rowId: `row-${Date.now()}-${prev.length}-${lineAccount}`,
        type: lineType,
        acccountCode: lineAccount,
        accName: stripLeadingCode(acc?.name ?? "", lineAccount) || lineAccount,
        description: (lineDescription || description).trim(),
        amount: amt,
        amountEGP: Math.round(amt * r * 100) / 100,
        locked: false,
      },
    ]);
    setLineAmount("");
    setLineAccount("");
    setLineType("Credit");
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((l, i) => i !== idx || l.locked));
  };

  const postJournal = async () => {
    if (!token || !receiptNo) return;

    const journalError = validateJournalForm(lines, totalDebit, totalCredit);
    if (journalError) {
      toast.error(journalError);
      return;
    }

    setBusy(true);
    try {
      const r = parseFloat(rate) || 1;
      await postCollectedVoucher(
        receiptNo,
        lines.map((l) => {
          const isDebit = l.type === "Debit";
          const egp = Math.round((l.amountEGP ?? (l.amount ?? 0) * r) * 100) / 100;
          return {
            acccountCode: l.acccountCode,
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
      toast.success(`Receipt Number ( ${receiptNo} ) updated Done`);
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
      ? "Cash Details"
      : paymentMethod === "Cheque"
        ? "Cheque Details"
        : "Bank Transfer Details";

  const PaymentIcon =
    paymentMethod === "Cash" ? Wallet : paymentMethod === "Cheque" ? FileText : Landmark;

  const statusLabel = approved ? "Posted" : isNew ? "Draft" : "Saved";
  const statusClass = approved
    ? "border-emerald-400 bg-emerald-100 text-emerald-900 text-base"
    : isNew
      ? "border-amber-400 bg-amber-100 text-amber-950 text-base"
      : "border-blue-400 bg-blue-100 text-blue-950 text-base";

  const voucherNoDisplay = recRef || (receiptNo != null ? String(receiptNo) : "—");
  const canEditJournal = !approved && receiptNo != null && !isNew;
  const balanced = Math.abs(difference) < 0.001;

  const fieldClass = "h-12 bg-white text-lg text-slate-900";

  return (
    <PageGuard permission={null}>
      <div className="collect-voucher-page min-h-full bg-[#e8edf3] p-4 text-lg text-slate-900 md:p-6">
        {/* Page header */}
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-[2.6rem]">
                Collect Voucher
              </h1>
              <Badge variant="outline" className={cn("rounded-full px-3 py-1 font-semibold", statusClass)}>
                {statusLabel}
              </Badge>
              {!isNew && voucherNoDisplay !== "—" ? (
                <span className="rounded-md border border-slate-300 bg-white px-3 py-1 text-lg font-bold text-slate-900 tabular-nums">
                  {voucherNoDisplay}
                </span>
              ) : null}
            </div>
            <p className="text-lg text-slate-700">
              {isNew
                ? "Create and manage collection transactions"
                : approved
                  ? "Posted collection voucher — journal locked"
                  : "Edit collection voucher — add accounting rows, then update to post"}
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
                  <BreadcrumbPage>
                    Collect Voucher{isNew ? " · New" : approved ? " · Posted" : " · Edit"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-1 flex items-center gap-0.5 rounded-lg border border-slate-300 bg-white p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-slate-800"
                title="First"
                disabled={isNew || busy}
                onClick={() => void navigate("first")}
              >
                <ChevronFirst className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-slate-800"
                title="Previous"
                disabled={isNew || busy}
                onClick={() => void navigate("previous")}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-slate-800"
                title="Next"
                disabled={isNew || busy}
                onClick={() => void navigate("next")}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-slate-800"
                title="Last"
                disabled={isNew || busy}
                onClick={() => void navigate("last")}
              >
                <ChevronLast className="h-5 w-5" />
              </Button>
            </div>
            <Button type="button" variant="outline" className="h-12 border-slate-400 text-lg font-semibold text-slate-800" onClick={() => void startNew()} disabled={busy}>
              New
            </Button>
            <Button type="button" variant="outline" className="h-12 border-slate-400 text-lg font-semibold text-slate-800" onClick={() => setFindOpen(true)} disabled={busy}>
              <Search className="mr-1.5 h-4 w-4" />
              Find
            </Button>
            {isNew ? (
              <>
                <Button type="button" variant="outline" className="h-12 border-slate-400 text-lg font-semibold text-slate-800" onClick={() => void loadLast()} disabled={busy}>
                  Clear
                </Button>
                <Button
                  type="button"
                  className="h-12 bg-blue-800 text-lg font-semibold text-white hover:bg-blue-900"
                  onClick={() => void saveHeader()}
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Save Voucher"}
                </Button>
              </>
            ) : null}
            {canEditJournal ? (
              <Button
                type="button"
                className="h-12 bg-blue-800 text-lg font-semibold text-white hover:bg-blue-900"
                onClick={() => void postJournal()}
                disabled={busy}
              >
                {busy ? "Updating…" : "Update Voucher"}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Voucher Information (65%) + Cash/Payment Details (35%) */}
        <div className="mb-4 grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
          <Card className="h-full gap-0 border-slate-300 py-0 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-200 px-5 py-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                <FileText className="h-5 w-5" />
              </span>
              <CardTitle className="text-lg font-bold text-slate-950">Voucher Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-5 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Receipt No.</FieldLabel>
                  <Input className={cn(fieldClass, "font-semibold tabular-nums")} value={voucherNoDisplay} readOnly disabled />
                </div>
                <div>
                  <FieldLabel required>Receipt Date</FieldLabel>
                  <Input
                    data-cv-field="receiptDate"
                    type="date"
                    className={fieldClass}
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    disabled={!isNew}
                  />
                </div>
                <div>
                  <FieldLabel required>Collection Method</FieldLabel>
                  <Select
                    value={paymentMethod}
                    onValueChange={(v) => {
                      if (!v) return;
                      void onPaymentMethodChange(v as "Cash" | "Cheque" | "Transfer");
                    }}
                    disabled={!isNew}
                  >
                    <SelectTrigger className={fieldClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Cost Center</FieldLabel>
                  <CostCenterCombobox value={costCenter} onValueChange={setCostCenter} disabled={!isNew} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel required>Amount</FieldLabel>
                  <div className="flex overflow-hidden rounded-md border border-slate-300 bg-white shadow-xs">
                    <span className="flex items-center border-r border-slate-300 bg-slate-100 px-3 text-base font-bold text-slate-800">
                      {currency || "EGP"}
                    </span>
                    <Input
                      data-cv-field="amount"
                      className="h-12 border-0 text-lg text-slate-900 shadow-none focus-visible:ring-0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={!isNew}
                      inputMode="decimal"
                      placeholder="0.00"
                    />
                    <span className="flex items-center border-l border-slate-300 bg-slate-100 px-3 text-base font-semibold text-slate-700 tabular-nums">
                      Rate {rate}
                    </span>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel required>Amount in String</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      className={cn(fieldClass, "flex-1 text-right")}
                      dir="rtl"
                      value={totalString}
                      readOnly
                      data-cv-field="totalString"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 shrink-0 border-slate-400 text-lg font-semibold text-slate-800"
                      onClick={refreshAmountWords}
                      disabled={!isNew || !amount}
                    >
                      <RefreshCw className="mr-1.5 h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </div>
                <div>
                  <FieldLabel required>Collected From</FieldLabel>
                  <Select
                    value={vSource}
                    onValueChange={(v) => {
                      if (!v) return;
                      void onCollectedFromChange(v as "Customer" | "Supplier" | "Other");
                    }}
                    disabled={!isNew}
                  >
                    <SelectTrigger className={fieldClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Customer">Customer</SelectItem>
                      <SelectItem value="Supplier">Supplier</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel required>{vSource === "Other" ? "Name" : "Party"}</FieldLabel>
                  {vSource === "Other" ? (
                    <Input
                      data-cv-field="collectedName"
                      className={fieldClass}
                      value={collectedName}
                      onChange={(e) => {
                        setCollectedName(e.target.value);
                        if (!description) setDescription(e.target.value);
                      }}
                      disabled={!isNew}
                    />
                  ) : (
                    <div data-cv-field="collectedCode" tabIndex={-1}>
                      <SearchableCombobox
                        value={collectedCode}
                        onValueChange={(code) => {
                          setCollectedCode(code);
                          const s = sources.find((x) => x.accCode === code);
                          setCollectedName(s?.name ?? "");
                          if (s?.name) setDescription(s.name);
                        }}
                        options={toPartyOptions(sources)}
                        placeholder={`Search ${vSource.toLowerCase()}…`}
                        disabled={!isNew}
                        size="lg"
                      />
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel required>Description</FieldLabel>
                  <Textarea
                    data-cv-field="description"
                    className="min-h-[80px] resize-y bg-white text-lg text-slate-900"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!isNew}
                    placeholder="Enter description"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col gap-0 border-slate-300 py-0 shadow-sm">
            <CardHeader className="flex shrink-0 flex-row items-center gap-2 border-b border-slate-200 px-5 py-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <PaymentIcon className="h-5 w-5" />
              </span>
              <CardTitle className="text-lg font-bold text-slate-950">{detailTitle}</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-5 py-4">
              <div className="shrink-0 space-y-4">
              {paymentMethod === "Cash" && (
                <div className="grid gap-4">
                  <div>
                    <FieldLabel required>Safe NO.</FieldLabel>
                    <div data-cv-field="safeCode" tabIndex={-1}>
                      <SearchableCombobox
                        value={safeCode}
                        onValueChange={(v) => void onSafeChange(v)}
                        options={toAccountOptions(safes)}
                        placeholder="Search safe…"
                        disabled={!isNew}
                        size="lg"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel required>Currency Account</FieldLabel>
                    <div data-cv-field="safeCurrencyAcc" tabIndex={-1}>
                      <SearchableCombobox
                        value={safeCurrencyAcc}
                        onValueChange={(v) => {
                          setSafeCurrencyAcc(v);
                          void loadAccountCurrency(v);
                        }}
                        options={toAccountOptions(safeChildren)}
                        placeholder="Search account…"
                        disabled={!isNew}
                        size="lg"
                      />
                    </div>
                  </div>
                </div>
              )}
              {paymentMethod === "Cheque" && (
                <div className="grid gap-4">
                  <div>
                    <FieldLabel required>Cheque NO.</FieldLabel>
                    <Input
                      data-cv-field="chequeNo"
                      className={fieldClass}
                      value={chequeNo}
                      onChange={(e) => setChequeNo(e.target.value)}
                      disabled={!isNew}
                    />
                  </div>
                  <div>
                    <FieldLabel required>Due Date</FieldLabel>
                    <Input
                      data-cv-field="dueDate"
                      type="date"
                      className={fieldClass}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      disabled={!isNew}
                    />
                  </div>
                  <div>
                    <FieldLabel required>Bank Name</FieldLabel>
                    <div data-cv-field="chequeBank" tabIndex={-1}>
                      <SearchableCombobox
                        value={chequeBank}
                        onValueChange={(v) => void onChequeBankChange(v)}
                        options={toAccountOptions(banks)}
                        placeholder="Search bank…"
                        disabled={!isNew}
                        size="lg"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel required>Account NO.</FieldLabel>
                    <div data-cv-field="chequeAccount" tabIndex={-1}>
                      <SearchableCombobox
                        value={chequeAccount}
                        onValueChange={(v) => {
                          setChequeAccount(v);
                          void loadAccountCurrency(v);
                        }}
                        options={toAccountOptions(chequeAccounts)}
                        placeholder="Search account…"
                        disabled={!isNew}
                        size="lg"
                      />
                    </div>
                  </div>
                </div>
              )}
              {paymentMethod === "Transfer" && (
                <div className="grid gap-4">
                  <div>
                    <FieldLabel required>Bank Name</FieldLabel>
                    <div data-cv-field="transferBank" tabIndex={-1}>
                      <SearchableCombobox
                        value={transferBank}
                        onValueChange={(v) => void onTransferBankChange(v)}
                        options={toAccountOptions(banks)}
                        placeholder="Search bank…"
                        disabled={!isNew}
                        size="lg"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel required>Bank Account NO.</FieldLabel>
                    <div data-cv-field="transferAccount" tabIndex={-1}>
                      <SearchableCombobox
                        value={transferAccount}
                        onValueChange={(v) => {
                          setTransferAccount(v);
                          void loadAccountCurrency(v);
                        }}
                        options={toAccountOptions(transferAccounts)}
                        placeholder="Search account…"
                        disabled={!isNew}
                        size="lg"
                      />
                    </div>
                  </div>
                </div>
              )}
              </div>

              <VoucherAttachmentsPanel
                variant="embedded"
                className="min-h-0 flex-1"
                voucherType="Collect"
                voucherId={isNew ? null : receiptNo}
                voucherRef={recRef || (receiptNo != null ? String(receiptNo) : null)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Accounting Entries */}
        <Card className="mb-4 gap-0 overflow-hidden border-slate-300 py-0 shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-800">
                <Building2 className="h-5 w-5" />
              </span>
              <CardTitle className="text-lg font-bold text-slate-950">Accounting Entries</CardTitle>
            </div>
            {canEditJournal ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 border-blue-400 text-lg font-semibold text-blue-900 hover:bg-blue-100"
                onClick={addJournalLine}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Row
              </Button>
            ) : null}
          </CardHeader>

          {canEditJournal ? (
            <div className="border-b border-amber-300 bg-amber-100 px-5 py-2.5 text-base text-amber-950">
              Unposted voucher: Credit rows are kept in this screen until you press{" "}
              <strong>Update Voucher</strong> (Debit must equal Credit).
            </div>
          ) : null}
          {approved ? (
            <div className="border-b border-emerald-300 bg-emerald-100 px-5 py-2.5 text-base text-emerald-950">
              Posted — lines loaded from General Ledger (TransType CJ).
            </div>
          ) : null}

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-lg">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100 text-left text-base font-bold uppercase tracking-wide text-slate-800">
                    <th className="w-10 px-3 py-3">#</th>
                    <th className="w-[130px] px-3 py-3">Debit / Credit</th>
                    <th className="min-w-[180px] px-3 py-3">Account</th>
                    <th className="min-w-[160px] px-3 py-3">Description</th>
                    <th className="w-[110px] px-3 py-3 text-right">Amount</th>
                    <th className="w-[110px] px-3 py-3 text-right">Amount EGP</th>
                    {canEditJournal ? <th className="w-12 px-3 py-3 text-center">Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr
                      key={l.rowId ?? `${l.type}-${l.acccountCode}-${idx}`}
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
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-950">
                        {(l.amount ?? 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                        {(l.amountEGP ?? 0).toFixed(2)}
                      </td>
                      {canEditJournal ? (
                        <td className="px-3 py-2.5 text-center">
                          {!l.locked ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-red-700 hover:bg-red-100 hover:text-red-800"
                              onClick={() => removeLine(idx)}
                              title="Delete row"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-base text-slate-400">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                  {lines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canEditJournal ? 7 : 6}
                        className="px-3 py-10 text-center text-lg text-slate-600"
                      >
                        {isNew
                          ? "Save the voucher header first to seed the Debit row."
                          : "No ledger lines yet."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {canEditJournal ? (
              <div className="grid gap-3 border-t border-slate-200 bg-slate-100/80 p-4 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <FieldLabel>Type</FieldLabel>
                  <Select value={lineType} onValueChange={(v) => v && setLineType(v)}>
                    <SelectTrigger className={fieldClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Debit">Debit</SelectItem>
                      <SelectItem value="Credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="lg:col-span-2" data-cv-field="lineAccount" tabIndex={-1}>
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
                    data-cv-field="lineDescription"
                    className={fieldClass}
                    placeholder="Description"
                    value={lineDescription || description}
                    onChange={(e) => setLineDescription(e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel required>Amount</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      data-cv-field="lineAmount"
                      className={fieldClass}
                      placeholder="0.00"
                      value={lineAmount}
                      onChange={(e) => setLineAmount(e.target.value)}
                    />
                    <Button type="button" className="h-12 shrink-0 bg-blue-800 hover:bg-blue-900" onClick={addJournalLine}>
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-slate-300 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-base font-medium text-slate-700">
                {lines.length} line{lines.length === 1 ? "" : "s"}
                {canEditJournal ? " · ready to post when balanced" : null}
              </div>
              <div
                className={cn(
                  "min-w-[240px] rounded-lg border px-4 py-3 text-lg",
                  balanced && lines.length > 0
                    ? "border-emerald-400 bg-emerald-100"
                    : "border-slate-300 bg-slate-100"
                )}
              >
                <div className="flex justify-between gap-8 py-0.5">
                  <span className="font-medium text-slate-800">Total Debit</span>
                  <span className="font-bold tabular-nums text-blue-900">{totalDebit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-8 py-0.5">
                  <span className="font-medium text-slate-800">Total Credit</span>
                  <span className="font-bold tabular-nums text-emerald-900">{totalCredit.toFixed(2)}</span>
                </div>
                <Separator className="my-2 bg-slate-400" />
                <div className="flex justify-between gap-8 py-0.5">
                  <span className="font-bold text-slate-950">Difference</span>
                  <span
                    className={cn(
                      "font-bold tabular-nums",
                      balanced ? "text-slate-950" : "text-red-700"
                    )}
                  >
                    {difference.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3.5 shadow-sm">
          <div className="text-base text-slate-700">
            {userName ? (
              <span>
                User: <span className="font-semibold text-slate-900">{userName}</span>
              </span>
            ) : null}
            {receiptNo != null ? (
              <span className="ml-3">
                ReceiptNO: <span className="font-semibold tabular-nums text-slate-900">{receiptNo}</span>
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {isNew ? (
              <>
                <Button type="button" variant="outline" className="h-12 border-slate-400 text-lg font-semibold text-slate-800" onClick={() => void loadLast()} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-12 bg-blue-800 text-lg font-semibold hover:bg-blue-900"
                  onClick={() => void saveHeader()}
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Save Voucher"}
                </Button>
              </>
            ) : canEditJournal ? (
              <Button
                type="button"
                className="h-12 bg-blue-800 text-lg font-semibold hover:bg-blue-900"
                onClick={() => void postJournal()}
                disabled={busy}
              >
                {busy ? "Updating…" : "Update Voucher"}
              </Button>
            ) : (
              <Button type="button" variant="outline" className="h-12 border-slate-400 text-lg font-semibold text-slate-800" onClick={() => void startNew()} disabled={busy}>
                New Voucher
              </Button>
            )}
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
              <Button onClick={() => void doSearch()}>
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
                    onClick={() => void openSearchRow(r.receiptNO)}
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
