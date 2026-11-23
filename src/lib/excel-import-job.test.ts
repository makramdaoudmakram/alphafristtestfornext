import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getExcelImportJobStatus = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  getExcelImportJobStatus,
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
});