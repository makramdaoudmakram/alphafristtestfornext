export type ExcelImportMode = "Insert" | "Update" | "Upsert" | "Delete";

export const EXCEL_IMPORT_MODES: ExcelImportMode[] = [
  "Insert",
  "Update",
  "Upsert",
  "Delete",
];

export const EXCEL_IMPORT_MODE_LABELS: Record<ExcelImportMode, string> = {
  Insert: "Insert — new records only",
  Update: "Update — existing records only",
  Upsert: "Insert or update",
  Delete: "Delete — by primary key only",
};

export function excelImportModeToApiValue(mode: ExcelImportMode): number {
  switch (mode) {
    case "Insert":
      return 0;
    case "Update":
      return 1;
    case "Upsert":
      return 2;
    case "Delete":
      return 3;
  }
}

export type ExcelPropertyMetadata = {
  name: string;
  clrType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isRequired: boolean;
  isNullable: boolean;
  isImportable: boolean;
  isDatabaseGenerated: boolean;
  maxLength?: number | null;
  foreignKeyPrincipalEntity?: string | null;
};

export type ExcelEntityMetadata = {
  entityName: string;
  displayName: string;
  primaryKey: string;
  identityKey: boolean;
  alternateKey?: string | null;
  excludedColumns: string[];
  lookupColumns: string[];
  useCreateMethod: boolean;
  useUpdateMethod: boolean;
  useDeleteMethod: boolean;
  properties: ExcelPropertyMetadata[];
};

export type ExcelTemplateRequest = {
  mode: ExcelImportMode;
  selectedColumns: string[];
};

export type ExcelTemplateDownload = {
  blob: Blob;
  fileName: string;
};

export type ExcelImportError = {
  rowNumber: number;
  columnName?: string | null;
  errorCode: string;
  message: string;
};

export type ExcelImportPreview = {
  totalRows: number;
  insertCount: number;
  updateCount: number;
  deleteCount: number;
  validRowCount: number;
  errorCount: number;
};

export type ExcelImportResult = {
  success: boolean;
  isPreview: boolean;
  entityName: string;
  mode: ExcelImportMode;
  importSessionId?: string | null;
  preview: ExcelImportPreview;
  inserted: number;
  updated: number;
  deleted: number;
  totalProcessed: number;
  errors: ExcelImportError[];
};

/** Row count at or above which commit runs as a background job with polling. */
export const EXCEL_IMPORT_ASYNC_ROW_THRESHOLD = 25;

export type ExcelImportJobStatusName =
  | "Queued"
  | "Running"
  | "Completed"
  | "Failed";

export type ExcelImportJobStatus = {
  importJobId: string;
  entityName: string;
  status: ExcelImportJobStatusName;
  progressPercent: number;
  processedRows: number;
  totalRows: number;
  message?: string | null;
  result?: ExcelImportResult | null;
};

export type ExcelImportCommitResponse =
  | { isAsync: false; result: ExcelImportResult }
  | { isAsync: true; importJobId: string };

export function excelImportJobStatusFromApiValue(
  value: number
): ExcelImportJobStatusName {
  switch (value) {
    case 1:
      return "Running";
    case 2:
      return "Completed";
    case 3:
      return "Failed";
    default:
      return "Queued";
  }
}

export function excelImportModeFromApiValue(value: number): ExcelImportMode {
  switch (value) {
    case 1:
      return "Update";
    case 2:
      return "Upsert";
    case 3:
      return "Delete";
    default:
      return "Insert";
  }
}
