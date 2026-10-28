"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { PageGuard } from "@/components/permissions/page-guard";
import { ItemLanguageToggle } from "@/components/pharm-recive/ItemLanguageToggle";
import { SalesAddCustomerSheet } from "@/components/sales/SalesAddCustomerSheet";
import { SalesPageToolbar } from "@/components/sales/SalesPageToolbar";
import { SalesCustomerAutocomplete } from "@/components/sales/SalesCustomerAutocomplete";
import { ReturnItemStockSearchBox } from "@/components/return/ReturnItemStockSearchBox";
import { SalesDetailsGrid } from "@/components/sales/SalesDetailsGrid";
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
import { usePharmacyScope } from "@/components/pharmacy/pharmacy-scope-provider";
import { PERMISSIONS } from "@/lib/route-permissions";
import {
  ApiError,
  createSalesReturn,
  finalizeSalePayment,
  getSalesReceipt,
  getCurrentOpenShift,
  getItemCatalog,
  getUnitConversionInfo,
  getSalePaymentContext,
  getSalePaymentKinds,
  getSalePaymentMethods,
  getSalesServerTime,
  getShiftMovements,
  getSalesReturnStoreContext,
  lookupSalesManByPassword,
} from "@/lib/api-client";
import {
  createEmptyReturnTab,
  createEmptySalesLine,
  hasAnyRowDiscount,
  hasGlobalDiscount,
  headerDiscountAmount,
  isSellableSalesLine,
  money,
  sumLinesNet,
  validateReturnQuantities,
} from "@/lib/sales-workspace-calc";
import { formatUnitOptionLabel } from "@/lib/item-unit-options";
import {
  findEmptySalesReturnLineIndex,
  patchSalesReturnLineFromStockSearch,
} from "@/lib/sales-return-item-stock-search";
import { applyPriceQtyNetToBasePrices } from "@/lib/purchase-unit-conversion";
import type { ReturnItemStockSearchItem } from "@/types/stock";
import { createUnitService } from "@/services/unit.service";
import type {
  SalesSearchLanguage,
  SalesWorkspaceLine,
  SalesWorkspaceTab,
} from "@/types/sales-workspace";
import type {
  SalesPaymentKindOption,
  SalesPaymentMethodOption,
} from "@/types/sales-payment";
import { SALES_PAYMENT_DOCUMENT_SALES_RETURN } from "@/types/sales-payment";
import {
  finalizeWithPrintIfNeeded,
  loadReceiptForPrint,
} from "@/lib/sales-receipt-print";
import { SalesThermalReceipt } from "@/components/sales/SalesThermalReceipt";
import type { SalesReceipt } from "@/types/sales-receipt";
import type { PharmReciveItemLanguage } from "@/types/pharm-recive";
import type { UnitItem } from "@/types/unit";
import { cn } from "@/lib/utils";

const RETURN_MOV_PARINT = 2;

function languageToToggle(value: SalesSearchLanguage): PharmReciveItemLanguage {
  return value === "Arabic" ? "ar" : "en";
}

function toggleToLanguage(value: PharmReciveItemLanguage): SalesSearchLanguage {
  return value === "ar" ? "Arabic" : "English";
}

function formatEgyptDateOnly(display: string): string {
  const raw = (display || "").trim();
  if (!raw || raw === "Loading..." || raw === "—") return raw || "—";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(raw);
  if (dmy) return `${dmy[1]}/${dmy[2]}/${dmy[3]}`;
  return raw.slice(0, 10);
}

function returnPayable(tab: SalesWorkspaceTab): number {
  return money(sumLinesNet(tab.lines) - headerDiscountAmount(tab));
}

export function SalesReturnWorkspacePageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? null;
  const { activePharmacyId, ready: pharmacyScopeReady } = usePharmacyScope();

  const [tabs, setTabs] = useState<SalesWorkspaceTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [seq, setSeq] = useState(1);
  const [egyptTime, setEgyptTime] = useState("Loading...");
  const [pharmacyName, setPharmacyName] = useState<string>("—");
  const [currentParmId, setCurrentParmId] = useState<string | null>(null);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("—");
  const [shiftNumber, setShiftNumber] = useState<string>("—");
  const [returnShiftReady, setReturnShiftReady] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [toolbarExpanded, setToolbarExpanded] = useState(false);

  const [language, setLanguage] = useState<SalesSearchLanguage>("English");
  /** Ephemeral only — never stored in tab state or browser storage. */
  const [salesManPasswordDraft, setSalesManPasswordDraft] = useState("");

  const [methods, setMethods] = useState<SalesPaymentMethodOption[]>([]);
  const [salesKinds, setSalesKinds] = useState<SalesPaymentKindOption[]>([]);
  const [paymentKindsReady, setPaymentKindsReady] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const methodsLoadSeqRef = useRef(0);
  const [paymentPayable, setPaymentPayable] = useState<number | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [receiptToPrint, setReceiptToPrint] = useState<SalesReceipt | null>(null);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  const active = tabs.find((t) => t.clientId === activeId) ?? null;
  const activeSalesKindId =
    active?.salesKindId != null && active.salesKindId > 0
      ? active.salesKindId
      : null;

  useEffect(() => {
    setSalesManPasswordDraft("");
  }, [activeId]);

  const updateTab = useCallback(
    (
      tabId: string,
      patch: Partial<SalesWorkspaceTab> | ((tab: SalesWorkspaceTab) => SalesWorkspaceTab)
    ) => {
      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.clientId !== tabId) return tab;
          return typeof patch === "function" ? patch(tab) : { ...tab, ...patch };
        })
      );
    },
    []
  );

  const updateTabLines = useCallback(
    (
      tabId: string,
      updater: (prev: SalesWorkspaceLine[]) => SalesWorkspaceLine[]
    ) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.clientId === tabId ? { ...tab, lines: updater(tab.lines) } : tab
        )
      );
    },
    []
  );

  const updateActive = useCallback(
    (
      patch: Partial<SalesWorkspaceTab> | ((tab: SalesWorkspaceTab) => SalesWorkspaceTab)
    ) => {
      if (!activeId) return;
      updateTab(activeId, patch);
    },
    [activeId, updateTab]
  );

  const ensureReturnShift = useCallback(async () => {
    if (!token) return;
    try {
      const movements = await getShiftMovements(token).catch(() => []);
      const returnMovements = movements.filter((m) => m.movParint === RETURN_MOV_PARINT);
      const returnMov = returnMovements[0];
      if (!returnMov?.movId) {
        setReturnShiftReady(false);
        setPharmacyName("—");
        setSessionStatus("No Return Movement");
        setShiftNumber("—");
        toast.message(
          "No Return Sales movement (MovParint = 2) is configured. Set it up in Sales Movement Setting first."
        );
        return;
      }

      const status = await getCurrentOpenShift(token);
      if (!status.hasOpenShift) {
        setReturnShiftReady(false);
        toast.message(
          "No open shift for the current pharmacy. Open a shift in Shift Management first."
        );
      } else {
        setReturnShiftReady(true);
      }

      setPharmacyName(status.pharmacyName?.trim() || "—");
      const shiftParmId =
        status.parmId != null && status.parmId > 0 ? String(status.parmId) : null;
      const scopeParmId = activePharmacyId?.trim() || null;
      setCurrentParmId(scopeParmId ?? shiftParmId);
      if (
        pharmacyScopeReady &&
        scopeParmId &&
        shiftParmId &&
        scopeParmId !== shiftParmId
      ) {
        setReturnShiftReady(false);
        toast.error(
          "Open shift belongs to a different pharmacy than your current selection. Switch pharmacy or open a shift for the selected pharmacy."
        );
        return;
      }

      try {
        const returnStore = await getSalesReturnStoreContext(token);
        setCurrentStoreId(returnStore.storeId?.trim() || null);
      } catch {
        setCurrentStoreId(null);
      }
      setSessionStatus(
        status.status?.trim() || (status.hasOpenShift ? "Open" : "Closed")
      );
      setShiftNumber(
        status.scId != null && status.scId > 0 ? String(status.scId) : "—"
      );
    } catch {
      setReturnShiftReady(false);
      setPharmacyName("—");
      setCurrentParmId(null);
      setCurrentStoreId(null);
      setSessionStatus("Unavailable");
      setShiftNumber("—");
    }
  }, [token, activePharmacyId, pharmacyScopeReady]);

  useEffect(() => {
    if (!token) {
      setPaymentKindsReady(false);
      return;
    }

    setTabs((prev) => {
      if (prev.length > 0) return prev;
      const first = createEmptyReturnTab(1, "Loading...");
      setActiveId(first.clientId);
      setSeq(2);
      return [first];
    });

    let cancelled = false;
    void (async () => {
      setUnitsLoading(true);
      const [time, kinds, unitResult] = await Promise.all([
        getSalesServerTime(token),
        getSalePaymentKinds(token).catch(() => [] as SalesPaymentKindOption[]),
        createUnitService(token)
          .listUnits()
          .catch(() => ({ units: [] as UnitItem[] })),
      ]);
      if (cancelled) return;

      setSalesKinds(kinds);
      setPaymentKindsReady(true);
      setUnits(unitResult.units);
      setUnitsLoading(false);

      const display = time?.egyptLocalDisplay?.trim() || "—";
      setEgyptTime(display);
      setTabs((prev) =>
        prev.map((tab) =>
          !tab.saved &&
          (tab.egyptTimeDisplay === "Loading..." || tab.egyptTimeDisplay === "—")
            ? { ...tab, egyptTimeDisplay: display }
            : tab
        )
      );

      await ensureReturnShift();
    })();

    return () => {
      cancelled = true;
    };
  }, [token, ensureReturnShift]);

  const handleNewTab = () => {
    const tab = createEmptyReturnTab(seq, egyptTime);
    setSeq((n) => n + 1);
    setTabs((prev) => [...prev, tab]);
    setActiveId(tab.clientId);
  };

  const handleCloseTab = (clientId: string) => {
    const remaining = tabs.filter((t) => t.clientId !== clientId);
    if (remaining.length === 0) {
      const fresh = createEmptyReturnTab(seq, egyptTime);
      setSeq((n) => n + 1);
      setTabs([fresh]);
      setActiveId(fresh.clientId);
      return;
    }
    setTabs(remaining);
    if (activeId === clientId) {
      setActiveId(remaining[0]?.clientId ?? null);
    }
  };

  const resolveSalesMan = async () => {
    if (!token || !active) return;
    if (active.salesManId) return;
    const tabId = active.clientId;
    const password = salesManPasswordDraft.trim();
    if (!password) {
      toast.error("Enter Sales Man password.");
      return;
    }
    try {
      const emp = await lookupSalesManByPassword(token, password);
      setSalesManPasswordDraft("");
      if (!emp?.id || emp.employType !== 1) {
        toast.error("Sales Man not found");
        updateTab(tabId, {
          salesManId: null,
          salesManName: "",
          salesManCode: "",
        });
        return;
      }
      updateTab(tabId, {
        salesManId: emp.id,
        salesManName: emp.name ?? "",
        salesManCode: emp.code ?? "",
      });
      toast.success("Sales Man loaded.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Sales Man not found");
    }
  };

  const clearSalesMan = () => {
    if (!active || active.saved) return;
    setSalesManPasswordDraft("");
    updateActive({
      salesManId: null,
      salesManName: "",
      salesManCode: "",
    });
  };

  const selectCustomer = (customer: {
    custCode: number;
    custNameEn: string | null;
    custNameAr: string | null;
    custMobile: string | null;
    custAddress: string | null;
  }) => {
    if (!active) return;
    updateActive({
      customerId: customer.custCode,
      customerCode: String(customer.custCode),
      customerSearch: `${customer.custCode} — ${customer.custNameEn || customer.custNameAr || ""}`,
      customerName: customer.custNameEn || customer.custNameAr || "",
      customerTel: customer.custMobile || "",
      customerAddress: customer.custAddress || "",
    });
  };

  const paymentTotal = useMemo(() => {
    if (!active) return 0;
    return money(
      Object.values(active.payments).reduce((acc, raw) => {
        const n = Number(raw);
        return acc + (Number.isFinite(n) ? n : 0);
      }, 0)
    );
  }, [active]);

  const resolveUnitName = useCallback(
    (unitId: number) => {
      const unit = units.find((u) => u.uCode === unitId);
      return (
        unit?.uNameEn?.trim() ||
        unit?.uNameAr?.trim() ||
        formatUnitOptionLabel(unitId, unit)
      );
    },
    [units]
  );

  const assertActiveQuantitiesValid = useCallback((): boolean => {
    if (!active) return false;
    const result = validateReturnQuantities(active.lines, resolveUnitName, {
      enforceBatchStock: false,
    });
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    return true;
  }, [active, resolveUnitName]);

  const handleBatchStockSelected = useCallback(
    async (searchResult: ReturnItemStockSearchItem) => {
      if (!token || !active || active.saved) return;
      if (!active.salesManId) {
        toast.error("Resolve Sales Man before adding items.");
        return;
      }
      const storeId = currentStoreId?.trim();
      if (!storeId) {
        toast.error(
          "Return stock store is not available. Check Sales Movement Setting and pharmacy scope, then refresh."
        );
        return;
      }
      let catalogItem;
      try {
        catalogItem = await getItemCatalog(searchResult.itemCatalogId, token);
      } catch {
        toast.error("Could not load item catalog record.");
        return;
      }

      const emptyIndex = findEmptySalesReturnLineIndex(active.lines);
      const targetIndex = emptyIndex >= 0 ? emptyIndex : active.lines.length;
      const baseLine =
        targetIndex < active.lines.length
          ? active.lines[targetIndex]
          : createEmptySalesLine();

      const patchOrError = patchSalesReturnLineFromStockSearch(
        baseLine,
        catalogItem,
        searchResult,
        language,
        storeId
      );
      if ("error" in patchOrError) {
        toast.error(patchOrError.error);
        return;
      }

      let nextLine = patchOrError;
      if (nextLine.unitId > 0) {
        try {
          const info = await getUnitConversionInfo(
            token,
            nextLine.itemCode.trim(),
            nextLine.unitId,
            1
          );
          if (!info.errorMessage?.trim()) {
            const priced = applyPriceQtyNetToBasePrices(
              0,
              nextLine.baseUnitSellPrice,
              info.priceQtyNet
            );
            nextLine = {
              ...nextLine,
              unitSellPrice: money(priced.itmSell),
              priceQtyNet: priced.priceQtyNet,
            };
          }
        } catch {
          // Keep unit-1 price when conversion lookup fails.
        }
      }

      updateTabLines(active.clientId, (prev) => {
        const next = [...prev];
        if (targetIndex >= next.length) {
          next.push(nextLine);
        } else {
          next[targetIndex] = nextLine;
        }
        const last = next[next.length - 1];
        if (last.itemCatalogId > 0) {
          next.push(createEmptySalesLine());
        }
        return next;
      });
    },
    [
      token,
      active,
      currentStoreId,
      language,
      updateTabLines,
    ]
  );

  const canPay = Boolean(
    active?.saved &&
      active.sthId != null &&
      active.sthId > 0 &&
      (active.billTyp ?? 0) === 0
  );

  const refreshPaymentContext = useCallback(
    async (sthId: number, tabId: string, salesKindId?: number | null) => {
      if (!token) return;
      setPaymentLoading(true);
      try {
        const ctx = await getSalePaymentContext(
          token,
          sthId,
          salesKindId,
          SALES_PAYMENT_DOCUMENT_SALES_RETURN
        );
        updateTab(tabId, { billTyp: ctx.billTyp });
        if (salesKindId != null && salesKindId > 0) {
          methodsLoadSeqRef.current += 1;
          setMethods(ctx.availablePaymentMethods);
        }
        setPaymentPayable(money(ctx.finalPayableAmount));
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Failed to load payment context."
        );
      } finally {
        setPaymentLoading(false);
      }
    },
    [token, updateTab]
  );

  const loadMethodsForSalesKind = useCallback(
    async (salesKindId: number | null) => {
      const seq = ++methodsLoadSeqRef.current;

      if (!token) {
        if (seq === methodsLoadSeqRef.current) setMethods([]);
        return;
      }
      if (salesKindId == null || salesKindId <= 0) {
        if (seq === methodsLoadSeqRef.current) setMethods([]);
        return;
      }
      setPaymentLoading(true);
      try {
        const rows = await getSalePaymentMethods(token, salesKindId);
        if (seq !== methodsLoadSeqRef.current) return;
        setMethods(rows);
      } catch (err) {
        if (seq !== methodsLoadSeqRef.current) return;
        setMethods([]);
        toast.error(
          err instanceof ApiError ? err.message : "Failed to load payment methods."
        );
      } finally {
        if (seq === methodsLoadSeqRef.current) setPaymentLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!paymentKindsReady) return;
    void loadMethodsForSalesKind(activeSalesKindId);
  }, [paymentKindsReady, activeId, activeSalesKindId, loadMethodsForSalesKind]);

  const onSalesKindChange = (raw: string) => {
    if (!active) return;
    const nextId = raw ? Number(raw) : null;
    const kindId = nextId != null && nextId > 0 ? nextId : null;
    updateActive({ salesKindId: kindId, payments: {} });
  };

  const canSave = Boolean(
    active &&
      !active.saved &&
      !saving &&
      active.salesManId &&
      returnShiftReady &&
      active.customerId != null &&
      active.customerId > 0
  );

  const handleSave = async () => {
    if (!token || !active) return;
    const tabId = active.clientId;
    if (active.saved) {
      toast.message("This tab is already saved.");
      return;
    }
    if (!returnShiftReady) {
      toast.error("Open a shift before saving the return.");
      return;
    }
    if (!active.salesManId) {
      toast.error("Resolve Sales Man first.");
      return;
    }
    if (active.customerId == null || active.customerId <= 0) {
      toast.error("Customer is required for sales return.");
      return;
    }
    const sellableLines = active.lines.filter(isSellableSalesLine);
    if (sellableLines.length === 0) {
      toast.error("Add at least one line.");
      return;
    }
    if (!assertActiveQuantitiesValid()) return;
    if (hasAnyRowDiscount(active.lines) && hasGlobalDiscount(active)) {
      toast.error("Cannot use global and row discounts together.");
      return;
    }

    setSaving(true);
    try {
      const result = await createSalesReturn(token, {
        empId: active.salesManId,
        custId: active.customerId,
        customerName: active.customerName || null,
        customerTel: active.customerTel || null,
        customerAddress: active.customerAddress || null,
        globalDiscountMode: hasGlobalDiscount(active) ? active.globalDiscountMode : null,
        globalDiscountPercent: active.globalDiscountPercent,
        globalDiscountValue: active.globalDiscountValue,
        lines: sellableLines.map((l) => ({
          itemCatalogId: l.itemCatalogId,
          stockId: l.stockId > 0 ? l.stockId : 0,
          quantity: l.quantity,
          unitId: l.unitId,
          unitSellPrice: l.unitSellPrice,
          discountMode: l.discountMode || null,
          discountPercent: l.discountPercent,
          discountValue: l.discountValue,
          returnBatchExpDate: l.expDate?.trim() || null,
          returnBatchNo: l.batchNo?.trim() || null,
        })),
        payments: null,
      });

      updateTab(tabId, {
        sthId: result.sthId,
        saved: true,
        billTyp: result.billTyp ?? 0,
        label: `Return ${result.sthId}`,
        egyptTimeDisplay: result.egyptLocalDisplay || active.egyptTimeDisplay,
        payments: {},
      });
      setPaymentPayable(money(result.payable));
      toast.success(`Return ${result.sthId} saved. Enter refund amounts below.`);
      void refreshPaymentContext(result.sthId, tabId, active.salesKindId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizePayment = async (printAfter = false) => {
    if (!token || !active || active.sthId == null) return;
    if (isFinalizing) return;
    if (!canPay) {
      toast.error("This return cannot be finalized.");
      return;
    }
    if (active.salesKindId == null || active.salesKindId <= 0) {
      toast.error("Select a sales kind.");
      return;
    }

    const targetPayable = money(paymentPayable ?? payable);
    const entries = Object.entries(active.payments)
      .map(([id, raw]) => ({
        paymentMethodId: Number(id),
        amount: money(Number(raw) || 0),
      }))
      .filter((p) => p.amount > 0);

    if (entries.length === 0) {
      toast.error("Enter at least one refund amount greater than zero.");
      return;
    }

    const allowedIds = new Set(methods.map((m) => m.paymentMethodId));
    if (entries.some((p) => !allowedIds.has(p.paymentMethodId))) {
      toast.error("One or more payment methods are not valid for the selected sales kind.");
      return;
    }

    const methodIds = entries.map((p) => p.paymentMethodId);
    if (methodIds.length !== new Set(methodIds).size) {
      toast.error("Duplicate payment methods are not allowed.");
      return;
    }

    const total = money(entries.reduce((sum, p) => sum + p.amount, 0));
    if (total !== targetPayable) {
      toast.error(
        `Refund total ${total.toFixed(2)} must equal payable ${targetPayable.toFixed(2)}.`
      );
      return;
    }

    setIsFinalizing(true);
    try {
      const sthId = active.sthId;
      const salesKindId = active.salesKindId;
      const clientId = active.clientId;
      const outcome = await finalizeWithPrintIfNeeded({
        inFlight: false,
        printAfter,
        finalize: () =>
          finalizeSalePayment(token, {
            sthId,
            salesKindId,
            payments: entries,
            documentType: SALES_PAYMENT_DOCUMENT_SALES_RETURN,
          }),
        fetchReceipt: (id) =>
          getSalesReceipt(token, id, SALES_PAYMENT_DOCUMENT_SALES_RETURN),
        onFinalized: (result) => {
          updateTab(clientId, {
            billTyp: result.billTyp ?? 1,
            payments: {},
          });
          setPaymentPayable(null);
          if (result.replay) {
            toast.message(
              `Return ${result.sthId} was already finalized. No new payment was recorded.`
            );
          } else {
            toast.success(
              `Return ${result.sthId} finalized. ${result.paymentStatus || "Payment finalized"}.`
            );
          }
        },
      });

      if (outcome.kind === "finalize-failed") {
        const err = outcome.error;
        toast.error(
          err instanceof ApiError ? err.message : "Payment finalization failed."
        );
      } else if (outcome.kind === "printed") {
        setReceiptToPrint(outcome.receipt);
      } else if (outcome.kind === "print-blocked") {
        toast.error(
          outcome.reason === "not-finalized"
            ? "The server reports this return is not finalized. Printing skipped."
            : "Refund finalized, but the receipt could not be loaded. Printing skipped."
        );
      }
    } finally {
      setIsFinalizing(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!token || !active || active.sthId == null) return;
    if (isFinalizing || (active.billTyp ?? 0) !== 1) return;
    setIsFinalizing(true);
    try {
      const loaded = await loadReceiptForPrint({
        sthId: active.sthId,
        fetchReceipt: (id) =>
          getSalesReceipt(token, id, SALES_PAYMENT_DOCUMENT_SALES_RETURN),
      });
      if (loaded.ok) {
        setReceiptToPrint(loaded.receipt);
      } else {
        toast.error(
          loaded.reason === "not-finalized"
            ? "The server reports this return is not finalized. Printing skipped."
            : "Receipt data could not be loaded. Printing skipped."
        );
      }
    } finally {
      setIsFinalizing(false);
    }
  };

  const rowDiscDisabled = !!active && hasGlobalDiscount(active);
  const globalDiscDisabled = !!active && hasAnyRowDiscount(active.lines);
  const payable = active ? returnPayable(active) : 0;

  return (
    <PageGuard permission={PERMISSIONS.sales.view}>
      <div className="mx-auto flex w-full max-w-[1600px] px-3 py-3 sm:px-4">
        <div className="flex w-full min-w-0 items-stretch">
          <div className="flex min-w-0 flex-1 flex-col gap-3 pr-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                <h1 className="text-2xl font-semibold tracking-tight">Sales Return</h1>
                <span className="text-muted-foreground">
                  Pharmacy:{" "}
                  <span className="text-foreground font-medium">{pharmacyName}</span>
                </span>
                <span className="text-muted-foreground">
                  Session:{" "}
                  <span className="text-foreground font-medium">{sessionStatus}</span>
                </span>
                <span className="text-muted-foreground inline-flex items-center gap-2">
                  Shift:{" "}
                  <span className="text-foreground font-medium">{shiftNumber}</span>
                  <ItemLanguageToggle
                    compact
                    value={languageToToggle(language)}
                    onChange={(v) => setLanguage(toggleToLanguage(v))}
                    disabled={!active || active.saved}
                  />
                </span>
              </div>
            </div>

            {!returnShiftReady ? (
              <Card>
                <CardContent className="py-4 text-sm text-muted-foreground">
                  An open shift is required. Open the pharmacy shift in Shift Management (the same
                  shift used for sales). Return movement (MovParint = 2) must be configured in
                  Sales Movement Setting.
                </CardContent>
              </Card>
            ) : null}

            <div className="flex flex-wrap gap-2 border-b pb-2">
              {tabs.map((tab) => (
                <div key={tab.clientId} className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={tab.clientId === activeId ? "default" : "outline"}
                    onClick={() => setActiveId(tab.clientId)}
                  >
                    {tab.label}
                    {!tab.saved ? " · Unsaved" : ""}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCloseTab(tab.clientId)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>

            {!active ? (
              <Card>
                <CardContent className="py-8 text-sm text-muted-foreground">
                  Loading Sales Return workspace…
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>{active.label}</CardTitle>
                    <CardDescription>
                      Date: {formatEgyptDateOnly(active.egyptTimeDisplay || egyptTime)}
                      {active.sthId != null
                        ? ` · Sth_Id ${active.sthId}`
                        : " · No return number yet"}
                      {active.saved
                        ? active.billTyp === 1
                          ? " · Finalized"
                          : " · Unpaid (BillTyp 0)"
                        : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2 md:items-start">
                    <div className="space-y-2">
                      <Label>Sales Man</Label>
                      {active.salesManId ? (
                        <div className="space-y-2 rounded-md border p-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Name: </span>
                            {active.salesManName || "—"}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Code: </span>
                            {active.salesManCode || "—"}
                          </div>
                          {!active.saved ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={clearSalesMan}
                            >
                              Change
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <form
                          autoComplete="off"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void resolveSalesMan();
                          }}
                        >
                          <Input
                            type="password"
                            name="sales-return-salesman-password"
                            autoComplete="new-password"
                            placeholder="Enter employee password"
                            value={salesManPasswordDraft}
                            disabled={active.saved}
                            onChange={(e) => setSalesManPasswordDraft(e.target.value)}
                          />
                        </form>
                      )}
                    </div>

                    <div className="text-sm md:justify-self-end md:min-w-[14rem]">
                      <div className="space-y-1 rounded-md border p-3 font-bold text-[1.2em] text-primary tabular-nums">
                        <div className="flex justify-between gap-4">
                          <span>Lines</span>
                          <span>{sumLinesNet(active.lines).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Discount</span>
                          <span>{headerDiscountAmount(active).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Payable</span>
                          <span>{payable.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Return details</CardTitle>
                    <CardDescription>
                      Search the item catalog by code, barcode, or name. Pick an
                      existing batch or an item with no stock to receive into a new
                      batch at the current pharmacy.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ReturnItemStockSearchBox
                      token={token}
                      storeId={currentStoreId ?? undefined}
                      disabled={active.saved || !active.salesManId}
                      itemLanguage={language === "Arabic" ? "ar" : "en"}
                      preferAvailableQty
                      showBatchDetails
                      onItemSelected={(item) => {
                        void handleBatchStockSelected(item);
                      }}
                    />
                    <SalesDetailsGrid
                      key={active.clientId}
                      tabId={active.clientId}
                      lines={active.lines}
                      token={token}
                      units={units}
                      unitsLoading={unitsLoading}
                      language={language}
                      stockScope="Catalog"
                      batchStockSelection
                      disabled={active.saved}
                      canAddItems={!!active.salesManId}
                      rowDiscDisabled={rowDiscDisabled}
                      skipStockAvailabilityCheck
                      egyptDateDisplay={active.egyptTimeDisplay || egyptTime}
                      onUpdateLines={updateTabLines}
                      onToast={(kind, text) => {
                        if (kind === "error") toast.error(text);
                        else toast.message(text);
                      }}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <Label>Discount</Label>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={active.saved || globalDiscDisabled}
                          aria-pressed={active.globalDiscountMode !== "V"}
                          className="min-w-[4.5rem] shrink-0"
                          onClick={() =>
                            updateActive({
                              globalDiscountMode:
                                active.globalDiscountMode === "V" ? "P" : "V",
                            })
                          }
                        >
                          {active.globalDiscountMode === "V" ? "Value" : "%"}
                        </Button>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-9 w-32"
                          disabled={active.saved || globalDiscDisabled}
                          placeholder={
                            active.globalDiscountMode === "V" ? "Amount" : "%"
                          }
                          value={
                            active.globalDiscountMode === "V"
                              ? active.globalDiscountValue
                              : active.globalDiscountPercent
                          }
                          onChange={(e) => {
                            const n = Number(e.target.value) || 0;
                            if (active.globalDiscountMode === "V") {
                              updateActive({ globalDiscountValue: n });
                            } else {
                              updateActive({
                                globalDiscountPercent: n,
                                globalDiscountMode: "P",
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Customer &amp; refund</CardTitle>
                    <CardDescription>
                      Customer is required. Save the return, then finalize refund payment.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>
                        Customer <span className="text-destructive">*</span>
                      </Label>
                      <SalesCustomerAutocomplete
                        value={
                          active.customerId
                            ? active.customerSearch ||
                              `${active.customerCode} — ${active.customerName}`
                            : active.customerSearch
                        }
                        token={token}
                        disabled={active.saved}
                        onQueryChange={(text) =>
                          updateActive({
                            customerSearch: text,
                            customerId: null,
                            customerCode: "",
                            customerName: "",
                            customerTel: "",
                            customerAddress: "",
                          })
                        }
                        onCustomerSelected={selectCustomer}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="return-sales-kind">Sales Kind</Label>
                      <select
                        id="return-sales-kind"
                        className="border-input bg-background h-9 w-full rounded-md border px-2"
                        disabled={active.billTyp === 1 || isFinalizing}
                        value={active.salesKindId ?? ""}
                        onChange={(e) => onSalesKindChange(e.target.value)}
                      >
                        <option value="">Select Sales Kind</option>
                        {salesKinds.map((k) => (
                          <option key={k.salesKindId} value={k.salesKindId}>
                            {k.salesKindName?.trim() || `Kind #${k.salesKindId}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3 border-t pt-4">
                      {!active.salesKindId ? (
                        <p className="text-sm text-muted-foreground">
                          Select a sales kind to load payment methods.
                        </p>
                      ) : methods.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {paymentLoading
                            ? "Loading payment methods…"
                            : "No payment methods assigned for this pharmacy and sales kind."}
                        </p>
                      ) : (
                        methods.map((m) => (
                          <div
                            key={m.paymentMethodId}
                            className="flex items-center justify-between gap-2"
                          >
                            <Label className={cn("min-w-24")}>
                              {m.paymentName || m.paymentMethodId}
                            </Label>
                            <Input
                              className="w-32"
                              type="number"
                              min={0}
                              step="0.01"
                              disabled={
                                isFinalizing || active.billTyp === 1 || !active.saved
                              }
                              value={active.payments[m.paymentMethodId] ?? "0"}
                              onChange={(e) =>
                                updateActive({
                                  payments: {
                                    ...active.payments,
                                    [m.paymentMethodId]: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                        ))
                      )}
                      <div className="text-sm">
                        Refund total: {paymentTotal.toFixed(2)} /{" "}
                        {(paymentPayable ?? payable).toFixed(2)}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                      <Button
                        type="button"
                        disabled={!canSave}
                        onClick={() => void handleSave()}
                      >
                        {saving ? "Saving…" : "Save Return"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          !canPay ||
                          isFinalizing ||
                          !active.salesKindId ||
                          methods.length === 0 ||
                          paymentTotal <= 0 ||
                          paymentTotal !== money(paymentPayable ?? payable)
                        }
                        onClick={() => void handleFinalizePayment(false)}
                      >
                        {isFinalizing ? "Finalizing…" : "Finalize Refund"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={
                          !canPay ||
                          isFinalizing ||
                          !active.salesKindId ||
                          methods.length === 0 ||
                          paymentTotal <= 0 ||
                          paymentTotal !== money(paymentPayable ?? payable)
                        }
                        onClick={() => void handleFinalizePayment(true)}
                      >
                        {isFinalizing ? "Finalizing…" : "Finalize Refund & Print"}
                      </Button>
                      {(active.billTyp ?? 0) === 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isFinalizing}
                          onClick={() => void handlePrintReceipt()}
                        >
                          Reprint Receipt
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <SalesPageToolbar
            expanded={toolbarExpanded}
            onExpandedChange={setToolbarExpanded}
            disabled={!token}
            onCustomer={() => setAddCustomerOpen(true)}
            onMissingSalesItem={() => toast.message("Not available on Sales Return.")}
            onNew={handleNewTab}
          />
        </div>
      </div>

      {receiptToPrint ? (
        <SalesThermalReceipt
          receipt={receiptToPrint}
          width={80}
          onClose={() => setReceiptToPrint(null)}
        />
      ) : null}

      <SalesAddCustomerSheet
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        token={token}
        currentParmId={currentParmId}
        onCreated={(customer) => {
          selectCustomer(customer);
        }}
      />
    </PageGuard>
  );
}
