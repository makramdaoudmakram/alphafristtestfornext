"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import type { ReportingMongoConnectionTest } from "@/types/reporting-mongo";

export function MongoConnectionTestPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportingMongoConnectionTest | null>(
    null
  );
  const [requestError, setRequestError] = useState<string | null>(null);

  async function testConnection() {
    setLoading(true);
    setRequestError(null);
    try {
      const data = await apiFetch<ReportingMongoConnectionTest>(
        "Reporting/mongo-connection",
        { method: "GET" },
        token
      );
      setResult(data);
      if (!data.enabled) {
        toast.message("Reporting Mongo is disabled in API configuration.");
      } else if (data.connected) {
        toast.success("MongoDB is reachable on the API host.");
      } else {
        toast.error("MongoDB is not reachable on the API host.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Mongo test request failed.";
      setResult(null);
      setRequestError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>MongoDB connection test</CardTitle>
          <CardDescription>
            This calls the published Alfa API (the HostGator machine), not your
            PC. It uses the same Mongo ping as Purchase reporting after Save or
            Post. If this fails after you publish, Purchase Mongo reporting will
            fail the same way on that host. Purchase SQL can still save.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            onClick={() => void testConnection()}
            disabled={loading || status === "loading"}
          >
            {loading ? "Testing…" : "Test MongoDB connection"}
          </Button>
          {requestError ? (
            <p className="text-destructive text-sm">{requestError}</p>
          ) : null}
          {result ? (
            <div className="space-y-2 text-sm">
              <p
                className={
                  result.enabled && result.connected
                    ? "font-medium text-emerald-700"
                    : "text-destructive font-medium"
                }
              >
                {result.purchaseImpact}
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">Enabled</dt>
                <dd>{String(result.enabled)}</dd>
                <dt className="text-muted-foreground">Connected</dt>
                <dd>{String(result.connected)}</dd>
                <dt className="text-muted-foreground">Database</dt>
                <dd>{result.databaseName}</dd>
                <dt className="text-muted-foreground">Connection</dt>
                <dd className="break-all">{result.connectionString}</dd>
                <dt className="text-muted-foreground">Collection</dt>
                <dd>{result.inventoryMovementFactsCollection}</dd>
                {result.error ? (
                  <>
                    <dt className="text-muted-foreground">Error</dt>
                    <dd className="break-all">{result.error}</dd>
                  </>
                ) : null}
              </dl>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
