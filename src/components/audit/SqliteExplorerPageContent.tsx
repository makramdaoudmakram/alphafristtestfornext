"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { DiagnosticsAdminGuard } from "@/components/diagnostics/DiagnosticsAdminGuard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchSqliteExplorerIndexes,
  fetchSqliteExplorerOverview,
  fetchSqliteExplorerStructure,
  fetchSqliteExplorerTableData,
  fetchSqliteExplorerTables,
  type SqliteExplorerDatabaseId,
  type SqliteExplorerIndex,
  type SqliteExplorerOverview,
  type SqliteExplorerStructure,
  type SqliteExplorerTableData,
  type SqliteExplorerTableSummary,
} from "@/lib/reporting/sqlite-explorer-api";

const DATABASES: { id: SqliteExplorerDatabaseId; label: string; labelAr: string }[] = [
  { id: "Movement", label: "AlfaMovement.db", labelAr: "حركة المخزون والتقارير" },
  { id: "Audit", label: "AlfaAudit.db", labelAr: "سجل التدقيق" },
];

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatCell(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function SqliteExplorerPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [database, setDatabase] = useState<SqliteExplorerDatabaseId>("Movement");
  const [overview, setOverview] = useState<SqliteExplorerOverview | null>(null);
  const [tables, setTables] = useState<SqliteExplorerTableSummary[]>([]);
  const [tableFilter, setTableFilter] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [structure, setStructure] = useState<SqliteExplorerStructure | null>(null);
  const [indexes, setIndexes] = useState<SqliteExplorerIndex[]>([]);
  const [data, setData] = useState<SqliteExplorerTableData | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortColumn, setSortColumn] = useState<string | undefined>();
  const [sortDescending, setSortDescending] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("structure");
  const detailRequestRef = useRef(0);
  const tablesRequestRef = useRef(0);

  const tableNames = useMemo(
    () => new Set(tables.map((t) => t.tableName)),
    [tables]
  );

  const handleDatabaseChange = (value: SqliteExplorerDatabaseId) => {
    if (value === database) return;
    detailRequestRef.current += 1;
    tablesRequestRef.current += 1;
    setDatabase(value);
    setSelectedTable(null);
    setStructure(null);
    setIndexes([]);
    setData(null);
    setError(null);
    setTableFilter("");
  };

  const filteredTables = useMemo(() => {
    const term = tableFilter.trim().toLowerCase();
    if (!term) return tables;
    return tables.filter((t) => t.tableName.toLowerCase().includes(term));
  }, [tables, tableFilter]);

  const loadOverviewAndTables = useCallback(async () => {
    if (!token) {
      setError("Sign in is required.");
      return;
    }
    const requestId = ++tablesRequestRef.current;
    setLoadingOverview(true);
    setLoadingTables(true);
    setError(null);
    try {
      const [overviewResult, tablesResult] = await Promise.all([
        fetchSqliteExplorerOverview(token, database),
        fetchSqliteExplorerTables(token, database),
      ]);
      if (requestId !== tablesRequestRef.current) return;
      setOverview(overviewResult);
      setTables(tablesResult);
      setSelectedTable((current) => {
        if (current && tablesResult.some((t) => t.tableName === current)) return current;
        return tablesResult[0]?.tableName ?? null;
      });
    } catch (err) {
      if (requestId !== tablesRequestRef.current) return;
      const message = err instanceof Error ? err.message : "Failed to load database metadata.";
      setError(message);
      toast.error(message);
    } finally {
      if (requestId === tablesRequestRef.current) {
        setLoadingOverview(false);
        setLoadingTables(false);
      }
    }
  }, [database, token]);

  const loadTableDetails = useCallback(async () => {
    if (!token || !selectedTable) return;
    if (tables.length > 0 && !tableNames.has(selectedTable)) return;

    const requestId = ++detailRequestRef.current;
    const db = database;
    const table = selectedTable;
    setLoadingDetails(true);
    setError(null);
    setStructure(null);
    setIndexes([]);
    setData(null);
    try {
      const [structureResult, indexesResult, dataResult] = await Promise.all([
        fetchSqliteExplorerStructure(token, db, table),
        fetchSqliteExplorerIndexes(token, db, table),
        fetchSqliteExplorerTableData(token, db, table, {
          pageNumber,
          pageSize,
          sortColumn,
          sortDescending,
          search: search.trim() || undefined,
        }),
      ]);
      if (requestId !== detailRequestRef.current) return;
      setStructure(structureResult);
      setIndexes(indexesResult);
      setData(dataResult);
    } catch (err) {
      if (requestId !== detailRequestRef.current) return;
      const message = err instanceof Error ? err.message : "Failed to load table details.";
      setError(message);
      toast.error(message);
    } finally {
      if (requestId === detailRequestRef.current) {
        setLoadingDetails(false);
      }
    }
  }, [
    database,
    pageNumber,
    pageSize,
    search,
    selectedTable,
    sortColumn,
    sortDescending,
    tableNames,
    tables.length,
    token,
  ]);

  useEffect(() => {
    void loadOverviewAndTables();
  }, [loadOverviewAndTables]);

  useEffect(() => {
    setPageNumber(1);
    setSortColumn(undefined);
    setSortDescending(false);
    setSearch("");
    setActiveTab("structure");
  }, [selectedTable, database]);

  useEffect(() => {
    void loadTableDetails();
  }, [loadTableDetails]);

  const dbMeta = DATABASES.find((d) => d.id === database);

  return (
    <DiagnosticsAdminGuard>
      <div className="space-y-6 p-4 md:p-6" dir="rtl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="text-start">
            <h1 className="text-2xl font-semibold tracking-tight">
              SQLite Data Explorer
            </h1>
            <p className="text-muted-foreground text-sm">
              أداة قراءة فقط لفحص قواعد SQLite قبل النشر
            </p>
            <p className="text-muted-foreground mt-1 text-sm" dir="ltr">
              Read-only inspection of reporting SQLite databases on this API host.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={database}
              onValueChange={(value) => handleDatabaseChange(value as SqliteExplorerDatabaseId)}
            >
              <SelectTrigger className="w-[220px]" dir="ltr">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATABASES.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              disabled={loadingOverview || loadingTables || !token}
              onClick={() => void loadOverviewAndTables()}
            >
              <RefreshCw
                className={`ml-2 h-4 w-4 ${loadingOverview || loadingTables ? "animate-spin" : ""}`}
              />
              تحديث
            </Button>
          </div>
        </div>

        {error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive text-base">Error</CardTitle>
              <CardDescription dir="ltr">{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>حجم القاعدة</CardDescription>
              <CardTitle className="text-lg" dir="ltr">
                {overview ? formatBytes(overview.fileSizeBytes) : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>الجداول</CardDescription>
              <CardTitle className="text-lg">{overview?.tableCount ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>الفهارس</CardDescription>
              <CardTitle className="text-lg">{overview?.indexCount ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>الحالة</CardDescription>
              <CardTitle className="text-lg" dir="ltr">
                {overview?.readStatus ?? "—"}
              </CardTitle>
              <CardDescription dir="ltr">{dbMeta?.label}</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tables</CardTitle>
              <CardDescription>اختر جدولاً للفحص</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="text-muted-foreground absolute right-2 top-2.5 h-4 w-4" />
                <Input
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  placeholder="بحث عن جدول"
                  className="pr-8"
                />
              </div>
              <div className="max-h-[520px] overflow-auto rounded-md border">
                {loadingTables ? (
                  <p className="text-muted-foreground p-3 text-sm">Loading tables…</p>
                ) : filteredTables.length === 0 ? (
                  <p className="text-muted-foreground p-3 text-sm">No tables found.</p>
                ) : (
                  filteredTables.map((table) => (
                    <button
                      key={table.tableName}
                      type="button"
                      onClick={() => {
                        detailRequestRef.current += 1;
                        setSelectedTable(table.tableName);
                      }}
                      className={`hover:bg-muted flex w-full flex-col items-start border-b px-3 py-2 text-start last:border-b-0 ${
                        selectedTable === table.tableName ? "bg-muted" : ""
                      }`}
                    >
                      <span className="font-medium" dir="ltr">
                        {table.tableName}
                      </span>
                      <span className="text-muted-foreground text-xs" dir="ltr">
                        {table.rowCount?.toLocaleString() ?? "?"} rows · {table.columnCount} cols ·{" "}
                        {table.indexCount} idx
                      </span>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg" dir="ltr">
                {selectedTable ?? "Select a table"}
              </CardTitle>
              <CardDescription>Structure, indexes, and paginated data</CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedTable ? (
                <p className="text-muted-foreground text-sm">Select a table from the list.</p>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="structure">Structure</TabsTrigger>
                    <TabsTrigger value="indexes">Indexes</TabsTrigger>
                    <TabsTrigger value="data">Data</TabsTrigger>
                  </TabsList>

                  <TabsContent value="structure" className="space-y-3">
                    {loadingDetails && !structure ? (
                      <p className="text-muted-foreground text-sm">Loading structure…</p>
                    ) : structure ? (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Column</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Null</TableHead>
                              <TableHead>PK</TableHead>
                              <TableHead>Default</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {structure.columns.map((column) => (
                              <TableRow key={column.name}>
                                <TableCell dir="ltr">{column.name}</TableCell>
                                <TableCell dir="ltr">{column.dataType}</TableCell>
                                <TableCell>{column.notNull ? "NO" : "YES"}</TableCell>
                                <TableCell>{column.primaryKeyPosition || "—"}</TableCell>
                                <TableCell dir="ltr">{column.defaultValue ?? "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {structure.foreignKeys.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>From</TableHead>
                                <TableHead>To table</TableHead>
                                <TableHead>To column</TableHead>
                                <TableHead>On update</TableHead>
                                <TableHead>On delete</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {structure.foreignKeys.map((fk) => (
                                <TableRow key={`${fk.id}-${fk.sequence}`}>
                                  <TableCell dir="ltr">{fk.fromColumn}</TableCell>
                                  <TableCell dir="ltr">{fk.referencedTable}</TableCell>
                                  <TableCell dir="ltr">{fk.toColumn}</TableCell>
                                  <TableCell dir="ltr">{fk.onUpdate}</TableCell>
                                  <TableCell dir="ltr">{fk.onDelete}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-muted-foreground text-sm">No foreign keys.</p>
                        )}
                      </>
                    ) : null}
                  </TabsContent>

                  <TabsContent value="indexes">
                    {indexes.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No indexes reported.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Columns</TableHead>
                            <TableHead>Unique</TableHead>
                            <TableHead>Origin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {indexes.map((index) => (
                            <TableRow key={index.indexName}>
                              <TableCell dir="ltr">{index.indexName}</TableCell>
                              <TableCell dir="ltr">{index.columns.join(", ") || "—"}</TableCell>
                              <TableCell>{index.isUnique ? "yes" : "no"}</TableCell>
                              <TableCell dir="ltr">{index.origin}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  <TabsContent value="data" className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث نصي آمن"
                        className="max-w-xs"
                      />
                      <Select
                        value={String(pageSize)}
                        onValueChange={(value) => {
                          setPageSize(Number(value));
                          setPageNumber(1);
                        }}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[25, 50, 100, 200].map((size) => (
                            <SelectItem key={size} value={String(size)}>
                              {size} / page
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="secondary" onClick={() => void loadTableDetails()}>
                        Apply
                      </Button>
                    </div>

                    {loadingDetails && !data ? (
                      <p className="text-muted-foreground text-sm">Loading rows…</p>
                    ) : data && data.rows.length > 0 ? (
                      <>
                        <div className="overflow-auto rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {data.columns.map((column) => (
                                  <TableHead key={column.name}>
                                    <button
                                      type="button"
                                      className="font-medium"
                                      dir="ltr"
                                      onClick={() => {
                                        if (sortColumn === column.name) {
                                          setSortDescending((value) => !value);
                                        } else {
                                          setSortColumn(column.name);
                                          setSortDescending(false);
                                        }
                                        setPageNumber(1);
                                      }}
                                    >
                                      {column.name}
                                      {sortColumn === column.name
                                        ? sortDescending
                                          ? " ↓"
                                          : " ↑"
                                        : ""}
                                    </button>
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.rows.map((row, index) => (
                                <TableRow key={index}>
                                  {data.columns.map((column) => (
                                    <TableCell key={column.name} dir="ltr" className="max-w-[280px] truncate">
                                      {formatCell(row[column.name])}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span dir="ltr">
                            Page {data.pageNumber} / {Math.max(data.totalPages, 1)} · {data.totalCount} rows
                          </span>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!data.hasPreviousPage}
                              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                            >
                              Previous
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!data.hasNextPage}
                              onClick={() => setPageNumber((p) => p + 1)}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">No rows matched.</p>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DiagnosticsAdminGuard>
  );
}
