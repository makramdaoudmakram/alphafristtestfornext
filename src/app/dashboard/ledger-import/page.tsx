import { Suspense } from "react";
import { LegacyLedgerImportPageContent } from "@/components/admin/legacy-ledger-import-page-content";

export default function LegacyLedgerImportPage() {
  return (
    <Suspense fallback={null}>
      <LegacyLedgerImportPageContent />
    </Suspense>
  );
}
