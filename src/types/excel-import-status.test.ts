import { describe, expect, it } from "vitest";
import { excelImportJobStatusFromApiValue } from "@/types/excel";
import {
  ExcelImportJobPollParseError,
  extractExcelImportJobStatusBody,
  normalizeExcelImportJobStatus,
} from "@/lib/api-client";

describe("excelImportJobStatusFromApiValue", () => {
  it("maps backend enum values", () => {
    expect(excelImportJobStatusFromApiValue(0)).toBe("Queued");
    expect(excelImportJobStatusFromApiValue(1)).toBe("Running");
    expect(excelImportJobStatusFromApiValue(2)).toBe("Completed");
    expect(excelImportJobStatusFromApiValue(3)).toBe("Failed");
    expect(excelImportJobStatusFromApiValue(4)).toBe("Interrupted");
  });
});

describe("extractExcelImportJobStatusBody", () => {
  it("uses root payload for non-admin polls", () => {
    const body = extractExcelImportJobStatusBody({
      importJobId: "abc",
      status: 1,
      Status: 1,
    });
    expect(body).toBe(body);
    expect(body.importJobId).toBe("abc");
  });

  it("unwraps nested job for admin polls", () => {
    const body = extractExcelImportJobStatusBody({
      job: {
        importJobId: "nested",
        status: 2,
      },
      diagnostics: { failureCategory: 0 },
    });
    expect(body.importJobId).toBe("nested");
    expect(body.status).toBe(2);
  });

  it("unwraps PascalCase Job", () => {
    const body = extractExcelImportJobStatusBody({
      Job: {
        ImportJobId: "pascal",
        Status: 4,
      },
    });
    expect(body.ImportJobId).toBe("pascal");
    expect(body.Status).toBe(4);
  });
});

describe("normalizeExcelImportJobStatus", () => {
  it("normalizes flat non-admin job payload", () => {
    const status = normalizeExcelImportJobStatus({
      importJobId: "abc",
      entityName: "ItemCatalog",
      status: 1,
      progressPercent: 50,
      processedRows: 5,
      totalRows: 10,
      message: "Processing row 5…",
    });
    expect(status.importJobId).toBe("abc");
    expect(status.status).toBe("Running");
    expect(status.progressPercent).toBe(50);
  });

  it("normalizes nested admin job payload", () => {
    const body = extractExcelImportJobStatusBody({
      Job: {
        ImportJobId: "nested",
        EntityName: "ItemCatalog",
        Status: 2,
        ProgressPercent: 100,
        ProcessedRows: 10,
        TotalRows: 10,
        Message: "Import completed successfully.",
      },
      Diagnostics: { failureCategory: 0 },
    });
    const status = normalizeExcelImportJobStatus(body as Record<string, unknown>);
    expect(status.importJobId).toBe("nested");
    expect(status.status).toBe("Completed");
  });

  it("throws instead of fabricating a Queued job on malformed response", () => {
    expect(() => normalizeExcelImportJobStatus({ status: 99 })).toThrow(
      ExcelImportJobPollParseError
    );
    expect(() => normalizeExcelImportJobStatus({ importJobId: "x" })).toThrow(
      ExcelImportJobPollParseError
    );
  });
});