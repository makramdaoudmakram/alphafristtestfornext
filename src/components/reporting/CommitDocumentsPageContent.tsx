"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { DiagnosticsAdminGuard } from "@/components/diagnostics/DiagnosticsAdminGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  fetchReportingReconciliation,
  repairReportingDocuments,
  RECONCILIATION_DEFAULT_LOOKBACK_DAYS,
  REPORTING_DOCUMENT_TYPES,
  type ReportingMonitorItem,
  type ReportingMonitorResponse,
} from "@/lib/reporting/reconciliation-api";

const STATUSES = [
  "MissingJob",
  "Pending",
  "Processing",
  "RetryPending",
  "Failed",
  "Completed",
  "MissingSQLite",
  "SQLiteMismatch",
  "Duplicate",
  "NotEligible",
];

function formatDateIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function defaultReconciliationRange(): { from: string; to: string } {
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - (RECONCILIATION_DEFAULT_LOOKBACK_DAYS - 1));
  return { from: formatDateIso(fromDate), to: formatDateIso(toDate) };
}

export function CommitDocumentsPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const initialRange = useMemo(() => defaultReconciliationRange(), []);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [store, setStore] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportingMonitorResponse | null>(null);
  const [selected, setSelected] = useState<Record<string, ReportingMonitorItem>>({});
  const [detail, setDetail] = useState<ReportingMonitorItem | null>(null);
  const [confirmRepair, setConfirmRepair] = useState(false);

  async function load(nextPage = page) {
    if (!token) {
      toast.error("Sign in is required.");
      return;
    }
    setLoading(true);
    try {
      const data = await fetchReportingReconciliation(token, {
        type: type === "all" ? undefined : type,
        from,
        to,
        status: status === "all" ? undefined : status,
        store: store.trim() || undefined,
        search: search.trim() || undefined,
        page: nextPage,
        pageSize: 50,
      });
      setResult(data);
      setPage(data.page);
      setSelected({});
      setDetail(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    void load(1);
  }, [token]);

  async function repair() {
    if (!token) return;
    const items = Object.values(selected).filter((item) => item.repairAvailable);
    if (items.length === 0) {
      toast.error("Select documents that can be repaired.");
      return;
    }
    if (!confirmRepair) {
      setConfirmRepair(true);
      return;
    }
    setConfirmRepair(false);
    setLoading(true);
    try {
      const response = await repairReportingDocuments(
        token,
        items.map((item) => ({
          documentType: item.documentType,
          jobHeaderId: item.jobHeaderId,
          documentId: item.documentId,
          jobKind: item.repairJobKind,
        }))
      );
      const failed = response.results.filter((r) => r.outcome !== "Staged");
      toast.success(
        `Staged ${response.staged}. Skipped ${response.skipped}.` +
          (failed.length > 0 ? ` ${failed.length} item(s) did not stage.` : "")
      );
      await load(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Repair failed.");
    } finally {
      setLoading(false);
    }
  }

  const summary = result?.summary;
  const displaySummary =
    status !== "all" && result?.filteredSummary ? result.filteredSummary : summary;
  const summaryLabel =
    status !== "all" && result?.filteredSummary
      ? "Counts for filtered status"
      : "Counts for full scan";

  return (
    <DiagnosticsAdminGuard>
      <div className="flex flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Commit Documents</h1>
          <p className="text-muted-foreground text-sm">
            Monitor SQL documents, reporting jobs, and verified SQLite snapshots in AlfaMovement.
          </p>
        </div>

        {result ? (
          <Card className="border-muted">
            <CardContent className="pt-4 text-sm">
              <p>
                Scanned <strong>{result.from}</strong> through <strong>{result.to}</strong>
                {result.rangeTruncated ? (
                  <span className="text-destructive font-medium">
                    {" "}
                    — range shortened to {result.maxRangeDays} day maximum
                  </span>
                ) : null}
              </p>
              {result.storeFilterNotes.length > 0 ? (
                <ul className="text-muted-foreground mt-2 list-disc pl-5">
                  {result.storeFilterNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
              {(result.monitoredScope?.excludedJobKinds?.length ?? 0) > 0 ? (
                <p className="text-muted-foreground mt-2">
                  Maintenance / lifecycle job kinds (not shown as documents):{" "}
                  {result.monitoredScope?.excludedJobKinds?.join(", ")}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="grid gap-3 pt-6 md:grid-cols-7">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {REPORTING_DOCUMENT_TYPES.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
            <div>
              <Label>Store</Label>
              <Input value={store} onChange={(event) => setStore(event.target.value)} />
            </div>
            <div>
              <Label>Document id</Label>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
            </div>
            <div className="flex items-end gap-2">
              <Button disabled={loading} onClick={() => load(1)}>Load</Button>
              <Button variant="secondary" disabled={loading} onClick={repair}>
                {confirmRepair ? "Confirm repair" : "Repair"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {confirmRepair ? (
          <Card className="border-amber-500">
            <CardContent className="pt-4 text-sm">
              Re-queue {Object.values(selected).filter((i) => i.repairAvailable).length} reporting job(s).
              SQLite publishing runs asynchronously in the background worker. Nothing is written to SQLite from this page.
            </CardContent>
          </Card>
        ) : null}

        {displaySummary ? (
          <>
            <p className="text-muted-foreground text-xs">{summaryLabel}</p>
            <div className="grid gap-2 md:grid-cols-5">
              <SummaryCard label="Total" value={displaySummary.total} />
              <SummaryCard label="Completed" value={displaySummary.completed} />
              <SummaryCard label="Missing job" value={displaySummary.missingJob} />
              <SummaryCard label="Missing SQLite" value={displaySummary.missingSqlite} />
              <SummaryCard label="Mismatch" value={displaySummary.mismatch} />
              <SummaryCard label="Duplicate" value={displaySummary.duplicate} />
              <SummaryCard label="Pending" value={displaySummary.pending} />
              <SummaryCard label="Processing" value={displaySummary.processing} />
              <SummaryCard label="Retry pending" value={displaySummary.retryPending} />
              <SummaryCard label="Failed" value={displaySummary.failed} />
              <SummaryCard label="Not eligible" value={displaySummary.notEligible} />
            </div>
          </>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                Documents
                {result ? ` (${result.totalCount})` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead />
                    <TableHead>Type</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>SQLite</TableHead>
                    <TableHead>Mismatch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(result?.items ?? []).map((item) => {
                    const key = `${item.documentType}:${item.jobHeaderId}:${item.documentId}`;
                    return (
                      <TableRow
                        key={key}
                        className={detail?.documentId === item.documentId && detail.documentType === item.documentType ? "bg-muted/50" : undefined}
                        onClick={() => setDetail(item)}
                      >
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            disabled={!item.repairAvailable}
                            checked={Boolean(selected[key])}
                            onChange={(event) => {
                              setSelected((current) => {
                                const next = { ...current };
                                if (event.target.checked) next[key] = item;
                                else delete next[key];
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell>{item.documentType}</TableCell>
                        <TableCell>{item.documentId}</TableCell>
                        <TableCell>{item.storeId ?? ""}</TableCell>
                        <TableCell>{item.status}</TableCell>
                        <TableCell>{item.jobStatus ?? "none"}</TableCell>
                        <TableCell>
                          {item.sqliteComplete ? "verified" : item.sqliteHeaderExists ? "header " : ""}
                          {item.sqliteLinesExist ? "lines " : ""}
                          {item.sqliteMovementExists ? "facts" : ""}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{item.mismatchReason ?? item.lastError ?? ""}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" disabled={loading || page <= 1} onClick={() => load(page - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={loading || !result || page * result.pageSize >= result.totalCount}
                  onClick={() => load(page + 1)}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {!detail ? (
                <p className="text-muted-foreground">Select a row to inspect SQL, job, and SQLite verification.</p>
              ) : (
                <>
                  <p><strong>{detail.documentType}</strong> #{detail.documentId} (SQL header id {detail.jobHeaderId})</p>
                  <p>Status: {detail.status}</p>
                  <p>Job: {detail.jobStatus ?? "none"} · attempts {detail.attemptCount ?? 0}</p>
                  <p>Repair: {detail.repairAvailable ? "available" : detail.repairUnavailableReason ?? "not available"}</p>
                  {detail.mismatchReason ? <p className="text-destructive">{detail.mismatchReason}</p> : null}
                  {detail.detail?.verificationProblems?.length ? (
                    <ul className="list-disc pl-5">
                      {detail.detail.verificationProblems.map((problem) => (
                        <li key={problem}>{problem}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DiagnosticsAdminGuard>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <p className="text-2xl font-semibold">{value}</p>
      </CardHeader>
    </Card>
  );
}
