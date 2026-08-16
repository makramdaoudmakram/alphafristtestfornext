import { Suspense } from "react";
import { ManualJournalPageContent } from "@/components/admin/manual-journal-page-content";

export default function ManualJournalPage() {
  return (
    <Suspense fallback={null}>
      <ManualJournalPageContent />
    </Suspense>
  );
}
