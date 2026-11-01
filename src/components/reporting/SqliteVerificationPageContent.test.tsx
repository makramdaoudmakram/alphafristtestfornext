import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SqliteVerificationPageContent } from "@/components/reporting/SqliteVerificationPageContent";
import * as sqliteApi from "@/lib/reporting/sqlite-verification-api";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { accessToken: "test-token" },
    status: "authenticated",
  }),
}));

vi.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    roles: ["Admin"],
    ready: true,
    loading: false,
    hasPermission: () => true,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

const sampleResponse: sqliteApi.SqliteReportingVerificationResponse = {
  verifiedAtUtc: "2026-01-15T10:00:00Z",
  overallStatus: "Healthy",
  readStore: "SQLite",
  movement: {
    fileName: "AlfaMovement.db",
    fileExists: true,
    canConnect: true,
    integrityCheckPassed: true,
    integrityCheckMessage: "ok",
    mainDatabaseSizeBytes: 1024,
    walSizeBytes: 0,
    shmSizeBytes: 0,
    movementFactCount: 10,
    auditEventCount: null,
    schemaValid: true,
    missingTables: [],
    errorMessage: null,
  },
  audit: {
    fileName: "AlfaAudit.db",
    fileExists: true,
    canConnect: true,
    integrityCheckPassed: true,
    integrityCheckMessage: "ok",
    mainDatabaseSizeBytes: 512,
    walSizeBytes: 0,
    shmSizeBytes: 0,
    movementFactCount: null,
    auditEventCount: 5,
    schemaValid: true,
    missingTables: [],
    errorMessage: null,
  },
  jobs: {
    pending: 0,
    processing: 0,
    completed: 1,
    retryPending: 0,
    failed: 0,
    expiredProcessing: 0,
    oldestPendingAgeSeconds: 0,
  },
  reconciliation: {
    from: "2026-01-15",
    to: "2026-01-15",
    rangeTruncated: false,
    synchronizedDocuments: 1,
    missingSqliteDocuments: 0,
    mismatchedDocuments: 0,
    pendingReportingDocuments: 0,
    failedReportingDocuments: 0,
  },
};

describe("SqliteVerificationPageContent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders healthy verification data", async () => {
    vi.spyOn(sqliteApi, "fetchSqliteReportingVerification").mockResolvedValue(
      sampleResponse
    );

    render(<SqliteVerificationPageContent />);

    await waitFor(() => {
      expect(screen.getByText(/Overall status/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText(/Movement facts/i)).toBeInTheDocument();
    expect(screen.getByText(/Audit events/i)).toBeInTheDocument();
  });

  it("shows API errors", async () => {
    vi.spyOn(sqliteApi, "fetchSqliteReportingVerification").mockRejectedValue(
      new Error("HTTP 403")
    );

    render(<SqliteVerificationPageContent />);

    await waitFor(() => {
      expect(screen.getByText(/Verification error/i)).toBeInTheDocument();
    });
    expect(screen.getByText("HTTP 403")).toBeInTheDocument();
  });

  it("refresh reloads verification data", async () => {
    const fetchSpy = vi
      .spyOn(sqliteApi, "fetchSqliteReportingVerification")
      .mockResolvedValue(sampleResponse);

    render(<SqliteVerificationPageContent />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
  });
});
