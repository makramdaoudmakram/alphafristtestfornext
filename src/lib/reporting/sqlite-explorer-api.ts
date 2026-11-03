import { API_BASE_URL } from "@/lib/api-config";

export type SqliteExplorerDatabaseId = "Movement" | "Audit";

export type SqliteExplorerOverview = {
  databaseId: string;
  displayName: string;
  fileSizeBytes: number;
  tableCount: number;
  indexCount: number;
  isAvailable: boolean;
  readStatus: string;
  errorMessage?: string | null;
};

export type SqliteExplorerTableSummary = {
  tableName: string;
  rowCount: number | null;
  columnCount: number;
  indexCount: number;
};

export type SqliteExplorerColumn = {
  name: string;
  dataType: string;
  notNull: boolean;
  primaryKeyPosition: number;
  defaultValue?: string | null;
};

export type SqliteExplorerForeignKey = {
  id: number;
  sequence: number;
  referencedTable: string;
  fromColumn: string;
  toColumn: string;
  onUpdate: string;
  onDelete: string;
};

export type SqliteExplorerStructure = {
  tableName: string;
  columns: SqliteExplorerColumn[];
  foreignKeys: SqliteExplorerForeignKey[];
};

export type SqliteExplorerIndex = {
  indexName: string;
  tableName: string;
  columns: string[];
  isUnique: boolean;
  origin: string;
};

export type SqliteExplorerTableData = {
  tableName: string;
  columns: SqliteExplorerColumn[];
  rows: Record<string, unknown>[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

function explorerUrl(path: string, query?: Record<string, string | number | boolean | undefined | null>) {
  const normalized = path.replace(/^\//, "");
  let url = `${API_BASE_URL}/Reporting/sqlite-explorer/${normalized}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      params.set(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return `HTTP ${response.status}`;
  try {
    const body = JSON.parse(text) as { message?: string };
    return body.message || text.slice(0, 200);
  } catch {
    return text.slice(0, 200);
  }
}

async function fetchJson<T>(token: string, path: string, query?: Record<string, string | number | boolean | undefined | null>): Promise<T> {
  const response = await fetch(explorerUrl(path, query), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
}

export function fetchSqliteExplorerOverview(token: string, database: SqliteExplorerDatabaseId) {
  return fetchJson<SqliteExplorerOverview>(token, "overview", { database });
}

export function fetchSqliteExplorerTables(token: string, database: SqliteExplorerDatabaseId) {
  return fetchJson<Array<Record<string, unknown>>>(token, "tables", { database }).then((rows) =>
    rows.map(normalizeTableSummary).filter((row) => row.tableName.length > 0)
  );
}

function normalizeTableSummary(raw: Record<string, unknown>): SqliteExplorerTableSummary {
  const rowCountRaw = raw.rowCount ?? raw.RowCount;
  return {
    tableName: String(raw.tableName ?? raw.TableName ?? ""),
    rowCount:
      rowCountRaw === null || rowCountRaw === undefined ? null : Number(rowCountRaw),
    columnCount: Number(raw.columnCount ?? raw.ColumnCount ?? 0),
    indexCount: Number(raw.indexCount ?? raw.IndexCount ?? 0),
  };
}

export function fetchSqliteExplorerStructure(
  token: string,
  database: SqliteExplorerDatabaseId,
  tableName: string
) {
  return fetchJson<SqliteExplorerStructure>(token, `tables/${encodeURIComponent(tableName)}/structure`, {
    database,
  });
}

export function fetchSqliteExplorerIndexes(
  token: string,
  database: SqliteExplorerDatabaseId,
  tableName: string
) {
  return fetchJson<SqliteExplorerIndex[]>(token, `tables/${encodeURIComponent(tableName)}/indexes`, {
    database,
  });
}

export function fetchSqliteExplorerTableData(
  token: string,
  database: SqliteExplorerDatabaseId,
  tableName: string,
  options: {
    pageNumber?: number;
    pageSize?: number;
    sortColumn?: string;
    sortDescending?: boolean;
    search?: string;
  }
) {
  return fetchJson<SqliteExplorerTableData>(token, `tables/${encodeURIComponent(tableName)}/data`, {
    database,
    pageNumber: options.pageNumber ?? 1,
    pageSize: options.pageSize ?? 50,
    sortColumn: options.sortColumn,
    sortDescending: options.sortDescending ?? false,
    search: options.search,
  });
}
