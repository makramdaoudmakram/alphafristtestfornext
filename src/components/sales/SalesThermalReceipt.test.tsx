import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SalesThermalReceipt,
  receiptPrintCss,
} from "@/components/sales/SalesThermalReceipt";
import type { SalesReceipt } from "@/types/sales-receipt";

function makeReceipt(overrides: Partial<SalesReceipt> = {}): SalesReceipt {
  return {
    sthId: 4801,
    billTyp: 1,
    paymentStatus: "Paid / Payment Finalized",
    invoiceDate: "2026-10-15 11:30:00",
    pharmacyName: "Branch Pharmacy",
    pharmacyTel: "02-555-0101",
    pharmacyAddress: "12 Street, Cairo",
    customerName: "Ahmed Ali",
    customerTel: "0100-111-2222",
    totalBill: 130,
    totalDiscount: 15,
    serviceCost: null,
    finalPayableAmount: 115,
    paidAmount: 100,
    remainingAmount: 15,
    changeAmount: 0,
    payments: [
      {
        paymentMethodId: 10,
        paymentName: "Cash",
        amount: 100,
        accountCode: "ACC-CASH",
      },
    ],
    lines: [
      {
        lineNo: 1,
        itemName: "Panadol",
        itemCode: "P-1",
        quantity: 2,
        unitName: "Strip",
        unitPrice: 50,
        lineDiscount: 10,
        lineNet: 90,
      },
      {
        lineNo: 2,
        itemName: "بردة medicine",
        itemCode: null,
        quantity: 1,
        unitName: null,
        unitPrice: 40,
        lineDiscount: 0,
        lineNet: 40,
      },
    ],
    ...overrides,
  };
}

function sheetText(): string {
  return document.querySelector(".receipt-sheet")?.textContent ?? "";
}

beforeEach(() => {
  vi.spyOn(window, "print").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("receiptPrintCss", () => {
  it("targets the 80mm thermal paper width", () => {
    expect(receiptPrintCss(80)).toContain("size: 80mm auto");
    expect(receiptPrintCss(80)).toContain("width: 80mm");
  });

  it("targets the 58mm thermal paper width", () => {
    expect(receiptPrintCss(58)).toContain("size: 58mm auto");
    expect(receiptPrintCss(58)).toContain("width: 58mm");
  });

  it("hides everything outside the receipt root while printing", () => {
    expect(receiptPrintCss(80)).toContain(
      "body > *:not(#sales-receipt-print-root)"
    );
  });
});

describe("SalesThermalReceipt", () => {
  it("opens the print dialog once mounted and closes on afterprint", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const onClose = vi.fn();
    render(<SalesThermalReceipt receipt={makeReceipt()} width={80} onClose={onClose} />);

    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));

    fireEvent(window as unknown as Element, new Event("afterprint"));
    expect(onClose).toHaveBeenCalled();
  });

  it("marks the sheet with the selected paper width", () => {
    render(<SalesThermalReceipt receipt={makeReceipt()} width={58} onClose={vi.fn()} />);
    expect(
      document.getElementById("sales-receipt-print-root")?.getAttribute("data-paper-width")
    ).toBe("58");
  });

  it("prints invoice number, date, pharmacy and customer from persisted data", () => {
    render(<SalesThermalReceipt receipt={makeReceipt()} width={80} onClose={vi.fn()} />);

    const text = sheetText();
    expect(text).toContain("Invoice No");
    expect(text).toContain("4801");
    expect(text).toContain("2026-10-15 11:30:00");
    expect(text).toContain("Branch Pharmacy");
    expect(text).toContain("02-555-0101");
    expect(text).toContain("Ahmed Ali");
  });

  it("renders item quantities, sales unit names, prices and discounts without clipping names", () => {
    render(<SalesThermalReceipt receipt={makeReceipt()} width={80} onClose={vi.fn()} />);

    const text = sheetText();
    expect(text).toContain("Panadol");
    expect(text).toContain("2 × Strip × 50.00");
    expect(text).toContain("90.00");
    expect(text).toContain("-10.00");
    expect(text).toContain("بردة medicine");
    // Lines with no resolvable unit keep the previous qty × price format.
    expect(text).toContain("1 × 40.00");
  });

  it("shows total payable, paid amount, remaining balance and omits change at zero", () => {
    render(<SalesThermalReceipt receipt={makeReceipt()} width={80} onClose={vi.fn()} />);

    const text = sheetText();
    expect(text).toContain("Total payable");
    expect(text).toContain("115.00");
    expect(text).toContain("Paid");
    expect(text).toContain("100.00");
    expect(text).toContain("Balance remaining");
    expect(text).toContain("Cash");
    expect(text).not.toContain("Change");
  });

  it("shows change when the server reports an overpayment", () => {
    render(
      <SalesThermalReceipt
        receipt={makeReceipt({
          paidAmount: 130,
          remainingAmount: 0,
          changeAmount: 15,
        })}
        width={80}
        onClose={vi.fn()}
      />
    );

    const text = sheetText();
    expect(text).toContain("Change");
    expect(text).toContain("15.00");
  });

  it("never prints VAT or tax", () => {
    render(<SalesThermalReceipt receipt={makeReceipt()} width={80} onClose={vi.fn()} />);

    const text = sheetText();
    expect(text).not.toMatch(/vat/i);
    expect(text).not.toMatch(/tax/i);
  });

  it("omits missing customer and date instead of inventing values", () => {
    render(
      <SalesThermalReceipt
        receipt={makeReceipt({
          invoiceDate: null,
          customerName: null,
          customerTel: null,
        })}
        width={58}
        onClose={vi.fn()}
      />
    );

    const text = sheetText();
    expect(text).not.toContain("Customer");
    expect(text).not.toContain("Date");
  });

  it("closes when the Close button is pressed", () => {
    vi.spyOn(window, "print").mockImplementation(() => {});
    const onClose = vi.fn();
    render(<SalesThermalReceipt receipt={makeReceipt()} width={80} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
