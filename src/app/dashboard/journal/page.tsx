import { Suspense } from "react";
import { JournalPageContent } from "@/components/admin/journal-page-content";

export default function JournalPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <JournalPageContent />
    </Suspense>
  );
}
