import { Suspense } from "react";
import { LedgerPageContent } from "@/components/admin/ledger-page-content";

export default function LedgerPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <LedgerPageContent />
    </Suspense>
  );
}
