import type { DiscountMode, SalesWorkspaceLine, SalesWorkspaceTab } from "@/types/sales-workspace";

export function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lineGross(line: SalesWorkspaceLine): number {
  return money(line.quantity * line.unitSellPrice);
}

export function lineDiscount(line: SalesWorkspaceLine): number {
  const gross = lineGross(line);
  if (line.discountMode === "P") {
    return money(gross * (Math.max(0, line.discountPercent) / 100));
  }
  if (line.discountMode === "V") {
    return money(Math.min(Math.max(0, line.discountValue), gross));
  }
  return 0;
}

export function lineNet(line: SalesWorkspaceLine): number {
  return money(lineGross(line) - lineDiscount(line));
}

export function isSellableSalesLine(line: SalesWorkspaceLine): boolean {
  return line.itemCatalogId > 0 && line.stockId > 0;
}

export function hasAnyRowDiscount(lines: SalesWorkspaceLine[]): boolean {
  return lines.some(
    (l) =>
      isSellableSalesLine(l) &&
      ((l.discountMode === "P" && l.discountPercent > 0) ||
        (l.discountMode === "V" && l.discountValue > 0))
  );
}

export function hasGlobalDiscount(tab: SalesWorkspaceTab): boolean {
  return (
    (tab.globalDiscountMode === "P" && tab.globalDiscountPercent > 0) ||
    (tab.globalDiscountMode === "V" && tab.globalDiscountValue > 0)
  );
}

export function sumLinesNet(lines: SalesWorkspaceLine[]): number {
  return money(
    lines
      .filter(isSellableSalesLine)
      .reduce((acc, line) => acc + lineNet(line), 0)
  );
}

export function headerDiscountAmount(tab: SalesWorkspaceTab): number {
  const base = sumLinesNet(tab.lines);
  if (tab.globalDiscountMode === "P") {
    return money(base * (Math.max(0, tab.globalDiscountPercent) / 100));
  }
  if (tab.globalDiscountMode === "V") {
    return money(Math.min(Math.max(0, tab.globalDiscountValue), base));
  }
  return 0;
}

export function payableAmount(tab: SalesWorkspaceTab): number {
  const service =
    tab.deliveryEnabled && Number.isFinite(tab.serviceCost) ? tab.serviceCost || 0 : 0;
  return money(sumLinesNet(tab.lines) - headerDiscountAmount(tab) + service);
}

/** True when Sales Service Id is a positive selection (not null/0/empty). */
export function hasValidSalesServiceSelection(
  salesServiceId: number | null | undefined
): boolean {
  return salesServiceId != null && Number.isFinite(salesServiceId) && salesServiceId > 0;
}

/** Quantity display/compare precision (not money). */
export function roundQty(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

type SalesUnitConversionFields = Pick<
  SalesWorkspaceLine,
  "unitId" | "unit1" | "unit2" | "unit3" | "unit1Unit2" | "unit1Unit3"
>;

/**
 * Mirrors UnitConversionService.ConvertToBaseUnitCore QuantityNet / ConversionValue.
 * Stock.AvailableQty is stored in the same base units as QuantityNet.
 */
export function convertSalesQuantityToBase(
  line: SalesUnitConversionFields,
  quantity: number
): {
  quantityNet: number | null;
  conversionValue: number | null;
  error: string | null;
} {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { quantityNet: null, conversionValue: null, error: "Quantity must be greater than zero." };
  }

  const unitId = line.unitId;
  const unit1 = line.unit1;
  const unit2 = line.unit2;
  const unit3 = line.unit3;
  const unit1Unit2 = line.unit1Unit2;
  const unit1Unit3 = line.unit1Unit3;

  if (unit1 == null && unit2 == null && unit3 == null) {
    return {
      quantityNet: null,
      conversionValue: null,
      error: "Item has no unit conversion configured.",
    };
  }

  if (unit3 != null && unitId === unit3) {
    if (unit1Unit3 == null || !Number.isFinite(unit1Unit3) || unit1Unit3 <= 0) {
      return {
        quantityNet: quantity,
        conversionValue: 1,
        error: "Item has an invalid Unit1→Unit3 conversion factor.",
      };
    }
    return { quantityNet: quantity, conversionValue: 1, error: null };
  }

  if (unit1 != null && unitId === unit1) {
    if (unit1Unit3 == null || !Number.isFinite(unit1Unit3) || unit1Unit3 <= 0) {
      return {
        quantityNet: null,
        conversionValue: null,
        error: "Item has an invalid Unit1→Unit3 conversion factor.",
      };
    }
    const conversionValue = unit1Unit3;
    return {
      quantityNet: quantity * conversionValue,
      conversionValue,
      error: null,
    };
  }

  if (unit2 != null && unitId === unit2) {
    if (unit1Unit2 == null || !Number.isFinite(unit1Unit2) || unit1Unit2 <= 0) {
      return {
        quantityNet: null,
        conversionValue: null,
        error: "Item has an invalid Unit1→Unit2 conversion factor.",
      };
    }
    if (unit1Unit3 == null || !Number.isFinite(unit1Unit3) || unit1Unit3 <= 0) {
      return {
        quantityNet: null,
        conversionValue: null,
        error: "Item has an invalid Unit1→Unit3 conversion factor.",
      };
    }
    const conversionValue = unit1Unit3 / unit1Unit2;
    return {
      quantityNet: quantity * conversionValue,
      conversionValue,
      error: null,
    };
  }

  return {
    quantityNet: null,
    conversionValue: null,
    error: `Unit id '${unitId}' is not configured for this item.`,
  };
}

/** Convert Stock.AvailableQty (base) into the currently selected unit. */
export function displayAvailableQtyInSelectedUnit(
  line: Pick<SalesWorkspaceLine, "availableQty"> & SalesUnitConversionFields
): number | null {
  const { conversionValue, error } = convertSalesQuantityToBase(line, 1);
  if (error || conversionValue == null || conversionValue <= 0) return null;
  return roundQty(line.availableQty / conversionValue);
}

/** Base-unit quantity for one sellable line (null if not convertible). */
export function lineBaseQuantity(
  line: Pick<SalesWorkspaceLine, "quantity" | "stockId" | "itemCatalogId"> &
    SalesUnitConversionFields
): number | null {
  if (line.stockId <= 0) return null;
  const converted = convertSalesQuantityToBase(line, line.quantity);
  if (converted.error || converted.quantityNet == null) return null;
  return converted.quantityNet;
}

/**
 * Invoice-local base qty already allocated to a StockId.
 * Does not change database AvailableQty — temporary UI allocation only.
 */
export function sumInvoiceBaseUsedForStock(
  lines: SalesWorkspaceLine[],
  stockId: number,
  excludeLineKey?: string
): number {
  if (stockId <= 0) return 0;
  let sum = 0;
  for (const line of lines) {
    if (!isSellableSalesLine(line)) continue;
    if (line.stockId !== stockId) continue;
    if (excludeLineKey && line.key === excludeLineKey) continue;
    const base = lineBaseQuantity(line);
    if (base != null) sum += base;
  }
  return roundQty(sum);
}

/** Remaining base qty for a StockId within this invoice (original DB avail − other rows). */
export function invoiceRemainingBaseForStock(
  lines: SalesWorkspaceLine[],
  stockId: number,
  originalAvailableQty: number,
  excludeLineKey?: string
): number {
  const used = sumInvoiceBaseUsedForStock(lines, stockId, excludeLineKey);
  return roundQty(Math.max(0, originalAvailableQty - used));
}

/** Remaining in the candidate line's selected unit (for display / toast). */
export function invoiceRemainingInSelectedUnit(
  lines: SalesWorkspaceLine[],
  candidate: Pick<SalesWorkspaceLine, "stockId" | "availableQty" | "key"> &
    SalesUnitConversionFields,
  excludeLineKey?: string
): number | null {
  const remainingBase = invoiceRemainingBaseForStock(
    lines,
    candidate.stockId,
    candidate.availableQty,
    excludeLineKey ?? candidate.key
  );
  const { conversionValue, error } = convertSalesQuantityToBase(candidate, 1);
  if (error || conversionValue == null || conversionValue <= 0) return null;
  return roundQty(remainingBase / conversionValue);
}

export function formatInvoiceStockInsufficientMessage(
  line: Pick<SalesWorkspaceLine, "batchNo" | "stockId">,
  remainingSelected: number | null,
  remainingBase: number,
  unitName: string
): string {
  const batchLabel = line.batchNo?.trim()
    ? `Batch ${line.batchNo.trim()}`
    : `stock #${line.stockId}`;
  if (remainingSelected != null) {
    return `Insufficient available quantity for ${batchLabel}. Only ${remainingSelected} ${unitName} is available for this invoice.`;
  }
  return `Insufficient available quantity for ${batchLabel}. Only ${remainingBase} (base) is available for this invoice.`;
}

/**
 * Check whether candidate qty fits invoice-local remaining for its StockId.
 * excludeLineKey defaults to candidate.key (other rows only).
 */
export function checkInvoiceStockAllocation(
  lines: SalesWorkspaceLine[],
  candidate: Pick<
    SalesWorkspaceLine,
    "key" | "stockId" | "availableQty" | "quantity" | "batchNo" | "itemName" | "itemCode"
  > &
    SalesUnitConversionFields,
  unitName: string,
  excludeLineKey?: string
): { ok: true } | { ok: false; message: string; remainingBase: number } {
  if (candidate.stockId <= 0) {
    return { ok: false, message: "Select a stock batch first.", remainingBase: 0 };
  }

  const converted = convertSalesQuantityToBase(candidate, candidate.quantity);
  if (converted.error || converted.quantityNet == null) {
    return {
      ok: false,
      message: converted.error || "Unable to convert quantity for this unit.",
      remainingBase: 0,
    };
  }

  const exclude = excludeLineKey ?? candidate.key;
  const remainingBase = invoiceRemainingBaseForStock(
    lines,
    candidate.stockId,
    candidate.availableQty,
    exclude
  );

  if (converted.quantityNet > remainingBase) {
    const remainingSelected = invoiceRemainingInSelectedUnit(
      lines,
      candidate,
      exclude
    );
    return {
      ok: false,
      message: formatInvoiceStockInsufficientMessage(
        candidate,
        remainingSelected,
        remainingBase,
        unitName
      ),
      remainingBase,
    };
  }

  return { ok: true };
}

/** @deprecated Prefer checkInvoiceStockAllocation — single-row vs DB avail only. */
export function salesQuantityExceedsAvailable(
  line: Pick<SalesWorkspaceLine, "availableQty" | "quantity"> & SalesUnitConversionFields
): { exceeds: boolean; quantityNet: number | null; displayAvailable: number | null; error: string | null } {
  const converted = convertSalesQuantityToBase(line, line.quantity);
  if (converted.error || converted.quantityNet == null) {
    return {
      exceeds: true,
      quantityNet: converted.quantityNet,
      displayAvailable: displayAvailableQtyInSelectedUnit(line),
      error: converted.error,
    };
  }
  const displayAvailable = displayAvailableQtyInSelectedUnit(line);
  return {
    exceeds: converted.quantityNet > line.availableQty,
    quantityNet: converted.quantityNet,
    displayAvailable,
    error: null,
  };
}

export function formatSalesQuantityExceedsMessage(
  line: Pick<SalesWorkspaceLine, "itemName" | "itemCode" | "unitId" | "batchNo" | "stockId"> &
    Parameters<typeof salesQuantityExceedsAvailable>[0],
  unitName: string
): string {
  const check = salesQuantityExceedsAvailable(line);
  const avail =
    check.displayAvailable != null
      ? `${check.displayAvailable} ${unitName}`.trim()
      : `${line.availableQty} (base)`;
  const label = line.itemName?.trim() || line.itemCode?.trim() || "item";
  return `Quantity for ${label} exceeds available quantity (${avail}).`;
}

/**
 * Shared frontend guard for Payment + Save.
 * Validates sellable lines using invoice-local StockId allocation (base units).
 */
export function validateSalesQuantities(
  lines: SalesWorkspaceLine[],
  resolveUnitName: (unitId: number) => string = (id) => String(id)
): { ok: true } | { ok: false; message: string; lineKey: string } {
  for (const line of lines) {
    if (!isSellableSalesLine(line)) continue;
    if (line.unitId <= 0) {
      return {
        ok: false,
        message: `Select a unit for ${line.itemName || line.itemCode || "item"}.`,
        lineKey: line.key,
      };
    }
    if (line.qtyError) {
      return { ok: false, message: line.qtyError, lineKey: line.key };
    }
    const check = checkInvoiceStockAllocation(
      lines,
      line,
      resolveUnitName(line.unitId)
    );
    if (!check.ok) {
      return { ok: false, message: check.message, lineKey: line.key };
    }
  }
  return { ok: true };
}

export function emptyDiscountMode(): DiscountMode {
  return "";
}

export function createEmptySalesLine(): SalesWorkspaceLine {
  return {
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemCatalogId: 0,
    itemCode: "",
    itemName: "",
    itmNameAr: "",
    itmNameEn: "",
    searchText: "",
    stockId: 0,
    batchNo: "",
    expDate: null,
    storId: 0,
    availableQty: 0,
    unit1: null,
    unit2: null,
    unit3: null,
    unit1Unit2: null,
    unit1Unit3: null,
    itmMaxDiscPer: null,
    groupNameEn: "",
    groupNameAr: "",
    unitId: 0,
    quantity: 1,
    baseUnitSellPrice: 0,
    unitSellPrice: 0,
    priceQtyNet: 1,
    qtyError: null,
    discountMode: "",
    discountPercent: 0,
    discountValue: 0,
  };
}

export function createEmptyTab(seq: number, egyptTimeDisplay: string): SalesWorkspaceTab {
  return {
    clientId: `tab-${Date.now()}-${seq}`,
    label: `New Sale ${seq}`,
    sthId: null,
    saved: false,
    billTyp: null,
    egyptTimeDisplay,
    salesManPassword: "",
    salesManCode: "",
    salesManId: null,
    salesManName: "",
    customerSearch: "",
    customerCode: "",
    customerId: null,
    customerName: "",
    customerTel: "",
    customerAddress: "",
    lines: [createEmptySalesLine()],
    globalDiscountMode: "P",
    globalDiscountPercent: 0,
    globalDiscountValue: 0,
    deliveryEnabled: false,
    salesServiceId: null,
    serviceCost: 0,
    requiresDeliveryEmployee: false,
    deliverySearch: "",
    deliveryEmployeeId: null,
    deliveryCode: "",
    deliveryEmployeeName: "",
    salesKindId: null,
    payments: {},
  };
}
