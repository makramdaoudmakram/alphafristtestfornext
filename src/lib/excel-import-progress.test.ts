import { describe, expect, it } from "vitest";
import {
  excelImportDisplayPercent,
  excelImportIsFinalizing,
} from "@/lib/excel-import-progress";
import type { ExcelImportJobStatus } from "@/types/excel";

function job(
  partial: Partial<ExcelImportJobStatus>
): ExcelImportJobStatus {
  return {
    importJobId: "job",
    entityName: "ItemCatalog",
    status: "Running",
    progressPercent: 0,
    processedRows: 0,
    totalRows: 10,
    message: null,
    result: null,
    ...partial,
  };
}

describe("excelImportDisplayPercent", () => {
  it("caps Running at 99% even when API reports 100", () => {
    expect(
      excelImportDisplayPercent(
        job({ status: "Running", progressPercent: 100, processedRows: 10 })
      )
    ).toBe(99);
  });

  it("shows 100% only when Completed", () => {
    expect(
      excelImportDisplayPercent(job({ status: "Completed", progressPercent: 100 }))
    ).toBe(100);
  });

  it("shows 99% while Running with all rows processed", () => {
    expect(
      excelImportDisplayPercent(
        job({ status: "Running", progressPercent: 100, processedRows: 10, totalRows: 10 })
      )
    ).toBe(99);
    expect(
      excelImportIsFinalizing(
        job({ status: "Running", processedRows: 10, totalRows: 10 })
      )
    ).toBe(true);
  });
});