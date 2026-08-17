"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, Wallet, Landmark } from "lucide-react";
import { toast } from "sonner";
import {
  getPendingCollectedVouchers,
  getPendingPaymentVouchers,
} from "@/lib/api-client";
import { PageGuard } from "@/components/permissions/page-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type PendingRow = {
  receiptNO: number;
  receiptDate: string | null;
  amount: number | null;
  currency: string | null;
  type: string | null;
  vSource: string | null;
  partyName: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatAmount(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function PendingTable({
  rows,
  partyHeader,
  emptyMessage,
  selectedId,
  loading,
  onSelect,
  onOpen,
}: {
  rows: PendingRow[];
  partyHeader: string;
  emptyMessage: string;
  selectedId: number | null;
  loading: boolean;
  onSelect: (receiptNO: number) => void;
  onOpen: (receiptNO: number) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-11 animate-pulse rounded-md bg-slate-200/80"
          />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-base text-slate-600">
        {emptyMessage}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-100 hover:bg-slate-100">
          <TableHead className="text-base font-bold text-slate-800">No.</TableHead>
          <TableHead className="text-base font-bold text-slate-800">Date</TableHead>
          <TableHead className="text-right text-base font-bold text-slate-800">
            Amount
          </TableHead>
          <TableHead className="text-base font-bold text-slate-800">Currency</TableHead>
          <TableHead className="text-base font-bold text-slate-800">Method</TableHead>
          <TableHead className="text-base font-bold text-slate-800">Source</TableHead>
          <TableHead className="text-base font-bold text-slate-800">{partyHeader}</TableHead>
          <TableHead className="w-[100px] text-base font-bold text-slate-800">
            Action
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const selected = selectedId === row.receiptNO;
          return (
            <TableRow
              key={row.receiptNO}
              className={cn(
                "cursor-pointer text-base",
                selected && "bg-blue-50 hover:bg-blue-50"
              )}
              onClick={() => onSelect(row.receiptNO)}
              onDoubleClick={() => onOpen(row.receiptNO)}
            >
              <TableCell className="font-semibold tabular-nums text-slate-900">
                {row.receiptNO}
              </TableCell>
              <TableCell>{formatDate(row.receiptDate)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatAmount(row.amount)}
              </TableCell>
              <TableCell>{row.currency || "—"}</TableCell>
              <TableCell>{row.type || "—"}</TableCell>
              <TableCell>{row.vSource || "—"}</TableCell>
              <TableCell className="max-w-[220px] truncate font-medium text-slate-900">
                {row.partyName?.trim() || "—"}
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 border-slate-300 text-base"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(row.receiptNO);
                  }}
                >
                  Open
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function PendingVoucherPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";
  const router = useRouter();

  const [payments, setPayments] = useState<PendingRow[]>([]);
  const [collections, setCollections] = useState<PendingRow[]>([]);
  const [loadingPay, setLoadingPay] = useState(true);
  const [loadingCol, setLoadingCol] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPay, setSelectedPay] = useState<number | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    if (!token) {
      setPayments([]);
      setCollections([]);
      setLoadingPay(false);
      setLoadingCol(false);
      return;
    }

    setError(null);
    setLoadingPay(true);
    setLoadingCol(true);
    try {
      const [p, c] = await Promise.all([
        getPendingPaymentVouchers(token),
        getPendingCollectedVouchers(token),
      ]);
      setPayments(p);
      setCollections(c);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load pending vouchers";
      setError(message);
      toast.error(message);
    } finally {
      setLoadingPay(false);
      setLoadingCol(false);
    }
  }, [token]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadAll();
  }, [sessionReady, loadAll]);

  const openPayment = (receiptNO: number) => {
    setSelectedPay(receiptNO);
    router.push(`/dashboard/payment-voucher?id=${receiptNO}`);
  };

  const openCollection = (receiptNO: number) => {
    setSelectedCol(receiptNO);
    router.push(`/dashboard/collection-voucher?id=${receiptNO}`);
  };

  return (
    <PageGuard permission={null}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Pending Payment / Collection
            </h1>
            <p className="text-lg text-slate-700">
              Unposted vouchers (Approved = false) — open to complete journal posting
            </p>
            <Breadcrumb>
              <BreadcrumbList className="text-base text-slate-700">
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <span className="text-slate-700">Accounts</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Pending Vouchers</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 border-slate-400 text-base font-semibold"
            onClick={() => void loadAll()}
            disabled={loadingPay || loadingCol}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-base text-red-900">
            {error}
          </div>
        ) : null}

        <Card className="border-slate-300 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-800">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-950">
                  Pending Payment
                </CardTitle>
                <CardDescription className="text-base text-slate-600">
                  PaymentVoucher where Approved = 0
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-slate-300 text-base tabular-nums">
              {loadingPay ? "…" : payments.length}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <PendingTable
              rows={payments}
              partyHeader="Paid To"
              emptyMessage="No pending payment vouchers found."
              selectedId={selectedPay}
              loading={loadingPay}
              onSelect={setSelectedPay}
              onOpen={openPayment}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-300 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-950">
                  Pending Collection
                </CardTitle>
                <CardDescription className="text-base text-slate-600">
                  CollectedVoucher where Approved = 0
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-slate-300 text-base tabular-nums">
              {loadingCol ? "…" : collections.length}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <PendingTable
              rows={collections}
              partyHeader="Collected Name"
              emptyMessage="No pending collection vouchers found."
              selectedId={selectedCol}
              loading={loadingCol}
              onSelect={setSelectedCol}
              onOpen={openCollection}
            />
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
