"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileUp, Loader2, Table2 } from "lucide-react";
import { toast } from "sonner";
import {
  commitLegacyLedger,
  downloadLegacyLedgerTemplate,
  isLegacyLedgerAdmin,
  previewLegacyLedger,
  type LegacyLedgerCommitResult,
  type LegacyLedgerPreview,
} from "@/lib/legacy-ledger-api";
import { getChartLeaves } from "@/lib/manual-journal-api";
import type { AccountSelectItem } from "@/types/collected-voucher";
import { usePermissions } from "@/components/permissions/permission-provider";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function formatAccountDisplay(code: string, name?: string | null) {
  const label = (name ?? "").trim();
  if (!label || label === code) return code;
  if (label.startsWith(code)) return label;
  return `${code} - ${label}`;
}

function formatAmount(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LegacyLedgerImportPageContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.accessToken;
  const { roles, ready, loading } = usePermissions();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [accounts, setAccounts] = useState<AccountSelectItem[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [debitAccount, setDebitAccount] = useState("");
  const [creditAccount, setCreditAccount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<LegacyLedgerPreview | null>(null);
  const [result, setResult] = useState<LegacyLedgerCommitResult | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | "template" | null>(null);

  useEffect(() => {
    if (!ready || loading) return;
    if (!isLegacyLedgerAdmin(roles)) router.replace("/dashboard");
  }, [ready, loading, roles, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    setAccountsLoading(true);
    getChartLeaves(token)
      .then((items) => {
        if (!cancelled) setAccounts(items);
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : "Could not load accounts."
        );
      })
      .finally(() => {
        if (!cancelled) setAccountsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        value: account.accCode,
        label: formatAccountDisplay(account.accCode, account.name),
      })),
    [accounts]
  );

  const resetPreview = useCallback(() => {
    setPreview(null);
    setResult(null);
  }, []);

  const onTemplate = async () => {
    if (!token) return;
    setBusy("template");
    try {
      const template = await downloadLegacyLedgerTemplate(token);
      saveBlob(template.blob, template.fileName);
      toast.success("Template downloaded.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Template failed.");
    } finally {
      setBusy(null);
    }
  };

  const onPreview = async () => {
    if (!token) return;

    if (!debitAccount || !creditAccount) {
      toast.error("Select both the debit account and the credit account.");
      return;
    }

    if (debitAccount === creditAccount) {
      toast.error("Debit account and credit account must be different.");
      return;
    }

    if (!file) {
      toast.error("Choose the Excel file to upload.");
      return;
    }

    setBusy("preview");
    setResult(null);
    try {
      const next = await previewLegacyLedger(token, file, debitAccount, creditAccount);
      setPreview(next);

      if (next.success) {
        toast.success(
          `${next.validRowCount} row(s) ready — ${next.ledgerEntryCount} ledger entries will be created.`
        );
      } else {
        toast.error(
          next.errors[0]?.reason ?? "The file could not be imported."
        );
      }
    } catch (error: unknown) {
      setPreview(null);
      toast.error(error instanceof Error ? error.message : "Preview failed.");
    } finally {
      setBusy(null);
    }
  };

  const onCommit = async () => {
    if (!token || !preview?.importSessionId) return;

    setBusy("commit");
    try {
      const committed = await commitLegacyLedger(token, preview.importSessionId);
      setResult(committed);
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success(
        `Imported ${committed.sourceRowCount} row(s) as ${committed.ledgerEntryCount} ledger entries.`
      );
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(null);
    }
  };

  if (!ready || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading…</CardTitle>
          <CardDescription>Checking accounting access.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isLegacyLedgerAdmin(roles)) return null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Legacy Ledger Import</CardTitle>
          <CardDescription>
            Each Excel row creates two ledger entries on the same date with the same
            description, and the Excel column that holds the amount decides the direction: a
            Depit amount debits the Debit account and credits the Credit account, while a
            Credit amount credits the Debit account and debits the Credit account. Nothing is
            written until you confirm.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={onTemplate} disabled={busy !== null}>
              {busy === "template" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download Excel Template
            </Button>
            <Badge variant="secondary">Date | Description | Depit | Credit</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-1.5 block font-semibold">
                Debit Account<span className="text-red-600"> *</span>
              </Label>
              <SearchableCombobox
                value={debitAccount}
                onValueChange={(value) => {
                  setDebitAccount(value);
                  resetPreview();
                }}
                options={accountOptions}
                placeholder="Select debit account"
                searchPlaceholder="Search account code or name"
                emptyMessage="No accounts found"
                size="lg"
                disabled={accountsLoading || busy !== null}
                dropdownMinWidth={320}
              />
            </div>
            <div>
              <Label className="mb-1.5 block font-semibold">
                Credit Account<span className="text-red-600"> *</span>
              </Label>
              <SearchableCombobox
                value={creditAccount}
                onValueChange={(value) => {
                  setCreditAccount(value);
                  resetPreview();
                }}
                options={accountOptions}
                placeholder="Select credit account"
                searchPlaceholder="Search account code or name"
                emptyMessage="No accounts found"
                size="lg"
                disabled={accountsLoading || busy !== null}
                dropdownMinWidth={320}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
                resetPreview();
              }}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <FileUp className="mr-2 h-4 w-4" />
              {file ? file.name : "Choose Excel file"}
            </Button>
            <Button onClick={onPreview} disabled={busy !== null || !file}>
              {busy === "preview" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Table2 className="mr-2 h-4 w-4" />
              )}
              Upload and Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Preview
              {preview.batchRef ? (
                <Badge variant="outline">{preview.batchRef}</Badge>
              ) : null}
            </CardTitle>
            <CardDescription>
              Debit {preview.debitAccountCode ?? "-"} · Credit{" "}
              {preview.creditAccountCode ?? "-"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <Metric label="Excel rows" value={String(preview.totalRows)} />
              <Metric label="Valid rows" value={String(preview.validRowCount)} />
              <Metric
                label="Ledger entries to create"
                value={String(preview.ledgerEntryCount)}
              />
              <Metric label="Total amount" value={formatAmount(preview.totalAmount)} />
            </div>

            {preview.errors.length > 0 ? (
              <div className="rounded-md border border-red-200 bg-red-50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Excel row</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.errors.map((error, index) => (
                      <TableRow key={`${error.rowNumber}-${index}`}>
                        <TableCell>{error.rowNumber || "—"}</TableCell>
                        <TableCell>{error.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            {preview.rows.length > 0 ? (
              <div className="max-h-72 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Row</TableHead>
                      <TableHead className="w-32">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-28 text-right">Depit</TableHead>
                      <TableHead className="w-28 text-right">Credit</TableHead>
                      <TableHead className="w-28 text-right">Amount</TableHead>
                      <TableHead className="w-64">Posting</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.slice(0, 200).map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>{row.date?.slice(0, 10)}</TableCell>
                        <TableCell className="max-w-[28rem] truncate">
                          {row.description}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAmount(row.depit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAmount(row.credit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAmount(row.amount)}
                        </TableCell>
                        <TableCell>
                          {row.debitOnFirstAccount
                            ? `${preview.debitAccountCode ?? "-"} debited · ${
                                preview.creditAccountCode ?? "-"
                              } credited`
                            : `${preview.debitAccountCode ?? "-"} credited · ${
                                preview.creditAccountCode ?? "-"
                              } debited`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {preview.rows.length > 200 ? (
                  <p className="px-3 py-2 text-sm text-slate-600">
                    Showing the first 200 of {preview.rows.length} rows.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div>
              <Button onClick={onCommit} disabled={!preview.success || busy !== null}>
                {busy === "commit" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Confirm and Import {preview.ledgerEntryCount} entries
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>Import completed</CardTitle>
            <CardDescription>
              Batch {result.batchRef} — {result.sourceRowCount} Excel row(s) created{" "}
              {result.ledgerEntryCount} ledger entries totalling{" "}
              {formatAmount(result.totalAmount)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Journal group (ACCOrder)</dt>
                <dd>
                  {result.firstAccOrder} – {result.lastAccOrder}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Receipt numbers</dt>
                <dd>
                  {result.firstReceiptNo} – {result.lastReceiptNo}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Transaction type</dt>
                <dd>{result.transType}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Imported at</dt>
                <dd>{result.importedAt?.replace("T", " ").slice(0, 19)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
