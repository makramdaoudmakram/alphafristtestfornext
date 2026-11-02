"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { DiagnosticsAdminGuard } from "@/components/diagnostics/DiagnosticsAdminGuard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fetchSqliteReportingVerification,
  type SqliteDatabaseVerification,
  type SqliteReportingVerificationResponse,
} from "@/lib/reporting/sqlite-verification-api";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "healthy") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Healthy</Badge>;
  }
  if (normalized === "degraded") {
    return <Badge variant="secondary">Degraded</Badge>;
  }
  return <Badge variant="outline">Unhealthy</Badge>;
}

function databaseStatus(db: SqliteDatabaseVerification): string {
  if (!db.fileExists) return "Missing file";
  if (!db.canConnect) return "Cannot connect";
  if (!db.integrityCheckPassed) return "Integrity failed";
  if (!db.schemaValid) return "Schema incomplete";
  return "OK";
}

function DatabaseCard({
  title,
  db,
  primaryCountLabel,
  primaryCountValue,
  extraCounts,
}: {
  title: string;
  db: SqliteDatabaseVerification;
  primaryCountLabel: string;
  primaryCountValue: number | null;
  extraCounts?: { label: string; value: number | null }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>File: {db.fileName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          Status: <strong>{databaseStatus(db)}</strong>
        </p>
        <p>Connect: {db.canConnect ? "yes" : "no"}</p>
        <p>
          Integrity:{" "}
          {db.integrityCheckPassed
            ? "ok"
            : db.integrityCheckMessage || "failed"}
        </p>
        <p>
          Schema: {db.schemaValid ? "valid" : "missing tables"}
          {db.missingTables.length > 0
            ? ` (${db.missingTables.join(", ")})`
            : ""}
        </p>
        <p>
          Size: {formatBytes(db.mainDatabaseSizeBytes)}
          {db.walSizeBytes > 0 ? ` · WAL ${formatBytes(db.walSizeBytes)}` : ""}
          {db.shmSizeBytes > 0 ? ` · SHM ${formatBytes(db.shmSizeBytes)}` : ""}
        </p>
        {primaryCountValue != null ? (
          <p>
            {primaryCountLabel}: {primaryCountValue.toLocaleString()}
          </p>
        ) : null}
        {extraCounts?.map((row) =>
          row.value != null ? (
            <p key={row.label}>
              {row.label}: {row.value.toLocaleString()}
            </p>
          ) : null
        )}
        {db.errorMessage ? (
          <p className="text-destructive">{db.errorMessage}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SqliteVerificationPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SqliteReportingVerificationResponse | null>(
    null
  );

  const load = useCallback(async () => {
    if (!token) {
      setError("Sign in is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSqliteReportingVerification(token);
      setData(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Verification request failed.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DiagnosticsAdminGuard>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              SQLite Server Verification
            </h1>
            <p className="text-muted-foreground text-sm" dir="rtl">
              فحص قاعدة بيانات SQLite
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Read-only health check for reporting SQLite on this API host.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={loading || !token}
            onClick={() => void load()}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive text-base">
                Verification error
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {data ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  Overall status {statusBadge(data.overallStatus)}
                </CardTitle>
                <CardDescription>
                  Read store: {data.readStore} · Last verified:{" "}
                  {new Date(data.verifiedAtUtc).toLocaleString()}
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <DatabaseCard
                title="AlfaMovement.db"
                db={data.movement}
                primaryCountLabel="Movement facts"
                primaryCountValue={data.movement.movementFactCount}
                extraCounts={[
                  {
                    label: "Document headers",
                    value: data.movement.documentHeaderCount,
                  },
                  {
                    label: "Document lines",
                    value: data.movement.documentLineCount,
                  },
                ]}
              />
              <DatabaseCard
                title="AlfaAudit.db"
                db={data.audit}
                primaryCountLabel="Audit events"
                primaryCountValue={data.audit.auditEventCount}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reporting jobs (SQL Server)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <p>Pending: {data.jobs.pending}</p>
                <p>Processing: {data.jobs.processing}</p>
                <p>Retry pending: {data.jobs.retryPending}</p>
                <p>Completed: {data.jobs.completed}</p>
                <p>Failed: {data.jobs.failed}</p>
                <p>Expired processing: {data.jobs.expiredProcessing}</p>
                <p>
                  Oldest pending age: {data.jobs.oldestPendingAgeSeconds}s
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reconciliation summary</CardTitle>
                <CardDescription>
                  Range {data.reconciliation.from} → {data.reconciliation.to}
                  {data.reconciliation.rangeTruncated ? " (truncated)" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <p>
                  Synchronized: {data.reconciliation.synchronizedDocuments}
                </p>
                <p>
                  Missing SQLite: {data.reconciliation.missingSqliteDocuments}
                </p>
                <p>
                  Mismatch: {data.reconciliation.mismatchedDocuments}
                </p>
                <p>
                  Pending documents:{" "}
                  {data.reconciliation.pendingReportingDocuments}
                </p>
                <p>
                  Failed documents: {data.reconciliation.failedReportingDocuments}
                </p>
              </CardContent>
            </Card>
          </>
        ) : loading ? (
          <p className="text-muted-foreground text-sm">Loading verification…</p>
        ) : null}
      </div>
    </DiagnosticsAdminGuard>
  );
}
