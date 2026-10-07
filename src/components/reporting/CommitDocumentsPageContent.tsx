"use client";

import { useMemo, useState } from "react";
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
  "NotEligible",
];

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function CommitDocumentsPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const initialDay = useMemo(() => todayIso(), []);
  const [type, setType] = useState("Sales");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState(initialDay);
  const [to, setTo] = useState(initialDay);
  const [store, setStore] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportingMonitorResponse | null>(null);
  const [selected, setSelected] = useState<Record<string, ReportingMonitorItem>>({});

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
        page: nextPage,
        pageSize: 50,
      });
      setResult(data);
      setPage(data.page);
      setSelected({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function repair() {
    if (!token) return;
    const items = Object.values(selected).filter((item) => item.repairAvailable);
    if (items.length === 0) {
      toast.error("Select documents that can be repaired.");
      return;
    }
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
      toast.success(`Staged ${response.staged}. Skipped ${response.skipped}.`);
      await load(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Repair failed.");
    } finally {
      setLoading(false);
    }
  }

  const summary = result?.summary;

  return (
    <DiagnosticsAdminGuard>
      <div className="flex flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Commit Documents</h1>
          <p className="text-muted-foreground text-sm">
            SQL documents that should be in AlfaMovement, and whether the reporting job and SQLite snapshot finished.
          </p>
        </div>

        <Card>
          <CardContent className="grid gap-3 pt-6 md:grid-cols-6">
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
            <div className="flex items-end gap-2">
              <Button disabled={loading} onClick={() => load(1)}>Load</Button>
              <Button variant="secondary" disabled={loading} onClick={repair}>Repair</Button>
            </div>
          </CardContent>
        </Card>

        {summary ? (
          <div className="grid gap-2 md:grid-cols-5">
            <SummaryCard label="Total" value={summary.total} />
            <SummaryCard label="Completed" value={summary.completed} />
            <SummaryCard label="Pending" value={summary.pending} />
            <SummaryCard label="Processing" value={summary.processing} />
            <SummaryCard label="Retry pending" value={summary.retryPending} />
            <SummaryCard label="Failed" value={summary.failed} />
            <SummaryCard label="Missing job" value={summary.missingJob} />
            <SummaryCard label="Missing SQLite" value={summary.missingSqlite} />
            <SummaryCard label="Mismatch" value={summary.mismatch} />
            <SummaryCard label="Not eligible" value={summary.notEligible} />
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>
              Documents
              {result ? ` (${result.totalCount})` : ""}
              {result?.rangeTruncated ? " — date range was shortened to the configured maximum" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>Type</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>SQL id</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>SQLite</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(result?.items ?? []).map((item) => {
                  const key = `${item.documentType}:${item.jobHeaderId}:${item.documentId}`;
                  return (
                    <TableRow key={key}>
                      <TableCell>
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
                      <TableCell>{item.jobHeaderId}</TableCell>
                      <TableCell>{item.status}</TableCell>
                      <TableCell>{item.jobStatus ?? "none"}</TableCell>
                      <TableCell>{item.attemptCount ?? ""}</TableCell>
                      <TableCell>
                        {item.sqliteHeaderExists ? "header " : ""}
                        {item.sqliteLinesExist ? "lines " : ""}
                        {item.sqliteMovementExists ? "facts" : ""}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{item.lastError}</TableCell>
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
