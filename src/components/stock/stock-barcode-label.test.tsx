import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import JsBarcode from "jsbarcode";
import { StockBarcodeLabelView } from "@/components/stock/stock-barcode-label";
import { buildThermalBarcodePlanForLabel } from "@/lib/stock-barcode-label-format";
import type { StockBarcodeLabel } from "@/types/stock";

vi.mock("jsbarcode", () => ({
  default: vi.fn(
    (
      node: SVGSVGElement,
      value: string,
      options: {
        margin: number;
        width: number;
        height: number;
        fontSize: number;
        textMargin: number;
      }
    ) => {
      const modules = 35 + value.length * 11;
      const w = options.margin * 2 + modules * options.width;
      const h = options.height + options.fontSize + options.textMargin * 2;
      node.setAttribute("width", String(w));
      node.setAttribute("height", String(h));
    }
  ),
}));

const baseLabel: StockBarcodeLabel = {
  stockId: 1,
  batchNo: "BATCH-001",
  barcodeValue: "BATCH-001",
  itemCode: "34740",
  itemNameAr: "اسم",
  itemNameEn: "AUGMENTIN 1GM",
  storeId: 1,
  expDate: "2030-10-01",
  qty: 1,
  salesPrice: 210,
  allowPrintBarcode: true,
};

function thermalMarkup(container: HTMLElement) {
  return container.querySelector(".stock-barcode-label--thermal")?.innerHTML ?? "";
}

describe("StockBarcodeLabelView thermal layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows product name, expiry, price, and centered thermal barcode SVG", async () => {
    render(<StockBarcodeLabelView label={baseLabel} thermalPrint />);

    expect(screen.getByTestId("thermal-product-name")).toHaveTextContent(
      "AUGMENTIN 1GM"
    );
    expect(screen.getByTestId("thermal-expiry")).toHaveTextContent("10/2030");
    expect(screen.getByTestId("thermal-sales-price")).toHaveTextContent(
      "210.00"
    );
    const wrap = screen.getByTestId("thermal-barcode-wrap");
    expect(wrap).toBeTruthy();

    const plan = buildThermalBarcodePlanForLabel(baseLabel);
    await waitFor(() => {
      expect(JsBarcode).toHaveBeenCalledWith(
        expect.any(SVGSVGElement),
        "BATCH-001",
        plan.jsOptions
      );
    });

    const svg = wrap.querySelector("svg");
    expect(svg?.getAttribute("width")).toMatch(/mm$/);
    expect(svg?.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
    expect(svg?.dataset.moduleWidthDots).toBe(String(plan.moduleWidthDots));
    expect(svg?.dataset.encodedValue).toBe("BATCH-001");
  });

  it("renders Arabic product name when English is empty", () => {
    render(
      <StockBarcodeLabelView
        label={{
          ...baseLabel,
          itemNameEn: null,
          itemNameAr: "أموكسيسيلين",
        }}
        thermalPrint
      />
    );
    expect(screen.getByTestId("thermal-product-name")).toHaveTextContent(
      "أموكسيسيلين"
    );
  });

  it("shows sales price on thermal labels even when allowPrintBarcode is false", () => {
    render(
      <StockBarcodeLabelView
        label={{ ...baseLabel, allowPrintBarcode: false, salesPrice: 99.5 }}
        thermalPrint
      />
    );
    expect(screen.getByTestId("thermal-sales-price")).toHaveTextContent("99.50");
  });

  it("leaves expiry empty when batch expiry is missing", () => {
    render(
      <StockBarcodeLabelView
        label={{ ...baseLabel, expDate: null }}
        thermalPrint
      />
    );
    expect(screen.getByTestId("thermal-expiry")).toHaveTextContent("");
  });

  it("renders identical thermal output for purchase and pharm receive payloads", () => {
    const purchaseLabel: StockBarcodeLabel = {
      ...baseLabel,
      stockId: 100,
      batchNo: "P-BATCH",
      barcodeValue: "P-BATCH",
    };
    const pharmLabel: StockBarcodeLabel = {
      ...baseLabel,
      stockId: 200,
      batchNo: "P-BATCH",
      barcodeValue: "P-BATCH",
      itemNameEn: "AUGMENTIN 1GM",
      expDate: "2030-10-01",
      salesPrice: 210,
    };

    const { container: purchaseContainer } = render(
      <StockBarcodeLabelView label={purchaseLabel} thermalPrint />
    );
    const purchaseHtml = thermalMarkup(purchaseContainer);

    const { container: pharmContainer } = render(
      <StockBarcodeLabelView label={pharmLabel} thermalPrint />
    );
    const pharmHtml = thermalMarkup(pharmContainer);

    const normalize = (html: string) =>
      html
        .replace(/P-BATCH|PH-BATCH/g, "X")
        .replace(/width="[\d.]+mm"/g, 'width="W"')
        .replace(/height="[\d.]+mm"/g, 'height="H"')
        .replace(/data-barcode-print-width-mm="[\d.]+"/g, "")
        .replace(/data-module-width-dots="[\d.]+"/g, 'data-module-width-dots="M"')
        .replace(/viewBox="[^"]+"/g, 'viewBox="0 0 0 0"')
        .replace(/data-bar-modules="[\d]+"/g, 'data-bar-modules="B"')
        .replace(/style="[^"]*"/g, "");

    expect(normalize(purchaseHtml)).toBe(normalize(pharmHtml));
  });
});
