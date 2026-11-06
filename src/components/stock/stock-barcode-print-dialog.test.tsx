import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StockBarcodePrintDialog } from "@/components/stock/stock-barcode-print-dialog";
import type { StockBarcodeLabel } from "@/types/stock";
import { BIXOLON_D22_MEDIA_HEIGHT_MM } from "@/lib/stock-barcode-bixolon-layout";

const sampleLabel: StockBarcodeLabel = {
  stockId: 1,
  batchNo: "B001",
  barcodeValue: "B001",
  itemCode: "ITM1",
  itemNameAr: null,
  itemNameEn: "Item One",
  storeId: 1,
  expDate: "2027-01-15",
  qty: 1,
  salesPrice: 10,
  allowPrintBarcode: true,
};

describe("StockBarcodePrintDialog", () => {
  beforeEach(() => {
    vi.spyOn(window, "print").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows Print Bixolon and Print Zebra actions", () => {
    render(
      <StockBarcodePrintDialog
        open
        onOpenChange={() => undefined}
        labels={[sampleLabel]}
      />
    );

    expect(
      screen.getByRole("button", { name: /print bixolon/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /print zebra/i })
    ).toBeInTheDocument();
  });

  it("groups Bixolon print output into 26 mm media blocks", async () => {
    vi.useFakeTimers();
    const labels = [
      { ...sampleLabel, stockId: 1, batchNo: "A" },
      { ...sampleLabel, stockId: 2, batchNo: "B" },
      { ...sampleLabel, stockId: 3, batchNo: "C" },
      { ...sampleLabel, stockId: 4, batchNo: "D" },
    ];
    render(
      <StockBarcodePrintDialog
        open
        onOpenChange={() => undefined}
        labels={labels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /print bixolon/i }));
    await vi.advanceTimersByTimeAsync(400);

    const root = document.getElementById("stock-barcode-print-root");
    expect(root).toBeTruthy();
    const mediaBlocks = root!.querySelectorAll(".bixolon-media-pair");
    expect(mediaBlocks).toHaveLength(2);
    expect(mediaBlocks[0].querySelectorAll(".stock-barcode-label--thermal")).toHaveLength(
      2
    );
    expect(mediaBlocks[1].querySelectorAll(".stock-barcode-label--thermal")).toHaveLength(
      2
    );
    expect(mediaBlocks[0]).toHaveAttribute(
      "data-bixolon-media-height-mm",
      String(BIXOLON_D22_MEDIA_HEIGHT_MM)
    );
    vi.useRealTimers();
  });

  it("invokes window.print after Print Bixolon", async () => {
    vi.useFakeTimers();
    render(
      <StockBarcodePrintDialog
        open
        onOpenChange={() => undefined}
        labels={[sampleLabel]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /print bixolon/i }));
    await vi.advanceTimersByTimeAsync(400);

    expect(window.print).toHaveBeenCalled();
    expect(document.getElementById("stock-barcode-print-root")).toBeTruthy();
    vi.useRealTimers();
  });

  it("mounts Zebra print root with flat labels", async () => {
    vi.useFakeTimers();
    render(
      <StockBarcodePrintDialog
        open
        onOpenChange={() => undefined}
        labels={[sampleLabel, { ...sampleLabel, stockId: 2 }]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /print zebra/i }));
    await vi.advanceTimersByTimeAsync(400);

    expect(window.print).toHaveBeenCalled();
    const root = document.getElementById("stock-barcode-zebra-print-root");
    expect(root).toBeTruthy();
    expect(root!.querySelector(".bixolon-media-pair")).toBeNull();
    expect(root!.querySelectorAll(".stock-barcode-label--thermal")).toHaveLength(
      2
    );
    vi.useRealTimers();
  });
});
