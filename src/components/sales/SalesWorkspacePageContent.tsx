"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Bike, Check } from "lucide-react";
import { PageGuard } from "@/components/permissions/page-guard";
import { ItemLanguageToggle } from "@/components/pharm-recive/ItemLanguageToggle";
import { SalesAddCustomerSheet } from "@/components/sales/SalesAddCustomerSheet";
import { SalesMissingItemsSheet } from "@/components/sales/SalesMissingItemsSheet";
import { SalesPageToolbar } from "@/components/sales/SalesPageToolbar";
import { SalesCustomerAutocomplete } from "@/components/sales/SalesCustomerAutocomplete";
import {
  formatDeliveryEmployeeLabel,
  SalesDeliveryEmployeeAutocomplete,
} from "@/components/sales/SalesDeliveryEmployeeAutocomplete";
import { SalesDetailsGrid } from "@/components/sales/SalesDetailsGrid";
import { SalesThermalReceipt } from "@/components/sales/SalesThermalReceipt";
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
import { PERMISSIONS } from "@/lib/route-permissions";
import {
  ApiError,
  createSale,
  getCurrentOpenShift,
  getSaleDeliveryServices,
  getSalePaymentContext,
  getSalePaymentKinds,
  getSalePaymentMethods,
  getSalesReceipt,
  finalizeSalePayment,
  getSalesServerTime,
  getShiftMovements,
  lookupSalesManByPassword,
  openShift,
  upsertSaleDelivery,
} from "@/lib/api-client";
import { getCustomerById } from "@/lib/customer-api";
import {
  applyNewSalesInvoiceDefaults,
  DEFAULT_CASH_CUSTOMER_ID,
} from "@/lib/sales-workspace-defaults";
import {
  createEmptyTab,
  areDeliveryRequirementsMet,
  canFinalizeSale,
  deliveryItemTotal,
  deliveryTierCost,
  DELIVERY_TIER_FREE_BOUNDARY,
  hasAnyRowDiscount,
  hasGlobalDiscount,
  hasValidSalesServiceSelection,
  headerDiscountAmount,
  isSaleFinalized,
  isSellableSalesLine,
  money,
  payableAmount,
  pickDeliveryService,
  sumLinesNet,
  validateSalesQuantities,
} from "@/lib/sales-workspace-calc";
import { formatUnitOptionLabel } from "@/lib/item-unit-options";
import {
  finalizeWithPrintIfNeeded,
  loadReceiptForPrint,
} from "@/lib/sales-receipt-print";
import { createUnitService } from "@/services/unit.service";
import type {
  SalesStockScope,
  SalesSearchLanguage,
  SalesWorkspaceLine,
  SalesWorkspaceTab,
} from "@/types/sales-workspace";
import type { SalesDeliveryEmployee } from "@/types/sales-delivery";
import type {
  ReceiptPaperWidth,
  SalesReceipt,
} from "@/types/sales-receipt";
import type {
  SalesPaymentKindOption,
  SalesPaymentMethodOption,
} from "@/types/sales-payment";
import type { PharmReciveItemLanguage } from "@/types/pharm-recive";
import type { CustomerItem } from "@/types/customer";
import type { UnitItem } from "@/types/unit";
import { cn } from "@/lib/utils";

function languageToToggle(value: SalesSearchLanguage): PharmReciveItemLanguage {
  return value === "Arabic" ? "ar" : "en";
}

function toggleToLanguage(value: PharmReciveItemLanguage): SalesSearchLanguage {
  return value === "ar" ? "Arabic" : "English";
}

/** Egypt server display → date only (DD/MM/YYYY). No browser clock. */
function formatEgyptDateOnly(display: string): string {
  const raw = (display || "").trim();
  if (!raw || raw === "Loading..." || raw === "—") return raw || "—";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(raw);
  if (dmy) return `${dmy[1]}/${dmy[2]}/${dmy[3]}`;
  return raw.slice(0, 10);
}

export function SalesWorkspacePageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? null;

  const [tabs, setTabs] = useState<SalesWorkspaceTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [seq, setSeq] = useState(1);
  const [egyptTime, setEgyptTime] = useState("Loading...");
  const [pharmacyName, setPharmacyName] = useState<string>("—");
  const [currentParmId, setCurrentParmId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("—");
  const [shiftNumber, setShiftNumber] = useState<string>("—");
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [missingItemsOpen, setMissingItemsOpen] = useState(false);
  const [toolbarExpanded, setToolbarExpanded] = useState(false);

  const [language, setLanguage] = useState<SalesSearchLanguage>("English");
  const [stockScope, setStockScope] =
    useState<SalesStockScope>("CurrentPharmacy");

  const [services, setServices] = useState<
    Array<{
      salesServiceId: number;
      serviceName: string;
      serviceType: string;
      cost: number;
      requiresDeliveryEmployee: boolean;
    }>
  >([]);
  const [methods, setMethods] = useState<SalesPaymentMethodOption[]>([]);
  const [salesKinds, setSalesKinds] = useState<SalesPaymentKindOption[]>([]);
  const cashCustomerRef = useRef<CustomerItem | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentPayable, setPaymentPayable] = useState<number | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [paperWidth, setPaperWidth] = useState<ReceiptPaperWidth>(80);
  const [receiptToPrint, setReceiptToPrint] = useState<{
    receipt: SalesReceipt;
    width: ReceiptPaperWidth;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  const active = tabs.find((t) => t.clientId === activeId) ?? null;

  const deliveryMandatory = Boolean(
    active?.salesKindId != null &&
      salesKinds.find((k) => k.salesKindId === active.salesKindId)?.deleveryMandatory
  );
  const paymentMethodRequiresDelivery = Boolean(
    active &&
      methods.some(
        (m) => m.deleveryRequair && Number(active.payments[m.paymentMethodId] ?? 0) > 0
      )
  );
  // DeliveryRequired = Delivery button OR SalesKind deleveryMandatory OR payment method deleveryRequair.
  const deliveryRequired = Boolean(
    active && (active.deliveryEnabled || deliveryMandatory || paymentMethodRequiresDelivery)
  );
  const showDeliveryFields = deliveryRequired;
  const tierItemTotal = active ? deliveryItemTotal(active) : 0;
  const tierServiceCost = deliveryTierCost(tierItemTotal);
  const autoDeliveryService = pickDeliveryService(services, tierItemTotal);
  // Totals above 300 must keep the zero-cost service — the menu is locked.
  const deliveryServiceLocked = deliveryRequired && tierServiceCost === 0;
  const deliveryEditableLocked = Boolean(
    active?.saved && (active.billTyp ?? 0) === 1
  );
  const deliveryRequirementsMet = areDeliveryRequirementsMet({
    deliveryRequired,
    deliveryMandatory,
    customerId: active?.customerId ?? null,
    deliveryEmployeeId: active?.deliveryEmployeeId ?? null,
    selectedSalesServiceId: active?.salesServiceId ?? null,
    autoDeliveryService,
  });
  const deliveryMandatoryRequirementsMet = deliveryRequirementsMet;
  const deliveryMissingReasons: string[] = [];
  if (active && !active.saved && !deliveryRequirementsMet) {
    if (deliveryMandatory && (active.customerId == null || active.customerId <= 0))
      deliveryMissingReasons.push(
        "Select a customer — required for delivery with this Sales Kind."
      );
    if (active.deliveryEmployeeId == null || active.deliveryEmployeeId <= 0)
      deliveryMissingReasons.push("Select the delivery employee (code lookup).");
    if (!autoDeliveryService)
      deliveryMissingReasons.push(
        `No delivery service costing ${tierServiceCost.toFixed(2)} is assigned to the current pharmacy.`
      );
    else if (active.salesServiceId !== autoDeliveryService.salesServiceId)
      deliveryMissingReasons.push(
        `Delivery service must be “${autoDeliveryService.serviceName}” for this invoice total.`
      );
  }

  /** Update one tab by id — never depends on which tab is currently active. */
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

  /** Line updates always target the tab that owns those lines (by clientId). */
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

  const ensureCashCustomer = useCallback(async (): Promise<CustomerItem | null> => {
    if (!token) return null;
    if (cashCustomerRef.current) return cashCustomerRef.current;
    try {
      const customer = await getCustomerById(DEFAULT_CASH_CUSTOMER_ID, token);
      if (customer.custCode === DEFAULT_CASH_CUSTOMER_ID) {
        cashCustomerRef.current = customer;
        return customer;
      }
    } catch {
      // Cash customer missing — leave unset.
    }
    return null;
  }, [token]);

  const loadMethodsForSalesKind = useCallback(
    async (salesKindId: number | null) => {
      if (!token) {
        setMethods([]);
        return;
      }
      if (salesKindId == null || salesKindId <= 0) {
        setMethods([]);
        return;
      }

      setPaymentLoading(true);
      try {
        setMethods(await getSalePaymentMethods(token, salesKindId));
      } catch (err) {
        setMethods([]);
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Failed to load payment methods."
        );
      } finally {
        setPaymentLoading(false);
      }
    },
    [token]
  );

  const stampNewInvoiceDefaults = useCallback(
    (tab: SalesWorkspaceTab, cash: CustomerItem | null) => {
      const next = applyNewSalesInvoiceDefaults(tab, salesKinds, cash);
      if (
        next.salesKindId != null &&
        next.salesKindId > 0 &&
        next.salesKindId !== tab.salesKindId
      ) {
        void loadMethodsForSalesKind(next.salesKindId);
      }
      return next;
    },
    [salesKinds, loadMethodsForSalesKind]
  );

  // Delivery normalization: the tier service follows the discounted goods total immediately,
  // and stale delivery-only values are cleared when delivery is no longer required.
  useEffect(() => {
    if (!active || active.deliveryPersisted || deliveryEditableLocked) return;
    if (!deliveryRequired) {
      if (
        active.salesServiceId != null ||
        active.serviceCost !== 0 ||
        active.requiresDeliveryEmployee
      ) {
        updateActive({
          salesServiceId: null,
          serviceCost: 0,
          requiresDeliveryEmployee: false,
        });
      }
      return;
    }
    if (!autoDeliveryService) return;
    if (
      active.salesServiceId !== autoDeliveryService.salesServiceId ||
      active.serviceCost !== autoDeliveryService.cost
    ) {
      const expected = autoDeliveryService;
      updateActive((tab) => ({
        ...tab,
        salesServiceId: expected.salesServiceId,
        serviceCost: expected.cost,
        requiresDeliveryEmployee: expected.requiresDeliveryEmployee,
      }));
    }
  }, [
    active,
    deliveryRequired,
    deliveryEditableLocked,
    autoDeliveryService,
    updateActive,
  ]);

  const ensureShift = useCallback(async () => {
    if (!token) return;
    try {
      let status = await getCurrentOpenShift(token);
      if (!status.hasOpenShift) {
        const movements = await getShiftMovements(token).catch(() => []);
        const movId = movements[0]?.movId;
        if (!movId) {
          setPharmacyName(status.pharmacyName?.trim() || "—");
          setCurrentParmId(
            status.parmId != null && status.parmId > 0
              ? String(status.parmId)
              : null
          );
          setSessionStatus(status.status?.trim() || "Closed");
          setShiftNumber("—");
          toast.message("No Sales Movement MovId available. Open Shift Management first.");
          return;
        }
        status = await openShift(token, {
          openingBalance: 0,
          notes: null,
          movId,
        });
        toast.success(`Shift opened (Sc_Id ${status.scId}).`);
      }
      setPharmacyName(status.pharmacyName?.trim() || "—");
      setCurrentParmId(
        status.parmId != null && status.parmId > 0
          ? String(status.parmId)
          : null
      );
      setSessionStatus(
        status.status?.trim() ||
          (status.hasOpenShift ? "Open" : "Closed")
      );
      setShiftNumber(
        status.scId != null && status.scId > 0 ? String(status.scId) : "—"
      );
    } catch {
      setPharmacyName("—");
      setCurrentParmId(null);
      setSessionStatus("Unavailable");
      setShiftNumber("—");
    }
  }, [token]);

  // Shell-first: open first in-memory tab immediately; load supporting data in background.
  useEffect(() => {
    if (!token) return;

    setTabs((prev) => {
      if (prev.length > 0) return prev;
      const first = createEmptyTab(1, "Loading...");
      setActiveId(first.clientId);
      setSeq(2);
      return [first];
    });

    let cancelled = false;
    void (async () => {
      setUnitsLoading(true);
      const [time, svc, kinds, unitResult] = await Promise.all([
        getSalesServerTime(token),
        getSaleDeliveryServices(token).catch(() => []),
        getSalePaymentKinds(token).catch(() => [] as SalesPaymentKindOption[]),
        createUnitService(token)
          .listUnits()
          .catch(() => ({ units: [] as UnitItem[] })),
      ]);
      if (cancelled) return;

      setServices(svc);
      setSalesKinds(kinds);
      setMethods([]);
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

      await ensureShift();
    })();

    return () => {
      cancelled = true;
    };
  }, [token, ensureShift]);

  useEffect(() => {
    if (!token || salesKinds.length === 0) return;
    let cancelled = false;
    void (async () => {
      const cash = await ensureCashCustomer();
      if (cancelled) return;
      setTabs((prev) =>
        prev.map((tab) => stampNewInvoiceDefaults(tab, cash))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [token, salesKinds, ensureCashCustomer, stampNewInvoiceDefaults]);

  const handleNewTab = () => {
    void (async () => {
      const cash = await ensureCashCustomer();
      const tab = stampNewInvoiceDefaults(createEmptyTab(seq, egyptTime), cash);
      setSeq((n) => n + 1);
      setTabs((prev) => [...prev, tab]);
      setActiveId(tab.clientId);
    })();
  };

  const handleCloseTab = (clientId: string) => {
    const remaining = tabs.filter((t) => t.clientId !== clientId);
    if (remaining.length === 0) {
      // Last tab closed → normal empty/new workspace (no DB change).
      void (async () => {
        const cash = await ensureCashCustomer();
        const fresh = stampNewInvoiceDefaults(
          createEmptyTab(seq, egyptTime),
          cash
        );
        setSeq((n) => n + 1);
        setTabs([fresh]);
        setActiveId(fresh.clientId);
      })();
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
    const password = active.salesManPassword.trim();
    if (!password) {
      toast.error("Enter Sales Man password.");
      return;
    }
    try {
      const emp = await lookupSalesManByPassword(token, password);
      if (!emp?.id || emp.employType !== 1) {
        toast.error("Sales Man not found");
        updateTab(tabId, {
          salesManId: null,
          salesManName: "",
          salesManCode: "",
          salesManPassword: "",
        });
        return;
      }
      updateTab(tabId, {
        salesManId: emp.id,
        salesManName: emp.name ?? "",
        salesManCode: emp.code ?? "",
        salesManPassword: "",
      });
      toast.success("Sales Man loaded.");
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status !== 404
          ? err.message
          : "Sales Man not found"
      );
    }
  };

  const clearSalesMan = () => {
    if (!active || active.saved) return;
    updateActive({
      salesManId: null,
      salesManName: "",
      salesManCode: "",
      salesManPassword: "",
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

  const onServiceChange = (serviceId: number | null) => {
    const svc = services.find((s) => s.salesServiceId === serviceId) ?? null;
    updateActive({
      salesServiceId: serviceId,
      serviceCost: svc?.cost ?? 0,
      requiresDeliveryEmployee: svc?.requiresDeliveryEmployee ?? false,
    });
  };

  /** Delivery toggle: OFF hides Sales Service + employee lookup and clears selection. */
  const toggleDelivery = () => {
    if (!active || active.saved) return;
    if (active.deliveryEnabled) {
      if (deliveryMandatory) {
        toast.message("Delivery is required for the selected Sales Kind.");
        return;
      }
      if (paymentMethodRequiresDelivery) {
        toast.message("Delivery is required by the selected payment method.");
        return;
      }
      updateActive({
        deliveryEnabled: false,
        deliverySearch: "",
        deliveryEmployeeId: null,
        deliveryCode: "",
        deliveryEmployeeName: "",
        salesServiceId: null,
        serviceCost: 0,
        requiresDeliveryEmployee: false,
      });
      return;
    }
    updateActive({ deliveryEnabled: true });
  };

  const clearDeliveryEmployeeSelection = () => {
    if (!active || active.saved) return;
    updateActive({
      deliverySearch: "",
      deliveryEmployeeId: null,
      deliveryCode: "",
      deliveryEmployeeName: "",
    });
  };

  const selectDeliveryEmployee = (emp: SalesDeliveryEmployee) => {
    if (!active) return;
    updateActive({
      deliveryEmployeeId: emp.employInfoId > 0 ? emp.employInfoId : null,
      deliveryCode: emp.code?.trim() || "",
      deliveryEmployeeName: emp.name?.trim() || "",
      deliverySearch: formatDeliveryEmployeeLabel(emp),
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
    const result = validateSalesQuantities(active.lines, resolveUnitName);
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    return true;
  }, [active, resolveUnitName]);

  const canPay = canFinalizeSale(active, isFinalizing);

  const refreshPaymentContext = useCallback(
    async (sthId: number, tabId: string, salesKindId?: number | null) => {
      if (!token) return;
      setPaymentLoading(true);
      try {
        const ctx = await getSalePaymentContext(token, sthId, salesKindId);
        updateTab(tabId, { billTyp: ctx.billTyp });
        if (salesKindId != null && salesKindId > 0) {
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

  const onSalesKindChange = (raw: string) => {
    if (!active) return;
    const nextId = raw ? Number(raw) : null;
    const kindId = nextId != null && nextId > 0 ? nextId : null;
    const kind = kindId != null
      ? salesKinds.find((k) => k.salesKindId === kindId) ?? null
      : null;
    const mandatory = Boolean(kind?.deleveryMandatory);
    updateActive({
      salesKindId: kindId,
      payments: {},
      ...(mandatory ? { deliveryEnabled: true } : {}),
    });
    void loadMethodsForSalesKind(kindId);
  };

  const assertDeliveryForSave = (): boolean => {
    if (!active || !deliveryRequired) return true;

    if (deliveryMandatory && (active.customerId == null || active.customerId <= 0)) {
      toast.error("Customer is required when DeliveryMandatory is enabled.");
      return false;
    }
    if (active.deliveryEmployeeId == null || active.deliveryEmployeeId <= 0) {
      toast.error(
        deliveryMandatory
          ? "Delivery employee is required when DeliveryMandatory is enabled."
          : "Delivery employee code is required when delivery is selected or the payment method requires delivery."
      );
      return false;
    }
    if (!autoDeliveryService) {
      toast.error(
        `No delivery service costing ${tierServiceCost.toFixed(2)} is assigned to the current pharmacy.`
      );
      return false;
    }
    if (
      !hasValidSalesServiceSelection(active.salesServiceId) ||
      active.salesServiceId !== autoDeliveryService.salesServiceId
    ) {
      updateActive({
        salesServiceId: autoDeliveryService.salesServiceId,
        serviceCost: autoDeliveryService.cost,
        requiresDeliveryEmployee: autoDeliveryService.requiresDeliveryEmployee,
      });
      toast.message(
        `Delivery service set to “${autoDeliveryService.serviceName}” for this invoice total.`
      );
    }
    return true;
  };

  const canSave = Boolean(
    active &&
      !active.saved &&
      !saving &&
      active.salesManId &&
      deliveryMandatoryRequirementsMet
  );

  const handleSave = async () => {
    if (!token || !active) return;
    const tabId = active.clientId;
    if (active.saved) {
      toast.message("This tab is already saved.");
      return;
    }
    if (!active.salesManId) {
      toast.error("Resolve Sales Man first.");
      return;
    }
    const sellableLines = active.lines.filter(isSellableSalesLine);
    if (sellableLines.length === 0) {
      toast.error("Add at least one line.");
      return;
    }
    if (sellableLines.some((l) => l.pendingStocks && l.pendingStocks.length > 0)) {
      toast.error("Select a batch/stock for every line.");
      return;
    }
    if (!assertActiveQuantitiesValid()) return;
    if (hasAnyRowDiscount(active.lines) && hasGlobalDiscount(active)) {
      toast.error("Cannot use global and row discounts together.");
      return;
    }
    if (!assertDeliveryForSave()) return;

    setSaving(true);
    try {
      // Payments are finalized after Save via SalesPayment/finalize — never on create.
      const result = await createSale(token, {
        empId: active.salesManId,
        custId: active.customerId,
        customerName: active.customerName || null,
        customerTel: active.customerTel || null,
        customerAddress: active.customerAddress || null,
        globalDiscountMode: hasGlobalDiscount(active) ? active.globalDiscountMode : null,
        globalDiscountPercent: active.globalDiscountPercent,
        globalDiscountValue: active.globalDiscountValue,
        salesKindId: active.salesKindId,
        salesServiceId: deliveryRequired ? active.salesServiceId : null,
        deliveryCodeOrPassword:
          deliveryRequired && active.deliveryEmployeeId
            ? active.deliveryCode || null
            : null,
        deliveryRequested: deliveryRequired,
        lines: sellableLines.map((l) => ({
          itemCatalogId: l.itemCatalogId,
          stockId: l.stockId,
          quantity: l.quantity,
          unitId: l.unitId,
          unitSellPrice: l.unitSellPrice,
          discountMode: l.discountMode || null,
          discountPercent: l.discountPercent,
          discountValue: l.discountValue,
        })),
        payments: null,
      });

      updateTab(tabId, {
        sthId: result.sthId,
        saved: true,
        billTyp: result.billTyp ?? 0,
        label: `Sale ${result.sthId}`,
        egyptTimeDisplay: result.egyptLocalDisplay || active.egyptTimeDisplay,
        payments: {},
        deliveryPersisted: deliveryRequired,
      });
      setPaymentPayable(money(result.payable));
      toast.success(`Sale ${result.sthId} saved. Enter payment amounts below.`);
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
      // Already finalized: the click does nothing. Printing it is the reprint report's job.
      if (!isSaleFinalized(active)) toast.error("This sale cannot be paid.");
      return;
    }
    if (!assertDeliveryForSave()) return;

    // Delivery became required after save (payment method flag): persist it first,
    // then the refreshed payable (now including the tier service cost) applies.
    if (deliveryRequired && !active.deliveryPersisted) {
      try {
        await upsertSaleDelivery(token, {
          sthId: active.sthId,
          custId: active.customerId,
          customerName: active.customerName || null,
          tel: active.customerTel || null,
          address: active.customerAddress || null,
          salesServiceId: active.salesServiceId ?? 0,
          deliveryCodeOrPassword: active.deliveryCode || null,
        });
        updateTab(active.clientId, { deliveryPersisted: true });
        await refreshPaymentContext(active.sthId, active.clientId, active.salesKindId);
        toast.message(
          "Delivery service applied; payable updated. Confirm payment amounts and finalize again."
        );
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Failed to save delivery details."
        );
      }
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
      toast.error("Enter at least one payment amount greater than zero.");
      return;
    }

    const allowedIds = new Set(methods.map((m) => m.paymentMethodId));
    if (entries.some((p) => !allowedIds.has(p.paymentMethodId))) {
      toast.error(
        "One or more payment amounts use a method that is not valid for the selected sales kind."
      );
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
        `Payment total ${total.toFixed(2)} must equal payable ${targetPayable.toFixed(2)}.`
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
          }),
        // Read-only GET of the persisted invoice; never finalizes or pays again.
        fetchReceipt: (id) => getSalesReceipt(token, id),
        onFinalized: (result) => {
          updateTab(clientId, {
            billTyp: result.billTyp ?? 1,
            payments: {},
          });
          setPaymentPayable(null);
          // A replay means the sale was already finalized (an earlier response was lost): the
          // returned payments are the persisted ones and no new payment or stock movement happened.
          if (result.replay) {
            toast.message(
              `Sale ${result.sthId} was already finalized. No new payment was recorded.`
            );
          } else {
            toast.success(
              `Sale ${result.sthId} paid. ${result.paymentStatus || "Payment finalized"}.`
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
        setReceiptToPrint({ receipt: outcome.receipt, width: paperWidth });
      } else if (outcome.kind === "print-blocked") {
        toast.error(
          outcome.reason === "not-finalized"
            ? "The server reports this invoice is not finalized. Printing skipped."
            : "Payment finalized, but the receipt data could not be loaded. Printing skipped."
        );
      }
    } finally {
      setIsFinalizing(false);
    }
  };

  /** Reprint of an already finalized invoice: read-only GET only — never finalizes or pays. */
  const handlePrintReceipt = async () => {
    if (!token || !active || active.sthId == null) return;
    if (isFinalizing || !isSaleFinalized(active)) return;
    const sthId = active.sthId;
    setIsFinalizing(true);
    try {
      const loaded = await loadReceiptForPrint({
        sthId,
        fetchReceipt: (id) => getSalesReceipt(token, id),
      });
      if (loaded.ok) {
        setReceiptToPrint({ receipt: loaded.receipt, width: paperWidth });
      } else {
        toast.error(
          loaded.reason === "not-finalized"
            ? "The server reports this invoice is not finalized. Printing skipped."
            : "Receipt data could not be loaded from the server. Printing skipped."
        );
      }
    } finally {
      setIsFinalizing(false);
    }
  };

  const rowDiscDisabled = !!active && hasGlobalDiscount(active);
  const globalDiscDisabled = !!active && hasAnyRowDiscount(active.lines);
  const payable = active ? payableAmount(active) : 0;

  return (
    <PageGuard permission={PERMISSIONS.sales.view}>
      <div className="mx-auto flex w-full max-w-[1600px] px-3 py-3 sm:px-4">
        <div className="flex w-full min-w-0 items-stretch">
          <div className="flex min-w-0 flex-1 flex-col gap-3 pr-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
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
                title="Close Invoice Tab"
                aria-label="Close Invoice Tab"
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
              Loading Sales workspace…
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{active.label}</CardTitle>
                <CardDescription>
                  Date: {formatEgyptDateOnly(active.egyptTimeDisplay || egyptTime)}
                  {active.sthId != null ? ` · Sth_Id ${active.sthId}` : " · No sale number yet"}
                  {active.saved
                    ? active.billTyp === 1
                      ? " · Paid"
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
                    <Input
                      type="password"
                      autoComplete="off"
                      placeholder="Enter employee password"
                      value={active.salesManPassword}
                      disabled={active.saved}
                      onChange={(e) =>
                        updateActive({ salesManPassword: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void resolveSalesMan();
                        }
                      }}
                    />
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
                      <span>Service</span>
                      <span>
                        {deliveryRequired
                          ? active.serviceCost.toFixed(2)
                          : "0.00"}
                      </span>
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
                <div>
                  <CardTitle>Sales details</CardTitle>
                  <CardDescription>
                    Scan barcode, enter item code, or search by name in the row. Item name fills automatically.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm lg:flex-nowrap">
                  {(
                    [
                      ["CurrentPharmacy", "Current Pharmacy — Available Qty"],
                      ["Catalog", "Item Catalog"],
                      
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1.5"
                    >
                      <input
                        type="radio"
                        name="stockScope"
                        checked={stockScope === value}
                        disabled={active.saved}
                        onChange={() => setStockScope(value)}
                      />
                      <span className="text-xs sm:text-sm">{label}</span>
                    </label>
                  ))}
                </div>
                <SalesDetailsGrid
                  key={active.clientId}
                  tabId={active.clientId}
                  lines={active.lines}
                  token={token}
                  units={units}
                  unitsLoading={unitsLoading}
                  language={language}
                  stockScope={stockScope}
                  disabled={active.saved}
                  canAddItems={!!active.salesManId}
                  rowDiscDisabled={rowDiscDisabled}
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
                      step={active.globalDiscountMode === "V" ? "0.01" : "0.01"}
                      className="h-9 w-32"
                      disabled={active.saved || globalDiscDisabled}
                      placeholder={active.globalDiscountMode === "V" ? "Amount" : "%"}
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
                  {globalDiscDisabled ? (
                    <p className="text-xs text-muted-foreground">
                      Disabled while row discounts exist.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Payment</CardTitle>
                  <CardDescription>
                    Customer, optional delivery/service, payment methods, then Save and finalize.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    Customer
                    {deliveryMandatory ? (
                      <span className="text-destructive"> *</span>
                    ) : null}
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
                  {active.customerId ? (
                    <div className="text-muted-foreground space-y-1 text-sm">
                      <div>{active.customerName || "—"}</div>
                      <div>{active.customerTel || "—"}</div>
                      <div>{active.customerAddress || "—"}</div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Delivery</Label>
                  <Button
                    type="button"
                    variant={active.deliveryEnabled ? "default" : "outline"}
                    disabled={active.saved}
                    aria-pressed={active.deliveryEnabled}
                    onClick={toggleDelivery}
                    className="gap-2"
                  >
                    <Bike className="size-4" aria-hidden />
                    Delivery
                    {active.deliveryEnabled ? (
                      <Check className="size-4" aria-hidden />
                    ) : null}
                  </Button>
                </div>

                {showDeliveryFields ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="delivery-employee-lookup">
                          Delivery Employee
                          {deliveryRequired ? (
                            <span className="text-destructive"> *</span>
                          ) : null}
                        </Label>
                        {active.deliveryEmployeeId ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={deliveryEditableLocked}
                            onClick={clearDeliveryEmployeeSelection}
                          >
                            Clear
                          </Button>
                        ) : null}
                      </div>
                      <SalesDeliveryEmployeeAutocomplete
                        value={active.deliverySearch}
                        token={token}
                        disabled={deliveryEditableLocked}
                        onQueryChange={(text) =>
                          updateActive({
                            deliverySearch: text,
                            deliveryEmployeeId: null,
                            deliveryCode: "",
                            deliveryEmployeeName: "",
                          })
                        }
                        onEmployeeSelected={selectDeliveryEmployee}
                        onResolveFailed={(message) => toast.error(message)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payment-sales-service">
                        Sales Service
                        {deliveryRequired ? (
                          <span className="text-destructive"> *</span>
                        ) : null}
                      </Label>
                      <select
                        id="payment-sales-service"
                        className="border-input bg-background h-9 w-full rounded-md border px-2"
                        disabled={deliveryEditableLocked || deliveryServiceLocked}
                        value={active.salesServiceId ?? ""}
                        onChange={(e) =>
                          onServiceChange(e.target.value ? Number(e.target.value) : null)
                        }
                      >
                        <option value="">Select Sales Service</option>
                        {services.map((s) => (
                          <option key={s.salesServiceId} value={s.salesServiceId}>
                            {s.serviceName} — {s.cost.toFixed(2)}
                          </option>
                        ))}
                      </select>
                      {deliveryServiceLocked ? (
                        <p className="text-xs text-muted-foreground">
                          Invoice total is above {DELIVERY_TIER_FREE_BOUNDARY} — the zero-cost
                          delivery service is applied automatically.
                        </p>
                      ) : null}
                      {deliveryRequired && !autoDeliveryService ? (
                        <div className="text-destructive mt-1 text-xs">
                          No delivery service costing {tierServiceCost.toFixed(2)} is assigned
                          to the current pharmacy for this invoice total.
                        </div>
                      ) : null}
                      <div className="text-sm">
                        Service value: {active.serviceCost.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="payment-sales-kind">Sales Kind</Label>
                  <select
                    id="payment-sales-kind"
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
                  {salesKinds.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No sales kinds assigned to the current pharmacy.
                    </p>
                  ) : null}
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
                    Payment total: {paymentTotal.toFixed(2)} /{" "}
                    {(paymentPayable ?? payable).toFixed(2)}
                  </div>
                </div>

                {!active.saved && !canSave &&
                (deliveryMissingReasons.length > 0 || !active.salesManId) ? (
                  <div className="text-destructive text-xs" role="alert">
                    <p>Save is disabled until these are resolved:</p>
                    <ul className="list-disc ps-4">
                      {!active.salesManId ? (
                        <li>Resolve Sales Man first.</li>
                      ) : null}
                      {deliveryMissingReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                    <div className="mr-auto flex items-center gap-1">
                      <span className="text-muted-foreground text-xs">Receipt</span>
                      <Button
                        type="button"
                        size="sm"
                        variant={paperWidth === 80 ? "default" : "outline"}
                        aria-pressed={paperWidth === 80}
                        onClick={() => setPaperWidth(80)}
                      >
                        80 mm
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={paperWidth === 58 ? "default" : "outline"}
                        aria-pressed={paperWidth === 58}
                        onClick={() => setPaperWidth(58)}
                      >
                        58 mm
                      </Button>
                    </div>
                    <Button
                      type="button"
                      disabled={!canSave}
                      onClick={() => void handleSave()}
                    >
                      {saving ? "Saving…" : "Save"}
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
                      onClick={() => void handleFinalizePayment()}
                    >
                      {isFinalizing ? "Finalizing…" : "Finalize"}
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
                      onClick={() => void handleFinalizePayment(true)}
                    >
                      {isFinalizing ? "Finalizing…" : "Finalize & Print"}
                    </Button>
                    {isSaleFinalized(active) && active.sthId != null ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isFinalizing}
                        onClick={() => void handlePrintReceipt()}
                      >
                        {isFinalizing ? "Preparing…" : "Print receipt"}
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
            onMissingSalesItem={() => setMissingItemsOpen(true)}
            onNew={handleNewTab}
          />
        </div>
      </div>

      <SalesAddCustomerSheet
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        token={token}
        currentParmId={currentParmId}
        onCreated={(customer) => {
          selectCustomer(customer);
        }}
      />
      <SalesMissingItemsSheet
        open={missingItemsOpen}
        onOpenChange={setMissingItemsOpen}
        token={token}
        language={language}
        custId={active?.customerId ?? null}
      />
      {receiptToPrint ? (
        <SalesThermalReceipt
          receipt={receiptToPrint.receipt}
          width={receiptToPrint.width}
          onClose={() => setReceiptToPrint(null)}
        />
      ) : null}
    </PageGuard>
  );
}
