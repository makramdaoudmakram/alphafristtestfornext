import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getExcelImportJobStatus = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  getExcelImportJobStatus,
  ExcelImportJobPollParseError: class ExcelImportJobPollParseError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ExcelImportJobPollParseError";
    }
  },
  ApiError: class ApiError extends Error {
    constructor(
      readonly status: number,
      message: string
    ) {
      super(message);
      this.name = "ApiError";
    }
  },
}));

import {
  ExcelImportJobWaitTimeoutError,
  waitForExcelImportJob,
} from "@/lib/excel-import-job";

describe("waitForExcelImportJob", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getExcelImportJobStatus.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("times out without implying the import failed", async () => {
    getExcelImportJobStatus.mockResolvedValue({
      importJobId: "job-1",
      entityName: "ItemCatalog",
      status: "Running",
      progressPercent: 10,
      processedRows: 5,
      totalRows: 100,
      message: "Processing row 5…",
      result: null,
    });

    const pending = waitForExcelImportJob(
      "ItemCatalog",
      "job-1",
      "token",
      undefined,
      {
        maxWaitMs: 2000,
        pollIntervalMs: 500,
      }
    );

    const assertion = pending.then(
      () => {
        throw new Error("expected timeout");
      },
      (error: unknown) => {
        expect(error).toBeInstanceOf(ExcelImportJobWaitTimeoutError);
        expect(error).toMatchObject({ importJobId: "job-1" });
      }
    );

    await vi.runAllTimersAsync();
    await assertion;
  });

  it("stops polling when status is Interrupted", async () => {
    getExcelImportJobStatus.mockResolvedValue({
      importJobId: "job-2",
      entityName: "ItemCatalog",
      status: "Interrupted",
      progressPercent: 80,
      processedRows: 80,
      totalRows: 100,
      message: "Import was interrupted.",
      result: null,
    });

    await expect(
      waitForExcelImportJob("ItemCatalog", "job-2", "token", undefined, {
        pollIntervalMs: 100,
        maxWaitMs: 1000,
      })
    ).rejects.toMatchObject({ name: "ExcelImportJobInterruptedError" });
  });

  it("retries transient poll errors without marking the job complete", async () => {
    getExcelImportJobStatus
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        importJobId: "job-retry",
        entityName: "ItemCatalog",
        status: "Running",
        progressPercent: 20,
        processedRows: 2,
        totalRows: 10,
        message: "Processing…",
        result: null,
      })
      .mockResolvedValue({
        importJobId: "job-retry",
        entityName: "ItemCatalog",
        status: "Completed",
        progressPercent: 100,
        processedRows: 10,
        totalRows: 10,
        message: "Import completed successfully.",
        result: {
          success: true,
          isPreview: false,
          entityName: "ItemCatalog",
          mode: "Update",
          inserted: 0,
          updated: 10,
          deleted: 0,
          totalProcessed: 10,
          errors: [],
          preview: {
            totalRows: 10,
            insertCount: 0,
            updateCount: 10,
            deleteCount: 0,
            validRowCount: 10,
            errorCount: 0,
          },
        },
      });

    const pending = waitForExcelImportJob(
      "ItemCatalog",
      "job-retry",
      "token",
      undefined,
      { pollIntervalMs: 100, maxWaitMs: 5000 }
    );

    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.success).toBe(true);
    expect(getExcelImportJobStatus).toHaveBeenCalledTimes(3);
  });

  it("stops polling on Completed", async () => {
    getExcelImportJobStatus.mockResolvedValue({
      importJobId: "job-3",
      entityName: "ItemCatalog",
      status: "Completed",
      progressPercent: 100,
      processedRows: 10,
      totalRows: 10,
      message: "Import completed successfully.",
      result: {
        success: true,
        isPreview: false,
        entityName: "ItemCatalog",
        mode: "Update",
        inserted: 0,
        updated: 10,
        deleted: 0,
        totalProcessed: 10,
        errors: [],
        preview: {
          totalRows: 10,
          insertCount: 0,
          updateCount: 10,
          deleteCount: 0,
          validRowCount: 10,
          errorCount: 0,
        },
      },
    });

    const result = await waitForExcelImportJob(
      "ItemCatalog",
      "job-3",
      "token",
      undefined,
      { pollIntervalMs: 100, maxWaitMs: 1000 }
    );

    expect(result.success).toBe(true);
    expect(getExcelImportJobStatus).toHaveBeenCalledTimes(1);
  });
});