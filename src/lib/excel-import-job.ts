import { EXCEL_IMPORT_JOB_MAX_WAIT_MS } from "@/types/excel";
import type { ExcelImportJobStatus, ExcelImportResult } from "@/types/excel";
import { ApiError, getExcelImportJobStatus } from "@/lib/api-client";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class ExcelImportJobWaitTimeoutError extends Error {
  readonly importJobId: string;
  readonly lastStatus: ExcelImportJobStatus | null;

  constructor(
    importJobId: string,
    lastStatus: ExcelImportJobStatus | null,
    maxWaitMs: number
  ) {
    super(
      `The import is still running on the server after ${Math.round(
        maxWaitMs / 60_000
      )} minutes. The import may still succeed — use Check status to see the latest progress.`
    );
    this.name = "ExcelImportJobWaitTimeoutError";
    this.importJobId = importJobId;
    this.lastStatus = lastStatus;
  }
}

export async function waitForExcelImportJob(
  entityName: string,
  importJobId: string,
  token: string,
  onProgress?: (status: ExcelImportJobStatus) => void,
  options?: { pollIntervalMs?: number; maxWaitMs?: number }
): Promise<ExcelImportResult> {
  const pollIntervalMs = options?.pollIntervalMs ?? 800;
  const maxWaitMs = options?.maxWaitMs ?? EXCEL_IMPORT_JOB_MAX_WAIT_MS;
  const startedAt = Date.now();
  let lastStatus: ExcelImportJobStatus | null = null;

  while (true) {
    if (Date.now() - startedAt > maxWaitMs) {
      throw new ExcelImportJobWaitTimeoutError(
        importJobId,
        lastStatus,
        maxWaitMs
      );
    }

    const status = await getExcelImportJobStatus(entityName, importJobId, token);
    lastStatus = status;
    onProgress?.(status);

    if (status.status === "Completed" || status.status === "Failed") {
      if (!status.result) {
        throw new ApiError(
          500,
          status.message || "Import job finished without a result payload."
        );
      }

      return status.result;
    }

    await delay(pollIntervalMs);
  }
}